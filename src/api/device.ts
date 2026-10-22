import { get, post, put, del, request } from "@/utils/request";
import type { UserType } from "@/api/checkin";
import config from "@/config";

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
export function putSetup(
  id: number,
  data: Partial<SetupType>,
  apiUrl: string = config.apiUrl,
): Promise<SetupType> {
  return request<SetupType>({
    url: `/setups/${id}`,
    method: "PUT",
    data: data as unknown as Record<string, unknown>,
    baseUrl: apiUrl,
  });
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
export function getDeviceWithSetup(
  id: number,
  apiUrl: string = config.apiUrl,
): Promise<DeviceType> {
  return get<DeviceType>(`/devices/${id}`, { expand: "setup" }, apiUrl);
}

/**
 * 获取当前用户管理的设备列表
 */
export async function manageDevice(apiUrl: string = config.apiUrl): Promise<DeviceType[]> {
  // Yii's provider defaults to 20 items. Read each page before showing a total.
  const pageSize = 20;
  const devices: DeviceType[] = [];
  const seen = new Set<number>();
  for (let page = 1; ; page++) {
    const batch = await get<DeviceType[]>(
      "/devices/manage",
      { expand: "setup", sort: "id", page, "per-page": pageSize },
      apiUrl,
    );
    if (!Array.isArray(batch)) throw new Error("设备列表格式错误");
    // Yii clamps an out-of-range page to its last page, which may contain 20 items.
    if (page > 1 && batch.length && batch.every((device) => seen.has(device.id))) return devices;
    for (const device of batch) {
      if (seen.has(device.id)) throw new Error("设备分页结果重复，请重试");
      seen.add(device.id);
      devices.push(device);
    }
    if (batch.length < pageSize) return devices;
  }
}
