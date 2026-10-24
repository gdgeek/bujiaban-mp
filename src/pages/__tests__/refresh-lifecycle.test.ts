import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSetup, nodeText } from "./setup-harness";

const identity = { unionid: "private-unionid", openid: "private-openid", user: null };
const LEGACY_API = "https://x.4mr.cn/v2";
const CURRENT_API = "https://c.4mr.cn/api/v2";
const backend = { apiUrl: LEGACY_API };
const file = { id: 1, key: "video.mp4" };
const device = {
  id: 7,
  tag: "tag",
  uuid: "uuid",
  ip: "",
  setup: {
    id: 70,
    title: "原名称",
    money: 9,
    scene_id: 42,
    slogans: ["原口号"],
    shots: [2],
    pictures: ["image"],
    thumbs: ["thumb"],
  },
};
let toast: ReturnType<typeof vi.fn>;
let stopRefresh: ReturnType<typeof vi.fn>;
beforeEach(() => {
  backend.apiUrl = LEGACY_API;
  toast = vi.fn();
  stopRefresh = vi.fn();
  uni.showToast = toast as typeof uni.showToast;
  uni.stopPullDownRefresh = stopRefresh;
});

function videoPage(
  fetchFiles = vi.fn().mockResolvedValue([file]),
  login = vi.fn().mockResolvedValue(identity),
) {
  return {
    fetchFiles,
    login,
    page: loadSetup("src/pages/video/index.vue", {
      "@/config": { default: backend },
      "@/api/login": { login },
      "@/utils/common": { getFileList: fetchFiles },
      "@/utils/global": { default: { url: "" } },
      "@/stores/modules/video": { useVideoStore: () => ({ videos: [] }) },
    }),
  };
}

describe("record page refresh", () => {
  it("fetches actual records every time the page becomes visible", async () => {
    const { page, fetchFiles } = videoPage();
    await page.fire("onShow");
    expect(fetchFiles).toHaveBeenCalledTimes(1);
    expect(page.state.list.value).toEqual([file]);
    await page.fire("onShow");
    expect(fetchFiles).toHaveBeenCalledTimes(2);
  });

  it("renders records from the fetched list even when the unrelated video store is empty", async () => {
    const { page } = videoPage();
    page.state.list.value = [file];
    page.state.loading.value = false;
    expect(nodeText(page.render())).not.toContain("暂无记录");
  });

  it("ends loading and pull-down refresh after failure, with a visible error", async () => {
    const { page } = videoPage(vi.fn().mockRejectedValue(new Error("offline")));
    await page.fire("onPullDownRefresh");
    expect(stopRefresh).toHaveBeenCalledTimes(1);
    expect(page.state.loading.value).toBe(false);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "获取视频列表失败" }));
  });

  it("keeps the API selected before login until that record refresh finishes", async () => {
    let finishLogin!: (value: unknown) => void;
    const login = vi
      .fn()
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishLogin = resolve;
        }),
      )
      .mockResolvedValue(identity);
    const { page, fetchFiles } = videoPage(undefined, login);
    const refresh = page.fire("onShow");
    backend.apiUrl = CURRENT_API;
    finishLogin(identity);
    await refresh;
    expect(login).toHaveBeenNthCalledWith(1, false, LEGACY_API);
    expect(fetchFiles).toHaveBeenNthCalledWith(1, identity.unionid, LEGACY_API);
    await page.fire("onShow");
    expect(login).toHaveBeenLastCalledWith(false, CURRENT_API);
    expect(fetchFiles).toHaveBeenLastCalledWith(identity.unionid, CURRENT_API);
  });
});

function devicePage(
  scenes: ReturnType<typeof vi.fn>,
  details = vi.fn().mockResolvedValue(device),
  login = vi.fn().mockResolvedValue(identity),
) {
  const save = vi.fn().mockResolvedValue({});
  return {
    details,
    save,
    page: loadSetup("src/pages/device/manage.vue", {
      "@/config": { default: backend },
      "@/api/login": { login },
      "@/api/device": { getDeviceWithSetup: details, putSetup: save },
      "@/api/a1": { getCheckinList: scenes },
    }),
  };
}

