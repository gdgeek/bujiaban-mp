import type COS from "cos-js-sdk-v5";
// #ifndef MP-WEIXIN
import BrowserCOS from "cos-js-sdk-v5/index.js";
// #endif
// #ifdef MP-WEIXIN
// 使用官方源码入口：默认 UMD 构建依赖 window，且内嵌了旧 XML 解析器。
import WeChatCOS from "cos-wx-sdk-v5/index.js";
// #endif
import config from "@/config";
import logger from "@/utils/logger";

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

/** 各业务 API 的存储桶、临时凭证和 SDK 实例保持独立。 */
interface CloudBackendCache {
  info: CloudStorageInfo | null;
  cacheTime: number;
  request: Promise<CloudStorageInfo> | null;
  cos: COS | null;
}
const backendCaches = new Map<string, CloudBackendCache>();
let cacheGeneration = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
const EXPIRY_MARGIN = 60 * 1000;

const getBackendCache = (apiUrl: string): CloudBackendCache => {
  let cache = backendCaches.get(apiUrl);
  if (!cache) {
    cache = { info: null, cacheTime: 0, request: null, cos: null };
    backendCaches.set(apiUrl, cache);
  }
  return cache;
};

/**
 * 获取云存储信息（带缓存）
 */
export const getCloudStorageInfoAPI = async (
  apiUrl: string = config.apiUrl,
): Promise<CloudStorageInfo> => {
  const cache = getBackendCache(apiUrl);
  // 检查缓存是否有效
  if (
    cache.info &&
    Date.now() - cache.cacheTime < CACHE_DURATION &&
    Date.now() < cache.info.expiredTime * 1000 - EXPIRY_MARGIN
  ) {
    return cache.info;
  }
  if (cache.request) return cache.request;

  const generation = cacheGeneration;
  const request = (async () => {
    try {
      const response = await uni.request({
        url: `${apiUrl}/tencent-cloud/store`,
        method: "GET",
      });
      const result = response.data as unknown as ApiResponse;
      const info = result?.data;
      if (response.statusCode !== 200 || !result?.success || !info) {
        throw new Error("获取云存储信息失败");
      }
      if (
        !info.bucket ||
        !info.region ||
        !info.tmpSecretId ||
        !info.tmpSecretKey ||
        !info.token ||
        !Number.isFinite(info.expiredTime) ||
        info.expiredTime * 1000 <= Date.now() + EXPIRY_MARGIN
      ) {
        throw new Error("云存储临时凭证无效或即将过期");
      }
      if (generation !== cacheGeneration) throw new Error("云存储凭证缓存已清除，请重试");
      cache.info = info;
      cache.cacheTime = Date.now();
      return info;
    } catch (error) {
      console.error("[cloud] 获取云存储信息失败:", error);
      throw error;
    }
  })();
  cache.request = request;
  try {
    return await request;
  } finally {
    if (cache.request === request) cache.request = null;
  }
};

const getCosConstructor = (): typeof COS => {
  // #ifdef MP-WEIXIN
  return WeChatCOS;
  // #endif
  // #ifndef MP-WEIXIN
  return BrowserCOS;
  // #endif
};

/**
 * 获取COS实例（单例模式）
 */
