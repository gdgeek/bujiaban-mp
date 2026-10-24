import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import config from "@/config";
import { login } from "@/api/login";
import { wxLogin, type IDType } from "@/api/checkin";
import { buildAuthHeader, clearId, getToken, loadId, saveId } from "../common";
import { request } from "../request";

const OLD_API = "https://x.4mr.cn/v2";
const NEW_API = "https://c.4mr.cn/api/v2";
const LEGACY_KEY = "AR_CHECKIN_OPENID";
const keyFor = (api: string) => `${LEGACY_KEY}:${encodeURIComponent(api)}`;
const session = (accessToken: string): IDType => ({
  token: { accessToken, refreshToken: "refresh-token", expires: "2099/01/01 12:00:00" },
  openid: "openid",
  unionid: "unionid",
  user: null,
});
const originalApiDescriptor = Object.getOwnPropertyDescriptor(config, "apiUrl")!;
let activeApi: string;

function respond(options: WechatMiniprogram.RequestOption, statusCode: number, data: unknown = {}) {
  options.success?.({ statusCode, data } as WechatMiniprogram.RequestSuccessCallbackResult);
}

beforeEach(() => {
  activeApi = NEW_API;
  Object.defineProperty(config, "apiUrl", { configurable: true, get: () => activeApi });
  for (const key of [LEGACY_KEY, keyFor(OLD_API), keyFor(NEW_API)]) uni.removeStorageSync(key);
  let nextCode = 0;
  vi.spyOn(wx, "login").mockImplementation((options) => {
    const data = { code: `wechat-code-${++nextCode}`, errMsg: "login:ok" };
    options?.success?.(data);
    return Promise.resolve(data);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(config, "apiUrl", originalApiDescriptor);
});

describe("credentials partitioned by API", () => {
  it("keeps independent credentials and clears only the selected API", () => {
    saveId(session("new-token"), NEW_API);
    saveId(session("old-token"), OLD_API);
    expect(getToken(NEW_API)).toBe("new-token");
    expect(getToken(OLD_API)).toBe("old-token");
    expect(buildAuthHeader(OLD_API)).toEqual({ Authorization: "Bearer old-token" });
    clearId(OLD_API);
    expect(loadId(OLD_API)).toBeNull();
    expect(getToken(NEW_API)).toBe("new-token");
  });

  it("uses the active API only as the default credential scope", () => {
    saveId(session("new-token"));
    activeApi = OLD_API;
    expect(loadId()).toBeNull();
    saveId(session("old-token"));
    activeApi = NEW_API;
    expect(getToken()).toBe("new-token");
    expect(getToken(OLD_API)).toBe("old-token");
  });

  it("discards unscoped credentials rather than assigning them to the v0 backend", () => {
    uni.setStorageSync(LEGACY_KEY, session("unknown-origin-token"));
    expect(loadId(OLD_API)).toBeNull();
    clearId(OLD_API);
    expect(uni.getStorageSync(LEGACY_KEY)).toBeFalsy();
    expect(uni.getStorageSync(keyFor(OLD_API))).toBeFalsy();
  });

  it("discards unscoped credentials and obtains a fresh checkin login", async () => {
    uni.setStorageSync(LEGACY_KEY, session("unknown-origin-token"));
    expect(loadId(NEW_API)).toBeNull();
    expect(uni.getStorageSync(keyFor(NEW_API))).toBeFalsy();
    expect(uni.getStorageSync(LEGACY_KEY)).toBeFalsy();
    const api = vi.spyOn(wx, "request").mockImplementation((options) => {
      respond(options, 200, { success: true, data: session("fresh-checkin-token") });
      return {} as WechatMiniprogram.RequestTask;
    });
    await expect(login(false, NEW_API)).resolves.toEqual(session("fresh-checkin-token"));
    expect(wx.login).toHaveBeenCalledTimes(1);
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ url: `${NEW_API}/site/login` }));
    expect(loadId(NEW_API)).toEqual(session("fresh-checkin-token"));
  });

  it("normalizes a trailing slash without merging different API paths", () => {
    saveId(session("old-token"), `${OLD_API}/`);
    expect(getToken(OLD_API)).toBe("old-token");
    expect(getToken(`${OLD_API}/other`)).toBeNull();
    expect(getToken(NEW_API)).toBeNull();
  });

  it("does not attribute unscoped credentials to a custom deployment", () => {
    const customApi = "https://development.example/v2";
    uni.setStorageSync(LEGACY_KEY, session("unknown-origin-token"));
    activeApi = customApi;
    expect(loadId()).toBeNull();
    expect(uni.getStorageSync(keyFor(customApi))).toBeFalsy();
    expect(uni.getStorageSync(LEGACY_KEY)).toBeFalsy();
  });

  it("keeps both scoped sessions when an unscoped session is also present", () => {
    uni.setStorageSync(keyFor(OLD_API), session("old-token"));
    uni.setStorageSync(keyFor(NEW_API), session("new-token"));
    uni.setStorageSync(LEGACY_KEY, session("unknown-origin-token"));
    expect(loadId(OLD_API)).toEqual(session("old-token"));
    expect(loadId(NEW_API)).toEqual(session("new-token"));
    expect(uni.getStorageSync(keyFor(OLD_API))).toEqual(session("old-token"));
    expect(uni.getStorageSync(keyFor(NEW_API))).toEqual(session("new-token"));
  });

  it("never restores legacy credentials after clearing an invalid scoped session", () => {
    uni.setStorageSync(LEGACY_KEY, session("legacy-checkin-token"));
    uni.setStorageSync(keyFor(NEW_API), { openid: "corrupt-session" });
    expect(loadId(NEW_API)).toBeNull();
    expect(loadId(NEW_API)).toBeNull();
    expect(uni.getStorageSync(LEGACY_KEY)).toBeFalsy();
  });
});

