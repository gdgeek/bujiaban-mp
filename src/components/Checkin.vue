<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getSignedVideoUrl, getOpenidFromStorage } from "@/utils/video";
import {
  getCheckinStatus,
  wxLogin,
  setCheckinReady,
  setCheckinOver,
  setCheckinLinked,
  getQueryString,
  type StatusData,
} from "@/services/checkin";
const OPENID_STORAGE_KEY = "AR_CHECKIN_OPENID";
const openid = ref<string | null>(null);
const token = ref<string | null>(null);
const status = ref<StatusData | null>(null);
const _ready = computed(() => {
  return !!(status.value && status.value.checkin.status == "ready");
});
const currentStep = computed(() => {
  if (!status.value) return 0;
  if (status.value.file != null) return 3;
  if (status.value.checkin.status == "ready") return 2;
  if (status.value.checkin.status == "linked") return 1;
  return 0;
});
const loadingState = ref(true);
const previewImageLoading = ref(true);
const animationActive = ref(false);

const previewImageUrl = ref<string>("");
const videoUrl = ref<string>("");

// 保存openid到本地存储
const saveOpenidToStorage = (id: string) => {
  try {
    uni.setStorageSync(OPENID_STORAGE_KEY, id);
    console.log("openid已成功保存到本地存储");
  } catch (e) {
    console.error("保存openid到本地存储失败:", e);
  }
};
const type = computed<undefined | null | string>(() => {
  //检查 token.value  第一个字母，是E还是C
  if (!token.value) return undefined;
  if (token.value.startsWith("E")) {
    return "E";
  } else if (token.value.startsWith("C")) {
    return "C";
  }
  return null;
});
let intervalId: number | null = null;
watch(
  () => _ready.value,
  (newVal) => {
    console.log("ready:" + newVal);
    if (newVal) {
      intervalId = setInterval(async () => {
        await refresh();
      }, 1800);
    } else {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  },
  { immediate: true },
);

// 刷新打卡状态
const refresh = async () => {
  if (token.value) {
    const ret = await getCheckinStatus(token.value);
    status.value = ret.data;
  }
};

// 开始录制
const begin = async () => {
  animationActive.value = true;
  setTimeout(async () => {
    if (openid.value && token.value) {
      const ret = await setCheckinReady(openid.value, token.value);
      status.value = ret.data;
    }
    animationActive.value = false;
  }, 800);
};

// 停止录制
const stop = async () => {
  animationActive.value = true;
  setTimeout(async () => {
    if (openid.value && token.value) {
      const ret = await setCheckinOver(openid.value, token.value);
      status.value = ret.data;
    }
    animationActive.value = false;
  }, 800);
};

// 获取签名后的URL，使用工具函数
const getSignedUrl = async (key: string, isPreview: boolean = false) => {
  try {
    const url = await getSignedVideoUrl(key, isPreview);
    if (isPreview) {
      previewImageUrl.value = url;
    } else {
      videoUrl.value = url;
    }
    return url;
  } catch (error) {
    console.error("获取签名URL失败:", error);
    return "";
  }
};

// 监听status.file变化，更新签名URL
watch(
  () => status.value?.file?.key,
  async (newKey) => {
    if (newKey) {
      previewImageLoading.value = true;
      await getSignedUrl(newKey, true); // 获取预览图URL
      await getSignedUrl(newKey); // 获取视频URL
    }
  },
);

const downloadVideo = async (key: string) => {
  // 先检查用户是否登录
  if (!openid.value) {
    uni.showToast({
      title: "请先登录",
      icon: "none",
    });
    return;
  }

  // 准备参数
  const params = {
    videoKey: key,
    price: 1, // 1分钱
    title: key.split("/").pop() || "AR打卡视频",
    action: "download",
  };

  // 跳转到支付页面
  uni.navigateTo({
    url: `/pages/payment/index?params=${encodeURIComponent(JSON.stringify(params))}`,
    fail: (err) => {
      console.error(`跳转到支付页面失败: ${JSON.stringify(err)}`);
      uni.showToast({
        title: "页面跳转失败",
        icon: "none",
      });
    },
  });
};

const getToken = () => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1] as unknown as { options: { q: string } };
  const query = currentPage.options;
  const decodedUrl = decodeURIComponent(query.q);
  const result = getQueryString(decodedUrl, "k");

  return result;
};

