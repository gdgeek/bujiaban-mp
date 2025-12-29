/**
 * 事件类型定义
 * 用于消除页面和组件中事件处理的 any 类型
 */

/** uni-app 输入事件 - 兼容内置类型 */
export interface UniInputEvent {
  detail: {
    value: string;
    cursor?: number;
    keyCode?: number;
  };
  target?: {
    id?: string;
    dataset?: Record<string, unknown>;
  };
}

/** uni-app 选择器变更事件 */
export interface UniPickerChangeEvent {
  detail: {
    value: number | number[];
  };
}

/** uni-app 滑块变更事件 */
export interface UniSliderChangeEvent {
  detail: {
    value: number;
  };
}

/** uni-app 开关变更事件 */
export interface UniSwitchChangeEvent {
  detail: {
    value: boolean;
  };
}

/** uni-app 表单提交事件 */
export interface UniFormSubmitEvent {
  detail: {
    value: Record<string, unknown>;
  };
}

/** 微信小程序获取手机号事件 */
export interface WxGetPhoneNumberEvent {
  detail: {
    code?: string;
    encryptedData?: string;
    iv?: string;
    errMsg?: string;
    cloudID?: string;
  };
}

/** 微信小程序获取用户信息响应 */
export interface WxUserInfo {
  nickName: string;
  avatarUrl: string;
  gender: number;
  country: string;
  province: string;
  city: string;
  language: string;
}

/** 微信小程序获取用户信息事件 */
export interface WxGetUserInfoEvent {
  detail: {
    userInfo?: WxUserInfo;
    rawData?: string;
    signature?: string;
    encryptedData?: string;
    iv?: string;
    errMsg?: string;
  };
}

/** 微信 getUserProfile 响应 */
export interface WxUserProfileResult {
  userInfo: WxUserInfo;
  rawData?: string;
  signature?: string;
  encryptedData?: string;
  iv?: string;
}

/** web-view 消息事件 */
export interface WebViewMessageEvent {
  detail: {
    data: unknown[];
  };
}

/** web-view 加载完成事件 */
export interface WebViewLoadEvent {
  detail: {
    src: string;
  };
}

/** 视频元数据加载事件 */
export interface VideoMetadataEvent {
  detail: {
    width: number;
    height: number;
    duration: number;
  };
}

/** 视频错误事件 */
export interface VideoErrorEvent {
  detail: {
    errMsg: string;
  };
}

/** 通用错误事件 */
export interface UniErrorEvent {
  detail?: {
    errMsg?: string;
  };
  errMsg?: string;
}
