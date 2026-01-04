import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock wx.request before importing
const mockWxRequest = vi.fn();
(global as any).wx = {
  ...(global as any).wx,
  request: mockWxRequest,
};

import { getCheckinList, VerseType } from "../a1";

describe("a1.ts", () => {
  beforeEach(() => {
    mockWxRequest.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getCheckinList", () => {
    it("should return verse list on success", async () => {
      const mockData: VerseType[] = [
        { verse_id: 1, name: "诗篇第一篇" },
        { verse_id: 2, name: "诗篇第二篇" },
      ];

      mockWxRequest.mockImplementation((options) => {
        expect(options.url).toContain("/server/scenes");
        options.success({ statusCode: 200, data: mockData });
      });

      const result = await getCheckinList();
      expect(result).toEqual(mockData);
      expect(mockWxRequest).toHaveBeenCalled();
    });

    it("should return empty array when no data", async () => {
      mockWxRequest.mockImplementation((options) => {
        options.success({ statusCode: 200, data: [] });
      });

      const result = await getCheckinList();
      expect(result).toEqual([]);
    });

    it("should throw error on request failure", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      mockWxRequest.mockImplementation((options) => {
        options.fail({ errMsg: "network error" });
      });

      await expect(getCheckinList()).rejects.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith("获取打卡列表失败:", expect.anything());

      consoleWarnSpy.mockRestore();
    });

    it("should throw error on server error (5xx)", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      mockWxRequest.mockImplementation((options) => {
        options.success({ statusCode: 500, data: {} });
      });

      await expect(getCheckinList()).rejects.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it("should throw error on unauthorized (401)", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      mockWxRequest.mockImplementation((options) => {
        options.success({ statusCode: 401, data: {} });
      });

      await expect(getCheckinList()).rejects.toThrow();

      consoleWarnSpy.mockRestore();
    });
  });

  describe("VerseType interface", () => {
    it("should have correct structure", () => {
      const verse: VerseType = {
        verse_id: 1,
        name: "测试经文",
      };

      expect(verse.verse_id).toBe(1);
      expect(verse.name).toBe("测试经文");
    });
  });
});
