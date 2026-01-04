/* eslint-disable no-console */
/**
 * 统一日志工具类
 * 根据环境自动控制日志输出
 * - 开发环境: 启用所有日志
 * - 生产环境: 仅保留 warn 和 error
 */

/** 判断是否为生产环境 */
const isProduction =
  import.meta.env?.MODE === "production" || process.env.NODE_ENV === "production";

/** 日志级别 */
type LogLevel = "debug" | "info" | "warn" | "error";

/** 日志配置 */
interface LoggerConfig {
  /** 是否启用日志 */
  enabled: boolean;
  /** 日志前缀 */
  prefix: string;
  /** 显示时间戳 */
  showTimestamp: boolean;
}

const defaultConfig: LoggerConfig = {
  enabled: true,
  prefix: "[App]",
  showTimestamp: false,
};

let config = { ...defaultConfig };

/**
 * 格式化日志消息
 */
const formatMessage = (level: LogLevel, tag: string, message: string): string => {
  const prefix = config.prefix;
  const timestamp = config.showTimestamp ? `[${new Date().toISOString()}]` : "";
  return `${timestamp}${prefix}[${tag}] ${message}`.trim();
};

/**
 * 判断是否应该输出该级别的日志
 */
const shouldLog = (level: LogLevel): boolean => {
  if (!config.enabled) return false;

  // 生产环境只输出 warn 和 error
  if (isProduction) {
    return level === "warn" || level === "error";
  }

  return true;
};

/**
 * 统一日志工具
 */
export const logger = {
  /**
   * 调试日志 (生产环境禁用)
   * @param tag 模块标签
   * @param message 日志消息
   * @param args 额外参数
   */
  debug(tag: string, message: string, ...args: unknown[]): void {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", tag, message), ...args);
    }
  },

  /**
   * 信息日志 (生产环境禁用)
   * @param tag 模块标签
   * @param message 日志消息
   * @param args 额外参数
   */
  info(tag: string, message: string, ...args: unknown[]): void {
    if (shouldLog("info")) {
      console.log(formatMessage("info", tag, message), ...args);
    }
  },

  /**
   * 警告日志 (所有环境启用)
   * @param tag 模块标签
   * @param message 日志消息
   * @param args 额外参数
   */
  warn(tag: string, message: string, ...args: unknown[]): void {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", tag, message), ...args);
    }
  },

  /**
   * 错误日志 (所有环境启用)
   * @param tag 模块标签
   * @param message 日志消息
   * @param args 额外参数
   */
  error(tag: string, message: string, ...args: unknown[]): void {
    if (shouldLog("error")) {
      console.error(formatMessage("error", tag, message), ...args);
    }
  },

  /**
   * 配置日志工具
   * @param newConfig 新配置
   */
  configure(newConfig: Partial<LoggerConfig>): void {
    config = { ...config, ...newConfig };
  },

  /**
   * 重置配置为默认值
   */
  reset(): void {
    config = { ...defaultConfig };
  },

  /**
   * 获取当前是否为生产环境
   */
  isProduction(): boolean {
    return isProduction;
  },
};

export default logger;
