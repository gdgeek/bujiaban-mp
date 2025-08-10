<script setup lang="ts">
import { ref, computed, defineProps } from "vue";

import { postData } from "@/utils/common";

import { type StatusData } from "@/services/checkin";
import Submit from "@/components/Submit.vue";
import PictureSelect from "@/components/PictureSelect.vue";
import Plane from "@/components/Plane.vue";
import Step from "@/components/Step.vue";

//增加属性父级别属性
const props = defineProps<{
  openid: string | null;
  token: string | null;
}>();

const result = ref<StatusData | null>(null);
const step = ref<"slogan" | "picture">("slogan");
const slogan = ref<string>("");
const apiPictures = ref<string[]>([]);

const handleNext = (text: string, pictures?: string[]) => {
  slogan.value = text;
  // 如果传递了图片数据，则保存
  if (pictures && pictures.length > 0) {
    apiPictures.value = pictures;
  }
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

// 计算当前步骤
const currentStep = computed<number>(() => {
  if (result.value) {
    if (result.value.file != null) return 3; // 完成
    if (result.value.checkin.status === "linked") return 2; // 录制中
  }

  if (step.value === "picture") return 1; // 选择封面
  if (step.value === "slogan") return 0; // 选择标语

  return 0;
});

// 步骤列表
const steps = [
  { title: "选择标语", desc: "个性文字" },
  { title: "选择封面", desc: "设置封面" },
  { title: "录制中", desc: "视频制作" },
  { title: "完成", desc: "处理完毕" },
];
</script>

<template>
  <view class="content-wrapper">
    <!-- 进度指示器 -->
    <view class="progress-tracker">
      <step :currentStep="currentStep" :steps="steps" style="width: 100%" />
    </view>

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
      :pictures="apiPictures"
    ></PictureSelect>
    <Plane v-else :openid="openid" :token="token"></Plane>
  </view>
</template>

<style lang="scss" scoped>
.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

// 进度指示器
.progress-tracker {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 28rpx;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.06), 0 4rpx 8rpx rgba(0, 0, 0, 0.04);
  padding: 48rpx 40rpx;
  margin-bottom: 40rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  overflow: hidden;

  // 添加背景装饰
  &::before {
    content: "";
    position: absolute;
    top: -20rpx;
    right: -20rpx;
    width: 120rpx;
    height: 120rpx;
    background: radial-gradient(circle, rgba(82, 196, 26, 0.04) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
  }
}
</style>
