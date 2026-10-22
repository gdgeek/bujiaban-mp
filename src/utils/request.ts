/**
 * 统一HTTP请求封装
 * 提供标准化的请求方法，自动处理认证头和错误
 */

import { clearId, getToken } from "./common";
import config from "@/config";
import { getApiUrlForVersion } from "@/config/backend";
import { login } from "@/api/login";

// Retain the outcome for late 401s from requests sent before the same recovery attempt.
const recoveries = new Map<string, { promise: Promise<void>; pending: boolean }>();

/** 请求配置选项 */
export interface RequestOptions {
  /** 请求URL路径（相对于baseUrl）或完整URL */
  url: string;
  /** 请求方法 */
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** 请求数据 */
  data?: Record<string, unknown> | string;
  /** 额外请求头 */
  header?: Record<string, string>;
  /** 基础URL，默认使用config.apiUrl */
  baseUrl?: string;
}

/** API响应结构 */
export interface ApiResult<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * 发送HTTP请求
 * @param options 请求配置
 * @returns Promise响应数据
 */
export function request<T = unknown>(options: RequestOptions): Promise<T> {
  const activeApiUrl = config.apiUrl.replace(/\/+$/, "");
  const { url, method = "GET", data, header = {}, baseUrl = activeApiUrl } = options;

  // 构建完整URL
  const fullUrl = /^https?:\/\//i.test(url)
    ? url
    : `${baseUrl.replace(/\/+$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;

  const apiBase = [activeApiUrl, getApiUrlForVersion(0), getApiUrlForVersion(1)]
    .map((api) => api.replace(/\/+$/, ""))
    .sort((left, right) => right.length - left.length)
    .find(
      (api) => fullUrl === api || fullUrl.startsWith(`${api}/`) || fullUrl.startsWith(`${api}?`),
    );
  const hasExplicitAuth = Object.keys(header).some((key) => key.toLowerCase() === "authorization");
  const usesLocalCredentials = !!apiBase && !hasExplicitAuth;
  const recoveryAtStart = apiBase ? recoveries.get(apiBase) : undefined;

  async function recover(sentToken: string | null): Promise<void> {
    try {
      if (!apiBase) throw new Error("未授权");
      const current = getToken(apiBase);
      // Another request may already have replaced the token while this 401 was in flight.
      if (current && current !== sentToken) return;
      const lastRecovery = recoveries.get(apiBase);
      if (lastRecovery && (lastRecovery.pending || lastRecovery !== recoveryAtStart)) {
        await lastRecovery.promise;
        return;
      }
      const recovery = { promise: login(true, apiBase).then(() => {}), pending: true };
      recoveries.set(apiBase, recovery);
      try {
        await recovery.promise;
      } finally {
        recovery.pending = false;
      }
    } catch {
      throw new Error("未授权，重新登录失败，请重试");
    }
  }

  function send(retried: boolean): Promise<T> {
    const sentToken = usesLocalCredentials && apiBase ? getToken(apiBase) : null;
    return new Promise((resolve, reject) => {
      wx.request({
        url: fullUrl,
        method,
        header: {
          ...(sentToken ? { Authorization: `Bearer ${sentToken}` } : {}),
          "Content-Type": "application/json",
          ...header,
        },
        data: typeof data === "string" ? data : data,
        success: (res) => {
          const statusCode = res.statusCode;
          if (statusCode >= 200 && statusCode < 300) {
            resolve(res.data as T);
          } else if (statusCode === 401) {
            if (usesLocalCredentials && !retried) {
              recover(sentToken)
                .then(() => send(true))
                .then(resolve, reject);
            } else {
              if (usesLocalCredentials && apiBase && sentToken === getToken(apiBase))
                clearId(apiBase);
              reject(new Error("未授权，请重新登录"));
            }
          } else if (statusCode === 403) {
            console.warn("[request] 无权限访问");
            reject(new Error("无权限访问"));
          } else if (statusCode >= 500) {
            console.warn("[request] 服务器错误:", statusCode);
            reject(new Error("服务器错误，请稍后重试"));
          } else {
            console.warn("[request] 请求失败:", statusCode, res.data);
            reject(new Error(`请求失败: ${statusCode}`));
          }
        },
        fail: (err) => {
          console.warn("[request] 网络请求失败:", err.errMsg);
          reject(new Error(err.errMsg || "网络请求失败"));
        },
      });
    });
  }

  return send(false);
}

/**
 * GET请求快捷方法
 */
export function get<T = unknown>(
  url: string,
  params?: Record<string, unknown>,
  baseUrl?: string,
): Promise<T> {
  let finalUrl = url;
  if (params) {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    if (query) {
      finalUrl += (url.includes("?") ? "&" : "?") + query;
    }
  }
  return request<T>({ url: finalUrl, method: "GET", baseUrl });
}

/**
 * POST请求快捷方法
 */
export function post<T = unknown>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: "POST", data });
}

/**
 * PUT请求快捷方法
 */
export function put<T = unknown>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: "PUT", data });
}

/**
 * DELETE请求快捷方法
 */
export function del<T = unknown>(url: string): Promise<T> {
  return request<T>({ url, method: "DELETE" });
}

export default { request, get, post, put, del };
