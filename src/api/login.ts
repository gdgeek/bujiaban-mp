import { wxLogin, type UserType } from "./checkin";
import { type IDType } from "@/api/checkin";
import { loadId, saveId, clearId } from "@/utils/common";
import { post } from "@/utils/request";
import config from "@/config";

const pendingLogins = new Map<string, Promise<IDType>>();

export interface RegistResponse {
  success: boolean;
  message: string;
  data: {
    user: UserType;
  };
}

export const regist = async (code: string): Promise<RegistResponse> => {
  return post<RegistResponse>("/wechat/bind-phone", { code });
};

export const login = (
  refresh: boolean = false,
  apiUrl: string = config.apiUrl,
): Promise<IDType> => {
  const apiBase = apiUrl.replace(/\/+$/, "");
  const pendingLogin = pendingLogins.get(apiBase);
  if (pendingLogin) return pendingLogin;
  const id = loadId(apiBase);
  if (!refresh && id) return Promise.resolve(id);

  const nextLogin = wxLogin(apiBase)
    .then((res) => {
      saveId(res.data, apiBase);
      return res.data;
    })
    .catch((error) => {
      clearId(apiBase);
      throw error;
    })
    .finally(() => {
      pendingLogins.delete(apiBase);
    });
  pendingLogins.set(apiBase, nextLogin);
  return nextLogin;
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
  return post<ProfileResponse>("/wechat/profile", { nickname, avatar });
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
  return post<BindPhoneResponse>("/wechat/phone", payload);
};
