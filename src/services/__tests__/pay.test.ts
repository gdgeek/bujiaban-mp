import { describe, it, expect } from "vitest";
import { generateOrderNo } from "../pay";

describe("pay.ts", () => {
  describe("generateOrderNo", () => {
    it("should generate a string", () => {
      const orderNo = generateOrderNo();
      expect(typeof orderNo).toBe("string");
    });

    it("should generate unique order numbers", () => {
      const orders = new Set<string>();
      for (let i = 0; i < 100; i++) {
        orders.add(generateOrderNo());
      }
      // 所有订单号应该是唯一的
      expect(orders.size).toBe(100);
    });

    it("should have correct length (timestamp + 6 digits)", () => {
      const orderNo = generateOrderNo();
      // 时间戳约13位 + 6位随机数 = 19位
      expect(orderNo.length).toBeGreaterThanOrEqual(18);
      expect(orderNo.length).toBeLessThanOrEqual(20);
    });

    it("should contain only digits", () => {
      const orderNo = generateOrderNo();
      expect(orderNo).toMatch(/^\d+$/);
    });
  });
});
