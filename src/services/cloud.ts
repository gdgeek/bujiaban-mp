import COS from "cos-js-sdk-v5";
import global from "@/utils/global";
// 定义云存储信息的类型
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

interface ApiResponse {
  message: string;
  success: boolean;
  data: CloudStorageInfo;
}

// 获取云存储信息的API
export const getCloudStorageInfoAPI = async (): Promise<CloudStorageInfo> => {
  try {
    const response = await uni.request({
      url: `${global.url}/tencent-cloud/store`,
      method: "GET",
    });

    // 将response.data转为ApiResponse类型
    const result = response.data as unknown as ApiResponse;

    if (response.statusCode === 200 && result && result.success) {
      return result.data;
    }

    throw new Error("获取云存储信息失败");
  } catch (error) {
    console.error("获取云存储信息失败:", error);
    throw error;
  }
};

// 获取COS实例
let cosInstance: any = null;
export const getCosInstance = async (): Promise<any> => {
  try {
    if (cosInstance) return cosInstance;

    const cloudInfo = await getCloudStorageInfoAPI();

    cosInstance = new COS({
      getAuthorization: (_options: any, callback: Function) => {
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
    console.error("获取COS实例失败:", error);
    throw error;
  }
};

// 获取文件URL
export const getObjectUrl = async (fileName: string): Promise<string> => {
  try {
    const cos = await getCosInstance();
    const cloudInfo = await getCloudStorageInfoAPI();
    return new Promise((resolve, reject) => {
      cos.getObjectUrl(
        {
          Bucket: cloudInfo.bucket,
          Region: cloudInfo.region,
          Key: fileName,
          Sign: true, // 是否签名
        },
        (err: any, data: any) => {
          if (err) {
            console.error("获取文件URL失败:", err);
            reject(err);
          } else {
            console.log("获取文件URL成功:", data.Url);
            resolve(data.Url);
          }
        },
      );
    });
  } catch (error) {
    console.error("获取文件URL失败:", error);
    throw error;
  }
};

// 上传文件
export const uploadFile = async (
  file: File | Blob | UniApp.ChooseImageSuccessCallbackResultFile,
  fileName: string,
  onProgress?: (progress: number) => void,
): Promise<string> => {
  try {
    const cos = await getCosInstance();
    const cloudInfo = await getCloudStorageInfoAPI();

    return new Promise((resolve, reject) => {
      cos.putObject(
        {
          Bucket: cloudInfo.bucket,
          Region: cloudInfo.region,
          Key: fileName,
          Body: file,
          onProgress: (info: any) => {
            const percent = Math.floor(info.percent * 100);
            onProgress?.(percent);
          },
        },
        (err: any, data: any) => {
          if (err) {
            console.error("上传文件失败:", err);
            reject(err);
          } else {
            console.log("上传文件成功:", data);
            // 上传成功后获取文件URL并返回
            getObjectUrl(fileName)
              .then((url) => resolve(url))
              .catch((error) => reject(error));
          }
        },
      );
    });
  } catch (error) {
    console.error("上传文件失败:", error);
    throw error;
  }
};

// 删除文件
export const deleteFile = async (fileName: string): Promise<void> => {
  try {
    const cos = await getCosInstance();
    const cloudInfo = await getCloudStorageInfoAPI();

    return new Promise((resolve, reject) => {
      cos.deleteObject(
        {
          Bucket: cloudInfo.bucket,
          Region: cloudInfo.region,
          Key: fileName,
        },
        (err: any, data: any) => {
          if (err) {
            console.error("删除文件失败:", err);
            reject(err);
          } else {
            console.log("删除文件成功:", data);
            resolve();
          }
        },
      );
    });
  } catch (error) {
    console.error("删除文件失败:", error);
    throw error;
  }
};

// 批量删除文件
export const deleteMultipleFiles = async (fileNames: string[]): Promise<void> => {
  try {
    const cos = await getCosInstance();
    const cloudInfo = await getCloudStorageInfoAPI();

    const objects = fileNames.map((name) => ({ Key: name }));

    return new Promise((resolve, reject) => {
      cos.deleteMultipleObject(
        {
          Bucket: cloudInfo.bucket,
          Region: cloudInfo.region,
          Objects: objects,
        },
        (err: any, data: any) => {
          if (err) {
            console.error("批量删除文件失败:", err);
            reject(err);
          } else {
            console.log("批量删除文件成功:", data);
            resolve();
          }
        },
      );
    });
  } catch (error) {
    console.error("批量删除文件失败:", error);
    throw error;
  }
};

// 获取文件列表
export const listFiles = async (prefix: string = "", delimiter: string = "/"): Promise<any> => {
  try {
    const cos = await getCosInstance();
    const cloudInfo = await getCloudStorageInfoAPI();

    return new Promise((resolve, reject) => {
      cos.getBucket(
        {
          Bucket: cloudInfo.bucket,
          Region: cloudInfo.region,
          Prefix: prefix,
          Delimiter: delimiter,
        },
        (err: any, data: any) => {
          if (err) {
            console.error("获取文件列表失败:", err);
            reject(err);
          } else {
            console.log("获取文件列表成功:", data);
            resolve(data);
          }
        },
      );
    });
  } catch (error) {
    console.error("获取文件列表失败:", error);
    throw error;
  }
};
