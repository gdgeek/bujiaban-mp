<template>
  <view class="video-page">
    <!-- 添加调试信息 -->
    <view v-if="!isLoaded" class="loading-tips">
      <text>正在加载记录管理页面...</text>
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
import { ref, onMounted } from "vue";

// web-view URL
const webviewUrl = ref("");
// 页面是否加载完成
const isLoaded = ref(false);

// 初始化页面
onMounted(() => {
  try {
    // 获取当前小程序环境下的完整URL
    const accountInfo = uni.getAccountInfoSync();
    const env = accountInfo.miniProgram.envVersion;

    // 根据不同环境使用不同URL
    if (env === "develop") {
      // 开发环境
      // webviewUrl.value = "https://file.4mr.cn";
      webviewUrl.value = "http://localhost:5173";
    } else if (env === "trial") {
      // 体验版环境
      webviewUrl.value = "https://file.4mr.cn";
    } else {
      // 正式环境
      webviewUrl.value = "https://file.4mr.cn";
    }

    console.log("当前小程序环境:", env);
  } catch (err) {
    console.error("获取小程序信息失败:", err);
  }

  console.log("加载HTML路径:", webviewUrl.value);
});

// 处理web-view加载成功
const onWebViewLoaded = (event: any) => {
  console.log("web-view加载成功:", event);
  isLoaded.value = true;
};

// 处理web-view加载错误
const onWebViewError = (event: any) => {
  console.error("web-view加载失败:", event);
  uni.showToast({
    title: "页面加载失败，请检查网络",
    icon: "none",
  });
};

// 处理web-view消息
const handleMessage = (event: any) => {
  console.log("收到web-view消息", event);
};
</script>

<style lang="scss">
.video-page {
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
