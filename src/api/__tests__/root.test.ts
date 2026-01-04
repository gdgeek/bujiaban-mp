import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock wx.request before importing
const mockWxRequest = vi.fn();
(global as any).wx = {
  ...(global as any).wx,
  request: mockWxRequest,
};

import { assign, unassign } from "../root";

describe("root.ts", () => {
  beforeEach(() => {
    mockWxRequest.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("assign", () => {
    it("should assign admin to a device", async () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.method).toBe("POST");
        expect(options.url).toContain("/devices/1/assign");
        options.success({ statusCode: 200, data: { success: true } });
      });

      const result = await assign(1, "13800138000");
      expect(mockWxRequest).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should send correct data in request body", async () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.data).toEqual({ device_id: 2, phone: "13900139000" });
        options.success({ statusCode: 200, data: {} });
      });

      await assign(2, "13900139000");
    });
  });

  describe("unassign", () => {
    it("should unassign admin from a device and return true", async () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.method).toBe("DELETE");
        expect(options.url).toContain("/devices/1/assign/100");
        options.success({ statusCode: 200, data: {} });
      });

      const result = await unassign(1, 100);
      expect(result).toBe(true);
    });

    it("should return false on failure", async () => {
      mockWxRequest.mockImplementation((options) => {
        options.fail({ errMsg: "network error" });
      });

      const result = await unassign(1, 100);
      expect(result).toBe(false);
    });
  });
});