onLoad(async () => {
  token.value = getToken(); //得到token

  //本页面所有操作都具有token

  // 首先尝试从本地存储中获取openid
  const storedOpenid = getOpenidFromStorage();
  if (storedOpenid) {
    console.log("从本地存储中恢复了openid");
    openid.value = storedOpenid;
  } else {
    // 如果本地没有存储openid，则请求新的
    try {
      const ret = await wxLogin();
      openid.value = ret.openid; //得到openid
      // 将新获取的openid保存到本地存储
      if (openid.value) {
        saveOpenidToStorage(openid.value);
      }
    } catch (error) {
      console.error("openid 请求失败！" + error);
      return;
    }
  }

  try {
    if (token.value) {
      const ret = await getCheckinStatus(token.value);

      if (!ret.success || ret.data.checkin.openid != openid.value) {
        //没有状态，证明没有链接，这里要链接
        if (openid.value && token.value) {
          const linkedRet = await setCheckinLinked(openid.value, token.value);
          console.log("链接成功！" + JSON.stringify(linkedRet));
          status.value = linkedRet.data;
        }
      } else {
        //有状态，证明已经链接，这里要刷新
        status.value = ret.data;
      }
    }
  } catch (error) {
    console.log("status 请求失败！" + error);
  } finally {
    loadingState.value = false;
  }
});
</script>