describe("login partitioned by API", () => {
  it("captures wxLogin's API before WeChat returns its code", async () => {
    let finishWechat!: () => void;
    vi.mocked(wx.login).mockImplementation((options) => {
      const data = { code: "delayed-code", errMsg: "login:ok" };
      finishWechat = () => options?.success?.(data);
      return Promise.resolve(data);
    });
    const api = vi.spyOn(wx, "request").mockImplementation((options) => {
      respond(options, 200, { success: true, data: session("old-token") });
      return {} as WechatMiniprogram.RequestTask;
    });
    const result = wxLogin(OLD_API);
    activeApi = NEW_API;
    finishWechat();
    await expect(result).resolves.toMatchObject({ data: session("old-token") });
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ url: `${OLD_API}/site/login` }));
  });

  it("single-flights each API independently and stores results in their original scopes", async () => {
    const pending: WechatMiniprogram.RequestOption[] = [];
    vi.spyOn(wx, "request").mockImplementation((options) => {
      pending.push(options);
      return {} as WechatMiniprogram.RequestTask;
    });
    const oldFirst = login(true, OLD_API);
    const oldSecond = login(true, OLD_API);
    const newFirst = login(true, NEW_API);
    const newSecond = login(true, NEW_API);
    const results = Promise.all([oldFirst, oldSecond, newFirst, newSecond]);
    void results.catch(() => {});
    activeApi = OLD_API;
    for (const call of pending) {
      const token = call.url.startsWith(OLD_API) ? "old-token" : "new-token";
      respond(call, 200, { success: true, data: session(token) });
    }
    await expect(results).resolves.toEqual([
      session("old-token"),
      session("old-token"),
      session("new-token"),
      session("new-token"),
    ]);
    expect(wx.login).toHaveBeenCalledTimes(2);
    expect(pending.map((call) => call.url)).toEqual([
      `${OLD_API}/site/login`,
      `${NEW_API}/site/login`,
    ]);
    expect(getToken(OLD_API)).toBe("old-token");
    expect(getToken(NEW_API)).toBe("new-token");
  });
});

