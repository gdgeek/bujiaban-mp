import { get } from "@/utils/request";
import config from "@/config";
import type { FileType } from "./checkin";

export type DownloadFile = FileType & { price: number | null };

export async function getDownloadFile(id: number, apiUrl = config.apiUrl): Promise<DownloadFile> {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("文件信息不完整，请从记录页重新打开");
  const file = await get<DownloadFile>(`/files/${id}`, undefined, apiUrl);
  if (!file || Number(file.id) !== id || typeof file.key !== "string" || !file.key) {
    throw new Error("文件信息无效，请重新打开");
  }
  const price = file.price;
  return {
    ...file,
    unlocked: Number(file.unlocked) === 1 ? 1 : 0,
    price: Number.isSafeInteger(price) && Number(price) >= 0 ? price : null,
  };
}

export function isFileDownloadAllowed(file: {
  price?: number | null;
  unlocked: number | boolean;
}): boolean {
  return file.unlocked === 1 || file.unlocked === true || file.price === 0;
}