<template>
  <view class="content-wrapper">
    <!-- 加载状态 -->

    <view class="loading-container" v-if="loadingState">
      <view class="loading-spinner"></view>
      <view class="loading-text">连接中...</view>
    </view>

    <!-- 主内容区域 -->
    <view class="main-content" v-else>
      <!-- 进度指示器 -->
      <view v-if="type != undefined" class="progress-tracker">
        <view class="step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
          <view class="step-circle">
            <image
              v-if="currentStep > 0"
              class="step-success-icon"
              src="/static/icons/process_success.png"
              mode="aspectFit"
            ></image>
            <text v-else>1</text>
          </view>
          <view class="step-label">连接</view>
        </view>
        <view
          class="step-line"
          :class="{ active: currentStep >= 1, completed: currentStep > 1 }"
        ></view>
        <view class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
          <view class="step-circle">
            <image
              v-if="currentStep > 1"
              class="step-success-icon"
              src="/static/icons/process_success.png"
              mode="aspectFit"
            ></image>
            <text v-else>2</text>
          </view>
          <view class="step-label">准备</view>
        </view>
        <view
          class="step-line"
          :class="{ active: currentStep >= 2, completed: currentStep > 2 }"
        ></view>
        <view class="step" :class="{ active: currentStep >= 3, completed: currentStep > 3 }">
          <view class="step-circle">
            <image
              v-if="currentStep > 2"
              class="step-success-icon"
              src="/static/icons/process_success.png"
              mode="aspectFit"
            ></image>
            <text v-else>3</text>
          </view>
          <view class="step-label">完成</view>
        </view>
      </view>

      <!-- 状态卡片 -->
      <view class="status-card" :class="{ 'animation-active': animationActive }">
        <block v-if="status && status.file != null">
          <view class="status-icon success-icon">
            <image src="/static/icons/success.png" mode="aspectFit"></image>
          </view>
          <view class="status-title">🎉 录制完成！</view>
          <view class="status-description"
            >恭喜您！AR打卡视频已成功生成，快来查看您的精彩时刻吧！</view
          >
          <view class="file-info">
            <view class="file-icon">
              <image src="/static/icons/video_icon.png" mode="aspectFit"></image>
            </view>
            <view class="file-name">{{ status.file.key.split("/").pop() }}</view>
          </view>

          <!-- 视频第一帧预览 -->
          <view class="video-preview">
            <view class="preview-title">视频预览</view>
            <view class="preview-container">
              <!-- 加载动画 -->
              <view class="preview-loading" v-if="previewImageLoading">
                <view class="loading-spinner"></view>
                <text class="loading-text">加载预览中...</text>
              </view>
              <!-- 预览图 - 使用签名后的URL -->
              <image
                class="preview-image"
                :class="{ 'image-loaded': !previewImageLoading }"
                :src="previewImageUrl"
                mode="aspectFill"
                @load="previewImageLoading = false"
                @error="previewImageLoading = false"
              ></image>
            </view>
          </view>

          <!-- 按钮组 -->
          <view class="action-buttons">
            <!-- 下载视频按钮 -->
            <button
              class="action-button download-button full-width"
              @click="downloadVideo(status.file.key)"
            >
              <view class="button-icon"
                ><image src="/static/icons/download.png" mode="aspectFit"></image
              ></view>
              <!-- <text>拍摄服务费(¥0.01)</text> -->
              <text>文件下载</text>
            </button>
          </view>

          <!-- 支付说明 -->
          <view class="payment-tips">
            <image src="/static/icons/tip.png" mode="aspectFit" class="tip-icon"></image>
            <!-- <text class="tip-text">拍摄服务费¥0.01，支付完成后可获取打卡视频并保存到相册</text> -->
            <text class="tip-text">文件下载免费，下载完成后可获取打卡视频并保存到相册</text>
          </view>
        </block>

        <block v-else-if="status && status.checkin.status == 'linked'">
          <view class="status-icon linked-icon">
            <image src="/static/icons/linked.png" mode="aspectFit"></image>
          </view>
          <view class="status-title">已连接</view>
          <view class="status-description">您的设备已成功连接，准备好开始录制了吗？</view>
          <view class="ar-instruction">
            <view class="instruction-step">
              <view class="instruction-number">1</view>
              <view class="instruction-text">手机对准目标</view>
            </view>
            <view class="instruction-step">
              <view class="instruction-number">2</view>
              <view class="instruction-text">保持稳定录制</view>
            </view>
            <view class="instruction-step">
              <view class="instruction-number">3</view>
              <view class="instruction-text">完成AR打卡</view>
            </view>
          </view>

          <button class="action-button begin-button full-width" @click="begin">
            <view class="button-icon"
              ><image src="/static/icons/start_recording.png" mode="aspectFit"></image
            ></view>
            <text>开始录制</text>
          </button>
        </block>

        <block v-else-if="status && status.checkin.status == 'ready'">
          <view class="status-icon ready-icon">
            <image src="/static/icons/recording.png" mode="aspectFit"></image>
          </view>
          <view class="status-title">录制进行中</view>
          <view class="status-description">正在进行AR打卡录制，请保持设备稳定...</view>
          <view class="recording-indicator">
            <view class="recording-pulse"></view>
            <view class="recording-ring"></view>
            <view class="recording-time">● REC</view>
          </view>
          <button class="action-button cancel-button full-width" @click="stop">
            <view class="button-icon"
              ><image src="/static/icons/stop_recording.png" mode="aspectFit"></image
            ></view>
            <text>停止录制</text>
          </button>
        </block>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

