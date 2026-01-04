<script setup lang="ts">
defineOptions({ name: "VideoRecoding" });
/**
 * 文件处理中状态组件
 * 显示录制完成后的处理中状态
 */
</script>

<template>
  <view class="content-wrapper">
    <view class="main-content">
      <view class="status-card">
        <view class="status-icon linked-icon">
          <image src="/static/icons/file_handling.png" mode="aspectFit"></image>
        </view>
        <view class="status-title">文件处理中</view>
        <view class="status-description">文件已经录制完成，正在进行最后的处理！</view>
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

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.status-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;

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

      image {
        width: 100rpx;
        height: 100rpx;
        position: relative;
        z-index: 2;
        filter: brightness(1.1) drop-shadow(0 4rpx 8rpx rgba(74, 144, 226, 0.3));
        animation: icon-breath 2.5s ease-in-out infinite;
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
}

@keyframes connected-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

@keyframes connection-wave {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.3);
  }
}

@keyframes icon-breath {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}
</style>
