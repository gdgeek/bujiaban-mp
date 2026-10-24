import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const selectionKey = "AR_DEVICE_QR_VERSION";
let storage: Map<string, unknown>;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_API_URL", "");
  storage = new Map();
  uni.getStorageSync = vi.fn((key: string) => storage.get(key)) as typeof uni.getStorageSync;
  uni.setStorageSync = vi.fn((key: string, value: unknown) => {
    storage.set(key, value);
  });
});

afterEach(() => vi.unstubAllEnvs());

describe("device QR backend selection", () => {
  it("identifies the captured legacy API without treating other hosts or paths as v0", async () => {
    const backend = await import("../backend");
    expect(backend.isLegacyApiUrl("https://x.4mr.cn/v2")).toBe(true);
    expect(backend.isLegacyApiUrl("https://x.4mr.cn/v2/")).toBe(true);
    expect(backend.isLegacyApiUrl("https://c.4mr.cn/api/v2")).toBe(false);
    expect(backend.isLegacyApiUrl("https://x.4mr.cn/v2/other")).toBe(false);
    expect(backend.isLegacyApiUrl("https://x.4mr.cn.invalid/v2")).toBe(false);
    backend.selectDeviceApiVersion(1);
    expect(backend.isLegacyApiUrl("https://x.4mr.cn/v2")).toBe(true);
  });

  it("uses the current backend before a device has been scanned", async () => {
    const backend = await import("../backend");
    expect(backend.getActiveApiUrl()).toBe("https://c.4mr.cn/api/v2");
  });

  it("routes legacy and new QR versions to their own fixed backends", async () => {
    const backend = await import("../backend");
    backend.selectDeviceApiVersion(0);
    expect(backend.getActiveApiUrl()).toBe("https://x.4mr.cn/v2");
    backend.selectDeviceApiVersion(1);
    expect(backend.getActiveApiUrl()).toBe("https://c.4mr.cn/api/v2");
  });

  it("persists the last scanned backend across an app restart", async () => {
    const backend = await import("../backend");
    backend.selectDeviceApiVersion(0);
    expect(storage.get(selectionKey)).toBe(0);
    vi.resetModules();
    expect((await import("../backend")).getActiveApiUrl()).toBe("https://x.4mr.cn/v2");
  });

  it("does not switch or persist an unsupported version", async () => {
    const backend = await import("../backend");
    backend.selectDeviceApiVersion(0);
    for (const value of [-1, 0.5, 2, NaN, Infinity]) {
      expect(() => backend.selectDeviceApiVersion(value)).toThrow("版本");
      expect(backend.getActiveApiUrl()).toBe("https://x.4mr.cn/v2");
      expect(storage.get(selectionKey)).toBe(0);
    }
  });

  it("ignores a corrupt persisted version", async () => {
    storage.set(selectionKey, "https://untrusted.invalid/v2");
    expect((await import("../backend")).getActiveApiUrl()).toBe("https://c.4mr.cn/api/v2");
  });

  it("keeps the configured current API available while legacy still uses its fixed URL", async () => {
    vi.stubEnv("VITE_API_URL", "https://test.example/api/v2");
    const backend = await import("../backend");
    expect(backend.getApiUrlForVersion(1)).toBe("https://test.example/api/v2");
    expect(backend.getApiUrlForVersion(0)).toBe("https://x.4mr.cn/v2");
  });

  it("updates config.apiUrl when the QR backend changes", async () => {
    const backend = await import("../backend");
    const { default: config } = await import("../index");
    backend.selectDeviceApiVersion(0);
    expect(config.apiUrl).toBe("https://x.4mr.cn/v2");
    backend.selectDeviceApiVersion(1);
    expect(config.apiUrl).toBe("https://c.4mr.cn/api/v2");
  });
});
