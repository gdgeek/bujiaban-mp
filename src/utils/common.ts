import CryptoJS from "crypto-js";
import global from "@/utils/global";
import { type FileType, type IDType, type ApiResponse } from "@/services/checkin";

// 从本地存储读取 accessToken（不引入跨文件依赖）
const OPENID_STORAGE_KEY = "AR_CHECKIN_OPENID";
function getAccessTokenFromStorage(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stored: IDType = uni.getStorageSync(OPENID_STORAGE_KEY);
    return stored?.token?.accessToken ?? null;
  } catch (e) {
    console.warn("读取 accessToken 失败:", e);
    return null;
  }
}

function buildAuthHeader(): Record<string, string> {
  const at = getAccessTokenFromStorage();
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
  const salt = "buj1aban.c0m";
  const str = token + time + param + salt;
  console.log("hash", CryptoJS.MD5(str).toString());
  return CryptoJS.MD5(str).toString();
}
export function getFileList(id: string): Promise<FileType[]> {
  const url = `${global.url}/files/list?unionid=${id}`;
  return new Promise((resolve, reject) => {
    wx.request({
      url: url,
      method: "GET",
      header: {
        ...buildAuthHeader(),
      },
      success: (res) => {
        console.log("请求成功:", res.data);
        resolve(res.data as FileType[]);
      },
      fail: (err) => {
        console.error("请求失败:", err);
        reject(err);
      },
    });
  });
  //console.error("请求URL:", url);
}
/*
export function getUrl(token: string, id: string, expand: string = "token,file"): string {
  const time: string = Math.floor(Date.now() / 1000).toString();
  const hash = calculateHash(token, time, id);
  const url = `${global.url}/server/applet?time=${time}&hash=${hash}&expand=${expand}`;
  /*wx.request({
    url: url,
    method: "GET",
    header: {
      ...buildAuthHeader(),
    },
    success: (res) => {
      console.log("请求成功:", res.data);
    },
    fail: (err) => {
      console.error("请求失败:", err);
    },
  });
  //console.error("请求URL:", url);
  return url;
}*/
export function postData(
  id: string,
  token: string,
  status: string | undefined | null,
  context: any | undefined | null,
  expand: string = "token,file",
): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const time: string = Math.floor(Date.now() / 1000).toString();
    const hash = calculateHash(token, time, id);
    const url = `${global.url}/applet/refresh?time=${time}&hash=${hash}&expand=${expand}`;
    //const url = getUrl(token, id, expand);
    //console.error("请求URL:", token);
    let data: { token: string; id: string; status?: string; data?: string } = { token, id };

    if (context) {
      data = { ...data, data: JSON.stringify(context) };
    }
    if (status) {
      data = { ...data, status };
    }

    // console.error("请求数据:", data);

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
        console.log("本地状态刷新成功！", res.data);
        //console.error(res.data);
        resolve(res.data as ApiResponse);
      },
      fail: function (res) {
        console.log("本地状态刷新失败！", res.errMsg);
        reject(res.errMsg);
      },
    });
  });
}
