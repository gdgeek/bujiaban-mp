import global from "@/utils/global";

import { buildAuthHeader } from "@/utils/common.ts";
import type { UserType } from "@/services/checkin";
/*device_id: 44
id: 1
money: 0
scene_id: null
shots: (4) [1, 5, 10, 20]
slogans: (4) ["我在这里很想你", "今天也要加油鸭", "阳光正好，微风不燥", "记录每一刻，热爱每一天"]
thumbs: (4) ["https://game-1251022382.cos.ap-nanjing.myqcloud.com/picture/t1.webp", "https://game-1251022382.cos.ap-nanjing.myqcloud.com/picture/t2.webp", "https://game-1251022382.cos.ap-nanjing.myqcloud.com/picture/t3.webp", "https://game-1251022382.cos.ap-nanjing.myqcloud.com/picture/t4.webp"]
title: "测试机器" */
export interface SetupType {
  //  device_id: number;
  // 一些接口会返回这些标识字段，用于独立更新 setup
  id?: number;
  device_id?: number;
  money: number;

  scene_id: number | null;
  shots: number[];
  slogans: string[];
  thumbs: string[];
  title: string;
}
export interface DeviceType {
  id: number;
  uuid: string;
  tag: string;
  //created_at: string;
  //updated_at: string;
  ip: string;
  setup?: SetupType;
  admin?: UserType;
}

/**
 * 获取设备列表（支持 Yii2 风格分页与按 tag 过滤）
 * @param params.tag  按 tag 精确或模糊过滤（按后端实现）
 * @param params.page 页码，从 1 开始（Yii2 默认）
 * @param params.pageSize 每页数量（Yii2 常用 per-page 参数名）
 */
export function getDevices(params?: {
  tag?: string;
  page?: number;
  pageSize?: number;
}): Promise<DeviceType[]> {
  const { tag, page, pageSize } = params || {};

  const query: string[] = ["expand=admin"];
  if (tag) query.push(`tag=${encodeURIComponent(tag)}`);
  if (typeof page === "number") query.push(`page=${page}`);
  if (typeof pageSize === "number") query.push(`per-page=${pageSize}`); // Yii2 常用 per-page
  const qs = query.length ? `?${query.join("&")}` : "";

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${global.url}/devices${qs}`,
      method: "GET",
      header: {
        ...buildAuthHeader(),
      },
      success: (res) => {
        console.error("请求成功:", res.data);
        resolve(res.data as any[]);
      },
      fail: (err) => {
        console.error("请求失败:", err);
        reject(err);
      },
    });
  });
}

export function postDevice(data: DeviceType): Promise<DeviceType> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${global.url}/devices`,
      method: "POST",
      header: {
        ...buildAuthHeader(),
        "Content-Type": "application/json",
      },
      data: JSON.stringify(data),
      success: (res) => {
        console.log("请求成功:", res.data);
        resolve(res.data as DeviceType);
      },
      fail: (err) => {
        console.error("请求失败:", err);
        reject(err);
      },
    });
  });
}

export function putDevice(id: number, data: Partial<DeviceType>): Promise<DeviceType> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${global.url}/devices/${id}`,
      method: "PUT",
      header: {
        ...buildAuthHeader(),
        "Content-Type": "application/json",
      },
      data: JSON.stringify(data),
      success: (res) => {
        console.log("请求成功:", res.data);
        resolve(res.data as DeviceType);
      },
      fail: (err) => {
        console.error("请求失败:", err);
        reject(err);
      },
    });
  });
}

// 独立更新设备的 setup：PUT /setups/{id}
export function putSetup(id: number, data: Partial<SetupType>): Promise<SetupType> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${global.url}/setups/${id}`,
      method: "PUT",
      header: {
        ...buildAuthHeader(),
        "Content-Type": "application/json",
      },
      data: JSON.stringify(data),
      success: (res) => {
        console.log("请求成功:", res.data);
        resolve(res.data as SetupType);
      },
      fail: (err) => {
        console.error("请求失败:", err);
        reject(err);
      },
    });
  });
}
export function deleteDevice(id: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${global.url}/devices/${id}`,
      method: "DELETE",
      header: {
        ...buildAuthHeader(),
      },
      success: (res) => {
        console.log("请求成功:", res.data);
        resolve(true);
      },
      fail: (err) => {
        console.error("请求失败:", err);
        reject(false);
      },
    });
  });
}

export function getDevice(id: number): Promise<DeviceType> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${global.url}/devices/${id}`,
      method: "GET",
      header: {
        ...buildAuthHeader(),
      },
      success: (res) => {
        console.log("请求成功:", res.data);
        resolve(res.data as DeviceType);
      },
      fail: (err) => {
        console.error("请求失败:", err);
        reject(err);
      },
    });
  });
}
/*
    public function actionManage($user_id)
    {
      $query = Control::find()->where(['user_id' => $user_id]);
      return $query->all();
    }
    'GET manage' => 'manage',
*/
export function manageDevice(): Promise<DeviceType[]> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${global.url}/devices/manage?expand=setup`,
      method: "GET",
      header: {
        ...buildAuthHeader(),
      },
      success: (res) => {
        console.log("请求成功!!:", res.data);
        resolve(res.data as DeviceType[]);
      },
      fail: (err) => {
        console.error("请求失败:", err);
        reject(err);
      },
    });
  });
}

/*
// 通过手机号为设备执行“指定/绑定”之类的操作（后端需提供该接口）
export function assignDevice(id: number, phone: string): Promise<any> {
  return new Promise((resolve) => {
    wx.request({
      url: `${global.url}/devices/${id}/assign`,
      method: "POST",
      header: {
        ...buildAuthHeader(),
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ phone }),
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
*/
