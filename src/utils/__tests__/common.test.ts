import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock wx.request and uni storage
const mockWxRequest = vi.fn();
const mockStorage: Record<string, unknown> = {};

(global as any).wx = {
  ...(global as any).wx,
  request: mockWxRequest,
};

(global as any).uni = {
  ...(global as any).uni,
  setStorageSync: vi.fn((key: string, value: unknown) => {
    mockStorage[key] = value;
  }),
  getStorageSync: vi.fn((key: string) => mockStorage[key]),
};

import {
  calculateHash,
  buildAuthHeader,
  saveId,
  loadId,
  getToken,
  getFileList,
  postData,
} from "../common";

describe("common.ts", () => {
  beforeEach(() => {
    mockWxRequest.mockClear();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("calculateHash", () => {
    it("should generate a hash string", () => {
      const hash = calculateHash("token123", "1234567890", "user123");
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(32); // MD5 hash length
    });

    it("should generate different hashes for different inputs", () => {
      const hash1 = calculateHash("token1", "1234567890", "user1");
      const hash2 = calculateHash("token2", "1234567890", "user1");
      expect(hash1).not.toBe(hash2);
    });

    it("should generate consistent hashes for same inputs", () => {
      const hash1 = calculateHash("token", "time", "user");
      const hash2 = calculateHash("token", "time", "user");
      expect(hash1).toBe(hash2);
    });
  });

  describe("buildAuthHeader", () => {
    it("should return an object", () => {
      const header = buildAuthHeader();
      expect(header).toBeDefined();
      expect(typeof header).toBe("object");
    });

    it("should return empty object when no token", () => {
      const header = buildAuthHeader();
      expect(header).toEqual({});
    });

    it("should return Authorization header when token exists", () => {
      mockStorage["AR_CHECKIN_OPENID"] = {
        token: { accessToken: "test-token" },
      };
      const header = buildAuthHeader();
      expect(header).toEqual({ Authorization: "Bearer test-token" });
    });
  });

  describe("saveId", () => {
    it("should save id to storage", () => {
      const id = { openid: "test-openid", unionid: "test-unionid" };
      saveId(id as any);
      expect(uni.setStorageSync).toHaveBeenCalledWith("AR_CHECKIN_OPENID", id);
    });

    it("should handle storage error gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (uni.setStorageSync as any).mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      saveId({ openid: "test" } as any);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("loadId", () => {
    it("should load id from storage", () => {
      const storedId = { openid: "stored-openid" };
      mockStorage["AR_CHECKIN_OPENID"] = storedId;

      const result = loadId();
      expect(result).toEqual(storedId);
    });

    it("should return null when no stored id", () => {
      const result = loadId();
      expect(result).toBeNull();
    });

    it("should handle storage error and return null", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (uni.getStorageSync as any).mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      const result = loadId();
      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe("getToken", () => {
    it("should return token when exists", () => {
      mockStorage["AR_CHECKIN_OPENID"] = {
        token: { accessToken: "my-token" },
      };

      const token = getToken();
      expect(token).toBe("my-token");
    });

    it("should return null when no token", () => {
      const token = getToken();
      expect(token).toBeNull();
    });

    it("should return null when token structure is incomplete", () => {
      mockStorage["AR_CHECKIN_OPENID"] = { openid: "test" };

      const token = getToken();
      expect(token).toBeNull();
    });
  });

  describe("getFileList", () => {
    it("should fetch file list successfully", async () => {
      const mockFiles = [{ id: 1, name: "file1.mp4" }];

      mockWxRequest.mockImplementation((options) => {
        expect(options.url).toContain("/files/list");
        expect(options.url).toContain("unionid=test-id");
        options.success({ data: mockFiles });
      });

      const result = await getFileList("test-id");
      expect(result).toEqual(mockFiles);
    });

    it("should reject on request failure", async () => {
      mockWxRequest.mockImplementation((options) => {
        options.fail({ errMsg: "network error" });
      });

      await expect(getFileList("test-id")).rejects.toEqual({ errMsg: "network error" });
    });
  });

  describe("postData", () => {
    it("should post data successfully", async () => {
      const mockResponse = { success: true, data: {} };

      mockWxRequest.mockImplementation((options) => {
        expect(options.method).toBe("POST");
        expect(options.url).toContain("/applet/refresh");
        expect(options.url).toContain("time=");
        expect(options.url).toContain("hash=");
        options.success({ data: mockResponse });
      });

      const result = await postData("id123", "token123", null, null);
      expect(result).toEqual(mockResponse);
    });

    it("should include status in request data when provided", async () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.data.status).toBe("active");
        options.success({ data: {} });
      });

      await postData("id123", "token123", "active", null);
    });

    it("should include context in request data when provided", async () => {
      const context = { key: "value" };

      mockWxRequest.mockImplementation((options) => {
        expect(options.data.data).toBe(JSON.stringify(context));
        options.success({ data: {} });
      });

      await postData("id123", "token123", null, context);
    });

    it("should reject on request failure", async () => {
      mockWxRequest.mockImplementation((options) => {
        options.fail({ errMsg: "network error" });
      });

      await expect(postData("id123", "token123", null, null)).rejects.toBe("network error");
    });
  });
});
