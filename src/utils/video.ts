import { getObjectUrl } from "@/services/cloud";
import { wxPay, generateOrderNo } from "@/services/pay";

/**
 * 获取视频对象的签名URL
 * @param key 视频在对象存储中的键值
 * @param isPreview 是否为预览图（添加截图参数）
 * @returns 签名后的URL
 */
export const getSignedVideoUrl = async (
  key: string,
  isPreview: boolean = false,
): Promise<string> => {
  try {
    const url = await getObjectUrl(key);
    // 如果是预览图，添加截图参数
    if (isPreview) {
      return `${url}&ci-process=snapshot&time=0.01`;
    }
    return url;
  } catch (error) {
    console.error("获取签名URL失败:", error);
    // 失败时使用默认无签名URL
    const defaultUrl = `https://game-1251022382.cos.ap-nanjing.myqcloud.com/${key}`;
    if (isPreview) {
      return `${defaultUrl}?ci-process=snapshot&time=0.01`;
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
    const authSetting = await uni.getSetting();
    if (!authSetting.authSetting["scope.writePhotosAlbum"]) {
      // 没有权限，请求授权
      uni.showLoading({
        title: "正在请求授权...",
        mask: true,
      });

      try {
        await new Promise<void>((resolve, reject) => {
          uni.authorize({
            scope: "scope.writePhotosAlbum",
            success: () => {
              console.log("相册授权成功");
              resolve();
            },
            fail: (err) => {
              console.error("相册授权失败:", err);
              uni.hideLoading();
              uni.showModal({
                title: "需要授权",
                content: "保存视频需要访问您的相册权限",
                confirmText: "前往设置",
                cancelText: "取消",
                success: (res) => {
                  if (res.confirm) {
                    uni.openSetting({
                      success: (settingRes) => {
                        if (settingRes.authSetting["scope.writePhotosAlbum"]) {
                          resolve();
                        } else {
                          uni.showToast({
                            title: "未获得权限，无法保存",
                            icon: "none",
                          });
                          reject(new Error("用户拒绝授权"));
                        }
                      },
                    });
                  } else {
                    uni.showToast({
                      title: "未获得权限，无法保存",
                      icon: "none",
                    });
                    reject(new Error("用户取消授权"));
                  }
                },
              });
            },
          });
        });
        uni.hideLoading();
        return true;
      } catch (error) {
        console.error("相册授权过程中出错:", error);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error("检查权限出错:", error);
    return false;
  }
};

/**
 * 下载视频并保存到相册
 * @param url 视频URL
 * @returns 是否下载成功
 */
export const downloadAndSaveVideo = async (url: string): Promise<boolean> => {
  try {
    uni.showLoading({
      title: "正在下载视频...",
      mask: true,
    });

    // 下载视频文件
    const downloadRes = await new Promise<{
      statusCode: number;
      tempFilePath: string;
    }>((resolve, reject) => {
      uni.downloadFile({
        url,
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      });
    });

    uni.hideLoading();

    if (downloadRes.statusCode === 200) {
      // 保存视频到相册
      await new Promise<void>((resolve, reject) => {
        uni.saveVideoToPhotosAlbum({
          filePath: downloadRes.tempFilePath,
          success: () => {
            uni.showToast({
              title: "视频已保存到相册",
              icon: "success",
              duration: 2000,
            });
            resolve();
          },
          fail: (err) => {
            console.error("保存到相册失败：", err);
            uni.showModal({
              title: "保存失败",
              content: "无法保存视频到相册，请检查相册权限设置",
              showCancel: false,
            });
            reject(err);
          },
        });
      });
      return true;
    } else {
      uni.showToast({
        title: "下载失败",
        icon: "none",
      });
      return false;
    }
  } catch (error) {
    console.error("下载过程中出错:", error);
    uni.hideLoading();
    uni.showToast({
      title: "下载视频失败",
      icon: "none",
    });
    return false;
  }
};

/**
 * 从本地存储获取openid
 */
export const getOpenidFromStorage = (): string | null => {
  const OPENID_STORAGE_KEY = "AR_CHECKIN_OPENID";
  try {
    const storedOpenid = uni.getStorageSync(OPENID_STORAGE_KEY);
    return storedOpenid || null;
  } catch (e) {
    console.error("从本地存储获取openid失败:", e);
    return null;
  }
};

/**
 * 处理支付
 * @param params 支付参数
 * @returns 是否支付成功
 */
export const handlePayment = async (params: {
  openid: string;
  amount: number;
  description: string;
}): Promise<boolean> => {
  try {
    // 创建订单号
    const orderNo = generateOrderNo();

    // 显示支付中提示
    uni.showLoading({
      title: "正在发起支付...",
      mask: true,
    });

    // 调用微信支付接口
    const payResult = await wxPay({
      openid: params.openid,
      out_trade_no: orderNo,
      amount: params.amount,
      description: params.description,
    });

    uni.hideLoading();

    return !!payResult; // 转换为布尔值
  } catch (error) {
    console.error("支付过程中出错:", error);
    uni.hideLoading();
    uni.showToast({
      title: "支付失败",
      icon: "none",
    });
    return false;
  }
};