// 加载状态
.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .loading-spinner {
    width: 80rpx;
    height: 80rpx;
    border: 4rpx solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top-color: #4a90e2;
    animation: spin 1s linear infinite;
    margin-bottom: 20rpx;
  }

  .loading-text {
    font-size: 28rpx;
    color: #666;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// 主内容区域
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

// 进度指示器
.progress-tracker {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 28rpx;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.06), 0 4rpx 8rpx rgba(0, 0, 0, 0.04);
  padding: 48rpx 40rpx;
  margin-bottom: 40rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: -20rpx;
    right: -20rpx;
    width: 120rpx;
    height: 120rpx;
    background: radial-gradient(circle, rgba(82, 196, 26, 0.04) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
  }

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 1;
    position: relative;

    .step-circle {
      width: 68rpx;
      height: 68rpx;
      border-radius: 50%;
      background: #e5e7eb;
      color: #9ca3af;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28rpx;
      font-weight: 700;
      margin-bottom: 12rpx;
      transition: all 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55);
      position: relative;
      overflow: hidden;

      &::before {
        content: "";
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
          45deg,
          transparent 30%,
          rgba(255, 255, 255, 0.3) 50%,
          transparent 70%
        );
        transform: translateX(-100%);
        transition: transform 0.6s ease;
      }

      text {
        position: relative;
        z-index: 2;
      }

      .step-success-icon {
        width: 36rpx;
        height: 36rpx;
        filter: brightness(1.1) drop-shadow(0 2rpx 4rpx rgba(0, 0, 0, 0.1));
        animation: success-bounce 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55);
      }
    }

    .step-label {
      font-size: 26rpx;
      color: #6b7280;
      font-weight: 500;
      transition: all 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55);
      letter-spacing: 0.5rpx;
    }

    &.active {
      .step-circle {
        background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
        color: #fff;
        box-shadow: 0 8rpx 20rpx rgba(82, 196, 26, 0.3), 0 4rpx 8rpx rgba(82, 196, 26, 0.2);
        transform: scale(1.08);

        &::before {
          transform: translateX(100%);
        }
      }

      .step-label {
        color: #52c41a;
        font-weight: 600;
        transform: translateY(-2rpx);
      }
    }

    &.completed {
      .step-circle {
        background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
        color: #fff;
        box-shadow: 0 8rpx 20rpx rgba(82, 196, 26, 0.25), 0 4rpx 8rpx rgba(82, 196, 26, 0.15);

        &::before {
          transform: translateX(100%);
        }
      }

      .step-label {
        color: #52c41a;
        font-weight: 600;
      }
    }
  }

  .step-line {
    height: 6rpx;
    flex: 1;
    background: #e5e7eb;
    margin: 0 16rpx;
    position: relative;
    top: -30rpx;
    border-radius: 3rpx;
    transition: all 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55);
    overflow: hidden;

    &:before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: 0;
      background: linear-gradient(90deg, #52c41a 0%, #73d13d 100%);
      border-radius: 3rpx;
      transition: width 0.8s ease-in-out;
      box-shadow: 0 2rpx 8rpx rgba(82, 196, 26, 0.3);
    }

    &.active {
      background: #e5e7eb;

      &:before {
        width: 100%;
        animation: line-glow 2s ease-in-out infinite;
      }
    }

    &.completed {
      background: #e5e7eb;

      &:before {
        width: 100%;
      }
    }
  }
}

