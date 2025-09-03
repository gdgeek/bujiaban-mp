import CryptoJS from "crypto-js";
import global from "@/utils/global";
import { buildAuthHeader } from "@/utils/common";
export interface CheckinInfo {
  created_at: string;
  //  token: string;
  id: string;
  status: string;
  updated_at: string;
}
/*
<id>2</id>
<unionid>obKwE6KHgRx3V99vceOwdh22_LRI</unionid>
<key>recode/05b2e1d67bcf4f11b20cb0f72c31e282.mp4</key>
<type>video/mp4</type>
<md5>e1c7b87eb9fa32ec94e66be743277c95</md5>
<size>42406354</size>
<bucket>game-1251022382</bucket>
<created_at>2025-05-28 14:58:30</created_at>
<unlocked>0</unlocked>
 */
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
  avatar: string;
  nickname: string;
  role: string;
  tel: string;
}
export interface FileInfo {
  // token: string;
  key: string;
  //  openid: string;
  created_at: string;
  //  updated_at: string;
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
  user: UserType;
  openid: string;
  unionid: string;
}

export interface LoginResponse {
  //openid: string;
  data: IDType;
  success: boolean;
  message: string;
}

/**
 * 获取打卡状态
 * @param token 打卡token
 * @returns 打卡状态信息
 */
export const getCheckinStatus = async (token: string): Promise<ApiResponse> => {
  return new Promise((resolve, reject) => {
    reject();
  });
};

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
              console.error("data", res.data);
              resolve(res.data as LoginResponse);
            },
            fail: function (res) {
              console.log("请求openid失败！", res.errMsg);
              reject(res.errMsg);
            },
          });
        } else {
          console.log("微信登录失败！", res.errMsg);
          reject(res.errMsg);
        }
      },
      fail: function (res) {
        console.log("微信登录失败！", res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};

/**
 * 设置打卡为ready状态
 * @param openid 用户openid
 * @param token 打卡token
 * @returns 打卡状态信息
 */
export const setCheckinReady = async (id: string, token: string): Promise<ApiResponse> => {
  return localRefresh(token, id, "ready");
};

/**
 * 设置打卡为over状态
 * @param openid 用户openid
 * @param token 打卡token
 * @returns 打卡状态信息
 */
export const setCheckinOver = async (id: string, token: string): Promise<ApiResponse> => {
  return localRefresh(token, id, "over");
};

/**
 * 设置打卡为linked状态
 * @param openid 用户openid
 * @param token 打卡token
 * @returns 打卡状态信息
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

/**
 * 计算hash值
 * @param token 设备/用户标识符
 * @param time 时间戳
 * @param param 参数值(device/openid/key其中之一)
 * @returns hash值
 */
export const calculateHash = (token: string, time: string, param: string): string => {
  const salt = "buj1aban.c0m";
  const str = token + time + param + salt;
  console.log("hash", CryptoJS.MD5(str).toString());
  return CryptoJS.MD5(str).toString();
};

/**
 * 本地状态刷新接口
 * @param token 设备/用户标识符，格式：[A-Z][0-9a-f]{32}
 * @param options 可选参数对象，包含device、openid、key三选一
 * @param options.device 设备标识符
 * @param options.openid 微信用户openid
 * @param options.key 文件键值
 * @param options.status 状态信息
 * @param options.data 附加数据
 * @returns 接口响应
 */
export const localRefresh = async (
  token: string,
  id: string,
  status?: string,
  idata: string | object = "",
): Promise<ApiResponse> => {
  return new Promise((resolve, reject) => {
    // 获取提供的参数值(用于计算hash)
    const param = id;

    // 生成时间戳
    const time = Math.floor(Date.now() / 1000).toString();

    // 计算hash
    const hash = calculateHash(token, time, id);

    // 准备请求数据
    const data: any = {
      token,
      id,
      status,
      data: typeof idata === "string" ? idata : JSON.stringify(idata),
    };

    // 添加三选一参数
    //if (options.device) data.device = options.device;
    // if (options.id) data.id = options.id;
    //if (options.key) data.key = options.key;
    // data.id = id;
    //  data.status = status;
    // data.data = typeof data.data === "string" ? data.data : JSON.stringify(data.data);

    // 发送请求
    wx.request({
      url: `${global.url}/server/applet?time=${time}&hash=${hash}&expand=token,file,device,setup,applet`,
      method: "POST",
      header: {
        ...buildAuthHeader(),
        "Content-Type": "application/json",
      },
      data,
      success: function (res) {
        console.log("本地状态刷新成功！", res.data);
        resolve(res.data as ApiResponse);
      },
      fail: function (res) {
        console.log("本地状态刷新失败！", res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};
