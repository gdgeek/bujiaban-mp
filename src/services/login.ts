import { wxLogin } from "./checkin.ts";
import { type IDType } from "@/services/checkin";
import { loadId, saveId, buildAuthHeader } from "@/utils/common.ts";
import global from "@/utils/global";
const isExpired = (expires: string) => {
  const now = new Date();
  const expireTime = new Date(expires);

  return new Date(now.getTime() + 3000) > expireTime; //三秒后过期
};

export const regist = async (code: string): Promise<boolean> => {
  return new Promise((resolve) => {
    wx.request({
      url: `${global.url}/wechat/bind-phone`,
      method: "POST",
      header: {
        ...buildAuthHeader(),
        "Content-Type": "application/json",
      },
      data: {
        code,
      },
      success: (res) => {
        console.error("cool", res.data);
        resolve(!!(res.statusCode && res.statusCode >= 200 && res.statusCode < 300));
      },
      fail: () => {
        console.error("注册失败");
        resolve(false);
      },
    });
  });
};
export const login = async (refresh: boolean = false): Promise<IDType> => {
  return new Promise((resolve, reject) => {
    const id: IDType | null = loadId();
    if (!refresh && id && !isExpired(id.token.expires)) {
      resolve(id);
    } else {
      wxLogin()
        .then((res) => {
          saveId(res.data);
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }
  });
};

// 绑定/上报用户资料（昵称、头像）
export const profile = async (nickname: string, avatar: string): Promise<boolean> => {
  return new Promise((resolve) => {
    wx.request({
      url: `${global.url}/wechat/profile`,
      method: "POST",
      header: {
        ...buildAuthHeader(),
        "Content-Type": "application/json",
      },
      data: { nickname, avatar },
      success: (res) => {
        console.error("profile", res.data);
        resolve(!!(res.statusCode && res.statusCode >= 200 && res.statusCode < 300));
      },
      fail: (e) => {
        console.error("profile fail", e);
        resolve(false);
      },
    });
  });
};

// 绑定/校验手机号：优先走 code 模式（新版 getPhoneNumber），兼容加密数据
export const bindPhone = async (
  payload: { code: string } | { encryptedData: string; iv: string; code?: string },
): Promise<boolean> => {
  return new Promise((resolve) => {
    wx.request({
      url: `${global.url}/wechat/phone`,
      method: "POST",
      header: {
        ...buildAuthHeader(),
        "Content-Type": "application/json",
      },
      data: payload,
      success: (res) => {
        resolve(!!(res.statusCode && res.statusCode >= 200 && res.statusCode < 300));
      },
      fail: () => resolve(false),
    });
  });
};
