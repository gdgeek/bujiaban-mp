<script setup lang="ts">
import { defineProps } from "vue";

const props = defineProps<{
  currentStep: number;
  steps: Array<{ title: string; desc: string }>;
}>();
</script>

<template>
  <view class="steps">
    <view
      v-for="(step, index) in props.steps"
      :key="index"
      class="step-item"
      :class="{
        active: index === props.currentStep && index !== props.steps.length - 1,
        completed:
          index < props.currentStep ||
          (index === props.currentStep && index === props.steps.length - 1),
      }"
    >
      <!-- 步骤圆圈 -->
      <view class="step-circle">
        <text
          v-if="
            index < props.currentStep ||
            (index === props.currentStep && index === props.steps.length - 1)
          "
          >✓</text
        >
        <text v-else>{{ index + 1 }}</text>
      </view>

      <!-- 步骤标题 -->
      <view class="step-label">{{ step.title }}</view>

      <!-- 连接线（除了最后一个） -->
      <view
        v-if="index < props.steps.length - 1"
        class="step-line"
        :class="{
          completed:
            index < props.currentStep ||
            (index === props.currentStep - 1 && props.currentStep === props.steps.length - 1),
        }"
      ></view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
// 步骤指示器
.steps {
  display: flex;
  align-items: center;
  position: relative;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
}

// 步骤圆圈
.step-circle {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: #e5e5e5;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
  transition: all 0.3s ease;
}

// 步骤标签
.step-label {
  font-size: 24rpx;
  color: #666;
  text-align: center;
}

// 连接线
.step-line {
  position: absolute;
  top: 30rpx;
  left: calc(50% + 30rpx);
  right: calc(-50% + 30rpx);
  height: 2rpx;
  background: #e5e5e5;
  transition: all 0.3s ease;
}

// 激活状态
.step-item.active {
  .step-circle {
    background: #007aff;
    color: #fff;
  }

  .step-label {
    color: #007aff;
    font-weight: bold;
  }
}

// 完成状态
.step-item.completed {
  .step-circle {
    background: #52c41a;
    color: #fff;
  }

  .step-label {
    color: #52c41a;
  }
}

.step-line.completed {
  background: #52c41a;
}

// 内容区域
.content {
  padding: 60rpx 40rpx;
  background: #f8f9fa;
  border-radius: 16rpx;
  margin-bottom: 40rpx;
  text-align: center;
}

.step-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.step-desc {
  display: block;
  font-size: 28rpx;
  color: #666;
}

// 按钮组
.buttons {
  display: flex;
  gap: 20rpx;
  justify-content: center;
}

.btn {
  padding: 20rpx 40rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  border: 1px solid #ddd;
  background: #fff;
  color: #333;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.primary {
    background: #007aff;
    color: #fff;
    border-color: #007aff;
  }

  &.reset-btn {
    background: #ff4d4f;
    color: #fff;
    border-color: #ff4d4f;
  }
}
</style>
