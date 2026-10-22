import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { regist, profile, bindPhone } from "../login";
import { localRefresh, type IDType } from "../checkin";
import config from "@/config";

const STORAGE_KEY = `AR_CHECKIN_OPENID:${encodeURIComponent(config.apiUrl)}`;
const session = (accessToken = "old-domain-token"): IDType => ({
  token: { accessToken, refreshToken: "refresh-token", expires: "2099/01/01 12:00:00" },
  openid: "test-openid",
  unionid: "business-unionid",
  user: null,
});
const user = { id: 1, nickname: "Alice", avatar: "avatar.jpg", role: "user", tel: "123" };
const result = { success: true, message: "ok", data: { user, token: "recording-state" } };
const actions = [
  {
    name: "regist",
    path: "/wechat/bind-phone",
    data: { code: "phone-code" },
    run: () => regist("phone-code"),
  },
  {
    name: "profile",
    path: "/wechat/profile",
    data: { nickname: "Alice", avatar: "avatar.jpg" },
    run: () => profile("Alice", "avatar.jpg"),
  },
  {
    name: "bindPhone code",
    path: "/wechat/phone",
    data: { code: "phone-code" },
    run: () => bindPhone({ code: "phone-code" }),
  },
  {
    name: "bindPhone encrypted",
    path: "/wechat/phone",
    data: { encryptedData: "encrypted", iv: "iv", code: "phone-code" },
    run: () => bindPhone({ encryptedData: "encrypted", iv: "iv", code: "phone-code" }),
  },
  {
    name: "localRefresh",
    path: "/server/applet",
    data: {
      token: "device-token",
      id: "business-unionid",
      status: "ready",
      data: JSON.stringify({ context: "recording" }),
    },
    run: () => localRefresh("device-token", "business-unionid", "ready", { context: "recording" }),
  },
];

function respond(options: WechatMiniprogram.RequestOption, statusCode: number, data: unknown) {
  options.success?.({ statusCode, data } as WechatMiniprogram.RequestSuccessCallbackResult);
}

beforeEach(() => {
  uni.setStorageSync(STORAGE_KEY, session());
  vi.spyOn(wx, "login").mockImplementation((options) => {
    const data = { code: "fresh-wechat-code", errMsg: "login:ok" };
    options?.success?.(data);
    return Promise.resolve(data);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("ordinary login API authentication", () => {
  it.each(actions)(
    "recovers $name after an expired bearer without changing its payload",
    async (action) => {
      const calls: WechatMiniprogram.RequestOption[] = [];
      vi.spyOn(wx, "request").mockImplementation((options) => {
        calls.push(options);
        if (options.url.endsWith("/site/login")) {
          respond(options, 200, { success: true, data: session("fresh-domain-token") });
        } else if (options.header?.Authorization === "Bearer old-domain-token") {
          respond(options, 401, { success: false, message: "expired" });
        } else respond(options, 200, result);
        return {} as WechatMiniprogram.RequestTask;
      });
      await expect(action.run()).resolves.toEqual(result);
      expect(wx.login).toHaveBeenCalledTimes(1);
      const attempts = calls.filter((call) => !call.url.endsWith("/site/login"));
      expect(attempts).toHaveLength(2);
      for (const attempt of attempts) {
        expect(attempt.url).toContain(`${config.apiUrl}${action.path}`);
        expect(attempt.method).toBe("POST");
        expect(attempt.data).toEqual(action.data);
      }
      expect(attempts[0].header?.Authorization).toBe("Bearer old-domain-token");
      expect(attempts[1].header?.Authorization).toBe("Bearer fresh-domain-token");
      expect(attempts[1].url).toBe(attempts[0].url);
      if (action.name === "localRefresh") {
        expect(attempts[0].url).toMatch(
          /time=\d+&hash=[a-f0-9]{32}&expand=token,file,device,setup,applet/,
        );
      }
    },
  );

  it.each(actions)("rejects $name on forbidden access without relogging in", async (action) => {
    const api = vi.spyOn(wx, "request").mockImplementation((options) => {
      respond(options, 403, { success: false, message: "forbidden" });
      return {} as WechatMiniprogram.RequestTask;
    });
    await expect(action.run()).rejects.toThrow("无权限");
    expect(wx.login).not.toHaveBeenCalled();
    expect(api).toHaveBeenCalledTimes(1);
  });

  it.each(actions)(
    "keeps $name business failure responses for its existing caller",
    async (action) => {
      const failure = { success: false, message: "业务失败", data: null };
      vi.spyOn(wx, "request").mockImplementation((options) => {
        respond(options, 200, failure);
        return {} as WechatMiniprogram.RequestTask;
      });
      await expect(action.run()).resolves.toEqual(failure);
      expect(wx.login).not.toHaveBeenCalled();
    },
  );
});
