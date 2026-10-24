import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  instances: [] as any[],
  apiUrl: "https://x.4mr.cn/v2",
}));

vi.mock("@/config", () => ({
  default: {
    get apiUrl() {
      return sdk.apiUrl;
    },
  },
}));

vi.mock("cos-js-sdk-v5", () => ({
  default: class MockCOS {
    static getAuthorization(options: { SecretId: string }) {
      return `q-ak=${options.SecretId}`;
    }
    options: any;
    constructor(options: any) {
      this.options = options;
      sdk.instances.push(this);
    }
    getObjectUrl(_options: any, callback: any) {
      this.options.getAuthorization({}, (authorization: any) => {
        if (!authorization.TmpSecretId) callback(new Error("COS authorization failed"));
        else callback(null, { Url: `https://cos.example/${authorization.TmpSecretId}` });
      });
    }
    postObject(options: any, callback: any) {
      expect(options.FilePath).toBe("wxfile://image.jpg");
      options.onProgress({ percent: 0.5 });
      callback(null, {});
    }
  },
}));

vi.mock("cos-wx-sdk-v5/index.js", async () => ({
  default: (await import("cos-js-sdk-v5")).default,
}));
vi.mock("cos-js-sdk-v5/index.js", async () => ({
  default: (await import("cos-js-sdk-v5")).default,
}));

import {
  clearCache,
  getCloudStorageInfoAPI,
  getCosInstance,
  getObjectUrl,
  uploadFile,
} from "../cloud";

const request = vi.fn();
const originalRequest = uni.request;
const NOW = 1_800_000_000_000;
const LEGACY_API = "https://x.4mr.cn/v2";
const V1_API = "https://c.4mr.cn/api/v2";
const credentials = (id = "first", expires = NOW / 1000 + 3600) => ({
  bucket: "test-123456",
  region: "ap-shanghai",
  token: `token-${id}`,
  tmpSecretId: id,
  tmpSecretKey: `secret-${id}`,
  startTime: NOW / 1000 - 60,
  expiredTime: expires,
  expiration: "",
  requestId: id,
});
const response = (data = credentials()) => ({ statusCode: 200, data: { success: true, data } });

