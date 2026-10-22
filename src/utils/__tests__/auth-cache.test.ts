import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadId, saveId, clearId, getToken, buildAuthHeader } from "../common";
import type { IDType } from "@/api/checkin";
import config from "@/config";

const STORAGE_KEY = `AR_CHECKIN_OPENID:${encodeURIComponent(config.apiUrl)}`;
const session = (): IDType => ({
  token: {
    accessToken: "cached-access-token",
    refreshToken: "cached-refresh-token",
    expires: "2099/01/01 12:00:00",
  },
  user: null,
  openid: "test-openid",
  unionid: "test-unionid",
});

describe("authentication cache validation", () => {
  beforeEach(() => uni.removeStorageSync(STORAGE_KEY));
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    "legacy-openid",
    42,
    [],
    {},
    { openid: "legacy-openid" },
    { ...session(), openid: "" },
    { ...session(), user: "invalid-user" },
    { ...session(), token: { ...session().token, accessToken: " " } },
    { ...session(), token: { ...session().token, accessToken: "trailing-newline\n" } },
    { ...session(), token: { ...session().token, refreshToken: 123 } },
    { ...session(), token: { ...session().token, expires: "bad-date" } },
    { ...session(), token: { ...session().token, expires: "2099/01/01 12:00:00\n" } },
    { ...session(), token: { ...session().token, expires: "2099/02/30 12:00:00" } },
    { ...session(), token: { ...session().token, expires: "2099-02-30T12:00:00Z" } },
    { ...session(), token: { ...session().token, expires: "2000/01/01 12:00:00" } },
  ])("ignores and removes an invalid stored session: %j", (value) => {
    uni.setStorageSync(STORAGE_KEY, value);
    expect(loadId()).toBeNull();
    expect(getToken()).toBeNull();
    expect(buildAuthHeader()).toEqual({});
    expect(uni.getStorageSync(STORAGE_KEY)).toBeFalsy();
  });

  it("refuses to replace valid credentials with malformed data", () => {
    const cached = session();
    saveId(cached);
    saveId({ openid: "broken" } as IDType);
    expect(loadId()).toEqual(cached);
  });

  it("removes credentials explicitly when the session becomes invalid", () => {
    saveId(session());
    clearId();
    expect(loadId()).toBeNull();
    expect(uni.getStorageSync(STORAGE_KEY)).toBeFalsy();
  });

  it.each([0, 2, 3])("discards credentials expiring within %s seconds", (seconds) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T12:00:00Z"));
    const cached = session();
    cached.token.expires = new Date(Date.now() + seconds * 1000).toISOString();
    uni.setStorageSync(STORAGE_KEY, cached);
    expect(loadId()).toBeNull();
    expect(getToken()).toBeNull();
  });

  it("accepts a valid session without a unionid or user profile", () => {
    const cached = { ...session(), unionid: null, user: null };
    saveId(cached);
    expect(loadId()).toEqual(cached);
    expect(getToken()).toBe(cached.token.accessToken);
  });

  it("uses the server's Asia/Shanghai timezone for timezone-free backend dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T12:00:00Z"));
    const cached = session();
    cached.token.expires = "2026/10/23 20:00:04";
    uni.setStorageSync(STORAGE_KEY, cached);
    expect(loadId()).toEqual(cached);
  });

  it.each(["2099/01/01 12:00:00", "2099-01-01T12:00:00.000Z", "2099-01-01T20:00:00+08:00"])(
    "accepts a valid expiry in the supported API format: %s",
    (expires) => {
      const cached = session();
      cached.token.expires = expires;
      saveId(cached);
      expect(loadId()).toEqual(cached);
      expect(getToken()).toBe(cached.token.accessToken);
    },
  );
});
