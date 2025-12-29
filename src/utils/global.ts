/**
 * 全局配置
 * @deprecated 请使用 @/config 代替
 */
import config from "@/config";

export default {
  url: config.apiUrl,
  a1_url: config.a1ApiUrl,
  key: config.hashSalt,
};
