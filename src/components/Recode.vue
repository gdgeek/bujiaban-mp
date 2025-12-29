<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";

import { postData } from "@/utils/common";

import type { ApiResponse, FileInfo, ReportInfo, StatusData, SetupInfo } from "@/services/checkin";

import Submit from "@/components/Submit.vue";
import PictureSelect from "@/components/PictureSelect.vue";
import File from "@/components/File.vue";
import Recoding from "@/components/Recoding.vue";
import Step from "@/components/Step.vue";
import type { IDType } from "@/services/checkin";
const step = ref<number>(-1);
const file = ref<FileInfo | null>(null);
const device = ref<ReportInfo | null>(null);
const setup = ref<SetupInfo | null>(null);

const slogan = ref<string>("");

let intervalId: number | null = null;
watch(
  () => step.value,
  (value: number, oldValue: number) => {
    if (value === 2 && intervalId === null) {
      //向 refresh 里面增加参数
      intervalId = setInterval(() => refresh(null, "token,file,device"), 1800);
    } else if (oldValue == 2) {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
    console.error("Step changed:", value);
  },
);
//增加属性父级别属性
const props = defineProps<{
  id: IDType | null;
  token: string | null;
}>();

const refresh = async (context: any | undefined | null, expand: string = "token,file") => {
  console.error("刷新数据", props.id?.token.accessToken);
  if (props.token && props.id) {
    const ret = await postData(props.id!.unionid, props.token!, status.value, context, expand);
    if (ret.data.file) {
      file.value = ret.data.file;
      if (file.value != null) {
        step.value = 3;
      }
    }
    if (ret.data.device) {
      device.value = ret.data.device;
    }
    if (ret.data.setup) {
      setup.value = ret.data.setup;
    }
    return ret;
  }
  return undefined;
};

const setSlogan = (text: string) => {
  slogan.value = text;
  step.value = 1;
};

// 处理返回上一步（选择标语）
const back = () => {
  step.value--;
};

// 最终提交表单
const setPicture = async (id: number) => {
  step.value = 2;
  const ret = await refresh(
    {
      picture: id,
      text: slogan.value,
    },
    "token,file,device",
  );
  if (ret) {
    console.error("提交结果", ret.data);
  }
};

// 步骤列表
const steps = [
  { title: "选择标语", desc: "个性文字", status: "slogan" },
  { title: "选择封面", desc: "设置封面", status: "picture" },
  { title: "录制中", desc: "视频制作", status: "linked" },
  { title: "完成", desc: "处理完毕", status: "finish" },
];
const status = computed(() => {
  if (step.value === -1) return "init";
  return steps[step.value].status;
});

//在启动时候运行
onMounted(async () => {
  uni.showLoading({ title: "加载中..." });
  console.error("组件已挂载，开始初始化" + props.id?.unionid + " " + props.token);

  const ret = await refresh(undefined, "setup");

  if (ret) {
    console.error("提交结果", ret.data);
  }
  uni.hideLoading();
  step.value = 0;
});
</script>

<template>
  <view class="content-wrapper" :loading="true">
    <!-- 进度指示器 -->
    <view class="progress-tracker">
      <step :currentStep="step" :steps="steps" style="width: 100%" />
    </view>

    <view v-if="setup">
      <Submit v-if="step === 0" @set-slogan="setSlogan" :slogan="slogan" :setup="setup"></Submit>
      <PictureSelect
        v-else-if="step === 1"
        @back="back"
        @setPicture="setPicture"
        :slogan="slogan"
        :setup="setup"
      ></PictureSelect>
      <Recoding v-else-if="step === 2" :setup="setup" :device="device" :file="file"></Recoding>
      <File v-else-if="step === 3" :setup="setup" :file="file"></File>
    </view>
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
