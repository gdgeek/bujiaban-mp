<template>
  <view class="payment-page">
    <view class="payment-card">
      <view class="payment-header">
        <text class="payment-title">视频下载</text>
      </view>

      <view class="payment-info">
        <view class="info-item">
          <text class="label">视频名称:</text>
          <text class="value">{{ paymentInfo.title || "未知视频" }}</text>
        </view>
        <view class="info-item">
          <text class="label">支付金额:</text>
          <text class="value">¥{{ (paymentInfo.price || 0) / 100 }}</text>
        </view>
      </view>

      <button class="pay-button" @click="handlePay" :loading="loading">确认支付</button>

      <button class="cancel-button" @click="handleCancel">取消</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
// 使用抽离出的工具函数替代直接导入
import {
  getSignedVideoUrl,
  getOpenidFromStorage,
  checkAlbumPermission,
  downloadAndSaveVideo,
  handlePayment,
} from "@/utils/video";

// 支付相关状态
const paymentInfo = ref({
  videoId: 0,
  videoKey: "",
  price: 1, // 默认1分钱
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
      console.log("接收到支付参数:", params);
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

// 处理支付
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

    // 使用工具函数处理支付
    const paySuccess = await handlePayment({
      openid,
      amount: paymentInfo.value.price || 1,
      description: `视频下载:${paymentInfo.value.title}`,
    });

    if (paySuccess) {
      uni.showToast({
        title: "支付成功，开始下载",
        icon: "success",
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
              content: "视频已成功保存到相册",
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
          title: "视频信息不完整",
          icon: "error",
        });
      }
    } else {
      uni.showToast({
        title: "支付已取消",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("支付或下载过程中出错:", error);
    uni.hideLoading();
    uni.showToast({
      title: "操作失败",
      icon: "error",
    });
  } finally {
    loading.value = false;
  }
};

// 取消支付
const handleCancel = () => {
  uni.navigateBack();
};
</script>

<style lang="scss">
.payment-page {
  padding: 30rpx;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
  // display: flex;
  justify-content: center;
  align-items: center;

  .payment-card {
    background: #fff;
    border-radius: 20rpx;
    padding: 50rpx 30rpx;
    box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.08);
    width: 100%;
    max-width: 750rpx;

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
      background: linear-gradient(to right, #4a90e2, #5a9de6);
      color: #fff;
      margin-bottom: 30rpx;
      border-radius: 10px;
      height: 90rpx;
      line-height: 90rpx;
      font-size: 32rpx;
      font-weight: 500;
      letter-spacing: 2rpx;
      box-shadow: 0 8rpx 16rpx rgba(74, 144, 226, 0.2);
      transition: all 0.3s ease;

      &:active {
        transform: translateY(2rpx);
        box-shadow: 0 4rpx 8rpx rgba(74, 144, 226, 0.2);
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
