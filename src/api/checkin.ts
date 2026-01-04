import global from "@/utils/global";
import { buildAuthHeader, calculateHash } from "@/utils/common";
import logger from "@/utils/logger";

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
  unionid: string;
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
export const wxLogin = async (): Promise<LoginResponse> => {
  return new Promise((resolve, reject) => {
    wx.login({
      success: function (res) {
        if (res.code) {
          wx.request({
            url: `${global.url}/site/login`,
            data: {
              code: res.code,
            },
            method: "POST",
            success: function (res) {
              logger.debug("checkin", "wxLogin 成功");
              resolve(res.data as LoginResponse);
            },
            fail: function (res) {
              console.warn("[checkin] 请求openid失败:", res.errMsg);
              reject(res.errMsg);
            },
          });
        } else {
          console.warn("[checkin] 微信登录失败:", res.errMsg);
          reject(res.errMsg);
        }
      },
      fail: function (res) {
        console.warn("[checkin] 微信登录失败:", res.errMsg);
        reject(res.errMsg);
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
  return new Promise((resolve, reject) => {
    const time = Math.floor(Date.now() / 1000).toString();
    const hash = calculateHash(token, time, id);

    const data: LocalRefreshData = {
      token,
      id,
      status,
      data: typeof idata === "string" ? idata : JSON.stringify(idata),
    };

    wx.request({
      url: `${global.url}/server/applet?time=${time}&hash=${hash}&expand=token,file,device,setup,applet`,
      method: "POST",
      header: {
        ...buildAuthHeader(),
        "Content-Type": "application/json",
      },
      data,
      success: function (res) {
        logger.debug("checkin", "localRefresh 成功");
        resolve(res.data as ApiResponse);
      },
      fail: function (res) {
        console.warn("[checkin] localRefresh 失败:", res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};
