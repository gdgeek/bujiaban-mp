/**
 * 用户相关类型定义
 */

/** 用户基础信息 */
export interface UserInfo {
  id: number;
  avatar: string;
  nickname: string;
  role: "root" | "manager" | "user" | string;
  tel: string;
}

/** 认证Token */
export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expires: string;
}

/** 用户ID信息（用于本地存储） */
export interface UserIdentity {
  token: AuthToken;
  user: UserInfo | null;
  openid: string;
  unionid: string;
}
