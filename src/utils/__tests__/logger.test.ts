import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "../logger";

describe("logger.ts", () => {
  beforeEach(() => {
    // Reset logger config before each test
    logger.reset();
    // Spy on console methods
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("log methods", () => {
    it("debug should call console.debug", () => {
      logger.debug("test", "debug message");
      expect(console.debug).toHaveBeenCalled();
    });

    it("info should call console.log", () => {
      logger.info("test", "info message");
      expect(console.log).toHaveBeenCalled();
    });

    it("warn should call console.warn", () => {
      logger.warn("test", "warn message");
      expect(console.warn).toHaveBeenCalled();
    });

    it("error should call console.error", () => {
      logger.error("test", "error message");
      expect(console.error).toHaveBeenCalled();
    });

    it("should include tag in log message", () => {
      logger.info("MyTag", "test message");
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[MyTag]"));
    });

    it("should include prefix in log message", () => {
      logger.info("test", "message");
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[App]"));
    });

    it("should pass additional arguments", () => {
      const extraData = { key: "value" };
      logger.info("test", "message", extraData);
      expect(console.log).toHaveBeenCalledWith(expect.any(String), extraData);
    });
  });

  describe("configure", () => {
    it("should disable logging when enabled is false", () => {
      logger.configure({ enabled: false });
      logger.info("test", "message");
      expect(console.log).not.toHaveBeenCalled();
    });

    it("should change prefix", () => {
      logger.configure({ prefix: "[Custom]" });
      logger.info("test", "message");
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[Custom]"));
    });

    it("should show timestamp when enabled", () => {
      logger.configure({ showTimestamp: true });
      logger.info("test", "message");
      expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^\[.*T.*\]/));
    });
  });

  describe("reset", () => {
    it("should reset config to defaults", () => {
      logger.configure({ enabled: false, prefix: "[Custom]" });
      logger.reset();
      logger.info("test", "message");
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[App]"));
    });
  });

  describe("isProduction", () => {
    it("should return a boolean", () => {
      expect(typeof logger.isProduction()).toBe("boolean");
    });
  });
});
