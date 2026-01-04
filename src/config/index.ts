/**
 * 应用配置模块
 * 统一管理所有配置项，从环境变量读取敏感信息
 */

// Vite 环境变量类型声明 (用于 import.meta.env 类型推断)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_A1_API_URL: string;
  readonly VITE_CLOUD_ENV: string;
  readonly VITE_HASH_SALT: string;
}

// 默认配置值（作为环境变量未设置时的后备）
const defaults = {
  apiUrl: "https://x.4mr.cn/v2",
  a1ApiUrl: "https://a1.4mr.cn/v1",
  cloudEnv: "game-9ghhigyq57e00dc3",
  hashSalt: "buj1aban.c0m",
};

/**
 * 应用配置
 * 优先从环境变量读取，如果未设置则使用默认值
 */
export const config = {
  /** 主API地址 */
  apiUrl: (import.meta.env?.VITE_API_URL as string) || defaults.apiUrl,

  /** A1 API地址 */
  a1ApiUrl: (import.meta.env?.VITE_A1_API_URL as string) || defaults.a1ApiUrl,

  /** 微信云开发环境ID */
  cloudEnv: (import.meta.env?.VITE_CLOUD_ENV as string) || defaults.cloudEnv,

  /** Hash计算盐值 */
  hashSalt: (import.meta.env?.VITE_HASH_SALT as string) || defaults.hashSalt,
} as const;

export default config;