describe("request scopes during backend switching", () => {
  it("recovers an old request with its old API even after the active API changes", async () => {
    saveId(session("old-token"), OLD_API);
    saveId(session("new-token"), NEW_API);
    activeApi = OLD_API;
    let original!: WechatMiniprogram.RequestOption;
    const calls: WechatMiniprogram.RequestOption[] = [];
    vi.spyOn(wx, "request").mockImplementation((options) => {
      calls.push(options);
      if (options.url === `${OLD_API}/site/login`) {
        respond(options, 200, { success: true, data: session("fresh-old-token") });
      } else if (
        options.url.startsWith(OLD_API) &&
        options.header?.Authorization === "Bearer old-token"
      ) {
        original = options;
      } else respond(options, 200, { url: options.url, bearer: options.header?.Authorization });
      return {} as WechatMiniprogram.RequestTask;
    });
    const oldRequest = request({ url: "/old-operation" });
    activeApi = NEW_API;
    await expect(request({ url: "/new-operation" })).resolves.toEqual({
      url: `${NEW_API}/new-operation`,
      bearer: "Bearer new-token",
    });
    respond(original, 401);
    await expect(oldRequest).resolves.toEqual({
      url: `${OLD_API}/old-operation`,
      bearer: "Bearer fresh-old-token",
    });
    expect(
      calls.filter(
        (call) => call.url.startsWith(OLD_API) && call.header?.Authorization === "Bearer new-token",
      ),
    ).toHaveLength(0);
    expect(getToken(NEW_API)).toBe("new-token");
    expect(getToken(OLD_API)).toBe("fresh-old-token");
  });

  it("shares 401 recovery within each API and refreshes the two APIs independently", async () => {
    saveId(session("old-token"), OLD_API);
    saveId(session("new-token"), NEW_API);
    const logins: WechatMiniprogram.RequestOption[] = [];
    vi.spyOn(wx, "request").mockImplementation((options) => {
      if (options.url.endsWith("/site/login")) logins.push(options);
      else if (options.header?.Authorization?.startsWith("Bearer fresh-"))
        respond(options, 200, options.url);
      else respond(options, 401);
      return {} as WechatMiniprogram.RequestTask;
    });
    const results = Promise.all([
      request({ url: "/old-a", baseUrl: OLD_API }),
      request({ url: "/old-b", baseUrl: OLD_API }),
      request({ url: "/new-a", baseUrl: NEW_API }),
      request({ url: "/new-b", baseUrl: NEW_API }),
    ]);
    void results.catch(() => {});
    for (const call of logins) {
      respond(call, 200, {
        success: true,
        data: session(call.url.startsWith(OLD_API) ? "fresh-old-token" : "fresh-new-token"),
      });
    }
    await expect(results).resolves.toEqual([
      `${OLD_API}/old-a`,
      `${OLD_API}/old-b`,
      `${NEW_API}/new-a`,
      `${NEW_API}/new-b`,
    ]);
    expect(logins.map((call) => call.url).sort()).toEqual(
      [`${OLD_API}/site/login`, `${NEW_API}/site/login`].sort(),
    );
    expect(wx.login).toHaveBeenCalledTimes(2);
  });

  it("does not clear new API credentials when an old API recovery fails", async () => {
    saveId(session("old-token"), OLD_API);
    saveId(session("new-token"), NEW_API);
    activeApi = OLD_API;
    let original!: WechatMiniprogram.RequestOption;
    vi.spyOn(wx, "request").mockImplementation((options) => {
      if (options.url.endsWith("/site/login")) respond(options, 500);
      else original = options;
      return {} as WechatMiniprogram.RequestTask;
    });
    const result = request({ url: "/old-operation" });
    activeApi = NEW_API;
    respond(original, 401);
    await expect(result).rejects.toThrow("重新登录失败");
    expect(getToken(OLD_API)).toBeNull();
    expect(getToken(NEW_API)).toBe("new-token");
  });
});
