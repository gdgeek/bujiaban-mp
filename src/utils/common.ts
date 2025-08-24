import CryptoJS from "crypto-js";
import global from "@/utils/global";
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

export function getUrl(token: string, id: string, expand: string = "token,file"): string {
  const time: string = Math.floor(Date.now() / 1000).toString();
  const hash = calculateHash(token, time, id);
  const url = `${global.url}/server/applet?time=${time}&hash=${hash}&expand=${expand}`;
  //console.error("请求URL:", url);
  return url;
}
export function postData(
  id: string,
  token: string,
  status: string | undefined | null,
  context: any | undefined | null,
  expand: string = "token,file",
): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const url = getUrl(token, id, expand);
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
