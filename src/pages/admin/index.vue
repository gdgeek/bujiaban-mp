<script setup lang="ts">
import { ref, onMounted } from "vue";
import { login } from "@/services/login";
import type { IDType } from "@/services/checkin";
import { putDevice, type DeviceType, manageDevice } from "@/api/device.ts";
import { assign } from "@/api/root.ts";
const id = ref<IDType | null>(null);
const devices = ref<DeviceType[]>([]);
const loading = ref(true);
const saving = ref<Record<number, boolean>>({});
const tagTimers = ref<Record<number, number>>({});

onMounted(async () => {
  try {
    id.value = await login();
    devices.value = await manageDevice();
  } finally {
    loading.value = false;
  }
});

const goDeviceManage = (deviceId: number) => {
  uni.navigateTo({ url: `/pages/device/manage?deviceId=${deviceId}` });
};

// 移除本页的 setup 编辑逻辑，转移到设备管理页面

// 已由组件内置预览逻辑处理
</script>

<template>
  <view class="admin-page">
    <view class="header">
      <text class="title">管理后台</text>
    </view>

    <view v-if="loading">加载中...</view>

    <view v-else>
      <view class="row">
        <text class="label">当前用户</text>
        <text class="value">{{ id?.user.nickname || id?.openid || "未登录" }}</text>
      </view>
      <view class="row">
        <text class="label">角色</text>
        <text class="value">{{ id?.user.role || "-" }}</text>
      </view>
      <view class="divider" />
      <view class="title small">设备列表</view>
      <view class="subtitle">当前共有 {{ devices.length }} 台设备</view>
      <view class="device-list">
        <view v-for="(d, i) in devices" :key="d.id">
          <view class="hr" />
          <view class="card">
            <view class="line"
              ><text class="k">Id</text><text class="v">{{ d.id }}</text></view
            >
            <view class="line"
              ><text class="k">Tag</text><text class="v">{{ d.tag }}</text></view
            >
            <view class="line"
              ><text class="k">UUID</text><text class="v mono">{{ d.uuid }}</text></view
            >
            <view class="line"
              ><text class="k">IP</text><text class="v">{{ d.ip || "-" }}</text>
            </view>
            <button size="mini" class="btn secondary block" @tap="goDeviceManage(d.id)">
              设备管理
            </button>
          </view>
          <view class="ops" v-if="saving[d.id]">
            <text class="saving">保存中...</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.admin-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding: 32rpx;
}
.header {
  margin-bottom: 20rpx;
}
.title {
  font-size: 36rpx;
  font-weight: 600;
}
.title.small {
  font-size: 28rpx;
  margin: 12rpx 0;
}
.subtitle {
  font-size: 24rpx;
  color: #666;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
  .divider {
    height: 20rpx;
  }
}
.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.divider {
  height: 20rpx;
  .device-list {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    margin-top: 12rpx;
  }
  .device-item {
    border: 1rpx solid #eee;
    border-radius: 12rpx;
    padding: 16rpx;
  }
  .line {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 8rpx;
  }
  .k {
    width: 100rpx;
    color: #666;
    font-size: 24rpx;
  }
  .v {
    color: #333;
    font-size: 26rpx;
  }
  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    word-break: break-all;
  }
  .input {
    flex: 1;
    border: 1rpx solid #ddd;
    border-radius: 8rpx;
    padding: 12rpx;
    font-size: 26rpx;
    background: #fff;
  }
  .textarea {
    width: 100%;
    min-height: 120rpx;
    border: 1rpx solid #ddd;
    border-radius: 8rpx;
    padding: 12rpx;
    font-size: 26rpx;
    background: #fff;
  }
  .btn.primary {
    background: #07c160;
    color: #fff;
  }

  .setup {
    margin: 12rpx 0 16rpx;
    padding: 12rpx;
    background: #fafafa;
    border: 1rpx solid #f0f0f0;
    border-radius: 12rpx;
  }
}
.label {
  color: #666;
  font-size: 26rpx;
}
.value {
  color: #111;
  font-size: 28rpx;
}
.device-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 8rpx;
}
.device-item {
  border: 1rpx solid #eee;
  border-radius: 12rpx;
  padding: 16rpx;
}
.line {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.k {
  width: 120rpx;
  color: #666;
  font-size: 24rpx;
}
.k.full {
  width: 100%;
  display: block;
  text-align: center;
}
.v {
  color: #333;
  font-size: 26rpx;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
}
.tips {
  margin-top: 10rpx;
  color: #999;
  font-size: 24rpx;
}
.actions {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}
.btn {
  background: #f5f5f5;
  color: #333;
}
.btn.secondary {
  background: #eff4ff;
  color: #2e73ff;
}
.btn.danger {
  background: #ffecec;
  color: #e54d42;
}
.btn.small {
  font-size: 24rpx;
  padding: 12rpx 16rpx;
}
.btn.block {
  width: 100%;
  display: block;
}
.icon-btn {
  background: transparent;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-btn.mini {
  width: 48rpx;
  height: 48rpx;
}
.icon-btn .icon {
  width: 36rpx;
  height: 36rpx;
  display: block;
}
.ops {
  min-height: 40rpx;
}
.saving {
  color: #2e73ff;
  font-size: 24rpx;
}
.line.column {
  flex-direction: column;
  align-items: stretch;
}
.slogans {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.slogan-row {
  display: flex;
  gap: 12rpx;
  align-items: center;
}
.flex-1 {
  flex: 1;
}
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.modal {
  width: 640rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}
.modal-title {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  margin-top: 16rpx;
}
.err {
  color: #e54d42;
  font-size: 24rpx;
  margin-top: 8rpx;
}
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin: 8rpx 0 12rpx;
}
.thumb {
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
  background: #f2f3f5;
}
.empty {
  color: #999;
  font-size: 24rpx;
  margin: 8rpx 0 12rpx;
}
.hr {
  width: 100%;
  height: 1px;
  background: #ececec;
  margin: 16rpx 0;
  border-radius: 1px;
}
</style>
