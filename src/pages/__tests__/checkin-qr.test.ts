import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDeviceQr, parseDeviceQr } from "@/utils/device-qr";
import { loadSetup } from "./setup-harness";

const token = "R0123456789abcdef0123456789abcdef";
const oldQr = `https://w.4mr.cn/t?k=${token}`;
let scanned: string;
let toast: ReturnType<typeof vi.fn>;
let reLaunch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  scanned = oldQr;
  toast = vi.fn();
  reLaunch = vi.fn();
  uni.showToast = toast as typeof uni.showToast;
  uni.reLaunch = reLaunch as typeof uni.reLaunch;
  uni.scanCode = vi.fn((options: any) =>
    options.success({ result: scanned }),
  ) as typeof uni.scanCode;
  uni.getStorageSync = vi.fn().mockReturnValue(true);
  vi.stubGlobal("getCurrentPages", () => [{ options: { q: encodeURIComponent(scanned) } }]);
});

function page() {
  const login = vi.fn().mockResolvedValue({ openid: "openid", unionid: "unionid", user: null });
  const selectVersion = vi.fn();
  const result = loadSetup("src/pages/checkin/index.vue", {
    "@/api/login": { login },
    "@/api/checkin": {
      getQueryString: (url: string, key: string) => new URL(url).searchParams.get(key),
    },
    "@/utils/device-qr": { parseDeviceQr, buildDeviceQr },
    "@/config/backend": {
      selectDeviceApiVersion: selectVersion,
      getApiUrlForVersion: (version: number) => {
        if (version !== 0 && version !== 1) throw new Error("设备二维码版本暂不支持");
        return "https://test.invalid/v2";
      },
    },
    "@/utils/logger": { default: { debug: vi.fn() } },
  });
  return { ...result, login, selectVersion };
}

describe("device QR page entry", () => {
  it.each([0, 1])("selects backend v=%s before logging in from a WeChat link", async (version) => {
    const p = page();
    const qr = version === 0 ? oldQr : `${oldQr}&v=1`;
    await p.fire("onLoad", { q: encodeURIComponent(qr) });
    expect(p.selectVersion).toHaveBeenCalledWith(version);
    expect(p.state.token.value).toBe(token);
    expect(p.selectVersion.mock.invocationCallOrder[0]).toBeLessThan(
      p.login.mock.invocationCallOrder[0],
    );
  });

  it("opens normally without QR parameters", async () => {
    vi.stubGlobal("getCurrentPages", () => [{ options: {} }]);
    const p = page();
    await expect(p.fire("onLoad", {})).resolves.toBeUndefined();
    expect(p.state.token.value).toBeNull();
    expect(p.selectVersion).not.toHaveBeenCalled();
    expect(p.login).toHaveBeenCalledOnce();
  });

  it.each([0, 1])("preserves v=%s through scan and relaunch", async (version) => {
    scanned = version === 0 ? oldQr : `${oldQr}&v=1`;
    const p = page();
    p.state.agreementChecked.value = true;
    p.state.handleScan();
    const url = reLaunch.mock.calls[0][0].url;
    const carriedQr = decodeURIComponent(url.split("?q=")[1]);
    expect(parseDeviceQr(carriedQr)).toEqual({ token, version });
    expect(carriedQr).toContain(`&v=${version}`);
    // The old page must finish before the new page changes active credentials.
    expect(p.selectVersion).not.toHaveBeenCalled();
  });

  it("rejects malformed versions without relaunching or selecting a backend", async () => {
    scanned = `${oldQr}&v=-1`;
    const p = page();
    p.state.agreementChecked.value = true;
    p.state.handleScan();
    expect(reLaunch).not.toHaveBeenCalled();
    expect(p.selectVersion).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalled();
  });

  it("rejects an unsupported future version before relaunching", () => {
    scanned = `${oldQr}&v=2`;
    const p = page();
    p.state.agreementChecked.value = true;
    p.state.handleScan();
    expect(reLaunch).not.toHaveBeenCalled();
    expect(p.selectVersion).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining("版本") }),
    );
  });

  it("does not log in when a linked QR version is invalid", async () => {
    const p = page();
    await p.fire("onLoad", { q: encodeURIComponent(`${oldQr}&v=-1`) });
    expect(p.login).not.toHaveBeenCalled();
    expect(p.selectVersion).not.toHaveBeenCalled();
    expect(p.state.token.value).toBeNull();
    expect(p.state.loadingState.value).toBe(false);
    expect(toast).toHaveBeenCalled();
  });
});
