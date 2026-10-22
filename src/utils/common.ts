import CryptoJS from "crypto-js";
import config from "@/config";
import type { FileType, IDType, ApiResponse } from "@/api/checkin";
import { get, request } from "./request";
import logger from "@/utils/logger";

// 从本地存储读取 accessToken（不引入跨文件依赖）

const OPENID_STORAGE_KEY = "AR_CHECKIN_OPENID";

function idStorageKey(apiUrl: string): string {
  return `${OPENID_STORAGE_KEY}:${encodeURIComponent(apiUrl.replace(/\/+$/, ""))}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

// User::token emits Asia/Shanghai dates; the device's timezone must not change their expiry.
function tokenExpiry(value: unknown): number {
  if (typeof value !== "string") return NaN;
  const local = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
  const iso =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  const parts = local || iso;
  if (!parts) return NaN;
  const [year, month, day, hour, minute, second] = parts.slice(1, 7).map(Number);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate() ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  )
    return NaN;
  return local ? Date.UTC(year, month - 1, day, hour - 8, minute, second) : Date.parse(value);
}

/** Credentials must be usable before they enter storage or an Authorization header. */
export function isValidId(value: unknown): value is IDType {
  if (!isRecord(value) || !isRecord(value.token)) return false;
  const token = value.token;
  const isBearer = (part: unknown) =>
    typeof part === "string" && /^[A-Za-z0-9._~-]{1,8192}$/.test(part);
  return (
    typeof value.openid === "string" &&
    !!value.openid.trim() &&
    (typeof value.unionid === "string" || value.unionid === null) &&
    (value.user === null ||
      (isRecord(value.user) && Number.isSafeInteger(value.user.id) && Number(value.user.id) > 0)) &&
    isBearer(token.accessToken) &&
    isBearer(token.refreshToken) &&
    tokenExpiry(token.expires) > Date.now() + 3000
  );
}

export function clearId(apiUrl: string = config.apiUrl): void {
  try {
    uni.removeStorageSync(idStorageKey(apiUrl));
    uni.removeStorageSync(OPENID_STORAGE_KEY);
  } catch (e) {
    console.error("[common] 清除登录凭据失败:", e);
  }
}

export const saveId = (id: IDType, apiUrl: string = config.apiUrl) => {
  if (!isValidId(id)) return;
  try {
    uni.setStorageSync(idStorageKey(apiUrl), id);
    uni.removeStorageSync(OPENID_STORAGE_KEY);
    logger.debug("common", "openid已成功保存到本地存储");
  } catch (e) {
    console.error("[common] 保存openid到本地存储失败:", e);
  }
};

/**
 * 从本地存储获取openid
 */
export const loadId = (apiUrl: string = config.apiUrl): IDType | null => {
  try {
    const storageKey = idStorageKey(apiUrl);
    const storedOpenid: unknown = uni.getStorageSync(storageKey);
    if (isValidId(storedOpenid)) return storedOpenid;
    if (storedOpenid !== "" && storedOpenid !== undefined && storedOpenid !== null) {
      clearId(apiUrl);
      return null;
    }
    // Historical releases shared this key across multiple APIs, so its origin is unknowable.
    uni.removeStorageSync(OPENID_STORAGE_KEY);
    return null;
  } catch (e) {
    console.error("[common] 从本地存储获取openid失败:", e);
    return null;
  }
};

export function getToken(apiUrl: string = config.apiUrl): string | null {
  try {
    const stored: IDType | null = loadId(apiUrl);
    return stored?.token?.accessToken ?? null;
  } catch (e) {
    console.warn("[common] 读取 accessToken 失败:", e);
    return null;
  }
}

export function buildAuthHeader(apiUrl: string = config.apiUrl): Record<string, string> {
  const at = getToken(apiUrl);
  // 调试日志改为debug级别
  logger.debug("common", "buildAuthHeader token:", at ? "***" : "null");
  return at ? { Authorization: `Bearer ${at}` } : {};
}

/**
 * 计算hash值
 * @param token 设备/用户标识符
 * @param time 时间戳
 * @param param 参数值(device/openid/key其中之一)
 * @returns hash值
 */
export function calculateHash(token: string, time: string, param: string): string {
  const str = token + time + param + config.hashSalt;
  return CryptoJS.MD5(str).toString();
}

export async function getFileList(
  id: string | null,
  apiUrl: string = config.apiUrl,
): Promise<FileType[]> {
  const files = await get<FileType[]>("/files/list", { unionid: id }, apiUrl);
  if (!Array.isArray(files)) throw new Error("文件列表响应无效，请重试");
  return files;
}

export async function postData(
  id: string | null,
  token: string,
  status: string | undefined | null,
  context: unknown | undefined | null,
  expand: string = "token,file",
  apiUrl: string = config.apiUrl,
): Promise<ApiResponse> {
  if (typeof id !== "string" || !id.trim()) {
    throw new Error("业务身份暂不可用，请重新登录");
  }
  const time = Math.floor(Date.now() / 1000).toString();
  const hash = calculateHash(token, time, id);
  const data: { token: string; id: string; status?: string; data?: string } = { token, id };
  if (context) data.data = JSON.stringify(context);
  if (status) data.status = status;
  const result = await request<ApiResponse>({
    url: `/applet/refresh?time=${time}&hash=${hash}&expand=${encodeURIComponent(expand)}`,
    method: "POST",
    data,
    baseUrl: apiUrl,
  });
  if (result?.success !== true || !result.data)
    throw new Error(result?.message || "打卡状态更新失败，请重试");
  return result;
}
