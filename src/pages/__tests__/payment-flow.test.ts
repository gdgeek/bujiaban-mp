import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSetup, nodeText } from "./setup-harness";
import { isFileDownloadAllowed } from "@/api/files";

const locked = { id: 12, key: "owner.mp4", price: 100, unlocked: 0 };
let getFile: ReturnType<typeof vi.fn>;
let pay: ReturnType<typeof vi.fn>;
let download: ReturnType<typeof vi.fn>;
let signed: ReturnType<typeof vi.fn>;
let toast: ReturnType<typeof vi.fn>;
let activeApiUrl: string;

beforeEach(() => {
  activeApiUrl = "https://checkin.voxel.cn/api/v2";
  getFile = vi.fn().mockResolvedValue(locked);
  pay = vi.fn().mockResolvedValue(false);
  download = vi.fn().mockResolvedValue(true);
  // An unavailable preview must not prevent metadata and entitlement checks.
  signed = vi
    .fn()
    .mockRejectedValueOnce(new Error("preview unavailable"))
    .mockResolvedValue("https://signed.invalid/file");
  for (const key of [
    "AR_PURCHASED_FILES",
    "AR_PURCHASED_FILES:" + encodeURIComponent("https://x.4mr.cn/v2"),
    "AR_PURCHASED_FILES:" + encodeURIComponent("https://checkin.voxel.cn/api/v2"),
  ])
    uni.removeStorageSync(key);
  toast = vi.fn();
  uni.showToast = toast as typeof uni.showToast;
});

function paymentPage() {
  return loadSetup("src/pages/payment/index.vue", {
    "@/config": {
      default: {
        get apiUrl() {
          return activeApiUrl;
        },
      },
    },
    "@/config/backend": {
      isLegacyApiUrl: (url: string) => url.replace(/\/+$/, "") === "https://x.4mr.cn/v2",
    },
    "@/api/login": { login: vi.fn().mockResolvedValue({ openid: "owner" }) },
    "@/api/files": { getDownloadFile: getFile, isFileDownloadAllowed },
    "@/utils/logger": { default: { info: vi.fn(), debug: vi.fn() } },
    "@/utils/video": {
      getSignedVideoUrl: signed,
      checkAlbumPermission: vi.fn().mockResolvedValue(true),
      downloadAndSaveVideo: download,
      handlePayment: pay,
    },
  });
}

const query = {
  params: encodeURIComponent(
    JSON.stringify({ videoId: 12, videoKey: "other.mp4", price: 0, alreadyPurchased: true }),
  ),
};

describe("payment page server authority", () => {
  it("keeps file and payment requests on the page's original backend", async () => {
    const page = paymentPage();
    await page.fire("onLoad", query);
    activeApiUrl = "https://x.4mr.cn/v2";
    await page.state.handlePay();
    expect(getFile).toHaveBeenLastCalledWith(12, "https://checkin.voxel.cn/api/v2");
    expect(pay).toHaveBeenCalledWith(
      expect.objectContaining({ file_id: 12 }),
      "https://checkin.voxel.cn/api/v2",
    );
  });
  it("ignores free/purchased navigation flags and pays the server amount", async () => {
    const page = paymentPage();
    await page.fire("onLoad", query);
    expect(page.state.paymentInfo.value).toMatchObject({
      videoId: 12,
      videoKey: "owner.mp4",
      price: 100,
    });
    expect(page.state.alreadyPurchased.value).toBe(false);
    await page.state.handlePay();
    expect(pay).toHaveBeenCalledWith(
      expect.objectContaining({ file_id: 12, amount: 100 }),
      "https://checkin.voxel.cn/api/v2",
    );
    expect(download).not.toHaveBeenCalled();
  });

  it("shows unknown historical pricing and never starts a free download", async () => {
    getFile.mockResolvedValue({ ...locked, price: null });
    const page = paymentPage();
    await page.fire("onLoad", query);
    expect(nodeText(page.render())).toContain("尚未确认收费金额");
    await page.state.handlePay();
    expect(pay).not.toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
    expect(page.state.metadataLoading.value).toBe(false);
  });

  it("shows file loading failures and prevents payment", async () => {
    getFile.mockRejectedValue(new Error("无权限访问"));
    const page = paymentPage();
    await page.fire("onLoad", query);
    expect(nodeText(page.render())).toContain("无权限访问");
    expect(page.state.metadataLoading.value).toBe(false);
    await page.state.handlePay();
    expect(pay).not.toHaveBeenCalled();
  });

  it("never reads old or scoped purchased caches for v1 server-authoritative access", async () => {
    uni.setStorageSync("AR_PURCHASED_FILES", ["owner.mp4"]);
    uni.setStorageSync(`AR_PURCHASED_FILES:${encodeURIComponent(activeApiUrl)}`, ["owner.mp4"]);
    const readStorage = vi.spyOn(uni, "getStorageSync");
    try {
      const page = paymentPage();
      await page.fire("onLoad", query);
      expect(page.state.alreadyPurchased.value).toBe(false);
      await page.state.handlePay();
      expect(pay).toHaveBeenCalledOnce();
      expect(download).not.toHaveBeenCalled();
      expect(
        readStorage.mock.calls.every(([key]) => !String(key).startsWith("AR_PURCHASED_FILES")),
      ).toBe(true);
    } finally {
      readStorage.mockRestore();
    }
  });

  it("rechecks server unlocking after payment before downloading", async () => {
    pay.mockResolvedValue(true);
    const page = paymentPage();
    await page.fire("onLoad", query);
    await page.state.handlePay();
    expect(getFile).toHaveBeenCalledTimes(3);
    expect(download).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining("尚未确认") }),
    );
    expect(page.state.loading.value).toBe(false);
  });
});

