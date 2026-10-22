import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import config from "@/config";

const STORAGE_KEY = `AR_CHECKIN_OPENID:${encodeURIComponent(config.apiUrl)}`;

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
  removeStorageSync: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
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

const validId = (accessToken = "test-token") => ({
  openid: "test-openid",
  unionid: "test-unionid",
  user: null,
  token: { accessToken, refreshToken: "refresh-token", expires: "2099/01/01 12:00:00" },
});

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
      mockStorage[STORAGE_KEY] = validId();
      const header = buildAuthHeader();
      expect(header).toEqual({ Authorization: "Bearer test-token" });
    });
  });

  describe("saveId", () => {
    it("should save id to storage", () => {
      const id = validId();
      saveId(id);
      expect(uni.setStorageSync).toHaveBeenCalledWith(STORAGE_KEY, id);
    });

    it("should handle storage error gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (uni.setStorageSync as any).mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      saveId(validId());
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("loadId", () => {
    it("should load id from storage", () => {
      const storedId = validId();
      mockStorage[STORAGE_KEY] = storedId;

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
      mockStorage[STORAGE_KEY] = validId("my-token");

      const token = getToken();
      expect(token).toBe("my-token");
    });

    it("should return null when no token", () => {
      const token = getToken();
      expect(token).toBeNull();
    });

    it("should return null when token structure is incomplete", () => {
      mockStorage[STORAGE_KEY] = { openid: "test" };

      const token = getToken();
      expect(token).toBeNull();
    });
  });

  describe("getFileList", () => {
    it("keeps an old record identity in its captured API", async () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.url).toBe("https://x.4mr.cn/v2/files/list?unionid=old-owner");
        options.success({ statusCode: 200, data: [] });
      });
      expect(await getFileList("old-owner", "https://x.4mr.cn/v2")).toEqual([]);
    });
    it("rejects HTTP errors instead of treating the error body as a file list", async () => {
      mockWxRequest.mockImplementation((options) =>
        options.success({ statusCode: 503, data: { message: "down" } }),
      );
      await expect(getFileList("owner")).rejects.toThrow();
    });
    it("should fetch file list successfully", async () => {
      const mockFiles = [{ id: 1, name: "file1.mp4" }];

      mockWxRequest.mockImplementation((options) => {
        expect(options.url).toContain("/files/list");
        expect(options.url).toContain("unionid=test-id");
        options.success({ statusCode: 200, data: mockFiles });
      });

      const result = await getFileList("test-id");
      expect(result).toEqual(mockFiles);
    });

    it("should reject on request failure", async () => {
      mockWxRequest.mockImplementation((options) => {
        options.fail({ errMsg: "network error" });
      });

      await expect(getFileList("test-id")).rejects.toThrow("network error");
    });
  });

  describe("postData", () => {
    it("posts an existing recording's identity and token to its captured API", async () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.url).toMatch(/^https:\/\/x\.4mr\.cn\/v2\/applet\/refresh\?/);
        expect(options.data).toMatchObject({ id: "old-owner", token: "old-recording-token" });
        options.success({ statusCode: 200, data: { success: true, data: {} } });
      });
      await postData(
        "old-owner",
        "old-recording-token",
        "linked",
        null,
        "token,file",
        "https://x.4mr.cn/v2",
      );
    });
    it("rejects missing business identity without sending a request", async () => {
      await expect(postData(null, "recording-token", "linked", null)).rejects.toThrow(/身份/);
      expect(mockWxRequest).not.toHaveBeenCalled();
    });

    it("keeps the access token out of query strings", async () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.url).not.toMatch(/[?&]t=/);
        options.success({ statusCode: 200, data: { success: true, data: {} } });
      });
      await postData("owner", "recording-token", "linked", null);
    });
    it("should post data successfully", async () => {
      const mockResponse = { success: true, data: {} };

      mockWxRequest.mockImplementation((options) => {
        expect(options.method).toBe("POST");
        expect(options.url).toContain("/applet/refresh");
        expect(options.url).toContain("time=");
        expect(options.url).toContain("hash=");
        options.success({ statusCode: 200, data: mockResponse });
      });

      const result = await postData("id123", "token123", null, null);
      expect(result).toEqual(mockResponse);
    });

    it("should include status in request data when provided", async () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.data.status).toBe("active");
        options.success({ statusCode: 200, data: { success: true, data: {} } });
      });

      await postData("id123", "token123", "active", null);
    });

    it("should include context in request data when provided", async () => {
      const context = { key: "value" };

      mockWxRequest.mockImplementation((options) => {
        expect(options.data.data).toBe(JSON.stringify(context));
        options.success({ statusCode: 200, data: { success: true, data: {} } });
      });

      await postData("id123", "token123", null, context);
    });

    it("should reject on request failure", async () => {
      mockWxRequest.mockImplementation((options) => {
        options.fail({ errMsg: "network error" });
      });

      await expect(postData("id123", "token123", null, null)).rejects.toThrow("network error");
    });
  });
});
