import type { IDType } from "@/services/checkin";
import { getObjectUrl } from "@/services/cloud";
import { wxPay, generateOrderNo } from "@/services/pay";
import config from "@/config";

/** COS默认域名 */
const COS_DEFAULT_DOMAIN = "https://game-1251022382.cos.ap-nanjing.myqcloud.com";

/**
 * 获取视频对象的签名URL
 * @param key 视频在对象存储中的键值
 * @param isPreview 是否为预览图（添加截图参数）
 * @param time 时间点（秒），默认为0.01秒，用于获取特定时间的截帧
 * @returns 签名后的URL
 */
export const getSignedVideoUrl = async (
  key: string,
  isPreview: boolean = false,
  time: number = 0.01,
): Promise<string> => {
  try {
    const url = await getObjectUrl(key);
    if (isPreview) {
      return `${url}&ci-process=snapshot&time=${time}`;
    }
    return url;
  } catch (error) {
    console.warn("[video] 获取签名URL失败，使用默认URL:", error);
    const defaultUrl = `${COS_DEFAULT_DOMAIN}/${key}`;
    if (isPreview) {
      return `${defaultUrl}?ci-process=snapshot&time=${time}`;
    }
    return defaultUrl;
  }
};

/**
 * 检查相册权限
 * @returns 是否获得授权
 */
export const checkAlbumPermission = async (): Promise<boolean> => {
  try {
    const { authSetting } = await uni.getSetting();

    if (authSetting["scope.writePhotosAlbum"]) {
      return true;
    }

    const isFirstAttempt = authSetting["scope.writePhotosAlbum"] === undefined;

    if (isFirstAttempt) {
      try {
        await new Promise<void>((resolve, reject) => {
          uni.authorize({
            scope: "scope.writePhotosAlbum",
            success: () => {
              console.debug("[video] 相册授权成功");
              resolve();
            },
            fail: (err) => {
              console.warn("[video] 相册首次授权失败:", err);
              reject(err);
            },
          });
        });
        return true;
      } catch {
        console.debug("[video] 用户拒绝首次授权，引导去设置页");
      }
    }

    // 已被拒绝，引导用户去设置页
    try {
      await new Promise<void>((resolve, reject) => {
        uni.showModal({
          title: "需要授权",
          content: '保存视频到本地需要访问您的相册权限，请在设置中开启"添加到相册"权限',
          confirmText: "前往设置",
          cancelText: "取消",
          success: (res) => {
            if (res.confirm) {
              uni.openSetting({
                success: (settingRes) => {
                  if (settingRes.authSetting["scope.writePhotosAlbum"]) {
                    uni.showToast({ title: "授权成功", icon: "success" });
                    resolve();
                  } else {
                    uni.showToast({ title: "未获得权限，无法保存视频", icon: "none" });
                    reject(new Error("用户拒绝授权"));
                  }
                },
                fail: (err) => {
                  console.error("[video] 打开设置页面失败:", err);
                  reject(err);
                },
              });
            } else {
              uni.showToast({ title: "未获得权限，无法保存视频", icon: "none" });
              reject(new Error("用户取消授权"));
            }
          },
        });
      });
      return true;
    } catch (error) {
      console.warn("[video] 授权过程中出错:", error);
      return false;
    }
  } catch (error) {
    console.error("[video] 检查权限出错:", error);
    return false;
  }
};

/** 下载文件响应 */
interface DownloadResult {
  statusCode: number;
  tempFilePath: string;
}

/**
 * 下载视频并保存到相册
 * @param url 视频URL
 * @returns 是否下载成功
 */
export const downloadAndSaveVideo = async (url: string): Promise<boolean> => {
  try {
    uni.showLoading({ title: "正在保存视频...", mask: true });

    const downloadRes = await new Promise<DownloadResult>((resolve, reject) => {
      uni.downloadFile({
        url,
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      });
    });

    uni.hideLoading();

    if (downloadRes.statusCode === 200) {
      await new Promise<void>((resolve, reject) => {
        uni.saveVideoToPhotosAlbum({
          filePath: downloadRes.tempFilePath,
          success: () => {
            uni.showToast({ title: "保存视频成功", icon: "success", duration: 2000 });
            resolve();
          },
          fail: (err) => {
            console.error("[video] 保存到相册失败:", err);
            uni.showModal({
              title: "保存视频失败",
              content: "无法保存视频到相册，请检查相册权限设置",
              showCancel: false,
            });
            reject(err);
          },
        });
      });
      return true;
    } else {
      uni.showToast({ title: "保存视频失败", icon: "none" });
      return false;
    }
  } catch (error) {
    console.error("[video] 视频处理过程中出错:", error);
    uni.hideLoading();
    uni.showToast({ title: "保存视频失败", icon: "none" });
    return false;
  }
};

/** 支付参数 */
interface PaymentParams {
  openid: string;
  amount: number;
  description: string;
}

/**
 * 处理支付
 * @param params 支付参数
 * @returns 是否支付成功
 */
export const handlePayment = async (params: PaymentParams): Promise<boolean> => {
  try {
    const orderNo = generateOrderNo();

    uni.showLoading({ title: "正在发起支付...", mask: true });

    const payResult = await wxPay({
      openid: params.openid,
      out_trade_no: orderNo,
      amount: params.amount,
      description: params.description,
    });

    uni.hideLoading();

    return !!payResult;
  } catch (error) {
    console.error("[video] 支付过程中出错:", error);
    uni.hideLoading();
    uni.showToast({ title: "支付失败", icon: "none" });
    return false;
  }
};
