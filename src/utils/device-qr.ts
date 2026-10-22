export interface DeviceQr {
  token: string;
  version: number;
}

const INVALID_QR = "无效的设备二维码，请重新扫码";
const INVALID_VERSION = "设备二维码版本号无效，请检查二维码";

function isValidToken(value: unknown): value is string {
  return (
    typeof value === "string" && value.length === 33 && /^[A-Za-z][0-9A-Fa-f]{32}$/.test(value)
  );
}

function decodeParameter(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    throw new Error(INVALID_QR);
  }
}

/** QR protocol version is independent of the device software's reported version. */
export function parseDeviceQr(value: string): DeviceQr {
  if (typeof value !== "string") throw new Error(INVALID_QR);

  // URL and URLSearchParams are unavailable in some WeChat JavaScript runtimes.
  const match = /^https?:\/\/w\.4mr\.cn\/t\?([^\s#]*)(?:#[^\s]*)?$/i.exec(value);
  if (!match || match[0] !== value) throw new Error(INVALID_QR);

  let token: string | undefined;
  let versionValue: string | undefined;
  for (const field of match[1].split("&")) {
    const separator = field.indexOf("=");
    const name = decodeParameter(separator === -1 ? field : field.slice(0, separator));
    const parameter = decodeParameter(separator === -1 ? "" : field.slice(separator + 1));
    if (name === "k") {
      if (token !== undefined) throw new Error(INVALID_QR);
      token = parameter;
    } else if (name === "v") {
      if (versionValue !== undefined) throw new Error(INVALID_VERSION);
      versionValue = parameter;
    }
  }

  if (!isValidToken(token)) throw new Error(INVALID_QR);
  if (versionValue !== undefined && (!versionValue || /[^0-9]/.test(versionValue))) {
    throw new Error(INVALID_VERSION);
  }
  const version = versionValue === undefined ? 0 : Number(versionValue);
  if (!Number.isSafeInteger(version)) throw new Error(INVALID_VERSION);
  return { token, version };
}

/** Rebuild scanned URLs without dropping the protocol version during navigation. */
export function buildDeviceQr(qr: DeviceQr): string {
  if (!isValidToken(qr?.token)) throw new Error(INVALID_QR);
  if (!Number.isSafeInteger(qr.version) || qr.version < 0) throw new Error(INVALID_VERSION);
  return `https://w.4mr.cn/t?k=${qr.token}&v=${qr.version}`;
}
