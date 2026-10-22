<script setup lang="ts">
defineOptions({ name: "VideoRecode" });
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { onShow, onHide } from "@dcloudio/uni-app";
import config from "@/config";
import { postData } from "@/utils/common";
import type { ApiResponse, FileInfo, ReportInfo, SetupInfo, IDType } from "@/api/checkin";
import Submit from "@/components/Submit.vue";
import PictureSelect from "@/components/PictureSelect.vue";
import File from "@/components/File.vue";
import Recoding from "@/components/Recoding.vue";
import Step from "@/components/Step.vue";

const props = defineProps<{ id: IDType | null; token: string | null }>();
const apiUrl = config.apiUrl;
const step = ref(-1);
const file = ref<FileInfo | null>(null);
const device = ref<ReportInfo | null>(null);
const setup = ref<SetupInfo | null>(null);
const slogan = ref("");
const errorMessage = ref("");
const initializing = ref(false);
const steps = [
  { title: "选择标语", desc: "个性文字", status: "slogan" },
  { title: "选择封面", desc: "设置封面", status: "picture" },
  { title: "录制中", desc: "视频制作", status: "linked" },
  { title: "完成", desc: "处理完毕", status: "finish" },
];
const status = computed(() => (step.value === -1 ? "init" : steps[step.value].status));
let timer: ReturnType<typeof setTimeout> | null = null;
let pendingRequest: Promise<ApiResponse | undefined> | null = null;
let active = true;
let disposed = false;
let version = 0;

const clearPoll = () => {
  if (timer !== null) clearTimeout(timer);
  timer = null;
};

const refresh = (
  context: Record<string, unknown> | null | undefined,
  expand = "token,file",
): Promise<ApiResponse | undefined> => {
  if (!active || disposed || pendingRequest) return Promise.resolve(undefined);
  if (!props.id?.unionid || !props.token) {
    errorMessage.value = "业务身份暂不可用，请重试";
    uni.showToast({ title: errorMessage.value, icon: "none" });
    return Promise.resolve(undefined);
  }
  const requestVersion = version;
  const unionid = props.id.unionid;
  const token = props.token;
  const isCurrent = () =>
    active &&
    !disposed &&
    requestVersion === version &&
    unionid === props.id?.unionid &&
    token === props.token;
  pendingRequest = (async () => {
    try {
      const response = await postData(unionid, token, status.value, context, expand, apiUrl);
      if (!isCurrent()) return undefined;
      if (!response.success || !response.data) throw new Error("刷新失败");
      const data = response.data;
      errorMessage.value = "";
      if (data.file) {
        file.value = data.file;
        step.value = 3;
      }
      if (data.device) device.value = data.device;
      if (data.setup) setup.value = data.setup;
      return response;
    } catch {
      if (isCurrent()) {
        errorMessage.value = "数据刷新失败，请重试";
        uni.showToast({ title: errorMessage.value, icon: "none" });
      }
      return undefined;
    } finally {
      pendingRequest = null;
    }
  })();
  return pendingRequest;
};

const schedulePoll = () => {
  if (!active || disposed || step.value !== 2 || pendingRequest || timer !== null) return;
  timer = setTimeout(async () => {
    timer = null;
    await refresh(null, "token,file,device");
    schedulePoll();
  }, 1800);
};

watch(step, () => {
  clearPoll();
  schedulePoll();
});

const initialize = async () => {
  if (!active || disposed || pendingRequest) return;
  const requestVersion = version;
  initializing.value = true;
  uni.showLoading({ title: "加载中..." });
  try {
    const response = await refresh(undefined, "setup");
    if (active && !disposed && requestVersion === version && response && step.value === -1) {
      step.value = 0;
    }
  } finally {
    initializing.value = false;
    uni.hideLoading();
  }
};

const resume = () => {
  if (!active || disposed) return;
  if (pendingRequest) {
    // Wait for the old request to settle before starting another visible session.
    void pendingRequest.then(resume);
  } else if (step.value === -1) {
    void initialize();
  } else {
    schedulePoll();
  }
};

const stop = () => {
  active = false;
  version++;
  clearPoll();
  if (initializing.value) uni.hideLoading();
};

onMounted(initialize);
onHide(stop);
onShow(() => {
  active = true;
  resume();
});
onBeforeUnmount(() => {
  disposed = true;
  stop();
});
watch(
  () => [props.id?.unionid, props.token],
  () => {
    version++;
    clearPoll();
    file.value = null;
    device.value = null;
    setup.value = null;
    step.value = -1;
    resume();
  },
);

const setSlogan = (text: string) => {
  slogan.value = text;
  step.value = 1;
};
const back = () => {
  step.value--;
};
const setPicture = async (id: number) => {
  if (pendingRequest || !active || disposed) return;
  clearPoll();
  const requestVersion = version;
  step.value = 2;
  const response = await refresh({ picture: id, text: slogan.value }, "token,file,device");
  if (active && requestVersion === version && !response) step.value = 1;
  schedulePoll();
};
const retry = async () => {
  if (step.value === -1) await initialize();
  else {
    clearPoll();
    await refresh(null, "token,file,device");
    schedulePoll();
  }
};
</script>

<template>
  <view class="content-wrapper">
    <!-- 进度指示器 -->
    <view class="progress-tracker">
      <Step :currentStep="step" :steps="steps" style="width: 100%" />
    </view>

    <view v-if="errorMessage" class="error-state">
      <text>{{ errorMessage }}</text>
      <button class="retry-button" size="mini" :loading="initializing" @tap="retry">重试</button>
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

.error-state {
  color: #e54d42;
  font-size: 26rpx;
  margin-bottom: 24rpx;
}
.retry-button {
  margin-top: 12rpx;
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
