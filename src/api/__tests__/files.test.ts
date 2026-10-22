import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/utils/request", () => ({ get: vi.fn() }));
import { get } from "@/utils/request";
import { getDownloadFile, isFileDownloadAllowed } from "../files";
import config from "@/config";

describe("file download authority", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads authoritative metadata by positive file id", async () => {
    vi.mocked(get).mockResolvedValue({ id: 5, key: "file.mp4", price: 100, unlocked: 0 });
    expect(await getDownloadFile(5)).toMatchObject({ id: 5, price: 100 });
    expect(get).toHaveBeenCalledWith("/files/5", undefined, config.apiUrl);
  });

  it("keeps an explicitly selected backend for file metadata", async () => {
    vi.mocked(get).mockResolvedValue({ id: 5, key: "file.mp4", price: 100, unlocked: 0 });
    await getDownloadFile(5, "https://x.4mr.cn/v2");
    expect(get).toHaveBeenCalledWith("/files/5", undefined, "https://x.4mr.cn/v2");
  });

  it("does not allow missing prices or local route flags to make a locked file free", () => {
    expect(isFileDownloadAllowed({ price: null, unlocked: 0 })).toBe(false);
    expect(isFileDownloadAllowed({ price: undefined, unlocked: 0 })).toBe(false);
    expect(isFileDownloadAllowed({ price: 100, unlocked: 0 })).toBe(false);
    expect(isFileDownloadAllowed({ price: 0, unlocked: 0 })).toBe(true);
    expect(isFileDownloadAllowed({ price: null, unlocked: 1 })).toBe(true);
  });

  it("rejects missing ids without making an API call", async () => {
    await expect(getDownloadFile(0)).rejects.toThrow(/文件/);
    expect(get).not.toHaveBeenCalled();
  });

  it("rejects inconsistent metadata instead of using navigation values", async () => {
    vi.mocked(get).mockResolvedValue({ id: 8, key: "other.mp4", price: 0, unlocked: 1 });
    await expect(getDownloadFile(5)).rejects.toThrow(/文件/);
  });
});
