import { describe, expect, it } from "vitest";
import { buildDeviceQr, parseDeviceQr } from "../device-qr";

const token = "R0123456789abcdef0123456789abcdef";
const legacyUrl = `https://w.4mr.cn/t?k=${token}`;

describe("parseDeviceQr", () => {
  it("defaults a legacy device QR without v to version 0", () => {
    expect(parseDeviceQr(legacyUrl)).toEqual({ token, version: 0 });
  });

  it.each([0, 1, 2, Number.MAX_SAFE_INTEGER])("preserves explicit version %s", (version) => {
    expect(parseDeviceQr(`${legacyUrl}&v=${version}`)).toEqual({ token, version });
  });

  it("accepts the old HTTP address and arbitrary parameter order", () => {
    expect(
      parseDeviceQr(`http://w.4mr.cn/t?source=device&v=1&k=${token}&name=hello%20world`),
    ).toEqual({ token, version: 1 });
  });

  it("reads URL-encoded parameter names and values", () => {
    expect(parseDeviceQr(`https://w.4mr.cn/t?%6B=${token}&%76=%31`)).toEqual({ token, version: 1 });
  });

  it("keeps fragments out of query parameter values", () => {
    expect(parseDeviceQr(`${legacyUrl}&v=1#camera`)).toEqual({ token, version: 1 });
  });

  it.each([
    "",
    "-1",
    "1.5",
    "+1",
    "%2B1",
    "1e2",
    "0x1",
    "NaN",
    "Infinity",
    "9007199254740992",
    "%20",
    "1%20",
    "%",
  ])("rejects invalid v=%s instead of treating it as legacy", (version) => {
    expect(() => parseDeviceQr(`${legacyUrl}&v=${version}`)).toThrow(/二维码/);
  });

  it.each(["v=0&v=1", "v=1&v=1", "v=1&%76=0"])(
    "rejects ambiguous duplicate version parameters: %s",
    (params) => {
      expect(() => parseDeviceQr(`${legacyUrl}&${params}`)).toThrow(/二维码/);
    },
  );

  it.each([
    "",
    "R123",
    "00123456789abcdef0123456789abcdef",
    "R0123456789abcdef0123456789abcdeg",
    "R0123456789abcdef0123456789abcdef0",
    `${token}%0A`,
  ])("rejects an invalid device token: %s", (invalidToken) => {
    expect(() => parseDeviceQr(`https://w.4mr.cn/t?k=${invalidToken}`)).toThrow(/二维码/);
  });

  it.each([
    "https://w.4mr.cn/t?v=1",
    `https://w.4mr.cn/t?k=${token}&k=${token}`,
    `https://w.4mr.cn.evil.example/t?k=${token}`,
    `https://evil.example/w.4mr.cn/t?k=${token}`,
    `https://evil.example/?next=https://w.4mr.cn/t?k=${token}`,
    `https://w.4mr.cn@evil.example/t?k=${token}`,
    `https://w.4mr.cn/other/t?k=${token}`,
    `https://w.4mr.cn/t/extra?k=${token}`,
    `ftp://w.4mr.cn/t?k=${token}`,
    `https://w.4mr.cn/t?k=${token}\n`,
    `${legacyUrl}&source=%`,
  ])("rejects a malformed or unrelated URL: %s", (value) => {
    expect(() => parseDeviceQr(value)).toThrow(/二维码/);
  });
});

describe("buildDeviceQr", () => {
  it.each([0, 1, 42, Number.MAX_SAFE_INTEGER])(
    "builds a canonical HTTPS URL and preserves version %s on a round trip",
    (version) => {
      const qr = { token, version };
      const result = buildDeviceQr(qr);
      expect(result).toBe(`${legacyUrl}&v=${version}`);
      expect(parseDeviceQr(result)).toEqual(qr);
    },
  );

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects an invalid version %s when building a QR",
    (version) => {
      expect(() => buildDeviceQr({ token, version })).toThrow(/二维码/);
    },
  );

  it("rejects an invalid token when building a QR", () => {
    expect(() => buildDeviceQr({ token: "not-a-token", version: 1 })).toThrow(/二维码/);
  });
});
