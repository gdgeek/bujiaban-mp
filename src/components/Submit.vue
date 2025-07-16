<script setup lang="ts">
import { ref, computed, watch } from "vue";

// 增加属性父级别属性
const props = defineProps<{
  openid: string | null;
  token: string | null;
  savedSlogan?: string;
}>();

const input = ref(props.savedSlogan || "");
const emits = defineEmits<{ (e: "next", val: string): void; (e: "submit", val: any): void }>();

watch(
  () => props.savedSlogan,
  (newVal) => {
    if (newVal) {
      input.value = newVal;
    }
  },
);

const nextStep = () => {
  emits("next", input.value);
  console.error("前往下一步");
};

const formReset = (e: any) => {
  e.preventDefault();
  input.value = "";
  console.error("Form reset");
};

// 预设标语列表
const presetSlogans = [
  { id: 1, text: "我在这里很想你", color: "#E6F7FF", bgColor: "#1890FF" },
  { id: 2, text: "今天也要加油鸭", color: "#F6FFED", bgColor: "#52C41A" },
  { id: 3, text: "阳光正好，微风不燥", color: "#FFF7E6", bgColor: "#FA8C16" },
  { id: 4, text: "记录每一刻，热爱每一天", color: "#FCF5FF", bgColor: "#722ED1" },
];

// 选择预设标语
const selectSlogan = (slogan: string) => {
  input.value = slogan;
};

// 是否有选中的预设标语
const activeSlogan = computed(() => {
  return presetSlogans.find((item) => item.text === input.value)?.id || null;
});
</script>

<template>
  <view class="submit-container">
    <!-- 标题 -->
    <view class="submit-header">
      <text class="submit-title">打卡标语</text>
      <text class="submit-subtitle">选择或输入您的打卡标语</text>
    </view>

    <form @reset="formReset">
      <!-- 预设标语选项 -->
      <view class="preset-slogans">
        <view
          v-for="slogan in presetSlogans"
          :key="slogan.id"
          class="slogan-item"
          :class="{ active: activeSlogan === slogan.id }"
          :style="{
            backgroundColor: activeSlogan === slogan.id ? slogan.bgColor + '22' : slogan.color,
            borderColor: activeSlogan === slogan.id ? slogan.bgColor : 'transparent',
          }"
          @click="selectSlogan(slogan.text)"
        >
          <image
            v-if="activeSlogan === slogan.id"
            class="star-icon"
            src="/static/icons/star.png"
            mode="aspectFit"
          ></image>
          <text
            class="slogan-text"
            :style="{ color: activeSlogan === slogan.id ? slogan.bgColor : '#333' }"
          >
            {{ slogan.text }}
          </text>
        </view>
      </view>

      <!-- 自定义输入框 -->
      <view class="input-wrapper">
        <image class="input-icon" src="/static/icons/pencil.png" mode="aspectFit"></image>
        <input
          v-model="input"
          class="custom-input"
          name="题词"
          placeholder="输入自定义标语..."
          placeholder-class="placeholder"
          maxlength="15"
        />
      </view>

      <!-- 按钮组 -->
      <view class="button-group">
        <button class="btn reset-btn" size="mini" form-type="reset">
          <image class="btn-icon" src="/static/icons/reset.png" mode="aspectFit"></image>
          <text>重置</text>
        </button>
        <button class="btn next-btn" size="mini" @click="nextStep">
          <image class="btn-icon" src="/static/icons/arrow-right.png" mode="aspectFit"></image>
          <text>下一步</text>
        </button>
      </view>
    </form>
  </view>
</template>

<style lang="scss" scoped>
.submit-container {
  padding: 40rpx;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
}

.submit-header {
  margin-bottom: 36rpx;
}

.submit-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  display: block;
}

.submit-subtitle {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}

// 预设标语样式
.preset-slogans {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 40rpx;
}

// 为标语选中时添加过渡效果
.slogan-item {
  padding: 24rpx;
  border-radius: 16rpx;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  border: 2rpx solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;

  &.active {
    transform: translateX(10rpx);
    padding-left: 70rpx; /* 为星星图标留出空间 */
  }

  &::before {
    content: "";
    position: absolute;
    left: -6rpx;
    top: 50%;
    transform: translateY(-50%);
    width: 6rpx;
    height: 60%;
    border-radius: 8rpx;
    opacity: 0;
    transition: all 0.3s;
  }
}

.star-icon {
  width: 36rpx;
  height: 36rpx;
  position: absolute;
  left: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  animation: rotateIn 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}

.slogan-text {
  font-size: 28rpx;
  line-height: 1.5;
  text-align: center;
  font-weight: 500;
}

// 输入框样式
.input-wrapper {
  display: flex;
  align-items: center;
  border: 1rpx solid #eaeaea;
  border-radius: 16rpx;
  padding: 6rpx 24rpx;
  margin-bottom: 40rpx;
  background-color: #f9f9f9;
}

.input-icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: 16rpx;
}

.custom-input {
  flex: 1;
  height: 80rpx;
  font-size: 28rpx;
  border: none;
  background: transparent;
}

.placeholder {
  color: #bbb;
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

.reset-btn {
  background: #f5f7fa;
  color: #666;
  border: 1px solid #e0e5ec;

  &:active {
    background: #eef1f6;
  }
}

.next-btn {
  background: #1890ff;
  color: #fff;
  border: none;
  box-shadow: 0 8rpx 16rpx rgba(24, 144, 255, 0.15);

  &:active {
    background: #177ddc;
    transform: translateY(2rpx);
    box-shadow: 0 4rpx 8rpx rgba(24, 144, 255, 0.15);
  }

  &[disabled] {
    background: #91caff;
    color: #ffffff;
    box-shadow: none;
    opacity: 0.7;
  }
}

@keyframes rotateIn {
  from {
    opacity: 0;
    transform: translateY(-50%) rotate(-180deg) scale(0.5);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) rotate(0deg) scale(1);
  }
}
</style>
