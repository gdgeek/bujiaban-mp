<template>
  <view class="video-container">
    <!-- 只显示封面图，去除中间播放按钮 -->
    <view class="poster-container" @click="playVideo">
      <image :src="videoPoster" class="video-poster" mode="aspectFill"></image>
    </view>

    <view class="share-buttons">
      <button class="share-button" open-type="share">
        <image src="@/static/icons/share_friends.png" class="share-icon"></image>
        <text class="share-text">分享给朋友</text>
      </button>

      <view class="share-button" @click="playVideo">
        <image src="@/static/icons/video_play.png" class="share-icon"></image>
        <text class="share-text">查看详情</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
const videoPoster = ref("https://picsum.photos/700/400"); // 使用随机图片作为视频封面
const videoTitle = ref("精彩视频");
const videoDesc = ref("这是一段非常精彩的视频，点击查看更多内容！");
const externalVideoUrl = ref("https://vjs.zencdn.net/v/oceans.mp4"); // 外部视频链接

// 播放视频 - 跳转到外部网页
const playVideo = () => {
  // 打开外部链接
  uni.navigateTo({
    url: `/pages/webview/index?url=${encodeURIComponent(externalVideoUrl.value)}`,
    fail: (err) => {
      console.error("跳转失败", err);
      // 如果没有webview页面，则使用系统浏览器打开
      uni.showModal({
        title: "提示",
        content: "是否复制视频链接？",
        success: (res) => {
          if (res.confirm) {
            // 微信小程序中复制链接到剪贴板
            uni.setClipboardData({
              data: externalVideoUrl.value,
              success: () => {
                uni.showToast({
                  title: "链接已复制，请在浏览器中打开",
                  icon: "none",
                });
              },
            });
          }
        },
      });
    },
  });
};

// 页面加载
onMounted(() => {
  console.log("视频页面加载完成");
});

// 分享给朋友
const onShareAppMessage = () => {
  return {
    title: videoTitle.value,
    desc: videoDesc.value,
    path: "/pages/home/index",
    imageUrl: videoPoster.value,
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
    title: videoTitle.value,
    query: "/pages/home/index",
    imageUrl: videoPoster.value,
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
.video-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx;

  .poster-container {
    position: relative;
    width: 100%;
    height: 400rpx;
    border-radius: 12rpx;
    overflow: hidden;

    .video-poster {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .share-buttons {
    display: flex;
    justify-content: space-around;
    width: 100%;
    margin-top: 30rpx;

    .share-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20rpx;
      font-size: 24rpx;
      line-height: 1.2;

      /* 重置按钮样式 */
      background-color: transparent;
      border: none;
      margin: 0;
      width: auto;

      &::after {
        border: none;
      }

      .share-icon {
        width: 60rpx;
        height: 60rpx;
        margin-bottom: 10rpx;
      }

      .play-icon-small {
        width: 0;
        height: 0;
        border-top: 12rpx solid transparent;
        border-bottom: 12rpx solid transparent;
        border-left: 24rpx solid #666;
        margin-bottom: 10rpx;
      }

      .share-text {
        font-size: 24rpx;
        color: #666;
      }
    }
  }
}
</style>
