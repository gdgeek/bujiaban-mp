<template>
  <view class="video-card">
    <view class="video-thumb">
      <image
        :src="thumbnailUrl"
        mode="aspectFill"
        class="thumbnail-image"
        :lazy-load="true"
        @error="onImageError"
      />
    </view>
    <view class="video-info">
      <text class="video-title">{{ videoTitle }}</text>
      <text class="video-date">上传日期: {{ video.created_at }}</text>
    </view>
    <view class="video-actions">
      <button class="action-button download-button full-width" @click="downloadVideo()">
        <view class="button-icon"
          ><image src="/static/icons/download.png" mode="aspectFit"></image
        ></view>
        <!-- <text>拍摄服务费(¥0.01)</text> -->
        <text>文件下载</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { FileType } from "@/api/checkin";
//import type { Video } from "@/types/video";
import { getSignedVideoUrl } from "@/utils/video";

const props = defineProps<{
  video: FileType;
}>();

// 视频缩略图URL
const thumbnailUrl = ref<string>("");
// 图片加载错误标志
const imageLoadError = ref<boolean>(false);
// 添加loading状态
const loading = ref<boolean>(false);

// 从cosKey中提取视频标题
const videoTitle = computed(() => {
  if (!props.video.key) return "未命名视频";

  // 获取/后文件名
  const parts = props.video.key.split("/");
  const filename = parts[parts.length - 1];

  // 去掉文件扩展名
  return filename.replace(/\.[^/.]+$/, "");
});

// 获取视频缩略图
const updateThumbnailUrl = async () => {
  if (props.video.key && !imageLoadError.value) {
    try {
      thumbnailUrl.value = await getSignedVideoUrl(props.video.key, true);
    } catch (error) {
      console.error("获取视频缩略图失败:", error);
      // 使用占位图
      imageLoadError.value = true;
    }
  }
};

// 图片加载错误处理
const onImageError = () => {
  console.log("图片加载失败，使用占位图");
  imageLoadError.value = true;
  thumbnailUrl.value = "/static/images/video_placeholder.png";
};

// 处理视频服务
const downloadVideo = async () => {
  console.log("准备处理视频下载:", props.video.id);

  loading.value = true;

  try {
    const params = {
      videoKey: props.video.key,
      price: 0,
      title: videoTitle.value || "AR打卡视频",
      action: "download",
    };

    // 跳转到支付页面
    uni.navigateTo({
      url: `/pages/payment/index?params=${encodeURIComponent(JSON.stringify(params))}`,
      success: () => {
        loading.value = false;
      },
      fail: (err) => {
        console.error(`跳转到支付页面失败: ${JSON.stringify(err)}`);
        uni.showToast({
          title: "页面跳转失败",
          icon: "none",
        });
        loading.value = false;
      },
    });
  } catch (error) {
    console.error("处理视频下载失败:", error);
    uni.showToast({
      title: "操作失败",
      icon: "none",
    });
    loading.value = false;
  }
};

// 组件挂载时获取缩略图
onMounted(async () => {
  await updateThumbnailUrl();
});
</script>

<style lang="scss">
.video-card {
  margin: 20rpx 0;
  border-radius: 16rpx;
  background-color: #ffffff;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.video-thumb {
  width: 100%;
  height: 400rpx;
  position: relative;
  background-color: #f5f5f5;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
}

.video-info {
  padding: 20rpx;
}

.video-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.video-date {
  font-size: 24rpx;
  color: #999;
  display: block;
}

.video-actions {
  padding: 0 20rpx 20rpx;
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

  // 统一的激活状态效果
  &:active {
    transform: translateY(2rpx);
    box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.15);
  }

  &.download-button {
    background: #1890ff;
    &:active {
      background: #177ddc;
    }
  }
}
</style>