describe("device setup loading", () => {
  it("keeps device details and the existing scene when the scene catalog fails", async () => {
    const { page, details, save } = devicePage(vi.fn().mockRejectedValue(new Error("offline")));
    await expect(page.fire("onLoad", { deviceId: "7" })).resolves.toBeUndefined();
    expect(details).toHaveBeenCalledWith(7, LEGACY_API);
    expect(page.state.loading.value).toBe(false);
    expect(page.state.setupForm.value.scene_id).toBe("42");
    expect(nodeText(page.render())).toContain("场景列表加载失败");
    await page.state.saveSetup();
    expect(save).toHaveBeenCalledWith(
      70,
      expect.objectContaining({ scene_id: 42, title: "原名称", pictures: ["image"] }),
      LEGACY_API,
    );
  });

  it("retries the scene catalog without overwriting unsaved form changes", async () => {
    const scenes = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue([{ verse_id: 42, name: "原场景" }]);
    const { page, details } = devicePage(scenes);
    await page.fire("onLoad", { deviceId: "7" });
    page.state.setupForm.value.title = "未保存修改";
    await page.state.loadScenes();
    expect(page.state.setupForm.value.title).toBe("未保存修改");
    expect(page.state.setupForm.value.scene_id).toBe("42");
    expect(page.state.selectedVerseName.value).toBe("原场景");
    expect(details).toHaveBeenCalledTimes(1);
  });

  it("shows a retry state instead of an editable empty form after device failure", async () => {
    const details = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(device);
    const { page } = devicePage(vi.fn().mockResolvedValue([]), details);
    await expect(page.fire("onLoad", { deviceId: "7" })).resolves.toBeUndefined();
    expect(page.state.loading.value).toBe(false);
    expect(nodeText(page.render())).toContain("设备加载失败");
    await page.state.loadDevice();
    expect(page.state.device.value.id).toBe(7);
  });

  it("keeps device reads, scene retries and saving in the page's original API", async () => {
    let finishLogin!: (value: unknown) => void;
    const login = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        finishLogin = resolve;
      }),
    );
    const scenes = vi.fn().mockResolvedValue([]);
    const { page, details, save } = devicePage(scenes, undefined, login);
    const loaded = page.fire("onLoad", { deviceId: "7" });
    backend.apiUrl = CURRENT_API;
    finishLogin(identity);
    await loaded;
    expect(login).toHaveBeenCalledWith(false, LEGACY_API);
    expect(details).toHaveBeenCalledWith(7, LEGACY_API);
    await page.state.loadScenes();
    expect(scenes.mock.calls.every(([api]) => api === LEGACY_API)).toBe(true);
    await page.state.saveSetup();
    expect(save).toHaveBeenCalledWith(70, expect.any(Object), LEGACY_API);
  });
});

describe("associated devices page", () => {
  it("handles list failure and lets the user retry", async () => {
    const list = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue([device]);
    const page = loadSetup("src/pages/admin/index.vue", {
      "@/config": { default: backend },
      "@/api/login": { login: vi.fn().mockResolvedValue(identity) },
      "@/api/device": { manageDevice: list },
    });
    await expect(page.fire("onShow")).resolves.toBeUndefined();
    expect(page.state.loading.value).toBe(false);
    expect(nodeText(page.render())).toContain("关联设备加载失败");
    await page.state.loadDevices();
    expect(page.state.devices.value).toHaveLength(1);
    expect(nodeText(page.render())).toContain("共 1 台");
  });

  it("loads associated devices from the API captured before login", async () => {
    let finishLogin!: (value: unknown) => void;
    const login = vi
      .fn()
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishLogin = resolve;
        }),
      )
      .mockResolvedValue(identity);
    const list = vi.fn().mockResolvedValue([device]);
    const page = loadSetup("src/pages/admin/index.vue", {
      "@/config": { default: backend },
      "@/api/login": { login },
      "@/api/device": { manageDevice: list },
    });
    const loaded = page.fire("onShow");
    backend.apiUrl = CURRENT_API;
    finishLogin(identity);
    await loaded;
    expect(login).toHaveBeenNthCalledWith(1, false, LEGACY_API);
    expect(list).toHaveBeenNthCalledWith(1, LEGACY_API);
    await page.fire("onShow");
    expect(list).toHaveBeenLastCalledWith(CURRENT_API);
  });
});
