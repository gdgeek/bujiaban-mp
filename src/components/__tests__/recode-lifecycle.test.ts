import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { loadSetup, nodeText } from "../../pages/__tests__/setup-harness";
const setup = { money: 0, slogans: ["hello"], shots: [], thumbs: [] };
const identity = { unionid: "private-unionid" };
const legacyApiUrl = "https://x.4mr.cn/v2";
const currentApiUrl = "https://checkin.voxel.cn/api/v2";
let activeApiUrl: string;
const config = {
  get apiUrl() {
    return activeApiUrl;
  },
};
const response = (data = {}) => ({ success: true, data: { token: "", ...data } });
const flush = async () => {
  for (let index = 0; index < 12; index++) await Promise.resolve();
  await nextTick();
};
let page: ReturnType<typeof loadSetup> | undefined;
let hideLoading: ReturnType<typeof vi.fn>;
let toast: ReturnType<typeof vi.fn>;
function loadRecode(post: ReturnType<typeof vi.fn>) {
  page = loadSetup(
    "src/components/Recode.vue",
    {
      "@/config": { default: config },
      "@/utils/common": { postData: post },
      "@/utils/logger": { default: { debug: vi.fn() } },
    },
    { id: identity, token: "private-token" },
  );
  return page;
}
beforeEach(() => {
  vi.useFakeTimers();
  activeApiUrl = legacyApiUrl;
  hideLoading = vi.fn();
  toast = vi.fn();
  uni.hideLoading = hideLoading;
  uni.showLoading = vi.fn();
  uni.showToast = toast as typeof uni.showToast;
});
afterEach(async () => {
  await page?.fire("unmount");
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("recording request lifecycle", () => {
  it("keeps the recording API fixed until a new component is created", async () => {
    const post = vi.fn().mockResolvedValue(response({ setup }));
    const component = loadRecode(post);
    await component.fire("mounted");
    expect(post).toHaveBeenNthCalledWith(
      1,
      identity.unionid,
      "private-token",
      "init",
      undefined,
      "setup",
      legacyApiUrl,
    );

    activeApiUrl = currentApiUrl;
    await component.state.setPicture(1);
    await nextTick();
    await vi.advanceTimersByTimeAsync(1800);
    expect(post).toHaveBeenNthCalledWith(
      2,
      identity.unionid,
      "private-token",
      "linked",
      { picture: 1, text: "" },
      "token,file,device",
      legacyApiUrl,
    );
    expect(post).toHaveBeenNthCalledWith(
      3,
      identity.unionid,
      "private-token",
      "linked",
      null,
      "token,file,device",
      legacyApiUrl,
    );

    await component.fire("unmount");
    const nextComponent = loadRecode(post);
    await nextComponent.fire("mounted");
    expect(post).toHaveBeenNthCalledWith(
      4,
      identity.unionid,
      "private-token",
      "init",
      undefined,
      "setup",
      currentApiUrl,
    );
  });

  it("finishes the initial loading state and offers retry after initialization fails", async () => {
    const component = loadRecode(vi.fn().mockRejectedValue(new Error("offline")));
    await expect(component.fire("mounted")).resolves.toBeUndefined();
    expect(hideLoading).toHaveBeenCalled();
    expect(toast).toHaveBeenCalled();
    expect(nodeText(component.render())).toContain("重试");
  });

  it("stops polling while hidden, resumes on show, and stops after unmount", async () => {
    const post = vi.fn().mockResolvedValue(response({ setup }));
    const component = loadRecode(post);
    await component.fire("mounted");
    await component.state.setPicture(1);
    await nextTick();
    await vi.advanceTimersByTimeAsync(1800);
    expect(post).toHaveBeenCalledTimes(3);
    await component.fire("onHide");
    await vi.advanceTimersByTimeAsync(5400);
    expect(post).toHaveBeenCalledTimes(3);
    await component.fire("onShow");
    await vi.advanceTimersByTimeAsync(1800);
    expect(post).toHaveBeenCalledTimes(4);
    await component.fire("unmount");
    await vi.advanceTimersByTimeAsync(5400);
    expect(post).toHaveBeenCalledTimes(4);
  });

  it("waits for a hidden request to settle and discards its late result before polling again", async () => {
    let finish!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      finish = resolve;
    });
    const post = vi
      .fn()
      .mockResolvedValue(response({ setup }))
      .mockResolvedValueOnce(response({ setup }))
      .mockResolvedValueOnce(response())
      .mockReturnValueOnce(pending);
    const component = loadRecode(post);
    await component.fire("mounted");
    await component.state.setPicture(1);
    await nextTick();
    await vi.advanceTimersByTimeAsync(1800);
    expect(post).toHaveBeenCalledTimes(3);
    await component.fire("onHide");
    await component.fire("onShow");
    await vi.advanceTimersByTimeAsync(5400);
    expect(post).toHaveBeenCalledTimes(3);
    finish(response({ file: { key: "stale.mp4" } }));
    await flush();
    expect(component.state.file.value).toBeNull();
    expect(component.state.step.value).toBe(2);
    await vi.advanceTimersByTimeAsync(1800);
    expect(post).toHaveBeenCalledTimes(4);
  });

  it("catches polling failures and continues on the next interval", async () => {
    const post = vi
      .fn()
      .mockResolvedValue(response({ setup }))
      .mockResolvedValueOnce(response({ setup }))
      .mockResolvedValueOnce(response())
      .mockRejectedValueOnce(new Error("offline"));
    const component = loadRecode(post);
    await component.fire("mounted");
    await component.state.setPicture(1);
    await nextTick();
    await vi.advanceTimersByTimeAsync(1800);
    expect(toast).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1800);
    expect(post).toHaveBeenCalledTimes(4);
  });

  it("does not request recording state without a business identifier", async () => {
    const post = vi.fn().mockResolvedValue(response({ setup }));
    page = loadSetup(
      "src/components/Recode.vue",
      {
        "@/config": { default: config },
        "@/utils/common": { postData: post },
      },
      { id: { unionid: null }, token: "recording-token" },
    );
    await page.fire("mounted");
    expect(post).not.toHaveBeenCalled();
    expect(hideLoading).toHaveBeenCalled();
    expect(nodeText(page.render())).toContain("业务身份暂不可用");
  });

  it("ignores late initialization data after hiding and initializes again on show", async () => {
    let finish!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      finish = resolve;
    });
    const post = vi.fn().mockResolvedValue(response({ setup })).mockReturnValueOnce(pending);
    const component = loadRecode(post);
    const mounted = component.fire("mounted");
    await component.fire("onHide");
    expect(hideLoading).toHaveBeenCalled();
    await component.fire("onShow");
    expect(post).toHaveBeenCalledTimes(1);
    finish(response({ setup: { ...setup, slogans: ["stale"] } }));
    await mounted;
    await flush();
    expect(post).toHaveBeenCalledTimes(2);
    expect(component.state.setup.value.slogans).toEqual(["hello"]);
    expect(component.state.step.value).toBe(0);
  });

  it("does not log the raw user identifier or recording token", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const component = loadRecode(vi.fn().mockResolvedValue(response({ setup })));
    await component.fire("mounted");
    expect(log.mock.calls.flat().join(" ")).not.toMatch(/private-unionid|private-token/);
    log.mockRestore();
  });
});
