import config from "@/config";
import { get, post, put, del } from "@/utils/request";
import type { UserType } from "@/services/checkin";

/**
 * 设备配置类型
 */
export interface SetupType {
  id?: number;
  device_id?: number;
  money: number;
  scene_id: number | null;
  shots: number[];
  slogans: string[];
  thumbs: string[];
  pictures: string[];
  title: string;
}

/**
 * 设备类型
 */
export interface DeviceType {
  id: number;
  uuid: string;
  tag: string;
  ip: string;
  setup?: SetupType;
  admin?: UserType[];
}

/**
 * 获取设备列表（支持 Yii2 风格分页与按 tag 过滤）
 */
export function getDevices(params?: {
  tag?: string;
  page?: number;
  pageSize?: number;
}): Promise<DeviceType[]> {
  const query: Record<string, unknown> = { expand: "admin" };
  if (params?.tag) query.tag = params.tag;
  if (typeof params?.page === "number") query.page = params.page;
  if (typeof params?.pageSize === "number") query["per-page"] = params.pageSize;

  return get<DeviceType[]>("/devices", query);
}

/**
 * 创建设备
 */
export function postDevice(data: DeviceType): Promise<DeviceType> {
  return post<DeviceType>("/devices", data as unknown as Record<string, unknown>);
}

/**
 * 更新设备
 */
export function putDevice(id: number, data: Partial<DeviceType>): Promise<DeviceType> {
  return put<DeviceType>(`/devices/${id}`, data as unknown as Record<string, unknown>);
}

/**
 * 更新设备配置
 */
export function putSetup(id: number, data: Partial<SetupType>): Promise<SetupType> {
  return put<SetupType>(`/setups/${id}`, data as unknown as Record<string, unknown>);
}

/**
 * 删除设备
 */
export function deleteDevice(id: number): Promise<boolean> {
  return del(`/devices/${id}`).then(() => true);
}

/**
 * 获取单个设备
 */
export function getDevice(id: number): Promise<DeviceType> {
  return get<DeviceType>(`/devices/${id}`);
}

/**
 * 获取设备详情（包含setup）
 */
export function getDeviceWithSetup(id: number): Promise<DeviceType> {
  return get<DeviceType>(`/devices/${id}`, { expand: "setup" });
}

/**
 * 获取当前用户管理的设备列表
 */
export function manageDevice(): Promise<DeviceType[]> {
  return get<DeviceType[]>("/devices/manage", { expand: "setup" });
}
