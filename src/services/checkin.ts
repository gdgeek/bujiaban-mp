// 定义接口类型
export interface CheckinInfo {
  created_at: string;
  token: string;
  openid: string;
  status: string;
  updated_at: string;
}

export interface FileInfo {
  token: string;
  key: string;
  openid: string;
  created_at: string;
}

export interface StatusData {
  checkin: CheckinInfo;
  file?: FileInfo | null;
}

export interface ApiResponse {
  scuess: boolean;
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
};

/**
 * 设置打卡为over状态
 * @param openid 用户openid
 * @param token 打卡token
 * @returns 打卡状态信息
 */
export const setCheckinOver = async (openid: string, token: string): Promise<ApiResponse> => {
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
};

/**
 * 设置打卡为linked状态
 * @param openid 用户openid
 * @param token 打卡token
 * @returns 打卡状态信息
 */
export const setCheckinLinked = async (openid: string, token: string): Promise<ApiResponse> => {
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
};

/**
 * 删除打卡
 * @param openid 用户openid
 * @returns 删除结果
 */
export const deleteCheckin = async (openid: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/close?openid=" + openid,
      method: "DELETE",
      success: function (res) {
        console.log("删除打卡成功！", res.data);
        resolve(res.data);
      },
      fail: function (res) {
        console.log("删除打卡失败！", res.errMsg);
        reject(res.errMsg);
      },
    });
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
