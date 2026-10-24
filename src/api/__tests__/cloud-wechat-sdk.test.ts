import { afterEach, expect, it, vi } from "vitest";

const activeApi = vi.hoisted(() => ({ apiUrl: "https://x.4mr.cn/v2" }));
vi.mock("@/config", () => ({
  default: {
    get apiUrl() {
      return activeApi.apiUrl;
    },
  },
}));

vi.mock("cos-js-sdk-v5/index.js", () => ({
  default: class BrowserCOS {
    constructor() {
      throw new Error("微信环境不应实例化浏览器 COS SDK");
    }
  },
}));

afterEach(() => {
  activeApi.apiUrl = "https://x.4mr.cn/v2";
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("signs with the real WeChat SDK without browser DOM globals", async () => {
  const now = Math.floor(Date.now() / 1000);
  vi.stubGlobal("wx", {
    canIUse: () => false,
    getFileSystemManager: () => ({}),
    getSystemInfoSync: () => ({}),
    getStorageSync: () => "",
    setStorageSync: () => {},
  });
  vi.stubGlobal("uni", {
    ...uni,
    request: () =>
      Promise.resolve({
        statusCode: 200,
        data: {
          success: true,
          data: {
            bucket: "test-123456",
            region: "ap-shanghai",
            tmpSecretId: "test-id",
            tmpSecretKey: "test-secret",
            token: "test-token",
            startTime: now - 60,
            expiredTime: now + 3600,
          },
        },
      }),
  });
  const { getObjectUrl, clearCache } = await import("../cloud");
  clearCache();
  const url = new URL(await getObjectUrl("test.mp4"));
  expect(url.protocol).toBe("https:");
  expect(url.hostname).toBe("test-123456.cos.ap-shanghai.myqcloud.com");
  expect(url.searchParams.get("q-ak")).toBe("test-id");
  expect(url.searchParams.get("x-cos-security-token")).toBe("test-token");
});

it("uses refreshed STS after five minutes even when the real SDK cached older credentials", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const now = Math.floor(Date.now() / 1000);
  const response = (id: string) => ({
    statusCode: 200,
    data: {
      success: true,
      data: {
        bucket: "test-123456",
        region: "ap-shanghai",
        tmpSecretId: id,
        tmpSecretKey: `secret-${id}`,
        token: `token-${id}`,
        startTime: now - 60,
        expiredTime: now + 3600,
      },
    },
  });
  const request = vi
    .fn()
    .mockResolvedValueOnce(response("first"))
    .mockResolvedValue(response("second"));
  vi.stubGlobal("wx", {
    canIUse: () => false,
    getFileSystemManager: () => ({}),
    getSystemInfoSync: () => ({}),
    getStorageSync: () => "",
    setStorageSync: () => {},
  });
  vi.stubGlobal("uni", { ...uni, request });
  const { getObjectUrl, clearCache } = await import("../cloud");
  clearCache();
  expect(new URL(await getObjectUrl("test.mp4")).searchParams.get("q-ak")).toBe("first");
  vi.setSystemTime(Date.now() + 301_000);
  const refreshed = new URL(await getObjectUrl("test.mp4"));
  expect(request).toHaveBeenCalledTimes(2);
  expect(refreshed.searchParams.get("q-ak")).toBe("second");
  expect(refreshed.searchParams.get("x-cos-security-token")).toBe("token-second");
});

it("keeps the original SDK bound to its API when the active backend changes", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const now = Math.floor(Date.now() / 1000);
  const calls = { legacy: 0, v1: 0 };
  const request = vi.fn(({ url }: { url: string }) => {
    const api = url.startsWith("https://x.4mr.cn/v2/") ? "legacy" : "v1";
    const id = `${api}-${++calls[api]}`;
    return Promise.resolve({
      statusCode: 200,
      data: {
        success: true,
        data: {
          bucket: `${api}-123456`,
          region: "ap-shanghai",
          tmpSecretId: id,
          tmpSecretKey: `secret-${id}`,
          token: `token-${id}`,
          startTime: now - 60,
          expiredTime: now + 3600,
        },
      },
    });
  });
  vi.stubGlobal("wx", {
    canIUse: () => false,
    getFileSystemManager: () => ({}),
    getSystemInfoSync: () => ({}),
    getStorageSync: () => "",
    setStorageSync: () => {},
  });
  vi.stubGlobal("uni", { ...uni, request });
  const { getObjectUrl, getCosInstance, clearCache } = await import("../cloud");
  clearCache();
  const legacyCos = await getCosInstance();
  const legacyUrl = new URL(await getObjectUrl("old.mp4"));
  expect(legacyUrl.hostname).toBe("legacy-123456.cos.ap-shanghai.myqcloud.com");
  activeApi.apiUrl = "https://c.4mr.cn/api/v2";
  const v1Url = new URL(await getObjectUrl("new.mp4"));
  expect(v1Url.hostname).toBe("v1-123456.cos.ap-shanghai.myqcloud.com");
  expect(v1Url.searchParams.get("q-ak")).toBe("v1-1");
  vi.setSystemTime(Date.now() + 301_000);
  const oldUrl = await new Promise<string>((resolve, reject) =>
    legacyCos.getObjectUrl(
      { Bucket: "legacy-123456", Region: "ap-shanghai", Key: "old-again.mp4", Sign: true },
      (error, data) => (error ? reject(error) : resolve(data.Url)),
    ),
  );
  expect(new URL(oldUrl).searchParams.get("q-ak")).toBe("legacy-2");
  expect(request.mock.calls.at(-1)?.[0].url).toBe("https://x.4mr.cn/v2/tencent-cloud/store");
});