export const getCosInstance = async (apiUrl: string = config.apiUrl): Promise<COS> => {
  const cache = getBackendCache(apiUrl);
  const generation = cacheGeneration;
  try {
    await getCloudStorageInfoAPI(apiUrl);
    if (generation !== cacheGeneration) throw new Error("云存储凭证缓存已清除，请重试");
    if (cache.cos) return cache.cos;

    const CosClient = getCosConstructor();
    cache.cos = new CosClient({
      getAuthorization: (options, callback) => {
        void getCloudStorageInfoAPI(apiUrl)
          .then((cloudInfo) => {
            // 返回已计算的签名，避免 SDK 的私有 STS 缓存跳过本模块的凭证刷新。
            const authorization = CosClient.getAuthorization({
              ...options,
              SecretId: cloudInfo.tmpSecretId,
              SecretKey: cloudInfo.tmpSecretKey,
              KeyTime: `${cloudInfo.startTime};${cloudInfo.expiredTime}`,
            });
            callback({
              Authorization: authorization,
              TmpSecretId: cloudInfo.tmpSecretId,
              TmpSecretKey: cloudInfo.tmpSecretKey,
              SecurityToken: cloudInfo.token,
              StartTime: cloudInfo.startTime,
              ExpiredTime: cloudInfo.expiredTime,
            });
          })
          .catch(() => {
            // SDK 使用单参数授权回调；空凭证会触发其错误回调，避免请求一直挂起。
            // 对外操作在签名前也会获取凭证，将原始刷新错误直接 reject 给调用方。
            callback({} as COS.GetAuthorizationCallbackParams);
          });
      },
    });

    return cache.cos;
  } catch (error) {
    console.error("[cloud] 获取COS实例失败:", error);
    throw error;
  }
};

/**
 * 获取文件URL
 */
export const getObjectUrl = async (
  fileName: string,
  apiUrl: string = config.apiUrl,
): Promise<string> => {
  try {
    const [cos, cloudInfo] = await Promise.all([
      getCosInstance(apiUrl),
      getCloudStorageInfoAPI(apiUrl),
    ]);

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
  apiUrl: string = config.apiUrl,
): Promise<string> => {
  try {
    const [cos, cloudInfo] = await Promise.all([
      getCosInstance(apiUrl),
      getCloudStorageInfoAPI(apiUrl),
    ]);

    return new Promise((resolve, reject) => {
      const onComplete = (err: COS.CosError | null) => {
        if (err) {
          console.error("[cloud] 上传文件失败:", err);
          reject(err);
        } else {
          logger.debug("cloud", "上传文件成功");
          getObjectUrl(fileName, apiUrl).then(resolve).catch(reject);
        }
      };
      const params = {
        Bucket: cloudInfo.bucket,
        Region: cloudInfo.region,
        Key: fileName,
        onProgress: (info: { percent: number }) => onProgress?.(Math.floor(info.percent * 100)),
      };
      // #ifdef MP-WEIXIN
      if (!("path" in file) || !file.path) {
        reject(new Error("微信小程序上传需要选择文件返回的本地路径"));
        return;
      }
      (cos as WeChatCOS).postObject({ ...params, FilePath: file.path }, onComplete);
      return;
      // #endif
      // #ifndef MP-WEIXIN
      cos.putObject({ ...params, Body: file as File }, onComplete);
      // #endif
    });
  } catch (error) {
    console.error("[cloud] 上传文件失败:", error);
    throw error;
  }
};

/**
 * 删除文件
 */
export const deleteFile = async (
  fileName: string,
  apiUrl: string = config.apiUrl,
): Promise<void> => {
  try {
    const [cos, cloudInfo] = await Promise.all([
      getCosInstance(apiUrl),
      getCloudStorageInfoAPI(apiUrl),
    ]);

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
            logger.debug("cloud", "删除文件成功");
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
export const deleteMultipleFiles = async (
  fileNames: string[],
  apiUrl: string = config.apiUrl,
): Promise<void> => {
  try {
    const [cos, cloudInfo] = await Promise.all([
      getCosInstance(apiUrl),
      getCloudStorageInfoAPI(apiUrl),
    ]);

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
            logger.debug("cloud", "批量删除文件成功");
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
  apiUrl: string = config.apiUrl,
): Promise<ListFilesResult> => {
  try {
    const [cos, cloudInfo] = await Promise.all([
      getCosInstance(apiUrl),
      getCloudStorageInfoAPI(apiUrl),
    ]);

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
            logger.debug("cloud", "获取文件列表成功");
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
  cacheGeneration += 1;
  backendCaches.clear();
};
