import { describe, it, expect } from "vitest";
import { getQueryString } from "../checkin";

describe("checkin.ts", () => {
  describe("getQueryString", () => {
    it("should extract query parameter from URL", () => {
      const url = "?token=abc123&id=456";
      expect(getQueryString(url, "token")).toBe("abc123");
      expect(getQueryString(url, "id")).toBe("456");
    });

    it("should return null for non-existent parameter", () => {
      const url = "?token=abc123";
      expect(getQueryString(url, "id")).toBeNull();
    });

    it("should handle URL with path and query", () => {
      const url = "/path/to/page?token=xyz&other=value";
      expect(getQueryString(url, "token")).toBe("xyz");
    });

    it("should handle empty URL", () => {
      expect(getQueryString("", "token")).toBeNull();
    });

    it("should handle URL without query string", () => {
      const url = "/path/to/page";
      expect(getQueryString(url, "token")).toBeNull();
    });
  });
});
