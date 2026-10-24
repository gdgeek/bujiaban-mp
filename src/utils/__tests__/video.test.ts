import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock cloud API
vi.mock("@/api/cloud", () => ({
  getObjectUrl: vi.fn(),
}));

// Mock pay API
vi.mock("@/api/pay", () => ({
  wxPay: vi.fn(),
  generateOrderNo: vi.fn(() => "ORDER123456"),
}));

// Mock uni APIs
const mockUni = {
  getSetting: vi.fn(),
  authorize: vi.fn(),
  showModal: vi.fn(),
  openSetting: vi.fn(),
  showToast: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  downloadFile: vi.fn(),
  saveVideoToPhotosAlbum: vi.fn(),
  getStorageSync: vi.fn(),
  setStorageSync: vi.fn(),
};

(global as any).uni = mockUni;

import {
  getSignedVideoUrl,
  checkAlbumPermission,
  downloadAndSaveVideo,
  handlePayment,
} from "../video";
import { getObjectUrl } from "@/api/cloud";
import { wxPay } from "@/api/pay";
import { selectDeviceApiVersion } from "@/config/backend";

describe("video.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectDeviceApiVersion(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getSignedVideoUrl", () => {
    it("uses the backend captured by the video workflow", async () => {
      vi.mocked(getObjectUrl).mockResolvedValue("https://signed.invalid/video?sign=x");
      await getSignedVideoUrl("video.mp4", true, 3, "https://x.4mr.cn/v2");
      expect(getObjectUrl).toHaveBeenCalledWith("video.mp4", "https://x.4mr.cn/v2");
    });
    it("should return signed URL without preview params", async () => {
      (getObjectUrl as any).mockResolvedValue("https://signed-url.com/video.mp4?sign=xxx");

      const result = await getSignedVideoUrl("video.mp4");
      expect(result).toBe("https://signed-url.com/video.mp4?sign=xxx");
    });

    it("should return signed URL with preview params when isPreview is true", async () => {
      (getObjectUrl as any).mockResolvedValue("https://signed-url.com/video.mp4?sign=xxx");

      const result = await getSignedVideoUrl("video.mp4", true);
      expect(result).toContain("ci-process=snapshot");
      expect(result).toContain("time=0.01");
    });

    it("should use custom time for preview", async () => {
      (getObjectUrl as any).mockResolvedValue("https://signed-url.com/video.mp4?sign=xxx");

      const result = await getSignedVideoUrl("video.mp4", true, 5);
      expect(result).toContain("time=5");
    });

    it("should fallback to default URL on error", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      (getObjectUrl as any).mockRejectedValue(new Error("Cloud error"));

      const result = await getSignedVideoUrl("video.mp4");
      expect(result).toContain("game-1251022382.cos.ap-nanjing.myqcloud.com");
      expect(result).toContain("video.mp4");

      consoleSpy.mockRestore();
    });

    it("should fallback to default URL with preview params on error", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      (getObjectUrl as any).mockRejectedValue(new Error("Cloud error"));

      const result = await getSignedVideoUrl("video.mp4", true);
      expect(result).toContain("ci-process=snapshot");

      consoleSpy.mockRestore();
    });
  });

  describe("checkAlbumPermission", () => {
    it("should return true when already authorized", async () => {
      mockUni.getSetting.mockResolvedValue({
        authSetting: { "scope.writePhotosAlbum": true },
      });

      const result = await checkAlbumPermission();
      expect(result).toBe(true);
    });

    it("should request authorization on first attempt", async () => {
      mockUni.getSetting.mockResolvedValue({
        authSetting: { "scope.writePhotosAlbum": undefined },
      });
      mockUni.authorize.mockImplementation(({ success }) => success());

      const result = await checkAlbumPermission();
      expect(result).toBe(true);
      expect(mockUni.authorize).toHaveBeenCalled();
    });

    it("should return false when authorization is denied", async () => {
      mockUni.getSetting.mockResolvedValue({
        authSetting: { "scope.writePhotosAlbum": false },
      });
      mockUni.showModal.mockImplementation(({ success }) => success({ confirm: false }));

      const result = await checkAlbumPermission();
      expect(result).toBe(false);
    });

    it("should handle getSetting error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockUni.getSetting.mockRejectedValue(new Error("Setting error"));

      const result = await checkAlbumPermission();
      expect(result).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe("downloadAndSaveVideo", () => {
    it("should download and save video successfully", async () => {
      mockUni.downloadFile.mockImplementation(({ success }) =>
        success({ statusCode: 200, tempFilePath: "/tmp/video.mp4" }),
      );
      mockUni.saveVideoToPhotosAlbum.mockImplementation(({ success }) => success());

      const result = await downloadAndSaveVideo("https://example.com/video.mp4");

      expect(result).toBe(true);
      expect(mockUni.showLoading).toHaveBeenCalled();
      expect(mockUni.hideLoading).toHaveBeenCalled();
      expect(mockUni.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "保存视频成功" }),
      );
    });

    it("should return false when download fails", async () => {
      mockUni.downloadFile.mockImplementation(({ success }) =>
        success({ statusCode: 404, tempFilePath: "" }),
      );

      const result = await downloadAndSaveVideo("https://example.com/video.mp4");

      expect(result).toBe(false);
      expect(mockUni.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "保存视频失败" }),
      );
    });

    it("should handle download error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockUni.downloadFile.mockImplementation(({ fail }) => fail({ errMsg: "download error" }));

      const result = await downloadAndSaveVideo("https://example.com/video.mp4");

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });

    it("should handle save to album error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockUni.downloadFile.mockImplementation(({ success }) =>
        success({ statusCode: 200, tempFilePath: "/tmp/video.mp4" }),
      );
      mockUni.saveVideoToPhotosAlbum.mockImplementation(({ fail }) =>
        fail({ errMsg: "save error" }),
      );

      const result = await downloadAndSaveVideo("https://example.com/video.mp4");

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe("handlePayment", () => {
    it("uses the captured legacy backend and omits file_id after switching to v1", async () => {
      vi.mocked(wxPay).mockResolvedValue(true);
      await handlePayment(
        { file_id: 12, openid: "owner", amount: 100, description: "扫码设备文件" },
        "https://x.4mr.cn/v2",
      );
      expect(wxPay).toHaveBeenCalledWith(
        {
          openid: "owner",
          out_trade_no: "ORDER123456",
          amount: 100,
          description: "扫码设备文件",
        },
        "https://x.4mr.cn/v2",
      );
      expect(vi.mocked(wxPay).mock.calls[0][0]).not.toHaveProperty("file_id");
    });

    it("allows legacy payment without a file_id", async () => {
      vi.mocked(wxPay).mockResolvedValue(true);

      const result = await handlePayment(
        { openid: "owner", amount: 100, description: "旧设备文件" },
        "https://x.4mr.cn/v2",
      );

      expect(result).toBe(true);
      expect(wxPay).toHaveBeenCalledWith(
        {
          openid: "owner",
          out_trade_no: "ORDER123456",
          amount: 100,
          description: "旧设备文件",
        },
        "https://x.4mr.cn/v2",
      );
      expect(vi.mocked(wxPay).mock.calls[0][0]).not.toHaveProperty("file_id");
    });

    it("keeps the captured v1 backend and file_id after switching to legacy", async () => {
      selectDeviceApiVersion(0);
      vi.mocked(wxPay).mockResolvedValue(true);

      await handlePayment(
        { file_id: 12, openid: "owner", amount: 100, description: "新设备文件" },
        "https://c.4mr.cn/api/v2",
      );

      expect(wxPay).toHaveBeenCalledWith(
        expect.objectContaining({ file_id: 12, openid: "owner" }),
        "https://c.4mr.cn/api/v2",
      );
    });

    it.each([undefined, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, "12"])(
      "rejects invalid v1 file_id %s before requesting payment",
      async (fileId) => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.mocked(wxPay).mockResolvedValue(true);

        await expect(
          handlePayment(
            {
              file_id: fileId as number | undefined,
              openid: "owner",
              amount: 100,
              description: "新设备文件",
            },
            "https://c.4mr.cn/api/v2",
          ),
        ).rejects.toThrow("文件 ID 无效");
        expect(wxPay).not.toHaveBeenCalled();
        expect(mockUni.showLoading).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
      },
    );

    it.each(["https://x.4mr.cn/v2", "https://c.4mr.cn/api/v2"])(
      "returns false when payment is cancelled on %s",
      async (apiUrl) => {
        vi.mocked(wxPay).mockResolvedValue(false);

        const result = await handlePayment(
          { file_id: 12, openid: "owner", amount: 100, description: "扫码设备文件" },
          apiUrl,
        );

        expect(result).toBe(false);
        expect(mockUni.hideLoading).toHaveBeenCalled();
      },
    );

    it("should handle payment successfully", async () => {
      (wxPay as any).mockResolvedValue({ success: true });

      const result = await handlePayment({
        file_id: 12,
        openid: "test-openid",
        amount: 100,
        description: "测试支付",
      });

      expect(result).toBe(true);
      expect(mockUni.showLoading).toHaveBeenCalledWith(
        expect.objectContaining({ title: "正在发起支付..." }),
      );
      expect(mockUni.hideLoading).toHaveBeenCalled();
    });

    it("should return false when payment fails", async () => {
      (wxPay as any).mockResolvedValue(null);

      const result = await handlePayment({
        file_id: 12,
        openid: "test-openid",
        amount: 100,
        description: "测试支付",
      });

      expect(result).toBe(false);
    });

    it("should handle payment error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (wxPay as any).mockRejectedValue(new Error("Payment error"));

      await expect(
        handlePayment({
          file_id: 12,
          openid: "test-openid",
          amount: 100,
          description: "测试支付",
        }),
      ).rejects.toThrow("Payment error");
      expect(mockUni.hideLoading).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
