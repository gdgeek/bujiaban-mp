import config from "@/config";
import { calculateHash, isValidId } from "@/utils/common";
import logger from "@/utils/logger";
import { post } from "@/utils/request";

export interface CheckinInfo {
  created_at: string;
  id: string;
  status: string;
  updated_at: string;
}

export interface FileType {
  id: number;
  unionid: string;
  key: string;
  type: string;
  md5: string;
  size: number;
  bucket: string;
  created_at: string;
  unlocked: number;
  price?: number | null;
}

export interface ReportInfo {
  token: string;
  device: string;
  status: string;
  created_at: string;
  updated_at: string;
  data?: string | null;
}

export interface SetupInfo {
  money: number;
  slogans: Array<string>;
  shots: Array<number>;
  thumbs: Array<string>;
}

export interface UserType {
  id: number;
  avatar: string;
  nickname: string;
  role: string;
  tel: string;
}

export interface FileInfo {
  file_id?: number;
  key: string;
  created_at: string;
}

export interface StatusData {
  token: string;
  applet?: CheckinInfo;
  device?: ReportInfo | null;
  file?: FileInfo | null;
  setup?: SetupInfo | null;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data: StatusData;
}

export interface IDType {
  token: {
    accessToken: string;
    refreshToken: string;
    expires: string;
  };
  user: UserType | null;
  openid: string;
  unionid: string | null;
}

export interface LoginResponse {
  data: IDType;
  success: boolean;
  message: string;
}

/**
 * 微信登录获取openid
 * @returns 包含openid的对象
 */
export const wxLogin = async (apiUrl: string = config.apiUrl): Promise<LoginResponse> => {
  const apiBase = apiUrl.replace(/\/+$/, "");
  return new Promise((resolve, reject) => {
    wx.login({
      success: function (res) {
        if (typeof res.code === "string" && res.code.trim()) {
          wx.request({
            url: `${apiBase}/site/login`,
            data: {
              code: res.code,
            },
            method: "POST",
            success: function (res) {
              const body = res.data as Partial<LoginResponse> | null;
              if (
                !(res.statusCode >= 200 && res.statusCode < 300) ||
                !body ||
                body.success !== true ||
                !isValidId(body.data)
              ) {
                reject(new Error("微信登录失败，登录响应无效，请重试"));
                return;
              }
              logger.debug("checkin", "wxLogin 成功");
              resolve(body as LoginResponse);
            },
            fail: function (res) {
              console.warn("[checkin] 请求openid失败:", res.errMsg);
              reject(new Error("微信登录请求失败，请稍后重试"));
            },
          });
        } else {
          console.warn("[checkin] 微信登录失败:", res.errMsg);
          reject(new Error("微信登录失败，请重试"));
        }
      },
      fail: function (res) {
        console.warn("[checkin] 微信登录失败:", res.errMsg);
        reject(new Error("微信登录失败，请重试"));
      },
    });
  });
};

/**
 * 设置打卡为ready状态
 */
export const setCheckinReady = async (id: string, token: string): Promise<ApiResponse> => {
  return localRefresh(token, id, "ready");
};

/**
 * 设置打卡为over状态
 */
export const setCheckinOver = async (id: string, token: string): Promise<ApiResponse> => {
  return localRefresh(token, id, "over");
};

/**
 * 设置打卡为linked状态
 */
export const setCheckinLinked = async (id: string, token: string): Promise<ApiResponse> => {
  return localRefresh(token, id, "linked");
};

/**
 * 从URL中提取查询参数
 * @param url URL字符串
 * @param name 参数名
 * @returns 参数值或null
 */
export const getQueryString = (url: string, name: string): string | null => {
  const reg = new RegExp("(^|&|/?)" + name + "=([^&|/?]*)(&|/?|$)", "i");
  const r = url.substring(1).match(reg);
  if (r != null) {
    return r[2];
  }
  return null;
};

/** 本地刷新请求数据 */
interface LocalRefreshData {
  token: string;
  id: string;
  status?: string;
  data?: string;
}

/**
 * 本地状态刷新接口
 * @param token 设备/用户标识符
 * @param id 用户ID
 * @param status 状态信息
 * @param idata 附加数据
 * @returns 接口响应
 */
export const localRefresh = async (
  token: string,
  id: string,
  status?: string,
  idata: string | object = "",
): Promise<ApiResponse> => {
  const time = Math.floor(Date.now() / 1000).toString();
  const hash = calculateHash(token, time, id);
  const data: LocalRefreshData = {
    token,
    id,
    status,
    data: typeof idata === "string" ? idata : JSON.stringify(idata),
  };
  return post<ApiResponse>(
    `/server/applet?time=${time}&hash=${hash}&expand=token,file,device,setup,applet`,
    { ...data },
  );
};
