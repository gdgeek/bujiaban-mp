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
  return get<VerseType[]>("/checkin/list", {
    expand: "verse_id,name",
  })
    .then((data) => data)
    .catch((err) => {
      console.warn("获取打卡列表失败:", err);
      throw err;
    });
}

// 注意：a1 API使用不同的baseUrl，需要在request中支持
// 目前使用默认的apiUrl，如需切换请在request调用时指定baseUrl
