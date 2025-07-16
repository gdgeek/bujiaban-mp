import CryptoJS from "crypto-js";

export interface CheckinInfo {
  created_at: string;
  token: string;
  openid: string;
  status: string;
  updated_at: string;
}
export interface ReportInfo {
  token: string;
  device: string;
  status: string;
  created_at: string;
  updated_at: string;
  data?: string | null;
  setup?: string | null;
}
export interface FileInfo {
  token: string;
  key: string;
  openid: string;
  created_at: string;
  updated_at: string;
}

export interface StatusData {
  checkin: CheckinInfo;
  report?: ReportInfo | null;
  file?: FileInfo | null;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data: StatusData;
}

export interface LoginResponse {
  openid: string;
}

/**
 * 获取打卡状态
 * @param token 打卡token
 * @returns 打卡状态信息
 */
export const getCheckinStatus = async (token: string): Promise<ApiResponse> => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/status?token=" + token,
      method: "GET",
      success: function (res) {
        console.log("获取打卡状态成功！", res.data);
        resolve(res.data as ApiResponse);
      },
      fail: function (res) {
        console.log("获取打卡状态失败！", res.errMsg);
        reject(res.errMsg);
      },
    });
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
            url: "https://w.4mr.cn/v1/we-chat/openid",
            data: {
              code: res.code,
            },
            method: "POST",
            success: function (res) {
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
export const setCheckinReady = async (openid: string, token: string): Promise<ApiResponse> => {
  /*
  return new Promise((resolve, reject) => {
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/status-ready",
      method: "POST",
      data: {
        openid,
        token,
      },
      success: function (res) {
        console.log("设置打卡ready状态成功！", openid);
        resolve(res.data as ApiResponse);
      },
      fail: function (res) {
        console.log("设置打卡ready状态失败！", res.errMsg);
        reject(res.errMsg);
      },
    });
  });
  */

  return localRefresh(token, {
    openid,
    status: "ready",
  });
};

/**
 * 设置打卡为over状态
 * @param openid 用户openid
 * @param token 打卡token
 * @returns 打卡状态信息
 */
export const setCheckinOver = async (openid: string, token: string): Promise<ApiResponse> => {
  /*
  return new Promise((resolve, reject) => {
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/status-over",
      method: "POST",
      data: {
        openid,
        token,
      },
      success: function (res) {
        console.log("设置打卡over状态成功！", openid);
        resolve(res.data as ApiResponse);
      },
      fail: function (res) {
        console.log("设置打卡over状态失败！", res.errMsg);
        reject(res.errMsg);
      },
    });
  });
  */

  return localRefresh(token, {
    openid,
    status: "over",
  });
};

/**
 * 设置打卡为linked状态
 * @param openid 用户openid
 * @param token 打卡token
 * @returns 打卡状态信息
 */
export const setCheckinLinked = async (openid: string, token: string): Promise<ApiResponse> => {
  /*
  return new Promise((resolve, reject) => {
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/status-linked",
      method: "POST",
      data: {
        openid,
        token,
      },
      success: function (res) {
        console.log("设置打卡linked状态成功！", openid);
        resolve(res.data as ApiResponse);
      },
      fail: function (res) {
        console.log("设置打卡linked状态失败！", res.errMsg);
        reject(res.errMsg);
      },
    });
  });
  */

  return localRefresh(token, {
    openid,
    status: "linked",
  });
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
  options: {
    device?: string;
    openid?: string;
    key?: string;
    status?: string;
    data?: string | object;
  },
): Promise<ApiResponse> => {
  return new Promise((resolve, reject) => {
    // 确保只提供三选一参数中的一个
    const params = [options.device, options.openid, options.key].filter(Boolean);
    if (params.length !== 1) {
      reject("必须且只能提供device、openid、key三个参数中的一个");
      return;
    }

    // 获取提供的参数值(用于计算hash)
    const param = options.device || options.openid || options.key || "";

    // 生成时间戳
    const time = Math.floor(Date.now() / 1000).toString();

    // 计算hash
    const hash = calculateHash(token, time, param);

    // 准备请求数据
    const data: any = { token };

    // 添加三选一参数
    if (options.device) data.device = options.device;
    if (options.openid) data.openid = options.openid;
    if (options.key) data.key = options.key;

    // 添加可选参数
    if (options.status) data.status = options.status;
    if (options.data) {
      data.data = typeof options.data === "string" ? options.data : JSON.stringify(options.data);
    }

    // 发送请求
    wx.request({
      url: `https://w.4mr.cn/v1/local/refresh?time=${time}&hash=${hash}`,
      method: "POST",
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
