import { afterEach, describe, it, expect, vi } from "vitest";
import { loadEnv } from "vite";
import config from "../index";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("config/index.ts", () => {
  describe("config object", () => {
    it("should have apiUrl property", () => {
      expect(config.apiUrl).toBeDefined();
      expect(typeof config.apiUrl).toBe("string");
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

    it("cloudEnv should not be empty", () => {
      expect(config.cloudEnv.length).toBeGreaterThan(0);
    });

    it("hashSalt should not be empty", () => {
      expect(config.hashSalt.length).toBeGreaterThan(0);
    });
  });

  describe("unified proxy routing", () => {
    it("uses checkin as the default API when no environment override is present", async () => {
      vi.stubEnv("VITE_API_URL", "");
      vi.resetModules();
      const { config: defaults } = await import("../index");
      expect(defaults.apiUrl).toBe("https://checkin.voxel.cn/api/v2");
    });

    it.each(["development", "production"])(
      "uses checkin for the %s API configuration",
      async (mode) => {
        const env = loadEnv(mode, process.cwd());
        vi.stubEnv("VITE_API_URL", env.VITE_API_URL);
        vi.resetModules();
        const { config: configured } = await import("../index");
        expect(configured.apiUrl).toBe("https://checkin.voxel.cn/api/v2");
      },
    );
  });
});
