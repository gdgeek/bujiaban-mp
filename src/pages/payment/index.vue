<template>
  <view class="payment-page" :style="{ paddingBottom: (safeAreaInsets?.bottom || 0) + 'px' }">
    <view class="content-wrapper">
      <view class="payment-card">
        <view class="payment-header">
          <!-- <text class="payment-title">拍摄服务</text> -->
          <text class="payment-title">文件下载</text>
        </view>

        <view class="payment-info">
          <view class="info-item">
            <text class="label">文件名称:</text>
            <text class="value">{{ paymentInfo.title || "视频文件" }}</text>
          </view>
          <!-- <view class="info-item">
            <text class="label">服务费用:</text>
            <text class="value">¥{{ (paymentInfo.price || 0) / 100 }}</text>
          </view> -->
        </view>

        <!-- <button class="pay-button" @click="handlePay" :loading="loading">支付服务费</button> -->
        <button class="pay-button" @click="handlePay" :loading="loading">下载文件(免费)</button>

        <button class="cancel-button" @click="handleCancel">取消</button>
      </view>
    </view>

    <view class="flex-spacer"></view>
    <FooterCopyright />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import FooterCopyright from "@/components/FooterCopyright.vue";
import {
  getSignedVideoUrl,
  getOpenidFromStorage,
  checkAlbumPermission,
  downloadAndSaveVideo,
  // handlePayment, // 注释掉支付相关引用
} from "@/utils/video";

// 获取安全区域信息
const { safeAreaInsets } = uni.getWindowInfo();

// 支付相关状态
const paymentInfo = ref({
  videoId: 0,
  videoKey: "",
  // price: 1, // 默认1分钱
  title: "",
  action: "",
});
const loading = ref(false);
// 视频签名URL
const videoUrl = ref<string>("");

// 接收页面参数
onLoad((query) => {
  try {
    if (query && query.params) {
      const params = JSON.parse(decodeURIComponent(query.params));
      console.log("接收到参数:", params);
      paymentInfo.value = { ...paymentInfo.value, ...params };
    }
  } catch (error) {
    console.error("解析参数错误:", error);
    uni.showToast({
      title: "参数错误",
      icon: "error",
    });
  }
});

// 处理下载
const handlePay = async () => {
  // 获取openid
  const openid = getOpenidFromStorage();
  if (!openid) {
    uni.showToast({
      title: "请先登录",
      icon: "none",
    });

    // 跳转到登录或打卡页面获取openid
    setTimeout(() => {
      uni.redirectTo({
        url: "/pages/checkin/index?k=test123",
      });
    }, 1500);
    return;
  }

  try {
    loading.value = true;

    // 先检查相册权限
    const hasPermission = await checkAlbumPermission();
    if (!hasPermission) {
      loading.value = false;
      return;
    }

    /*
    // 处理支付
    const paySuccess = await handlePayment({
      openid,
      amount: paymentInfo.value.price || 1,
      description: `拍摄服务:${paymentInfo.value.title}`,
    });

    if (paySuccess) {
      uni.showToast({
        title: "支付成功，开始处理",
        icon: "success",
      });
    */

    // 直接执行下载逻辑，无需支付
    uni.showToast({
      title: "准备下载文件",
      icon: "loading",
    });

    // 执行实际下载逻辑
    if (paymentInfo.value.videoKey) {
      // 获取签名URL
      const signedUrl = await getSignedVideoUrl(paymentInfo.value.videoKey);

      // 下载并保存视频
      const downloadSuccess = await downloadAndSaveVideo(signedUrl);

      if (downloadSuccess) {
        // 显示成功提示并返回
        setTimeout(() => {
          uni.showModal({
            title: "下载完成",
            content: "文件已成功下载并保存到相册",
            showCancel: false,
            success: () => {
              // 返回上一页
              uni.navigateBack();
            },
          });
        }, 1000);
      }
    } else {
      uni.showToast({
        title: "文件信息不完整",
        icon: "error",
      });
    }
    /*
    } else {
      uni.showToast({
        title: "支付已取消",
        icon: "none",
      });
    }
    */
  } catch (error) {
    console.error("下载过程中出错:", error);
    uni.hideLoading();
    uni.showToast({
      title: "操作失败",
      icon: "error",
    });
  } finally {
    loading.value = false;
  }
};

// 取消下载
const handleCancel = () => {
  uni.navigateBack();
};
</script>

<style lang="scss">
.payment-page {
  padding: 30rpx;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  .content-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .flex-spacer {
    flex-grow: 1;
  }

  .payment-card {
    background: #fff;
    border-radius: 20rpx;
    padding: 50rpx 30rpx;
    box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.08);
    width: 100%;
    max-width: 750rpx;
    margin-bottom: 20rpx;

    .payment-header {
      text-align: center;
      margin-bottom: 60rpx;
      position: relative;
      padding-bottom: 20rpx;

      &:after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 80rpx;
        height: 4rpx;
        background: #4a90e2;
        border-radius: 2rpx;
      }

      .payment-title {
        font-size: 40rpx;
        font-weight: 600;
        color: #333;
      }
    }

    .payment-info {
      margin-bottom: 60rpx;
      background: #f9fafc;
      border-radius: 16rpx;
      padding: 20rpx 30rpx;

      .info-item {
        display: flex;
        padding: 24rpx 0;
        border-bottom: 1px solid #eef2f6;
        align-items: center;

        &:last-child {
          border-bottom: none;
        }

        .label {
          color: #666;
          width: 180rpx;
          font-size: 28rpx;
        }

        .value {
          color: #333;
          flex: 1;
          font-size: 30rpx;
          font-weight: 500;
        }
      }
    }

    .pay-button {
      background: #1890ff;
      color: #fff;
      margin-bottom: 30rpx;
      border-radius: 10px;
      height: 90rpx;
      line-height: 90rpx;
      font-size: 32rpx;
      font-weight: 500;
      letter-spacing: 2rpx;
      box-shadow: 0 8rpx 16rpx rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;

      &:active {
        background: #177ddc;
        transform: translateY(2rpx);
        box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.15);
      }
    }

    .cancel-button {
      background: #f5f7fa;
      color: #666;
      border-radius: 10px;
      height: 90rpx;
      line-height: 90rpx;
      font-size: 32rpx;
      border: 1px solid #e0e5ec;
      transition: all 0.3s ease;

      &:active {
        background: #eef1f6;
      }
    }
  }
}
</style>
