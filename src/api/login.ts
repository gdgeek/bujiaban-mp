import { wxLogin, type UserType } from "./checkin";
import { type IDType } from "@/api/checkin";
import { loadId, saveId, buildAuthHeader } from "@/utils/common";
import config from "@/config";
import logger from "@/utils/logger";

const isExpired = (expires: string) => {
  const now = new Date();
  const expireTime = new Date(expires);
  return new Date(now.getTime() + 3000) > expireTime; // 三秒后过期
};

export interface RegistResponse {
  success: boolean;
  message: string;
  data: {
    user: UserType;
  };
}

export const regist = async (code: string): Promise<RegistResponse> => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.apiUrl}/wechat/bind-phone`,
      method: "POST",
      header: {
        ...buildAuthHeader(),
        "Content-Type": "application/json",
      },
      data: { code },
      success: (res) => {
        logger.debug("login", "bind-phone 成功");
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as RegistResponse);
        } else {
          reject({ success: false, message: res.errMsg, data: { user: null } });
        }
      },
      fail: () => {
        console.warn("[login] 注册失败");
        reject({ success: false, message: "请求失败", data: { user: null } });
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

export interface ProfileResponse {
  success: boolean;
  message: string;
  data: {
    user: UserType;
  };
}

// 绑定/上报用户资料（昵称、头像）
export const profile = async (nickname: string, avatar: string): Promise<ProfileResponse> => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.apiUrl}/wechat/profile`,
      method: "POST",
      header: {
        ...buildAuthHeader(),
        "Content-Type": "application/json",
      },
      data: { nickname, avatar },
      success: (res) => {
        logger.debug("login", "profile 成功");
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as ProfileResponse);
        } else {
          reject(res.errMsg);
        }
      },
      fail: (e) => {
        console.warn("[login] profile 失败:", e);
        reject(e);
      },
    });
  });
};

export interface BindPhoneResponse {
  success: boolean;
  message: string;
  data: {
    user: UserType;
  };
}

// 绑定/校验手机号：优先走 code 模式（新版 getPhoneNumber），兼容加密数据
export const bindPhone = async (
  payload: { code: string } | { encryptedData: string; iv: string; code?: string },
): Promise<BindPhoneResponse> => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.apiUrl}/wechat/phone`,
      method: "POST",
      header: {
        ...buildAuthHeader(),
        "Content-Type": "application/json",
      },
      data: payload,
      success: (res) => {
        logger.debug("login", "bindPhone 成功");
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as BindPhoneResponse);
        } else {
          reject({ success: false, message: res.errMsg, data: { user: null } });
        }
      },
      fail: () => {
        reject({ success: false, message: "请求失败", data: { user: null } });
      },
    });
  });
};
