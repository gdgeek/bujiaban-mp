import { get } from "@/utils/request";
import config from "@/config";

/**
 * Verse类型
 */
export interface VerseType {
  verse_id: number;
  name: string;
}

/**
 * 获取打卡列表
 */
export function getCheckinList(): Promise<VerseType[]> {
  return get<VerseType[]>("/server/scenes")
    .then((data) => data)
    .catch((err) => {
      console.warn("获取打卡列表失败:", err);
      throw err;
    });
}
