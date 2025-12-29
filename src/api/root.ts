import { post, del } from "@/utils/request";

/**
 * 分配设备管理员
 */
export function assign(device_id: number, phone: string): Promise<unknown> {
  return post(`/devices/${device_id}/assign`, { device_id, phone });
}

/**
 * 取消（移除）设备管理员
 */
export function unassign(device_id: number, user_id: number): Promise<boolean> {
  return del(`/devices/${device_id}/assign/${user_id}`)
    .then(() => true)
    .catch(() => false);
}
