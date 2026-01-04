import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock wx.request before importing request module
const mockWxRequest = vi.fn();
(global as any).wx = {
  ...(global as any).wx,
  request: mockWxRequest,
};

// Import after mocking
import { request, get, post, put, del } from "../request";

describe("request.ts", () => {
  beforeEach(() => {
    mockWxRequest.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("request function", () => {
    it("should build full URL correctly with relative path", () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.url).toContain("/api/test");
        options.success({ statusCode: 200, data: { success: true } });
      });

      request({ url: "/api/test" });
      expect(mockWxRequest).toHaveBeenCalled();
    });

    it("should use absolute URL when provided", () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.url).toBe("https://custom.api.com/endpoint");
        options.success({ statusCode: 200, data: {} });
      });

      request({ url: "https://custom.api.com/endpoint" });
      expect(mockWxRequest).toHaveBeenCalled();
    });

    it("should resolve with data on success (2xx status)", async () => {
      mockWxRequest.mockImplementation((options) => {
        options.success({ statusCode: 200, data: { result: "ok" } });
      });

      const result = await request({ url: "/test" });
      expect(result).toEqual({ result: "ok" });
    });

    it("should reject with error on 401 status", async () => {
      mockWxRequest.mockImplementation((options) => {
        options.success({ statusCode: 401, data: {} });
      });

      await expect(request({ url: "/test" })).rejects.toThrow("未授权");
    });

    it("should reject with error on 403 status", async () => {
      mockWxRequest.mockImplementation((options) => {
        options.success({ statusCode: 403, data: {} });
      });

      await expect(request({ url: "/test" })).rejects.toThrow("无权限");
    });

    it("should reject with error on 5xx status", async () => {
      mockWxRequest.mockImplementation((options) => {
        options.success({ statusCode: 500, data: {} });
      });

      await expect(request({ url: "/test" })).rejects.toThrow("服务器错误");
    });

    it("should reject on network failure", async () => {
      mockWxRequest.mockImplementation((options) => {
        options.fail({ errMsg: "network error" });
      });

      await expect(request({ url: "/test" })).rejects.toThrow("network error");
    });

    it("should use specified HTTP method", () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.method).toBe("POST");
        options.success({ statusCode: 200, data: {} });
      });

      request({ url: "/test", method: "POST" });
    });
  });

  describe("get function", () => {
    it("should make GET request", () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.method).toBe("GET");
        options.success({ statusCode: 200, data: {} });
      });

      get("/test");
      expect(mockWxRequest).toHaveBeenCalled();
    });

    it("should serialize params to query string", () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.url).toContain("name=test");
        expect(options.url).toContain("page=1");
        options.success({ statusCode: 200, data: {} });
      });

      get("/test", { name: "test", page: 1 });
    });

    it("should filter out null and undefined params", () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.url).toContain("valid=true");
        expect(options.url).not.toContain("empty");
        options.success({ statusCode: 200, data: {} });
      });

      get("/test", { valid: true, empty: null, missing: undefined });
    });
  });

  describe("post function", () => {
    it("should make POST request with data", () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.method).toBe("POST");
        expect(options.data).toEqual({ key: "value" });
        options.success({ statusCode: 200, data: {} });
      });

      post("/test", { key: "value" });
    });
  });

  describe("put function", () => {
    it("should make PUT request", () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.method).toBe("PUT");
        options.success({ statusCode: 200, data: {} });
      });

      put("/test", { id: 1 });
    });
  });

  describe("del function", () => {
    it("should make DELETE request", () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.method).toBe("DELETE");
        options.success({ statusCode: 200, data: {} });
      });

      del("/test");
    });
  });
});
