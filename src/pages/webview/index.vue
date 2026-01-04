<template>
  <view class="webview-page">
    <!-- 添加调试信息 -->
    <view v-if="!isLoaded" class="loading-tips">
      <text>正在加载视频播放页面...</text>
      <text>当前URL: {{ webviewUrl }}</text>
    </view>

    <web-view
      :src="webviewUrl"
      @message="handleMessage"
      @load="onWebViewLoaded"
      @error="onWebViewError"
    ></web-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import type { UniErrorEvent } from "@/types/events";

// web-view URL
const webviewUrl = ref("");
// 页面是否加载完成
const isLoaded = ref(false);
// 视频key
const videoKey = ref("");
// 签名后的URL
const signedUrl = ref("");

// 接收页面参数
onLoad((query) => {
  if (query && query.key) {
    videoKey.value = decodeURIComponent(query.key as string);
    console.debug("[webview] 接收到视频key");

    // 接收签名URL
    if (query.url) {
      signedUrl.value = decodeURIComponent(query.url as string);
      console.debug("[webview] 接收到签名URL");
    }

    initWebviewUrl();
  } else {
    console.warn("[webview] 缺少key参数");
    uni.showToast({
      title: "缺少视频参数",
      icon: "none",
    });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  }
});

// 初始化页面URL
const initWebviewUrl = () => {
  try {
    // 获取当前小程序环境下的完整URL
    const accountInfo = uni.getAccountInfoSync();
    const env = accountInfo.miniProgram.envVersion;

    // 根据不同环境使用不同URL
    let baseUrl = "";
    if (env === "develop") {
      // 开发环境
      baseUrl = "http://localhost:5173";
      // baseUrl = "https://file.4mr.cn";
    } else if (env === "trial") {
      // 体验版环境
      baseUrl = "https://file.4mr.cn";
    } else {
      // 正式环境
      baseUrl = "https://file.4mr.cn";
    }

    // 构建完整的URL，包含key参数和签名URL
    let url = `${baseUrl}/video?key=${encodeURIComponent(videoKey.value)}`;

    // 如果有签名URL，追加到参数中
    if (signedUrl.value) {
      url += `&signedUrl=${encodeURIComponent(signedUrl.value)}`;
    }

    webviewUrl.value = url;
    console.debug("[webview] 当前环境:", env);
  } catch (err) {
    console.error("[webview] 获取小程序信息失败:", err);
  }
};

// 处理web-view加载成功
const onWebViewLoaded = () => {
  console.debug("[webview] 加载成功");
  isLoaded.value = true;
};

// 处理web-view加载错误
const onWebViewError = (event: UniErrorEvent) => {
  console.error("[webview] 加载失败:", event);
  uni.showToast({
    title: "视频页面加载失败，请检查网络",
    icon: "none",
  });
};

// 处理web-view消息
const handleMessage = () => {
  console.debug("[webview] 收到消息");
};

const onShareAppMessage = () => {
  return {
    title: "不加班平台",
    desc: "不加班平台",
    path: "/pages/home/index",
    imageUrl: webviewUrl.value,
    success() {
      uni.showToast({
        title: "分享成功",
        icon: "success",
      });
    },
    fail() {
      uni.showToast({
        title: "分享失败",
        icon: "none",
      });
    },
  };
};

// 分享到朋友圈
const onShareTimeline = () => {
  return {
    title: "不加班平台",
    query: "/pages/home/index",
    imageUrl: webviewUrl.value,
    success() {
      uni.showToast({
        title: "分享成功",
        icon: "success",
      });
    },
    fail() {
      uni.showToast({
        title: "分享失败",
        icon: "none",
      });
    },
  };
};

// 将分享方法暴露给页面实例
defineExpose({
  onShareAppMessage,
  onShareTimeline,
});
</script>

<style lang="scss">
.webview-page {
  width: 100%;
  height: 100vh;
  position: relative;
}

.loading-tips {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #666;
  font-size: 14px;
  z-index: 1;
}
</style>
