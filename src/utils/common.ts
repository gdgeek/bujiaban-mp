import CryptoJS from "crypto-js";

import { type StatusData, type ApiResponse } from "@/services/checkin";

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

export function getUrl(token: string, openid: string): string {
  const time: string = Math.floor(Date.now() / 1000).toString();
  const hash = calculateHash(token, time, openid);
  const url = "https://w.4mr.cn/v1/local/refresh?time=" + time + "&hash=" + hash;
  return url;
}
export function postData(data: any): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const url = getUrl(data.token, data.openid);
    // 发送请求
    wx.request({
      url: url,
      method: "POST",
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