const legacyApi = "https://x.4mr.cn/v2";
const legacyCache = `AR_PURCHASED_FILES:${encodeURIComponent(legacyApi)}`;
const legacyQuery = (
  params: Record<string, unknown> = { videoKey: "legacy.mp4", price: 100, shots: [1, 2] },
) => ({
  params: encodeURIComponent(JSON.stringify(params)),
});

describe("legacy payment page compatibility", () => {
  beforeEach(() => {
    activeApiUrl = legacyApi;
  });

  it("uses the original route and does not request the new file metadata API", async () => {
    const page = paymentPage();
    await page.fire("onLoad", legacyQuery());
    expect(page.state.paymentInfo.value).toMatchObject({
      videoKey: "legacy.mp4",
      price: 100,
      shots: [1, 2],
    });
    expect(getFile).not.toHaveBeenCalled();
    await page.state.handlePay();
    expect(pay).toHaveBeenCalledWith(
      { openid: "owner", amount: 100, description: "AR打卡服务:legacy.mp4" },
      legacyApi,
    );
    expect(download).not.toHaveBeenCalled();
  });

  it("keeps legacy payment and signing on the page backend after a later scan", async () => {
    pay.mockResolvedValue(true);
    download.mockResolvedValue(false);
    const page = paymentPage();
    await page.fire("onLoad", legacyQuery());
    activeApiUrl = "https://checkin.voxel.cn/api/v2";
    await page.state.handlePay();
    expect(pay).toHaveBeenLastCalledWith(expect.objectContaining({ amount: 100 }), legacyApi);
    expect(signed).toHaveBeenLastCalledWith("legacy.mp4", false, 0.01, legacyApi);
    expect(getFile).not.toHaveBeenCalled();
    expect(uni.getStorageSync(legacyCache)).toEqual(["legacy.mp4"]);
  });

  it("retains free legacy record downloads when the route explicitly supplies zero", async () => {
    download.mockResolvedValue(false);
    const page = paymentPage();
    await page.fire("onLoad", legacyQuery({ videoKey: "legacy.mp4", price: 0 }));
    await page.state.handlePay();
    expect(pay).not.toHaveBeenCalled();
    expect(download).toHaveBeenCalledOnce();
    expect(getFile).not.toHaveBeenCalled();
  });

  it("uses only the selected backend's purchased-file cache", async () => {
    uni.setStorageSync(legacyCache, ["legacy.mp4"]);
    download.mockResolvedValue(false);
    const page = paymentPage();
    await page.fire("onLoad", legacyQuery());
    expect(page.state.alreadyPurchased.value).toBe(true);
    await page.state.handlePay();
    expect(pay).not.toHaveBeenCalled();
    expect(download).toHaveBeenCalledOnce();
  });

  it("does not accept another backend cache or purchased navigation flags", async () => {
    uni.setStorageSync(
      `AR_PURCHASED_FILES:${encodeURIComponent("https://checkin.voxel.cn/api/v2")}`,
      ["legacy.mp4"],
    );
    const page = paymentPage();
    await page.fire(
      "onLoad",
      legacyQuery({ videoKey: "legacy.mp4", price: 100, alreadyPurchased: true }),
    );
    expect(page.state.alreadyPurchased.value).toBe(false);
    await page.state.handlePay();
    expect(pay).toHaveBeenCalledOnce();
    expect(uni.getStorageSync(legacyCache)).toBeFalsy();
  });

  it("keeps old purchased legacy files available without charging or rewriting the old cache", async () => {
    const oldPurchases = ["legacy.mp4", "older.mp4"];
    uni.setStorageSync("AR_PURCHASED_FILES", oldPurchases);
    download.mockResolvedValue(false);
    const page = paymentPage();
    await page.fire("onLoad", legacyQuery());
    expect(page.state.alreadyPurchased.value).toBe(true);
    await page.state.handlePay();
    expect(pay).not.toHaveBeenCalled();
    expect(download).toHaveBeenCalledOnce();
    expect(uni.getStorageSync("AR_PURCHASED_FILES")).toEqual(oldPurchases);
    expect(uni.getStorageSync(legacyCache)).toBeFalsy();
  });

  it("writes new legacy purchases only to the scoped cache without copying old entries", async () => {
    uni.setStorageSync("AR_PURCHASED_FILES", ["older.mp4"]);
    uni.setStorageSync(legacyCache, ["scoped.mp4"]);
    pay.mockResolvedValue(true);
    download.mockResolvedValue(false);
    const page = paymentPage();
    await page.fire("onLoad", legacyQuery());
    await page.state.handlePay();
    expect(uni.getStorageSync(legacyCache)).toEqual(["scoped.mp4", "legacy.mp4"]);
    expect(uni.getStorageSync("AR_PURCHASED_FILES")).toEqual(["older.mp4"]);
  });

  it.each(
    ["legacy.mp4", { "legacy.mp4": true }, ["legacy.mp4", {}], [null], [""], [" legacy.mp4 "]].map(
      (cache) => [cache],
    ),
  )("rejects malformed legacy purchase caches: %j", async (cache) => {
    uni.setStorageSync("AR_PURCHASED_FILES", cache);
    uni.setStorageSync(legacyCache, cache);
    const page = paymentPage();
    await page.fire("onLoad", legacyQuery());
    expect(page.state.alreadyPurchased.value).toBe(false);
    await page.state.handlePay();
    expect(pay).toHaveBeenCalledOnce();
    expect(download).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { videoKey: "legacy.mp4" },
    { videoKey: "", price: 0 },
    { videoKey: "  ", price: 0 },
    { videoKey: "../other.mp4", price: 0 },
    { videoKey: "https://other.invalid/a.mp4", price: 0 },
    { videoKey: "legacy.mp4", price: -1 },
    { videoKey: "legacy.mp4", price: 1.2 },
    { videoKey: "legacy.mp4", price: null },
    { videoKey: "legacy.mp4", price: "0" },
  ])("rejects invalid route data without defaulting it to a free file: %j", async (params) => {
    const page = paymentPage();
    await page.fire("onLoad", legacyQuery(params));
    expect(page.state.fileError.value).toBeTruthy();
    await page.state.handlePay();
    expect(pay).not.toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
    expect(getFile).not.toHaveBeenCalled();
  });

  it("allows retry after cancellation and only caches a successful payment", async () => {
    download.mockResolvedValue(false);
    pay.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const page = paymentPage();
    await page.fire("onLoad", legacyQuery());
    await page.state.handlePay();
    expect(page.state.loading.value).toBe(false);
    expect(uni.getStorageSync(legacyCache)).toBeFalsy();
    await page.state.handlePay();
    expect(pay).toHaveBeenCalledTimes(2);
    expect(download).toHaveBeenCalledOnce();
    expect(uni.getStorageSync(legacyCache)).toEqual(["legacy.mp4"]);
  });

  it("ignores duplicate clicks while payment is pending", async () => {
    let settle!: (value: boolean) => void;
    pay.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          settle = resolve;
        }),
    );
    const page = paymentPage();
    await page.fire("onLoad", legacyQuery());
    const first = page.state.handlePay();
    await vi.waitFor(() => expect(pay).toHaveBeenCalledOnce());
    await page.state.handlePay();
    expect(pay).toHaveBeenCalledOnce();
    settle(false);
    await first;
  });

  it("does not download after the page has closed during payment", async () => {
    let settle!: (value: boolean) => void;
    pay.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          settle = resolve;
        }),
    );
    const page = paymentPage();
    await page.fire("onLoad", legacyQuery());
    const first = page.state.handlePay();
    await vi.waitFor(() => expect(pay).toHaveBeenCalledOnce());
    await page.fire("onUnload");
    settle(true);
    await first;
    expect(download).not.toHaveBeenCalled();
  });
});
