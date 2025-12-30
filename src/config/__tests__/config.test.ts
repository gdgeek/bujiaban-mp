import { describe, it, expect } from "vitest";
import config from "../index";

describe("config/index.ts", () => {
  describe("config object", () => {
    it("should have apiUrl property", () => {
      expect(config.apiUrl).toBeDefined();
      expect(typeof config.apiUrl).toBe("string");
    });

    it("should have a1ApiUrl property", () => {
      expect(config.a1ApiUrl).toBeDefined();
      expect(typeof config.a1ApiUrl).toBe("string");
    });

    it("should have cloudEnv property", () => {
      expect(config.cloudEnv).toBeDefined();
      expect(typeof config.cloudEnv).toBe("string");
    });

    it("should have hashSalt property", () => {
      expect(config.hashSalt).toBeDefined();
      expect(typeof config.hashSalt).toBe("string");
    });
  });

  describe("config values", () => {
    it("apiUrl should be a valid URL format", () => {
      expect(config.apiUrl).toMatch(/^https?:\/\/.+/);
    });

    it("a1ApiUrl should be a valid URL format", () => {
      expect(config.a1ApiUrl).toMatch(/^https?:\/\/.+/);
    });

    it("cloudEnv should not be empty", () => {
      expect(config.cloudEnv.length).toBeGreaterThan(0);
    });

    it("hashSalt should not be empty", () => {
      expect(config.hashSalt.length).toBeGreaterThan(0);
    });
  });
});
