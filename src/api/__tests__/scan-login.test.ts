import { beforeEach, afterEach, describe, expect, it, vi, type MockInstance } from "vitest";
import * as api from "../scan-login";
const id = "0123456789abcdef0123456789abcdef";
const secret = "0123456789abcdef".repeat(4);
const origin = "https://x.b0.01xr.com";
const qr = (target = origin) =>
  `bujiaban-admin-login://v1/${id}?secret=${secret}&origin=${encodeURIComponent(target)}`;

beforeEach(() => {
  vi.stubEnv("VITE_ADMIN_LOGIN_ORIGINS", "");
  delete process.env.VITE_ADMIN_LOGIN_ORIGINS;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("admin login QR protocol", () => {
  it("parses a canonical login QR for the default B0 backend", () => {
    expect(api?.parseAdminLoginQr(qr())).toEqual({ id, secret, origin });
  });

  it("accepts the deployment canonical origin shared with the mini program API", () => {
    const canonical = "https://x.4mr.cn";
    expect(api.parseAdminLoginQr(qr(canonical))).toEqual({ id, secret, origin: canonical });
  });

  it("accepts B1 and either parameter order", () => {
    expect(
      api?.parseAdminLoginQr(
        `bujiaban-admin-login://v1/${id}?origin=${encodeURIComponent(
          "https://x.b1.01xr.com",
        )}&secret=${secret}`,
      ),
    ).toEqual({ id, secret, origin: "https://x.b1.01xr.com" });
  });

  it("reads an explicit allowlist instead of adding default backends", () => {
    vi.stubEnv(
      "VITE_ADMIN_LOGIN_ORIGINS",
      "https://admin.example.com, https://admin.example.com:8443",
    );
    expect(api?.getTrustedAdminLoginOrigins()).toEqual([
      "https://admin.example.com",
      "https://admin.example.com:8443",
    ]);
    expect(api?.parseAdminLoginQr(qr("https://admin.example.com"))).toEqual({
      id,
      secret,
      origin: "https://admin.example.com",
    });
    expect(() => api.parseAdminLoginQr(qr())).toThrow("不受信任");
  });

  it.each([
    qr("https://evil.example"),
    qr("https://x.b0.01xr.com.evil.example"),
    qr("http://x.b0.01xr.com"),
    qr("https://user:password@x.b0.01xr.com"),
    qr("https://x.b0.01xr.com/"),
    qr("https://x.b0.01xr.com/v2"),
    qr("https://x.b0.01xr.com?evil=1"),
    qr("https://x.b0.01xr.com#fragment"),
    qr("https://x.b0.01xr.com:443"),
    qr("https://X.B0.01XR.COM"),
    qr("https://x.b0.01xr.com\\@evil.example"),
  ])("rejects an untrusted or noncanonical origin: %s", (value) => {
    expect(() => api.parseAdminLoginQr(value)).toThrow();
  });

  it.each([
    "",
    "https://x.b0.01xr.com",
    qr().replace("v1/", "v2/"),
    qr().replace(id, id.toUpperCase()),
    qr().replace(id, id.slice(1)),
    qr().replace(secret, secret.toUpperCase()),
    qr().replace(secret, secret.slice(1)),
    `${qr()}&secret=${secret}`,
    `${qr()}&origin=${encodeURIComponent(origin)}`,
    `${qr()}&extra=1`,
    `${qr()}#fragment`,
    `${qr()}&`,
    ` ${qr()}`,
    `${qr()}\n`,
    qr().replace("origin=", "origin=%"),
    qr().replace("origin=", "origin=%E0%A4%A"),
    qr().replace(encodeURIComponent(origin), encodeURIComponent(encodeURIComponent(origin))),
    qr().replace(encodeURIComponent(origin), origin),
    qr().replace("secret=", "%73ecret="),
    qr().replace("origin=", "%6frigin="),
    qr().replace("origin=", "origin=="),
    qr().replace("?secret=", "?secret=&secret="),
  ])("rejects malformed protocol input: %s", (value) => {
    expect(() => api.parseAdminLoginQr(value)).toThrow();
  });

  it("does not trust malformed allowlist values", () => {
    vi.stubEnv("VITE_ADMIN_LOGIN_ORIGINS", "https://x.b0.01xr.com/path,https://user@x.b0.01xr.com");
    expect(api?.getTrustedAdminLoginOrigins()).toEqual([]);
    expect(() => api.parseAdminLoginQr(qr())).toThrow("不受信任");
  });
});

describe("confirmation and credentials stay within the target backend", () => {
  interface TestRequestOptions {
    url: string;
    method: string;
    header: Record<string, string>;
    data: Record<string, string>;
    success: (response: { data: unknown; statusCode: number }) => void;
    fail: (response: { errMsg: string }) => void;
  }
  const requestSpy = vi.fn<[TestRequestOptions], void>();
  const loginSpy = vi.fn<[WechatMiniprogram.LoginOption], void>();
  let storageReadSpy: MockInstance<[string], unknown>;
  let storageWriteSpy: MockInstance<[string, unknown], void>;
  let consoleSpy: MockInstance<Parameters<typeof console.warn>, void>;

  beforeEach(() => {
    api?.takePendingAdminLogin?.();
    uni.setStorageSync("AR_CHECKIN_OPENID", { token: { accessToken: "original-global-token" } });
    requestSpy.mockReset();
    loginSpy.mockReset().mockImplementation((options) => {
      options.success?.({ code: "fresh-code", errMsg: "login:ok" });
    });
    vi.stubGlobal("wx", { ...wx, request: requestSpy, login: loginSpy });
    storageReadSpy = vi.spyOn(uni, "getStorageSync");
    storageWriteSpy = vi.spyOn(uni, "setStorageSync");
    consoleSpy = vi.spyOn(console, "warn");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const success = (data: unknown, statusCode = 200) => ({
    data,
    statusCode,
    header: {},
    cookies: [],
    errMsg: "request:ok",
  });

  it("keeps the scan in one-use memory and only navigates without credentials", async () => {
    const navigate = vi.fn((options: UniApp.NavigateToOptions) => {
      options.success?.({
        errMsg: "navigateTo:ok",
        eventChannel: {},
      } as UniApp.NavigateToSuccessOptions);
    });
    vi.stubGlobal("uni", {
      ...uni,
      scanCode: vi.fn((options) => options.success({ result: qr() })),
      navigateTo: navigate,
    });
    expect(await api?.beginAdminLoginScan?.()).toBe(true);
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ url: "/pages/auth/confirm" }));
    expect(JSON.stringify(navigate.mock.calls)).not.toContain(secret);
    expect(api?.takePendingAdminLogin?.()).toEqual({ id, secret, origin });
    expect(api?.takePendingAdminLogin?.()).toBeNull();
    expect(loginSpy).not.toHaveBeenCalled();
    expect(requestSpy).not.toHaveBeenCalled();
    expect(storageWriteSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("does not authenticate or approve when the scanner is cancelled", async () => {
    vi.stubGlobal("uni", {
      ...uni,
      scanCode: vi.fn((options) => options.fail({ errMsg: "scanCode:fail cancel" })),
    });
    expect(await api?.beginAdminLoginScan?.()).toBe(false);
    expect(api?.takePendingAdminLogin?.()).toBeNull();
    expect(loginSpy).not.toHaveBeenCalled();
    expect(requestSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("discards the pending secret if navigation fails", async () => {
    const navigate = vi.fn((options: UniApp.NavigateToOptions) => {
      options.fail?.({ errMsg: "navigation failed" });
    });
    vi.stubGlobal("uni", {
      ...uni,
      scanCode: vi.fn((options) => options.success({ result: qr() })),
      navigateTo: navigate,
    });
    await expect(api?.beginAdminLoginScan?.()).rejects.toThrow("无法打开确认页");
    expect(api?.takePendingAdminLogin?.()).toBeNull();
    expect(requestSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("allows an ordinary user to approve B1 using only a fresh target Bearer", async () => {
    const target = "https://x.b1.01xr.com";
    loginSpy.mockImplementation((options) =>
      options.success?.({ code: "fresh-b1-code", errMsg: "login:ok" }),
    );
    requestSpy.mockImplementation((options) => {
      if (options.url.endsWith("/site/login")) {
        expect(options.url).toBe(`${target}/v2/site/login`);
        expect(options.method).toBe("POST");
        expect(options.header).toEqual({ "Content-Type": "application/json" });
        expect(options.data).toEqual({ code: "fresh-b1-code" });
        options.success(
          success({
            success: true,
            data: {
              token: { accessToken: "temporary-b1-token" },
              user: { id: 42, role: "user" },
            },
          }),
        );
      } else {
        expect(options.url).toBe(`${target}/v2/web-login/tickets/${id}/approve`);
        expect(options.method).toBe("POST");
        expect(options.header).toEqual({
          "Content-Type": "application/json",
          Authorization: "Bearer temporary-b1-token",
        });
        expect(options.data).toEqual({ secret });
        options.success(
          success({ success: true, message: "已确认", data: { status: "approved" } }),
        );
      }
    });
    await expect(api?.approveAdminLogin?.({ id, secret, origin: target })).resolves.toBeUndefined();
    expect(loginSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy).toHaveBeenCalledTimes(2);
    expect(storageReadSpy).not.toHaveBeenCalled();
    expect(storageWriteSpy).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(uni.getStorageSync("AR_CHECKIN_OPENID")).toEqual({
      token: { accessToken: "original-global-token" },
    });
  });

  it("revalidates the target before authentication", async () => {
    await expect(
      api?.approveAdminLogin?.({ id, secret, origin: "https://evil.example" }),
    ).rejects.toThrow("不受信任");
    expect(loginSpy).not.toHaveBeenCalled();
    expect(requestSpy).not.toHaveBeenCalled();
  });

  it.each([200, 403, 410, 429])(
    "shows the backend approval error for HTTP %i",
    async (statusCode) => {
      requestSpy.mockImplementation((options) => {
        options.success(
          success(
            options.url.endsWith("/site/login")
              ? { success: true, data: { token: { accessToken: "temporary-token" } } }
              : { success: false, message: "当前微信用户无权登录管理后台", data: null },
            options.url.endsWith("/site/login") ? 200 : statusCode,
          ),
        );
      });
      await expect(api?.approveAdminLogin?.({ id, secret, origin })).rejects.toThrow(
        "当前微信用户无权登录管理后台",
      );
    },
  );

  it("does not approve when target login fails", async () => {
    requestSpy.mockImplementation((options) =>
      options.success(success({ success: false, message: "微信身份无法识别", data: null }, 403)),
    );
    await expect(api?.approveAdminLogin?.({ id, secret, origin })).rejects.toThrow(
      "微信身份无法识别",
    );
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, "", "bad\r\ntoken", "bad\n"])(
    "rejects missing or unsafe target credentials",
    async (accessToken) => {
      requestSpy.mockImplementation((options) =>
        options.success(success({ success: true, data: { token: { accessToken } } })),
      );
      await expect(api?.approveAdminLogin?.({ id, secret, origin })).rejects.toThrow(
        "目标后端登录失败",
      );
      expect(requestSpy).toHaveBeenCalledTimes(1);
    },
  );

  it("does not accept a malformed approval success response", async () => {
    requestSpy.mockImplementation((options) =>
      options.success(
        success(
          options.url.endsWith("/site/login")
            ? { success: true, data: { token: { accessToken: "temporary-token" } } }
            : { success: true, data: { status: "pending" } },
        ),
      ),
    );
    await expect(api?.approveAdminLogin?.({ id, secret, origin })).rejects.toThrow("确认登录失败");
  });

  it("does not approve if the confirmation page is closed during target authentication", async () => {
    let cancelled = false;
    requestSpy.mockImplementation((options) => {
      cancelled = true;
      options.success(
        success({ success: true, data: { token: { accessToken: "temporary-token" } } }),
      );
    });
    await expect(api?.approveAdminLogin?.({ id, secret, origin }, () => cancelled)).rejects.toThrow(
      "已取消",
    );
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });

  it("does not expose request details or an echoed secret in error messages", async () => {
    requestSpy.mockImplementation((options) =>
      options.success(success({ success: false, message: `invalid ${secret}` }, 400)),
    );
    await expect(api?.approveAdminLogin?.({ id, secret, origin })).rejects.toThrow(
      "目标后端登录失败",
    );
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it.each(["bad\u0000detail", "bad\u001fdetail", "bad\ndetail", "<script>invalid</script>"])(
    "does not display control characters or markup returned as a backend message",
    async (message) => {
      requestSpy.mockImplementation((options) =>
        options.success(success({ success: false, message }, 400)),
      );
      await expect(api.approveAdminLogin({ id, secret, origin })).rejects.toThrow(
        "目标后端登录失败",
      );
    },
  );

  it("rejects invalid scan contents without navigation or authentication", async () => {
    const navigate = vi.fn();
    vi.stubGlobal("uni", {
      ...uni,
      scanCode: vi.fn((options) => options.success({ result: qr("https://evil.example") })),
      navigateTo: navigate,
    });
    await expect(api.beginAdminLoginScan()).rejects.toThrow("不受信任");
    expect(navigate).not.toHaveBeenCalled();
    expect(api.takePendingAdminLogin()).toBeNull();
    expect(loginSpy).not.toHaveBeenCalled();
    expect(requestSpy).not.toHaveBeenCalled();
  });

  it("does not send requests when WeChat does not provide a code", async () => {
    loginSpy.mockImplementation((options) =>
      options.success?.({ code: "", errMsg: "login:fail details" }),
    );
    await expect(api.approveAdminLogin({ id, secret, origin })).rejects.toThrow("微信登录失败");
    expect(requestSpy).not.toHaveBeenCalled();
  });

  it("does not expose network error details", async () => {
    requestSpy.mockImplementation((options) =>
      options.fail({ errMsg: `failed request ${secret}` }),
    );
    await expect(api.approveAdminLogin({ id, secret, origin })).rejects.toThrow(
      "网络请求失败，请稍后重试",
    );
    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
