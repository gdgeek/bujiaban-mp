<script setup lang="ts">
import { ref, defineEmits, defineProps } from "vue";

const props = defineProps<{
  openid: string | null;
  token: string | null;
  slogan: string;
}>();

const emits = defineEmits<{
  (e: "back"): void;
  (e: "submit", val: any): void;
}>();

const coverPictures = [
  { id: 1, src: "https://game-1251022382.cos.ap-nanjing.myqcloud.com/picture/a1.png" },
  { id: 2, src: "https://game-1251022382.cos.ap-nanjing.myqcloud.com/picture/a2.png" },
  { id: 3, src: "https://game-1251022382.cos.ap-nanjing.myqcloud.com/picture/a3.png" },
  { id: 4, src: "https://game-1251022382.cos.ap-nanjing.myqcloud.com/picture/a4.png" },
  { id: 5, src: "https://game-1251022382.cos.ap-nanjing.myqcloud.com/picture/a5.png" },
  { id: 6, src: "https://game-1251022382.cos.ap-nanjing.myqcloud.com/picture/a6.png" },
];

const selectedPicture = ref<number | null>(null);

const selectPicture = (id: number) => {
  selectedPicture.value = id;
};

const goBack = () => {
  emits("back");
};

const submitForm = () => {
  if (selectedPicture.value) {
    emits("submit", {
      success: true,
      text: props.slogan,
      picture: selectedPicture.value,
    });
  }
};
</script>

<template>
  <view class="picture-container">
    <!-- 标题 -->
    <view class="picture-header">
      <text class="picture-title">选择封面</text>
      <text class="picture-subtitle">为您的打卡选择一个精美封面</text>
    </view>

    <!-- 已选标语展示 -->
    <view class="selected-slogan">
      <text class="slogan-label">已选标语:</text>
      <text class="slogan-content">{{ slogan }}</text>
    </view>

    <!-- 封面图片选择区域 -->
    <view class="picture-grid">
      <view
        v-for="picture in coverPictures"
        :key="picture.id"
        class="picture-item"
        :class="{ active: selectedPicture === picture.id }"
        @click="selectPicture(picture.id)"
      >
        <image class="cover-image" :src="picture.src" mode="widthFix"></image>
        <view v-if="selectedPicture === picture.id" class="selected-overlay">
          <image class="check-icon" src="/static/icons/selected.png" mode="aspectFit"></image>
        </view>
      </view>
    </view>

    <!-- 按钮组 -->
    <view class="button-group">
      <button class="btn back-btn" size="mini" @click="goBack">
        <image class="btn-icon" src="/static/icons/arrow-left.png" mode="aspectFit"></image>
        <text>返回</text>
      </button>
      <button
        class="btn submit-btn"
        size="mini"
        @click="submitForm"
        :disabled="!selectedPicture"
        :class="{ disabled: !selectedPicture }"
      >
        <image class="btn-icon" src="/static/icons/process_success.png" mode="aspectFit"></image>
        <text>提交</text>
      </button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.picture-container {
  padding: 40rpx;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
}

.picture-header {
  margin-bottom: 36rpx;
}

.picture-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  display: block;
}

.picture-subtitle {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}

.selected-slogan {
  background: #f9f9f9;
  padding: 20rpx;
  border-radius: 16rpx;
  margin-bottom: 30rpx;
  display: flex;
  align-items: center;
}

.slogan-label {
  font-size: 26rpx;
  color: #666;
  margin-right: 10rpx;
}

.slogan-content {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.picture-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.picture-item {
  position: relative;
  border-radius: 16rpx;
  overflow: hidden;
  border: 2rpx solid transparent;
  transition: all 0.3s;
  min-height: 200rpx;

  &.active {
    border-color: #1890ff;
    transform: scale(1.02);
    box-shadow: 0 8rpx 16rpx rgba(24, 144, 255, 0.15);
  }
}

.cover-image {
  width: 100%;
  display: block;
}

.selected-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(24, 144, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease-in-out;
}

.check-icon {
  width: 60rpx;
  height: 60rpx;
  animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

// 按钮组样式
.button-group {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
}

.btn {
  flex: 1;
  height: 90rpx;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 500;
  transition: all 0.3s ease;
  letter-spacing: 2rpx;
}

.btn-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 10rpx;
}

.back-btn {
  background: #f5f7fa;
  color: #666;
  border: 1px solid #e0e5ec;

  &:active {
    background: #eef1f6;
  }
}

.submit-btn {
  background: #1890ff;
  color: #fff;
  border: none;
  box-shadow: 0 8rpx 16rpx rgba(24, 144, 255, 0.15);

  &:active {
    background: #177ddc;
    transform: translateY(2rpx);
    box-shadow: 0 4rpx 8rpx rgba(24, 144, 255, 0.15);
  }

  &[disabled],
  &.disabled {
    background: #91caff;
    color: #ffffff;
    box-shadow: none;
    opacity: 0.7;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
