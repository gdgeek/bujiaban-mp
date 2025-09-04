import global from "@/utils/global";

import { buildAuthHeader } from "@/utils/common.ts";

export function assign(device_id: number, phone: string): Promise<any> {
  return new Promise((resolve) => {
    wx.request({
      url: `${global.url}/devices/${device_id}/assign`,
      method: "POST",
      header: {
        ...buildAuthHeader(),
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ device_id, phone }),
      success: (res) => {
        console.error("请求成功xx:", res.data);
        resolve(res.data);
      },
      fail: (err) => {
        console.error("请求失败:", err);
        resolve(false);
      },
    });
  });
}

// 取消（移除）设备管理员
export function unassign(device_id: number, phone: string): Promise<boolean> {
  return new Promise((resolve) => {
    wx.request({
      url: `${global.url}/devices/${device_id}/assign`,
      method: "DELETE",
      header: {
        ...buildAuthHeader(),
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ device_id, phone }),
      success: (res) => {
        resolve(!!res.data || true);
      },
      fail: (err) => {
        console.error("请求失败:", err);
        resolve(false);
      },
    });
  });
}
