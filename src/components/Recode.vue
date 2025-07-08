<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";

const formSubmit = (e: Event) => {
  e.preventDefault();
  const formData = new FormData(e.target as HTMLFormElement);
  console.log("Form submitted with data:", Object.fromEntries(formData));
};
const formReset = (e: Event) => {
  e.preventDefault();
  console.log("Form reset");
};
</script>

<template>
  <view>
    <view>
      <form @submit="formSubmit" @reset="formReset">
        <view class="uni-form-item uni-column">
          <view class="title">input</view>
          <input class="uni-input" name="题词" value="龙马精神" />
        </view>
        <view class="uni-btn-v">
          <button class="uni-input">Submit</button>
          <button class="uni-input" type="default" form-type="reset">Reset</button>
        </view>
      </form>
    </view>
  </view>
</template>

<style lang="scss" scoped>
// 表单容器
.form-container {
  padding: 40rpx;
  background: #fff;
  min-height: 100vh;
}
.uni-input {
  padding: 0px;
  border: 1px solid #ccc;
  border-radius: 2px;
  font-size: 16px;
}
</style>
