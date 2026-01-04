import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 提取 isExpired 逻辑进行测试 (该函数在 login.ts 中是私有的，需要通过间接方式测试)
// 这里我们测试相同的逻辑

describe("login.ts - isExpired logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 模拟 isExpired 函数逻辑
  const isExpired = (expires: string) => {
    const now = new Date();
    const expireTime = new Date(expires);
    return new Date(now.getTime() + 3000) > expireTime; // 3秒后过期
  };

  describe("isExpired", () => {
    it("should return true for past dates", () => {
      vi.setSystemTime(new Date("2025-01-04T12:00:00Z"));
      expect(isExpired("2025-01-04T11:59:00Z")).toBe(true);
    });

    it("should return true for dates within 3 seconds", () => {
      vi.setSystemTime(new Date("2025-01-04T12:00:00Z"));
      // 2 seconds from now - still considered expired due to 3s buffer
      expect(isExpired("2025-01-04T12:00:02Z")).toBe(true);
    });

    it("should return false for future dates beyond 3 seconds", () => {
      vi.setSystemTime(new Date("2025-01-04T12:00:00Z"));
      // 5 seconds from now - not expired
      expect(isExpired("2025-01-04T12:00:05Z")).toBe(false);
    });

    it("should return false for dates far in the future", () => {
      vi.setSystemTime(new Date("2025-01-04T12:00:00Z"));
      expect(isExpired("2025-01-05T12:00:00Z")).toBe(false);
    });

    it("should handle ISO date strings", () => {
      vi.setSystemTime(new Date("2025-01-04T12:00:00.000Z"));
      expect(isExpired("2025-01-04T12:00:10.000Z")).toBe(false);
    });
  });
});
