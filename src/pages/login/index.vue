<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { login, profile, regist } from "@/services/login";

import type { IDType } from "@/services/checkin";

const loading = ref(false);
const hasProfile = ref(false);
const hasPhone = ref(false);
const nickname = ref("");
const avatarUrl = ref("");
const id = ref<IDType | null>(null);

// 角色是否具备管理权限
const isAdmin = computed(() => {
  const role = id.value?.user?.role?.toLowerCase?.() || "";
  return role === "root" || role === "manager";
});

onMounted(async () => {
  id.value = await login();
});

const maskPhone = (tel: string) => {
  if (!tel || tel === "--") return "--";
  return tel.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
};

// 必须在用户点击回调中直接调用 getUserProfile
const onGetProfile = async () => {
  try {
    const res: any = await new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: "用于完善用户资料",
        success: resolve,
        fail: reject,
      });
    });
    const userInfo = res?.userInfo || {};
    nickname.value = userInfo.nickName || "";
    avatarUrl.value = userInfo.avatarUrl || "";

    console.log("获取到用户信息:", userInfo);
    loading.value = true;
    const ok = await profile(nickname.value, avatarUrl.value);
    hasProfile.value = ok;
    uni.showToast({ title: ok ? "资料已保存" : "保存失败", icon: ok ? "success" : "none" });
  } catch (e) {
    console.error("获取用户信息失败", e);
    uni.showToast({ title: "用户取消或失败", icon: "none" });
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

const gotoAdmin = () => {
  if (!isAdmin.value) {
    uni.showToast({ title: "暂无权限", icon: "none" });
    return;
  }
  uni.navigateTo({ url: "/pages/admin/index" });
};
</script>

<template>
  <view class="login-page">
    <view class="card">
      <view class="title">用户信息</view>
      <view class="desc">用于打卡下载、订单与素材同步</view>
      <!-- 用户卡片 -->
      <view class="user-card" v-if="id">
        <view class="user-left">
          <image class="avatar" :src="id.user.avatar" mode="aspectFill" />
        </view>
        <view class="user-right">
          <view class="name-row">
            <text class="name">{{ id.user.nickname }}</text>
          </view>
          <view class="meta-row">
            <text class="label">手机号</text>
            <text class="value">{{ maskPhone(id.user.tel) }}</text>
          </view>
        </view>
      </view>

      <view class="divider" />
      <!-- 必须由点击触发 -->
      <button v-if="!id?.user.nickname" class="btn" :disabled="loading" @tap="onGetProfile">
        授权头像昵称
      </button>

      <button
        v-if="!id?.user.tel"
        class="btn"
        open-type="getPhoneNumber"
        @getphonenumber="onGetPhoneNumber"
      >
        绑定手机号
      </button>

      <view class="status">
        <text>资料：{{ id?.user.nickname ? "已授权" : "未授权" }}</text>
        <text>手机号：{{ id?.user.tel ? "已绑定" : "未绑定" }}</text>
      </view>

      <button v-if="isAdmin" class="btn primary" style="margin-top: 28rpx" @tap="gotoAdmin">
        进入管理后台
      </button>
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
.user-card {
  display: flex;
  gap: 24rpx;
  margin-top: 24rpx;
  padding: 24rpx;
  background: #f7f8fa;
  border-radius: 16rpx;
}
.user-left .avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #eee;
}
.user-right {
  flex: 1;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.name {
  font-size: 32rpx;
  font-weight: 600;
  color: #111;
}
.badge {
  font-size: 22rpx;
  color: #07c160;
  background: rgba(7, 193, 96, 0.1);
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
}
.badge.phone {
  color: #2e73ff;
  background: rgba(46, 115, 255, 0.1);
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 10rpx;
}
.meta-row.small {
  opacity: 0.8;
}
.label {
  width: 120rpx;
  color: #666;
  font-size: 24rpx;
}
.value {
  color: #333;
  font-size: 26rpx;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 22rpx;
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
