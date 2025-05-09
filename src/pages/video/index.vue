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
      // 开发环境 - 使用本地开发服务器
      // webviewUrl.value = "http://localhost:3000/video/index.html";
      webviewUrl.value = "https://file.4mr.cn";
      // webviewUrl.value = "http://localhost:5173";
    } else if (env === "trial") {
      // 体验版环境 - 使用测试服务器
      webviewUrl.value = "https://test-example.com/video/index.html";
    } else {
      // 正式环境 - 使用生产服务器
      webviewUrl.value = "https://file.4mr.cn";
    }

    console.log("当前小程序环境:", env);
  } catch (err) {
    console.error("获取小程序信息失败:", err);
    // 出错时使用备用URL
    webviewUrl.value = "http://localhost:3000/video/index.html";
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
  console.log("收到web-view消息:", event);

  // 从web-view接收消息
  if (event.detail && event.detail.data) {
    const data = event.detail.data;

    // 根据不同的消息类型进行处理
    switch (data.action) {
      case "add":
        handleAddVideo();
        break;
      case "edit":
        handleEditVideo(data.videoId);
        break;
      case "delete":
        handleDeleteVideo(data.videoId);
        break;
      default:
        console.log("未知操作:", data);
    }
  }
};

// 处理添加视频
const handleAddVideo = () => {
  uni.showToast({
    title: "正在添加视频...",
    icon: "none",
  });

  // 这里实现添加视频的逻辑
  // 未来将通过API调用实现
  console.log("添加视频");
};

// 处理编辑视频
const handleEditVideo = (videoId: number) => {
  uni.showToast({
    title: "正在编辑视频 ID: " + videoId,
    icon: "none",
  });

  // 这里实现编辑视频的逻辑
  // 未来将通过API调用实现
  console.log("编辑视频", videoId);
};

// 处理删除视频
const handleDeleteVideo = (videoId: number) => {
  uni.showToast({
    title: "已删除视频 ID: " + videoId,
    icon: "none",
  });

  // 这里实现删除视频的逻辑
  // 未来将通过API调用实现
  console.log("删除视频", videoId);
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
