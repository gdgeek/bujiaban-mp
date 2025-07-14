/**
 * 视频数据接口
 */
export interface Video {
  id: number;
  cosKey: string; // 腾讯云COS中的键值
  uploadDate: string;
  size?: number; // 文件大小(字节)
}