// 状态卡片
.status-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  transform: translateY(0);
  opacity: 1;

  &.animation-active {
    transform: translateY(20rpx);
    opacity: 0.7;
  }

  .status-icon {
    width: 120rpx;
    height: 120rpx;
    border-radius: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 30rpx;

    image {
      width: 100rpx;
      height: 100rpx;
    }

    &.linked-icon {
      background: rgba(74, 144, 226, 0.1);
      position: relative;
      overflow: visible;
      animation: connected-pulse 3s ease-in-out infinite;

      &::before {
        content: "";
        position: absolute;
        top: -15rpx;
        left: -15rpx;
        right: -15rpx;
        bottom: -15rpx;
        border: 2rpx solid rgba(74, 144, 226, 0.4);
        border-radius: 50%;
        animation: connection-wave 2s ease-out infinite;
      }

      &::after {
        content: "";
        position: absolute;
        top: -8rpx;
        left: -8rpx;
        right: -8rpx;
        bottom: -8rpx;
        border: 1rpx solid rgba(74, 144, 226, 0.6);
        border-radius: 50%;
        animation: success-ring 1.5s ease-in-out infinite;
      }

      image {
        width: 100rpx;
        height: 100rpx;
        position: relative;
        z-index: 2;
        filter: brightness(1.1) drop-shadow(0 4rpx 8rpx rgba(74, 144, 226, 0.3));
        animation: icon-breath 2.5s ease-in-out infinite;
      }
    }

    &.ready-icon {
      background: rgba(250, 173, 20, 0.1);
      animation: pulse 2s infinite;
      position: relative;
      overflow: visible;

      &::before {
        content: "";
        position: absolute;
        top: -8rpx;
        right: -8rpx;
        width: 24rpx;
        height: 24rpx;
        background: #ff4d4f;
        border-radius: 50%;
        border: 3rpx solid #fff;
        box-shadow: 0 0 0 2rpx rgba(255, 77, 79, 0.3);
        animation: recording-blink 1s ease-in-out infinite;
      }

      &::after {
        content: "";
        position: absolute;
        top: -15rpx;
        left: -15rpx;
        right: -15rpx;
        bottom: -15rpx;
        border: 2rpx solid transparent;
        border-top: 2rpx solid rgba(250, 173, 20, 0.8);
        border-right: 2rpx solid rgba(250, 173, 20, 0.6);
        border-radius: 50%;
        animation: recording-scan 2s linear infinite;
      }

      image {
        position: relative;
        z-index: 2;
        filter: brightness(1.1) drop-shadow(0 4rpx 12rpx rgba(250, 173, 20, 0.4));
        animation: recording-breath 3s ease-in-out infinite;
      }
    }

    &.success-icon {
      background: rgba(82, 196, 26, 0.1);
      position: relative;
      overflow: visible;
      animation: success-celebrate 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55);

      &::before {
        content: "";
        position: absolute;
        top: -20rpx;
        left: -20rpx;
        right: -20rpx;
        bottom: -20rpx;
        border: 3rpx solid rgba(82, 196, 26, 0.4);
        border-radius: 50%;
        animation: success-wave 1.5s ease-out infinite;
      }

      &::after {
        content: "";
        position: absolute;
        top: -30rpx;
        left: -30rpx;
        right: -30rpx;
        bottom: -30rpx;
        background: radial-gradient(circle, rgba(82, 196, 26, 0.1) 0%, transparent 70%);
        border-radius: 50%;
        animation: success-glow 2s ease-in-out infinite;
      }

      image {
        position: relative;
        z-index: 2;
        filter: brightness(1.2) drop-shadow(0 6rpx 15rpx rgba(82, 196, 26, 0.4));
        animation: success-bounce 2s ease-in-out infinite;
      }
    }
  }

  .status-title {
    font-size: 36rpx;
    font-weight: 600;
    color: #333;
    margin-bottom: 16rpx;
  }

  .status-description {
    font-size: 28rpx;
    color: #666;
    text-align: center;
    margin-bottom: 40rpx;
  }

  // 文件信息样式
  .file-info {
    display: flex;
    align-items: center;
    background: #f7f9fc;
    padding: 20rpx 30rpx;
    border-radius: 16rpx;
    width: 100%;
    margin-bottom: 40rpx;

    .file-icon {
      width: 60rpx;
      height: 60rpx;
      margin-right: 20rpx;

      image {
        width: 100%;
        height: 100%;
      }
    }

    .file-name {
      font-size: 28rpx;
      color: #333;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  // 视频预览样式
  .video-preview {
    width: 100%;
    margin-top: 10rpx;
    margin-bottom: 20rpx;

    .preview-title {
      font-size: 28rpx;
      color: #666;
      margin-bottom: 15rpx;
      text-align: center;
      font-weight: 500;
    }

    .preview-container {
      position: relative;
      width: 100%;
      height: 350rpx;
      border-radius: 16rpx;
      overflow: hidden;
      background: #f0f0f0;
      box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.12);
    }

    .preview-loading {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(245, 247, 250, 0.9);
      z-index: 2;

      .loading-spinner {
        width: 60rpx;
        height: 60rpx;
        border: 4rpx solid rgba(74, 144, 226, 0.1);
        border-radius: 50%;
        border-top-color: #4a90e2;
        animation: spin 1s linear infinite;
        margin-bottom: 16rpx;
      }

      .loading-text {
        font-size: 24rpx;
        color: #666;
        font-weight: 500;
      }
    }

    .preview-image {
      width: 100%;
      height: 100%;
      border-radius: 16rpx;
      transition: all 0.3s ease;
      position: relative;
      opacity: 0;
      transform: scale(0.95);

      &.image-loaded {
        opacity: 1;
        transform: scale(1);
      }

      &::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 16rpx;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
        pointer-events: none;
      }

      &:active {
        transform: scale(0.98);
        box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.1);
      }
    }
  }

  // AR指导说明
  .ar-instruction {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 40rpx;

    .instruction-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;

      .instruction-number {
        width: 50rpx;
        height: 50rpx;
        border-radius: 25rpx;
        background: #4a90e2;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24rpx;
        font-weight: 500;
        margin-bottom: 10rpx;
      }

      .instruction-text {
        font-size: 24rpx;
        color: #666;
        text-align: center;
      }
    }
  }

  // 录制指示器
  .recording-indicator {
    position: relative;
    width: 140rpx;
    height: 140rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 40rpx;

    .recording-pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(250, 173, 20, 0.2);
      animation: recording-pulse 2s infinite;
    }

    .recording-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 2rpx solid rgba(250, 173, 20, 0.4);
      animation: pulse 2s infinite;
    }

    .recording-time {
      position: relative;
      background: #faad14;
      color: #fff;
      padding: 10rpx 20rpx;
      border-radius: 30rpx;
      font-size: 24rpx;
      font-weight: 600;
    }
  }

  // 连接提示
  .connection-tips {
    width: 100%;
    margin-bottom: 30rpx;
    padding: 24rpx;
    background: linear-gradient(135deg, rgba(74, 144, 226, 0.03) 0%, rgba(74, 144, 226, 0.06) 100%);
    border-radius: 16rpx;
    border: 1rpx solid rgba(74, 144, 226, 0.1);

    .tip-item {
      display: flex;
      align-items: center;
      margin-bottom: 20rpx;
      animation: tip-fade-in 0.5s ease-in-out;

      &:last-child {
        margin-bottom: 0;
      }

      image {
        width: 40rpx;
        height: 40rpx;
        margin-right: 16rpx;
        filter: drop-shadow(0 2rpx 4rpx rgba(74, 144, 226, 0.2));
      }

      text {
        font-size: 26rpx;
        color: #999;
        font-weight: 500;
        letter-spacing: 0.5rpx;
      }
    }
  }

  // 按钮容器样式
  .action-buttons {
    display: flex;
    width: 100%;
    gap: 20rpx;
  }

  // 按钮样式
  .action-button {
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20rpx 24rpx;
    border-radius: 20rpx;
    font-size: 28rpx;
    font-weight: 500;
    color: #fff;
    box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    flex: 1;
    min-height: 80rpx;
    line-height: 1;
    margin-bottom: 20rpx;

    &.full-width {
      width: 100%;
      margin-right: 0;
    }

    .button-icon {
      width: 40rpx;
      height: 40rpx;
      margin-right: 12rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      image {
        width: 100%;
        height: 100%;
        vertical-align: middle;
      }
    }

    text {
      line-height: 1;
      display: flex;
      align-items: center;
    }

    &:active {
      transform: translateY(2rpx);
      box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.15);
    }

    &.begin-button {
      background: #4a90e2;
      &:active {
        background: #3a80d2;
      }
    }

    &.cancel-button {
      background: #ff4d4f;
      &:active {
        background: #ff3a3d;
      }
    }

    &.download-button {
      background: #1890ff;
      &:active {
        background: #177ddc;
      }
    }
  }

  // 支付提示样式
  .payment-tips {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 16rpx 24rpx;
    background: rgba(24, 144, 255, 0.05);
    border-radius: 16rpx;
    margin-bottom: 30rpx;

    .tip-icon {
      width: 32rpx;
      height: 32rpx;
      margin-right: 12rpx;
      flex-shrink: 0;
    }

    .tip-text {
      font-size: 24rpx;
      color: #666;
      line-height: 1.4;
    }
  }
}

