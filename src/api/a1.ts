import global from "@/utils/global";

//import { buildAuthHeader } from "@/utils/common.ts";
//import type { UserType } from "@/services/checkin";
/*device_id: 44
id: 1
money: 0
scene_id: null
shots: (4) [1, 5, 10, 20]
slogans: (4) ["我在这里很想你", "今天也要加油鸭", "阳光正好，微风不燥", "记录每一刻，热爱每一天"]
thumbs: (4) ["https://game-1251022382.cos.ap-nanjing.myqcloud.com/picture/t1.webp", "https://game-1251022382.cos.ap-nanjing.myqcloud.com/picture/t2.webp", "https://game-1251022382.cos.ap-nanjing.myqcloud.com/picture/t3.webp", "https://game-1251022382.cos.ap-nanjing.myqcloud.com/picture/t4.webp"]
title: "测试机器" */
export interface VerseType {
  verse_id: number;
  name: string;
}

// get https://a1.bujiaban.com/v1/checkin/list?expand=verse_id
/*返回 [
    {
        "verse_id": 685
    }
]*/
export function getCheckinList(): Promise<VerseType[]> {
  const query: string[] = ["expand=verse_id,name"];
  const qs = query.length ? `?${query.join("&")}` : "";

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${global.a1_url}/checkin/list${qs}`,
      method: "GET",
      success: (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as VerseType[]);
        } else {
          reject(new Error(`请求失败，状态码 ${res.statusCode}`));
        }
      },
      fail: (err) => {
        console.error("请求失败:", err);
        reject(err);
      },
    });
  });
}
