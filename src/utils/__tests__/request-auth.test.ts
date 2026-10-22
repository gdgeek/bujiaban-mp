import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { request } from "../request";
import config from "@/config";
import type { IDType } from "@/api/checkin";

const STORAGE_KEY = `AR_CHECKIN_OPENID:${encodeURIComponent(config.apiUrl)}`;
const session = (accessToken = "old-domain-token"): IDType => ({
  token: { accessToken, refreshToken: "refresh-token", expires: "2099/01/01 12:00:00" },
  openid: "test-openid",
  unionid: "test-unionid",
  user: null,
});

function respond(options: WechatMiniprogram.RequestOption, statusCode: number, data: unknown = {}) {
  options.success?.({ statusCode, data } as WechatMiniprogram.RequestSuccessCallbackResult);
}

const isLogin = (options: WechatMiniprogram.RequestOption) => options.url.endsWith("/site/login");

describe("local API authentication recovery", () => {
  beforeEach(() => {
    uni.setStorageSync(STORAGE_KEY, session());
    vi.spyOn(wx, "login").mockImplementation((options) => {
      const result = { code: "fresh-code", errMsg: "login:ok" };
      options?.success?.(result);
      return Promise.resolve(result);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("relogs in and replays an invalid legacy token once with the original payload", async () => {
    const calls: WechatMiniprogram.RequestOption[] = [];
    vi.spyOn(wx, "request").mockImplementation((options) => {
      calls.push(options);
      if (isLogin(options))
        respond(options, 200, { success: true, data: session("new-domain-token") });
      else if (options.header?.Authorization === "Bearer old-domain-token") respond(options, 401);
      else respond(options, 200, { success: true });
      return {} as WechatMiniprogram.RequestTask;
    });
    await expect(
      request({ url: "/devices/12", method: "PUT", data: { title: "device" } }),
    ).resolves.toEqual({ success: true });
    expect(wx.login).toHaveBeenCalledTimes(1);
    expect(calls.filter((call) => !isLogin(call))).toEqual([
      expect.objectContaining({
        method: "PUT",
        data: { title: "device" },
        header: expect.objectContaining({ Authorization: "Bearer old-domain-token" }),
      }),
      expect.objectContaining({
        method: "PUT",
        data: { title: "device" },
        header: expect.objectContaining({ Authorization: "Bearer new-domain-token" }),
      }),
    ]);
  });

  it("shares a single refresh for concurrent 401 responses", async () => {
    let finishLogin: (() => void) | undefined;
    vi.spyOn(wx, "request").mockImplementation((options) => {
      if (isLogin(options)) {
        finishLogin = () =>
          respond(options, 200, { success: true, data: session("new-domain-token") });
      } else if (options.header?.Authorization === "Bearer old-domain-token") respond(options, 401);
      else respond(options, 200, options.url);
      return {} as WechatMiniprogram.RequestTask;
    });
    const results = Promise.all([request({ url: "/first" }), request({ url: "/second" })]);
    void results.catch(() => {});
    await vi.waitFor(() => expect(wx.login).toHaveBeenCalledTimes(1));
    finishLogin?.();
    await expect(results).resolves.toEqual([`${config.apiUrl}/first`, `${config.apiUrl}/second`]);
    expect(wx.login).toHaveBeenCalledTimes(1);
  });

  it("reuses fresh credentials when an earlier request returns a late 401", async () => {
    let late: WechatMiniprogram.RequestOption | undefined;
    vi.spyOn(wx, "request").mockImplementation((options) => {
      if (isLogin(options))
        respond(options, 200, { success: true, data: session("new-domain-token") });
      else if (
        options.url.endsWith("/late") &&
        options.header?.Authorization === "Bearer old-domain-token"
      )
        late = options;
      else if (options.header?.Authorization === "Bearer old-domain-token") respond(options, 401);
      else respond(options, 200, { success: true });
      return {} as WechatMiniprogram.RequestTask;
    });
    const lateResult = request({ url: "/late" });
    await request({ url: "/first" });
    respond(late!, 401);
    await expect(lateResult).resolves.toEqual({ success: true });
    expect(wx.login).toHaveBeenCalledTimes(1);
  });

  it("clears invalidated credentials and rejects clearly when relogin fails", async () => {
    vi.spyOn(wx, "request").mockImplementation((options) => {
      respond(options, 401, { success: false });
      return {} as WechatMiniprogram.RequestTask;
    });
    await expect(request({ url: "/private" })).rejects.toThrow("重新登录失败");
    expect(wx.login).toHaveBeenCalledTimes(1);
    expect(uni.getStorageSync(STORAGE_KEY)).toBeFalsy();
  });

  it("shares a failed refresh with an earlier request whose 401 arrives late", async () => {
    let late: WechatMiniprogram.RequestOption | undefined;
    vi.spyOn(wx, "request").mockImplementation((options) => {
      if (isLogin(options)) respond(options, 500, { success: false });
      else if (options.url.endsWith("/late")) late = options;
      else respond(options, 401);
      return {} as WechatMiniprogram.RequestTask;
    });
    const lateResult = request({ url: "/late" });
    await expect(request({ url: "/first" })).rejects.toThrow("重新登录失败");
    respond(late!, 401);
    await expect(lateResult).rejects.toThrow("重新登录失败");
    expect(wx.login).toHaveBeenCalledTimes(1);
    expect(uni.getStorageSync(STORAGE_KEY)).toBeFalsy();
  });

  it("allows a later user action to retry after a failed refresh", async () => {
    let failLogin = true;
    vi.spyOn(wx, "request").mockImplementation((options) => {
      if (isLogin(options)) {
        if (failLogin) respond(options, 500, { success: false });
        else respond(options, 200, { success: true, data: session("new-domain-token") });
      } else if (options.header?.Authorization === "Bearer new-domain-token") {
        respond(options, 200, { success: true });
      } else respond(options, 401);
      return {} as WechatMiniprogram.RequestTask;
    });
    await expect(request({ url: "/first" })).rejects.toThrow("重新登录失败");
    failLogin = false;
    await expect(request({ url: "/try-again" })).resolves.toEqual({ success: true });
    expect(wx.login).toHaveBeenCalledTimes(2);
  });

  it("stops after one replay if the fresh token is also unauthorized", async () => {
    const api = vi.spyOn(wx, "request").mockImplementation((options) => {
      if (isLogin(options))
        respond(options, 200, { success: true, data: session("new-domain-token") });
      else respond(options, 401);
      return {} as WechatMiniprogram.RequestTask;
    });
    await expect(request({ url: "/private" })).rejects.toThrow("未授权");
    expect(wx.login).toHaveBeenCalledTimes(1);
    expect(api.mock.calls.filter(([options]) => !isLogin(options))).toHaveLength(2);
    expect(uni.getStorageSync(STORAGE_KEY)).toBeFalsy();
  });

  it("keeps valid credentials and never relogs in for 403", async () => {
    vi.spyOn(wx, "request").mockImplementation((options) => {
      respond(options, 403);
      return {} as WechatMiniprogram.RequestTask;
    });
    await expect(request({ url: "/private" })).rejects.toThrow("无权限");
    expect(wx.login).not.toHaveBeenCalled();
    expect(uni.getStorageSync(STORAGE_KEY)).toEqual(session());
  });

  it.each([
    { url: "https://other.example/v2/private" },
    { url: "/private", baseUrl: "https://other.example/v2" },
    { url: `${config.apiUrl}-other/private` },
  ])("never sends local credentials or relogs in for another API: %j", async (options) => {
    const api = vi.spyOn(wx, "request").mockImplementation((call) => {
      expect(call.header?.Authorization).toBeUndefined();
      respond(call, 401);
      return {} as WechatMiniprogram.RequestTask;
    });
    await expect(request(options)).rejects.toThrow("未授权");
    expect(wx.login).not.toHaveBeenCalled();
    expect(api).toHaveBeenCalledTimes(1);
    expect(uni.getStorageSync(STORAGE_KEY)).toEqual(session());
  });

  it("leaves explicit target credentials to their caller", async () => {
    const api = vi.spyOn(wx, "request").mockImplementation((options) => {
      expect(options.header?.authorization).toBe("Bearer target-token");
      expect(options.header?.Authorization).toBeUndefined();
      respond(options, 401);
      return {} as WechatMiniprogram.RequestTask;
    });
    await expect(
      request({ url: "/target", header: { authorization: "Bearer target-token" } }),
    ).rejects.toThrow("未授权");
    expect(wx.login).not.toHaveBeenCalled();
    expect(api).toHaveBeenCalledTimes(1);
    expect(uni.getStorageSync(STORAGE_KEY)).toEqual(session());
  });
});
