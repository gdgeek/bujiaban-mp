<script setup lang="ts">
import { ref } from "vue";
import { login, bindUserProfile, regist } from "@/services/login";
import { saveOpenidToStorage } from "@/utils/video";

const loading = ref(false);
const hasProfile = ref(false);
const hasPhone = ref(false);
const nickname = ref("");
const avatarUrl = ref("");

// 触发微信登录，拿 openid 与 token
const doLogin = async () => {
  loading.value = true;
  try {
    const id = await login();
    saveOpenidToStorage(id);
  } catch (e) {
    uni.showToast({ title: "登录失败", icon: "none" });
  } finally {
    loading.value = false;
  }
};

// 获取手机号（新版返回 code）
const onGetPhoneNumber = async (e: any) => {
  if (e?.detail?.errMsg?.indexOf("ok") === -1) {
    uni.showToast({ title: "未授权手机号", icon: "none" });
    return;
  }
  loading.value = true;
  try {
    const code: string | undefined = e?.detail?.code as string | undefined;
    if (code) {
      console.error("获取到手机号:", code);
      let ok = await regist(code);
      hasPhone.value = ok;
      uni.showToast({ title: ok ? "手机号已绑定" : "绑定失败", icon: ok ? "success" : "none" });
    } else {
      uni.showToast({ title: "未获取到手机号", icon: "none" });
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <view class="login-page">
    <view class="card">
      <view class="title">微信登录</view>
      <view class="desc">用于打卡下载、订单与素材同步</view>

      <view class="divider" />

      <button class="btn" open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">
        授权手机号
      </button>

      <view class="status">
        <text>资料：{{ hasProfile ? "已授权" : "未授权" }}</text>
        <text>手机号：{{ hasPhone ? "已绑定" : "未绑定" }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  padding: 40rpx;
  background: #f7f8fa;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
}
.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #111;
}
.desc {
  margin-top: 8rpx;
  color: #666;
  font-size: 26rpx;
}
.divider {
  height: 24rpx;
}
.btn {
  margin-top: 20rpx;
  background: #f5f5f5;
  color: #333;
}
.btn.primary {
  background: #07c160;
  color: #fff;
}
.status {
  margin-top: 16rpx;
  display: flex;
  justify-content: space-between;
  color: #555;
  font-size: 26rpx;
}
</style>