describe("cloud credentials", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    clearCache();
    sdk.apiUrl = LEGACY_API;
    sdk.instances.length = 0;
    vi.spyOn(console, "error").mockImplementation(() => {});
    request.mockReset().mockResolvedValue(response());
    uni.request = request as typeof uni.request;
  });

  afterEach(() => {
    uni.request = originalRequest;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shares one in-flight STS request across concurrent callers", async () => {
    let resolveRequest!: (value: any) => void;
    request.mockReturnValue(new Promise((resolve) => (resolveRequest = resolve)) as any);
    const requests = [getCloudStorageInfoAPI(), getCloudStorageInfoAPI(), getCloudStorageInfoAPI()];
    expect(uni.request).toHaveBeenCalledTimes(1);
    resolveRequest(response());
    const results = await Promise.all(requests);
    expect(results[0]).toBe(results[1]);
  });

  it("refreshes within 60 seconds of STS expiry even before five minutes", async () => {
    request
      .mockResolvedValueOnce(response(credentials("first", NOW / 1000 + 120)) as any)
      .mockResolvedValueOnce(response(credentials("second")) as any);
    await getCloudStorageInfoAPI();
    vi.setSystemTime(NOW + 60_000);
    expect((await getCloudStorageInfoAPI()).tmpSecretId).toBe("second");
    expect(uni.request).toHaveBeenCalledTimes(2);
  });

  it("uses refreshed STS in the existing singleton authorization callback", async () => {
    request
      .mockResolvedValueOnce(response(credentials("first")) as any)
      .mockResolvedValueOnce(response(credentials("second")) as any);
    const cos = await getCosInstance();
    vi.setSystemTime(NOW + 301_000);
    expect(await getObjectUrl("video.mp4")).toBe("https://cos.example/second");
    expect(await getCosInstance()).toBe(cos);
    expect(sdk.instances).toHaveLength(1);
  });

  it("creates only one COS instance for concurrent callers", async () => {
    const instances = await Promise.all([getCosInstance(), getCosInstance(), getCosInstance()]);
    expect(new Set(instances).size).toBe(1);
    expect(sdk.instances).toHaveLength(1);
    expect(uni.request).toHaveBeenCalledTimes(1);
  });

  it("rejects all callers on refresh failure and allows a later retry", async () => {
    const failure = new Error("STS unavailable");
    request.mockRejectedValueOnce(failure).mockResolvedValue(response() as any);
    const results = await Promise.allSettled([getCloudStorageInfoAPI(), getCloudStorageInfoAPI()]);
    expect(results).toEqual([
      { status: "rejected", reason: failure },
      { status: "rejected", reason: failure },
    ]);
    expect(await getCloudStorageInfoAPI()).toEqual(credentials());
    expect(uni.request).toHaveBeenCalledTimes(2);
  });

  it("allows retry after the transport throws before returning a promise", async () => {
    request.mockImplementationOnce(() => {
      throw new Error("request setup failed");
    });
    await expect(getCloudStorageInfoAPI()).rejects.toThrow("request setup failed");
    expect(await getCloudStorageInfoAPI()).toEqual(credentials());
  });

  it("rejects URL signing when refresh fails instead of signing with stale STS", async () => {
    await getCosInstance();
    vi.setSystemTime(NOW + 301_000);
    request.mockRejectedValue(new Error("STS unavailable"));
    await expect(getObjectUrl("video.mp4")).rejects.toThrow("STS unavailable");
  });

  it("does not cache an expired STS response", async () => {
    request
      .mockResolvedValueOnce(response(credentials("expired", NOW / 1000 - 1)) as any)
      .mockResolvedValueOnce(response() as any);
    await expect(getCloudStorageInfoAPI()).rejects.toThrow();
    expect(await getCloudStorageInfoAPI()).toEqual(credentials());
  });

  it("refreshes STS when the singleton itself requests authorization later", async () => {
    await getCosInstance();
    vi.setSystemTime(NOW + 301_000);
    request.mockResolvedValue(response(credentials("second")) as any);
    const authorization = await new Promise<any>((resolve) => {
      sdk.instances[0].options.getAuthorization({}, resolve);
    });
    expect(authorization.TmpSecretId).toBe("second");
  });

  it("settles the SDK authorization callback when refreshing fails", async () => {
    await getCosInstance();
    vi.setSystemTime(NOW + 301_000);
    request.mockRejectedValue(new Error("STS unavailable"));
    const authorization = await new Promise<any>((resolve) => {
      sdk.instances[0].options.getAuthorization({}, resolve);
    });
    expect(authorization.TmpSecretId).toBeUndefined();
  });

  it("uploads the WeChat selected file path and reports progress", async () => {
    const onProgress = vi.fn();
    expect(await uploadFile({ path: "wxfile://image.jpg", size: 1 }, "image.jpg", onProgress)).toBe(
      "https://cos.example/first",
    );
    expect(onProgress).toHaveBeenCalledWith(50);
  });

  it("keeps STS and COS singletons separate for each API", async () => {
    request.mockImplementation(({ url }: { url: string }) =>
      Promise.resolve(
        response({
          ...credentials(url.startsWith(LEGACY_API) ? "legacy" : "v1"),
          bucket: url.startsWith(LEGACY_API) ? "legacy-123456" : "v1-123456",
        }),
      ),
    );
    const legacy = await getCloudStorageInfoAPI(LEGACY_API);
    const v1 = await getCloudStorageInfoAPI(V1_API);
    expect(legacy.tmpSecretId).toBe("legacy");
    expect(v1.tmpSecretId).toBe("v1");
    expect(legacy.bucket).not.toBe(v1.bucket);
    const legacyCos = await getCosInstance(LEGACY_API);
    expect(await getCosInstance(LEGACY_API)).toBe(legacyCos);
    expect(await getCosInstance(V1_API)).not.toBe(legacyCos);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("deduplicates within an API while keeping switched in-flight operations separate", async () => {
    const finish = new Map<string, (value: unknown) => void>();
    request.mockImplementation(
      ({ url }: { url: string }) => new Promise((resolve) => finish.set(url, resolve)),
    );
    const legacyUrl = getObjectUrl("old.mp4");
    sdk.apiUrl = V1_API;
    const v1Url = getObjectUrl("new.mp4");
    expect(request).toHaveBeenCalledTimes(2);
    finish.get(`${V1_API}/tencent-cloud/store`)!(response(credentials("v1")));
    expect(await v1Url).toBe("https://cos.example/v1");
    finish.get(`${LEGACY_API}/tencent-cloud/store`)!(response(credentials("legacy")));
    expect(await legacyUrl).toBe("https://cos.example/legacy");
    expect(await getObjectUrl("new-again.mp4")).toBe("https://cos.example/v1");
  });

  it("gets the uploaded file URL from the API captured when upload started", async () => {
    request.mockImplementation(({ url }: { url: string }) =>
      Promise.resolve(response(credentials(url.startsWith(LEGACY_API) ? "legacy" : "v1"))),
    );
    const cos = await getCosInstance();
    let completeUpload!: (error: null) => void;
    let uploadStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      uploadStarted = resolve;
    });
    vi.spyOn(cos as any, "postObject").mockImplementation((...args: unknown[]) => {
      completeUpload = args[1] as typeof completeUpload;
      uploadStarted();
    });
    const upload = uploadFile({ path: "wxfile://image.jpg", size: 1 }, "old.jpg");
    await started;
    sdk.apiUrl = V1_API;
    expect(await getObjectUrl("new.jpg")).toBe("https://cos.example/v1");
    completeUpload(null);
    expect(await upload).toBe("https://cos.example/legacy");
  });

  it("does not repopulate a cleared API cache from an older in-flight request", async () => {
    let finishOld!: (value: unknown) => void;
    request.mockReturnValueOnce(
      new Promise((resolve) => {
        finishOld = resolve;
      }),
    );
    const old = getCloudStorageInfoAPI(LEGACY_API);
    clearCache();
    sdk.apiUrl = V1_API;
    request.mockResolvedValue(response(credentials("v1")));
    expect((await getCloudStorageInfoAPI()).tmpSecretId).toBe("v1");
    const oldRejected = expect(old).rejects.toThrow("缓存已清除");
    finishOld(response(credentials("legacy")));
    await oldRejected;
    request.mockResolvedValue(response(credentials("legacy-new")));
    expect((await getCloudStorageInfoAPI(LEGACY_API)).tmpSecretId).toBe("legacy-new");
    expect((await getCloudStorageInfoAPI(V1_API)).tmpSecretId).toBe("v1");
  });
});
