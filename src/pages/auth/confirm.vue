<script setup lang="ts">
defineOptions({ name: "AdminLoginConfirmation" });
import { ref } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import { approveAdminLogin, takePendingAdminLogin, type AdminLoginTicket } from "@/api/scan-login";

const origin = ref("");
const loading = ref(false);
const approved = ref(false);
const errorMessage = ref("");
// Keep the approval secret out of reactive page data, URLs and persistent storage.
let ticket: AdminLoginTicket | null = null;
let active = true;

onLoad(() => {
  ticket = takePendingAdminLogin();
  origin.value = ticket?.origin || "";
  if (!ticket) errorMessage.value = "登录二维码已失效，请返回我的页面重新扫码";
});

onUnload(() => {
  active = false;
  ticket = null;
});

const confirm = async () => {
  if (!ticket || loading.value || approved.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    await approveAdminLogin(ticket, () => !active);
    if (!active) return;
    ticket = null;
    approved.value = true;
  } catch (error) {
    if (active) {
      errorMessage.value = error instanceof Error ? error.message : "确认登录失败，请重试";
    }
  } finally {
    if (active) loading.value = false;
  }
};

const close = () => {
  if (loading.value) return;
  ticket = null;
  active = false;
  uni.navigateBack({
    fail: () => uni.switchTab({ url: "/pages/user/index" }),
  });
};
</script>

<template>
  <view class="confirm-page">
    <view class="card">
      <view class="title">{{ approved ? "已确认登录" : "确认登录设备后台" }}</view>
      <view class="app-name">不加班设备后台</view>

      <view v-if="origin" class="target">
        <text class="target-label">目标后端</text>
        <text class="target-origin" selectable>{{ origin }}</text>
      </view>

      <view v-if="approved" class="description">请返回电脑继续操作。</view>
      <view v-else class="description">
        确认后，当前电脑将使用你的微信身份登录，只能查看和管理此微信账号关联的设备。
        请确认这是你正在使用的电脑。
      </view>
      <view v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</view>

      <button
        v-if="origin && !approved"
        class="button primary"
        :loading="loading"
        :disabled="loading"
        @tap="confirm"
      >
        {{ loading ? "正在确认" : "确认登录" }}
      </button>
      <button class="button" :disabled="loading" @tap="close">
        {{ approved ? "返回我的" : "取消" }}
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.confirm-page {
  min-height: 100vh;
  padding: 40rpx;
  background: #f7f8fa;
}
.card {
  padding: 40rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
}
.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #111;
}
.app-name {
  margin-top: 16rpx;
  font-size: 28rpx;
  color: #333;
}
.target {
  margin: 32rpx 0;
  padding: 24rpx;
  background: #f7f8fa;
  border-radius: 12rpx;
}
.target-label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 24rpx;
  color: #666;
}
.target-origin {
  font-size: 28rpx;
  font-weight: 600;
  color: #111;
  word-break: break-all;
}
.description {
  margin-top: 24rpx;
  color: #555;
  font-size: 28rpx;
  line-height: 1.7;
}
.error {
  margin-top: 24rpx;
  color: #bd2929;
  font-size: 26rpx;
  line-height: 1.6;
}
.button {
  margin-top: 24rpx;
  background: #f5f5f5;
  color: #333;
}
.primary {
  margin-top: 40rpx;
  background: #07c160;
  color: #fff;
}
</style>