@keyframes recording-pulse {
  0% {
    transform: scale(0.95);
    opacity: 1;
  }
  70% {
    transform: scale(1.1);
    opacity: 0.7;
  }
  100% {
    transform: scale(0.95);
    opacity: 1;
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(250, 173, 20, 0.4);
  }
  70% {
    box-shadow: 0 0 0 20rpx rgba(250, 173, 20, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(250, 173, 20, 0);
  }
}

@keyframes success-celebrate {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes success-bounce {
  0%,
  100% {
    transform: scale(1);
    filter: brightness(1.2) drop-shadow(0 6rpx 15rpx rgba(82, 196, 26, 0.4));
  }
  50% {
    transform: scale(1.05);
    filter: brightness(1.3) drop-shadow(0 8rpx 20rpx rgba(82, 196, 26, 0.5));
  }
}

@keyframes success-wave {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.4;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

@keyframes success-glow {
  0% {
    filter: brightness(1.1) drop-shadow(0 2rpx 6rpx rgba(82, 196, 26, 0.2));
  }
  100% {
    filter: brightness(1.3) drop-shadow(0 4rpx 12rpx rgba(82, 196, 26, 0.4));
  }
}

@keyframes line-glow {
  0%,
  100% {
    box-shadow: 0 2rpx 8rpx rgba(82, 196, 26, 0.3);
  }
  50% {
    box-shadow: 0 2rpx 12rpx rgba(82, 196, 26, 0.5);
  }
}

@keyframes radar-scan {
  0% {
    transform: rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: rotate(360deg);
    opacity: 1;
  }
}

@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.4;
  }
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
}

@keyframes tip-fade-in {
  0% {
    opacity: 0;
    transform: translateX(-10rpx);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

// 连接成功背景脉冲动画
@keyframes connected-pulse {
  0%,
  100% {
    background: rgba(74, 144, 226, 0.1);
    box-shadow: 0 0 0 0 rgba(74, 144, 226, 0.1);
  }
  50% {
    background: rgba(74, 144, 226, 0.15);
    box-shadow: 0 0 15rpx 5rpx rgba(74, 144, 226, 0.1);
  }
}

// 连接波纹扩散动画
@keyframes connection-wave {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.4;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

// 成功指示圆环动画
@keyframes success-ring {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

// 图标呼吸动画
@keyframes icon-breath {
  0%,
  100% {
    transform: scale(1);
    filter: brightness(1.1) drop-shadow(0 4rpx 8rpx rgba(74, 144, 226, 0.3));
  }
  50% {
    transform: scale(1.05);
    filter: brightness(1.2) drop-shadow(0 6rpx 12rpx rgba(74, 144, 226, 0.4));
  }
}

// 录制指示闪烁动画
@keyframes recording-blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

// 录制扫描旋转动画
@keyframes recording-scan {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

// 录制呼吸动画
@keyframes recording-breath {
  0% {
    filter: brightness(1.1) drop-shadow(0 4rpx 8rpx rgba(250, 173, 20, 0.4));
  }
  50% {
    filter: brightness(1.2) drop-shadow(0 6rpx 12rpx rgba(250, 173, 20, 0.6));
  }
  100% {
    filter: brightness(1.1) drop-shadow(0 4rpx 8rpx rgba(250, 173, 20, 0.4));
  }
}
</style>
