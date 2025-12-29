import CryptoJS from "crypto-js";
import config from "@/config";
import type { FileType, IDType, ApiResponse } from "@/services/checkin";

// 从本地存储读取 accessToken（不引入跨文件依赖）

const OPENID_STORAGE_KEY = "AR_CHECKIN_OPENID";
export const saveId = (id: IDType) => {
  try {
    uni.setStorageSync(OPENID_STORAGE_KEY, id);
    console.debug("[common] openid已成功保存到本地存储");
  } catch (e) {
    console.error("[common] 保存openid到本地存储失败:", e);
  }
};

/**
 * 从本地存储获取openid
 */
export const loadId = (): IDType | null => {
  try {
    const storedOpenid = uni.getStorageSync(OPENID_STORAGE_KEY);
    return storedOpenid || null;
  } catch (e) {
    console.error("[common] 从本地存储获取openid失败:", e);
    return null;
  }
};

export function getToken(): string | null {
  try {
    const stored: IDType | null = loadId();
    return stored?.token?.accessToken ?? null;
  } catch (e) {
    console.warn("[common] 读取 accessToken 失败:", e);
    return null;
  }
}

export function buildAuthHeader(): Record<string, string> {
  const at = getToken();
  // 调试日志改为debug级别
  console.debug("[common] buildAuthHeader token:", at ? "***" : "null");
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

export function getFileList(id: string): Promise<FileType[]> {
  const url = `${config.apiUrl}/files/list?unionid=${id}`;
  return new Promise((resolve, reject) => {
    wx.request({
      url: url,
      method: "GET",
      header: {
        ...buildAuthHeader(),
      },
      success: (res) => {
        console.debug("[common] getFileList 成功");
        resolve(res.data as FileType[]);
      },
      fail: (err) => {
        console.error("[common] getFileList 失败:", err);
        reject(err);
      },
    });
  });
}

export function postData(
  id: string,
  token: string,
  status: string | undefined | null,
  context: unknown | undefined | null,
  expand: string = "token,file",
): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const time: string = Math.floor(Date.now() / 1000).toString();
    const hash = calculateHash(token, time, id);
    const url = `${config.apiUrl}/applet/refresh?time=${time}&hash=${hash}&expand=${expand}`;

    let data: { token: string; id: string; status?: string; data?: string } = { token, id };

    if (context) {
      data = { ...data, data: JSON.stringify(context) };
    }
    if (status) {
      data = { ...data, status };
    }

    // 发送请求
    wx.request({
      url: url,
      method: "POST",
      header: {
        ...buildAuthHeader(),
        "Content-Type": "application/json",
      },
      data,
      success: function (res) {
        console.debug("[common] postData 成功");
        resolve(res.data as ApiResponse);
      },
      fail: function (res) {
        console.warn("[common] postData 失败:", res.errMsg);
        reject(res.errMsg);
      },
    });
  });
}
