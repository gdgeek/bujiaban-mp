import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// Mock pinia-plugin-persistedstate
vi.mock("pinia-plugin-persistedstate", () => ({
  default: () => {},
}));

describe("stores/index.ts", () => {
  beforeEach(() => {
    // 创建新的 pinia 实例用于测试
    const pinia = createPinia();
    setActivePinia(pinia);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("pinia instance", () => {
    it("should export default pinia instance", async () => {
      const storeModule = await import("../index");
      expect(storeModule.default).toBeDefined();
    });

    it("should export user store module", async () => {
      const storeModule = await import("../index");
      // 验证模块导出
      expect(storeModule).toBeDefined();
    });
  });
});
