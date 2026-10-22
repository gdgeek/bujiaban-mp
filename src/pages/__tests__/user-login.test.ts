import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSetup, nodeText } from "./setup-harness";

const identity = { openid: "openid", unionid: "unionid", user: null };
let toast: ReturnType<typeof vi.fn>;
beforeEach(() => {
  toast = vi.fn();
  uni.showToast = toast as typeof uni.showToast;
});
afterEach(() => {
  vi.restoreAllMocks();
});

function userPage(login: ReturnType<typeof vi.fn>, regist = vi.fn()) {
  return loadSetup("src/pages/user/index.vue", {
    "@/api/login": { login, regist, profile: vi.fn() },
    "@/utils/logger": { default: { debug: vi.fn() } },
    "@/api/scan-login": { beginAdminLoginScan: vi.fn() },
  });
}

describe("user page login recovery", () => {
  it("catches failed initial login and shows a usable retry state", async () => {
    const login = vi.fn().mockRejectedValue(new Error("offline"));
    const page = userPage(login);
    await expect(page.fire("mounted")).resolves.toBeUndefined();
    expect(page.state.id.value).toBeNull();
    expect(page.state.loading.value).toBe(false);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "登录失败，请重试", icon: "none" }),
    );
    expect(nodeText(page.render())).toContain("登录失败");
    expect(nodeText(page.render())).toContain("重试登录");
  });

  it("lets retry restore the session and clear the failed state", async () => {
    const login = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(identity);
    const page = userPage(login);
    await expect(page.fire("mounted")).resolves.toBeUndefined();
    await page.state.loadUser();
    expect(page.state.id.value).toEqual(identity);
    expect(page.state.loading.value).toBe(false);
    expect(nodeText(page.render())).not.toContain("重试登录");
    expect(login).toHaveBeenCalledTimes(2);
  });

  it("keeps only one initial login in flight and finishes its loading state", async () => {
    let finish!: (value: unknown) => void;
    const login = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const page = userPage(login);
    const mounted = page.fire("mounted");
    expect(page.state.loading.value).toBe(true);
    await page.state.loadUser();
    expect(login).toHaveBeenCalledTimes(1);
    finish(identity);
    await mounted;
    expect(page.state.id.value).toEqual(identity);
    expect(page.state.loading.value).toBe(false);
  });

  it("handles a rejected phone binding without an unhandled callback rejection", async () => {
    const regist = vi.fn().mockRejectedValue(new Error("offline"));
    const page = userPage(vi.fn().mockResolvedValue(identity), regist);
    await page.fire("mounted");
    await expect(
      page.state.onGetPhoneNumber({ detail: { errMsg: "getPhoneNumber:ok", code: "phone-code" } }),
    ).resolves.toBeUndefined();
    expect(page.state.loading.value).toBe(false);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "绑定手机号失败，请重试", icon: "none" }),
    );
  });
});
