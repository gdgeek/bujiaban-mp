import COS from "cos-js-sdk-v5";
import config from "@/config";

/** 云存储信息类型 */
interface CloudStorageInfo {
  bucket: string;
  region: string;
  token: string;
  tmpSecretId: string;
  tmpSecretKey: string;
  startTime: number;
  expiredTime: number;
  expiration: string;
  requestId: string;
}

/** API响应结构 */
interface ApiResponse {
  message: string;
  success: boolean;
  data: CloudStorageInfo;
}

/** 云存储信息缓存 */
let cloudInfoCache: CloudStorageInfo | null = null;
let cloudInfoCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 获取云存储信息（带缓存）
 */
export const getCloudStorageInfoAPI = async (): Promise<CloudStorageInfo> => {
  // 检查缓存是否有效
  if (cloudInfoCache && Date.now() - cloudInfoCacheTime < CACHE_DURATION) {
    return cloudInfoCache;
  }

  try {
    const response = await uni.request({
      url: `${config.apiUrl}/tencent-cloud/store`,
      method: "GET",
    });

    const result = response.data as unknown as ApiResponse;

    if (response.statusCode === 200 && result?.success) {
      cloudInfoCache = result.data;
      cloudInfoCacheTime = Date.now();
      return result.data;
    }

    throw new Error("获取云存储信息失败");
  } catch (error) {
    console.error("[cloud] 获取云存储信息失败:", error);
    throw error;
  }
};

/** COS实例缓存 */
let cosInstance: COS | null = null;

/**
 * 获取COS实例（单例模式）
 */
export const getCosInstance = async (): Promise<COS> => {
  if (cosInstance) return cosInstance;

  try {
    const cloudInfo = await getCloudStorageInfoAPI();

    cosInstance = new COS({
      getAuthorization: (_options, callback) => {
        callback({
          TmpSecretId: cloudInfo.tmpSecretId,
          TmpSecretKey: cloudInfo.tmpSecretKey,
          SecurityToken: cloudInfo.token,
          StartTime: cloudInfo.startTime,
          ExpiredTime: cloudInfo.expiredTime,
        });
      },
    });

    return cosInstance;
  } catch (error) {
    console.error("[cloud] 获取COS实例失败:", error);
    throw error;
  }
};

/**
 * 获取文件URL
 */
export const getObjectUrl = async (fileName: string): Promise<string> => {
  try {
    const [cos, cloudInfo] = await Promise.all([getCosInstance(), getCloudStorageInfoAPI()]);

    return new Promise((resolve, reject) => {
      cos.getObjectUrl(
        {
          Bucket: cloudInfo.bucket,
          Region: cloudInfo.region,
          Key: fileName,
          Sign: true,
        },
        (err, data) => {
          if (err) {
            console.error("[cloud] 获取文件URL失败:", err);
            reject(err);
          } else {
            resolve(data.Url);
          }
        },
      );
    });
  } catch (error) {
    console.error("[cloud] 获取文件URL失败:", error);
    throw error;
  }
};

/**
 * 上传文件
 */
export const uploadFile = async (
  file: File | Blob | UniApp.ChooseImageSuccessCallbackResultFile,
  fileName: string,
  onProgress?: (progress: number) => void,
): Promise<string> => {
  try {
    const [cos, cloudInfo] = await Promise.all([getCosInstance(), getCloudStorageInfoAPI()]);

    return new Promise((resolve, reject) => {
      cos.putObject(
        {
          Bucket: cloudInfo.bucket,
          Region: cloudInfo.region,
          Key: fileName,
          Body: file as File,
          onProgress: (info) => {
            const percent = Math.floor(info.percent * 100);
            onProgress?.(percent);
          },
        },
        (err) => {
          if (err) {
            console.error("[cloud] 上传文件失败:", err);
            reject(err);
          } else {
            console.debug("[cloud] 上传文件成功");
            getObjectUrl(fileName)
              .then((url) => resolve(url))
              .catch((error) => reject(error));
          }
        },
      );
    });
  } catch (error) {
    console.error("[cloud] 上传文件失败:", error);
    throw error;
  }
};

/**
 * 删除文件
 */
export const deleteFile = async (fileName: string): Promise<void> => {
  try {
    const [cos, cloudInfo] = await Promise.all([getCosInstance(), getCloudStorageInfoAPI()]);

    return new Promise((resolve, reject) => {
      cos.deleteObject(
        {
          Bucket: cloudInfo.bucket,
          Region: cloudInfo.region,
          Key: fileName,
        },
        (err) => {
          if (err) {
            console.error("[cloud] 删除文件失败:", err);
            reject(err);
          } else {
            console.debug("[cloud] 删除文件成功");
            resolve();
          }
        },
      );
    });
  } catch (error) {
    console.error("[cloud] 删除文件失败:", error);
    throw error;
  }
};

/**
 * 批量删除文件
 */
export const deleteMultipleFiles = async (fileNames: string[]): Promise<void> => {
  try {
    const [cos, cloudInfo] = await Promise.all([getCosInstance(), getCloudStorageInfoAPI()]);

    const objects = fileNames.map((name) => ({ Key: name }));

    return new Promise((resolve, reject) => {
      cos.deleteMultipleObject(
        {
          Bucket: cloudInfo.bucket,
          Region: cloudInfo.region,
          Objects: objects,
        },
        (err) => {
          if (err) {
            console.error("[cloud] 批量删除文件失败:", err);
            reject(err);
          } else {
            console.debug("[cloud] 批量删除文件成功");
            resolve();
          }
        },
      );
    });
  } catch (error) {
    console.error("[cloud] 批量删除文件失败:", error);
    throw error;
  }
};

/** 文件信息 */
interface CosFileInfo {
  Key: string;
  LastModified: string;
  Size: string;
}

/** 文件列表结果 */
interface ListFilesResult {
  Contents: CosFileInfo[];
  CommonPrefixes: Array<{ Prefix: string }>;
}

/**
 * 获取文件列表
 */
export const listFiles = async (
  prefix: string = "",
  delimiter: string = "/",
): Promise<ListFilesResult> => {
  try {
    const [cos, cloudInfo] = await Promise.all([getCosInstance(), getCloudStorageInfoAPI()]);

    return new Promise((resolve, reject) => {
      cos.getBucket(
        {
          Bucket: cloudInfo.bucket,
          Region: cloudInfo.region,
          Prefix: prefix,
          Delimiter: delimiter,
        },
        (err, data) => {
          if (err) {
            console.error("[cloud] 获取文件列表失败:", err);
            reject(err);
          } else {
            console.debug("[cloud] 获取文件列表成功");
            resolve(data as unknown as ListFilesResult);
          }
        },
      );
    });
  } catch (error) {
    console.error("[cloud] 获取文件列表失败:", error);
    throw error;
  }
};

/**
 * 清除缓存（用于刷新凭证）
 */
export const clearCache = (): void => {
  cloudInfoCache = null;
  cloudInfoCacheTime = 0;
  cosInstance = null;
};
