/** Device QR versions select fixed API realms; QR content cannot supply an API URL. */
const currentApiUrl =
  (import.meta.env?.VITE_API_URL as string) || "https://c.4mr.cn/api/v2";
const legacyApiUrl = "https://x.4mr.cn/v2";
const selectionKey = "AR_DEVICE_QR_VERSION";
let activeVersion: 0 | 1 | undefined;

/** Keep a running operation on the payment protocol of its captured API. */
export function isLegacyApiUrl(apiUrl: string): boolean {
  return apiUrl.replace(/\/+$/, "") === legacyApiUrl;
}

export function getApiUrlForVersion(version: number): string {
  if (version === 0) return legacyApiUrl;
  if (version === 1) return currentApiUrl;
  throw new Error("该设备二维码版本暂不支持，请更新小程序");
}

export function getActiveApiUrl(): string {
  if (activeVersion === undefined) {
    try {
      const stored = typeof uni === "undefined" ? undefined : uni.getStorageSync(selectionKey);
      activeVersion = stored === 0 || stored === 1 ? stored : 1;
    } catch {
      activeVersion = 1;
    }
  }
  return getApiUrlForVersion(activeVersion ?? 1);
}

export function selectDeviceApiVersion(version: number): void {
  getApiUrlForVersion(version);
  activeVersion = version as 0 | 1;
  try {
    uni.setStorageSync(selectionKey, activeVersion);
  } catch {
    // The current session still works when persistent storage is unavailable.
    console.warn("[backend] 无法保存设备版本，下次扫码时将重新选择后端");
  }
}
