/**
 * API相关类型定义
 */

/** 通用API响应结构 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

/** 分页参数 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
