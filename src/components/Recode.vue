<script setup lang="ts">
import { ref } from "vue";

import { postData } from "@/utils/common";

import { type StatusData } from "@/services/checkin";
import Submit from "@/components/Submit.vue";
import PictureSelect from "@/components/PictureSelect.vue";
import Plane from "@/components/Plane.vue";
//增加属性父级别属性
const props = defineProps<{
  openid: string | null;
  token: string | null;
}>();

const result = ref<StatusData | null>(null);
const step = ref<"slogan" | "picture">("slogan");
const slogan = ref<string>("");

// 处理进入下一步（选择图片）
const handleNext = (text: string) => {
  slogan.value = text;
  step.value = "picture";
};

// 处理返回上一步（选择标语）
const handleBack = () => {
  step.value = "slogan";
};

// 最终提交表单
const submit = async (data: any) => {
  const ret = await postData({
    openid: props.openid,
    token: props.token,
    status: "linked",
    data: JSON.stringify(data),
  });
  result.value = ret.data as StatusData;
  console.error("提交结果", ret.data);
};
</script>

<template>
  <view>
    <Submit
      v-if="result == null && step === 'slogan'"
      @next="handleNext"
      :openid="openid"
      :token="token"
      :savedSlogan="slogan"
    ></Submit>
    <PictureSelect
      v-else-if="result == null && step === 'picture'"
      @back="handleBack"
      @submit="submit"
      :openid="openid"
      :token="token"
      :slogan="slogan"
    ></PictureSelect>
    <Plane v-else :openid="openid" :token="token"></Plane>
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
