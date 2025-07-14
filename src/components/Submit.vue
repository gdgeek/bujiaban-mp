<script setup lang="ts">
import { ref, defineEmits, computed, watch, onMounted, onUnmounted } from "vue";
import { calculateHash } from "@/utils/common";

//增加属性父级别属性
const props = defineProps<{
  openid: string | null;
  token: string | null;
}>();
const input = ref("龙马精2神!");
const emits = defineEmits<{ (e: "submit", val: any): void }>();
const formSubmit = (e: any) => {
  e.preventDefault();
  emits("submit", { success: true, text: input.value });
  console.error("Form submit");
};
const formReset = (e: any) => {
  e.preventDefault();
  console.error("Form reset");
};
</script>

<template>
  <view>
    <view>
      <form @reset="formReset">
        {{ props.openid }}
        {{ props.token }}
        <view class="uni-form-item uni-column">
          <view class="title">input</view>
          <input v-model="input" class="uni-input" name="题词" value="龙马精神!" />
        </view>
        <view class="uni-btn-v">
          <button class="uni-input" @click="formSubmit">Submit</button>
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
