import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { login } from "../login";
import { wxLogin, type IDType } from "../checkin";
import config from "@/config";

const STORAGE_KEY = `AR_CHECKIN_OPENID:${encodeURIComponent(config.apiUrl)}`;
const session = (): IDType => ({
  token: {
    accessToken: "new-access-token",
    refreshToken: "new-refresh-token",
    expires: "2099/01/01 12:00:00",
  },
  user: null,
  openid: "test-openid",
  unionid: "test-unionid",
});

describe("WeChat login", () => {
  beforeEach(() => {
    uni.removeStorageSync(STORAGE_KEY);
    vi.spyOn(wx, "login").mockImplementation((options) => {
      const result = { code: "fresh-wechat-code", errMsg: "login:ok" };
      options?.success?.(result);
      return Promise.resolve(result);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function respond(statusCode: number, data: unknown) {
    return vi.spyOn(wx, "request").mockImplementation((options) => {
      options.success?.({ statusCode, data } as WechatMiniprogram.RequestSuccessCallbackResult);
      return {} as WechatMiniprogram.RequestTask;
    });
  }

  it("uses a valid cached session without another WeChat login", async () => {
    const cached = session();
    uni.setStorageSync(STORAGE_KEY, cached);
    await expect(login()).resolves.toEqual(cached);
    expect(wx.login).not.toHaveBeenCalled();
  });

  it.each([400, 401, 403, 500])("rejects HTTP %s without saving credentials", async (status) => {
    respond(status, { success: true, data: session(), message: "failed" });
    await expect(login(true)).rejects.toThrow();
    expect(uni.getStorageSync(STORAGE_KEY)).toBeFalsy();
  });

  it("rejects a business failure without saving its data", async () => {
    respond(200, { success: false, data: session(), message: "登录失败" });
    await expect(login(true)).rejects.toThrow();
    expect(uni.getStorageSync(STORAGE_KEY)).toBeFalsy();
  });

  it.each([
    null,
    {},
    { ...session(), token: {} },
    { ...session(), token: { ...session().token, accessToken: "" } },
    { ...session(), token: { ...session().token, accessToken: "bad\r\nheader" } },
    { ...session(), token: { ...session().token, expires: "not-a-date" } },
    { ...session(), token: { ...session().token, expires: "2000/01/01 12:00:00" } },
  ])("rejects malformed login credentials: %j", async (data) => {
    respond(200, { success: true, data });
    await expect(wxLogin()).rejects.toThrow();
    expect(uni.getStorageSync(STORAGE_KEY)).toBeFalsy();
  });

  it("replaces a cached session whose expiry cannot be parsed", async () => {
    uni.setStorageSync(STORAGE_KEY, {
      ...session(),
      token: { ...session().token, expires: "not-a-date" },
    });
    const fresh = session();
    respond(200, { success: true, data: fresh, message: "success" });
    await expect(login()).resolves.toEqual(fresh);
    expect(wx.login).toHaveBeenCalledTimes(1);
    expect(uni.getStorageSync(STORAGE_KEY)).toEqual(fresh);
  });

  it("accepts a legitimate new user without a unionid or profile", async () => {
    const fresh = { ...session(), unionid: null, user: null };
    respond(200, { success: true, data: fresh, message: "success" });
    await expect(login(true)).resolves.toEqual(fresh);
    expect(uni.getStorageSync(STORAGE_KEY)).toEqual(fresh);
  });

  it("shares an in-flight WeChat login between concurrent callers", async () => {
    let finish: (() => void) | undefined;
    vi.spyOn(wx, "request").mockImplementation((options) => {
      finish = () =>
        options.success?.({
          statusCode: 200,
          data: { success: true, data: session(), message: "success" },
        } as unknown as WechatMiniprogram.RequestSuccessCallbackResult);
      return {} as WechatMiniprogram.RequestTask;
    });
    const first = login(true);
    const second = login(true);
    expect(wx.login).toHaveBeenCalledTimes(1);
    finish?.();
    await expect(Promise.all([first, second])).resolves.toEqual([session(), session()]);
  });

  it("clears invalidated credentials when forced login fails", async () => {
    uni.setStorageSync(STORAGE_KEY, session());
    respond(401, { success: false, message: "invalid login" });
    await expect(login(true)).rejects.toThrow();
    expect(uni.getStorageSync(STORAGE_KEY)).toBeFalsy();
  });

  it("rejects an empty WeChat code before calling the API", async () => {
    vi.mocked(wx.login).mockImplementation((options) => {
      const result = { code: "", errMsg: "login:ok" };
      options?.success?.(result);
      return Promise.resolve(result);
    });
    const api = respond(200, { success: true, data: session() });
    await expect(wxLogin()).rejects.toThrow("微信登录失败");
    expect(api).not.toHaveBeenCalled();
  });
});
