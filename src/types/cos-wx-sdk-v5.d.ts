declare module "cos-js-sdk-v5/index.js" {
  import COS from "cos-js-sdk-v5";
  export default COS;
}

declare module "cos-wx-sdk-v5/index.js" {
  import COS from "cos-js-sdk-v5";

  /** 微信 SDK 的通用 COS 接口与浏览器 SDK 一致，文件上传使用 FilePath。 */
  export default class WeChatCOS extends COS {
    postObject(
      params: {
        Bucket: string;
        Region: string;
        Key: string;
        FilePath: string;
        onProgress?: (info: { percent: number }) => void;
      },
      callback: (err: COS.CosError | null) => void,
    ): void;
  }
}
