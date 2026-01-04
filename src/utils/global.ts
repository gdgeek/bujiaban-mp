/**
 * 全局配置
 * @deprecated 请使用 @/config 代替
 */
import config from "@/config";

export default {
  url: config.apiUrl,
  key: config.hashSalt,
};
