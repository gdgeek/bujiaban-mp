<script setup lang="ts">
import { ref, onMounted, readonly } from "vue";
import { login } from "@/services/login";
import type { IDType, UserType } from "@/services/checkin";
import ArrayListInput from "@/components/ArrayListInput.vue";
import { getDevices, putDevice, deleteDevice, type DeviceType } from "@/api/device.ts";
import { assign, unassign } from "@/api/root.ts";
const id = ref<IDType | null>(null);
const devices = ref<DeviceType[]>([]);
const loading = ref(true);
const saving = ref<Record<number, boolean>>({});
const tagTimers = ref<Record<number, number>>({});

// 指定手机号弹窗
const assignVisible = ref(false);
const assignPhone = ref("");
const assignTargetId = ref<number | null>(null);
const assigning = ref(false);
const assignErr = ref("");
// 临时缓存：每台设备的管理员（支持后端返回 admin 或 admins 两种形态）
const adminList = (d: DeviceType) => {
  //返回d.admin.tel的字符串数组
  const admin: UserType[] | undefined = d.admin;
  return admin ? (Array.isArray(admin) ? admin : [admin]).map((a) => a.tel || "") : [];
};
const changeAdmin = (list: string[], d: DeviceType) => {
  //如果list比d.admin 多一个，说明要增加，调用输入内容
  if (list.length > adminList(d).length) {
    openAssign(d.id);
    return;
  }
  //如果 list 比d.admin 少一个，说明要删除，然后找到删除的手机号，调用删除接口
  if (list.length < adminList(d).length) {
    d.admin?.forEach((a) => {
      if (!list.includes(a.tel || "")) {
        removeAdmin(d.id, a.id || 0);
      }
    });
  }
  console.log("changeAdmin", list);
};

// 删除设备弹窗
const deleteVisible = ref(false);
const deleteTargetId = ref<number | null>(null);
const deleting = ref(false);

const openAssign = (deviceId: number) => {
  assignTargetId.value = deviceId;
  assignPhone.value = "";
  assignErr.value = "";
  assignVisible.value = true;
};
const closeAssign = () => {
  assignVisible.value = false;
};
const openDelete = (deviceId: number) => {
  deleteTargetId.value = deviceId;
  deleteVisible.value = true;
};
const closeDelete = () => {
  deleteVisible.value = false;
};
const confirmDelete = async () => {
  if (!deleteTargetId.value) return;
  deleting.value = true;
  try {
    const ok = await deleteDevice(deleteTargetId.value);
    if (ok) {
      devices.value = devices.value.filter((d) => d.id !== deleteTargetId.value);
      uni.showToast({ title: "已删除", icon: "success" });
      deleteVisible.value = false;
    } else {
      uni.showToast({ title: "删除失败", icon: "none" });
    }
  } catch (e) {
    uni.showToast({ title: "删除失败", icon: "none" });
  } finally {
    deleting.value = false;
  }
};
const onAssignPhoneInput = (e: any) => {
  assignPhone.value = (e?.detail?.value ?? "") as string;
};
const confirmAssign = async () => {
  const phone = (assignPhone.value || "").trim();
  // 简单手机校验（国内 11 位）
  if (!/^1\d{10}$/.test(phone)) {
    assignErr.value = "请输入有效的手机号";
    return;
  }
  if (!assignTargetId.value) return;
  assigning.value = true;
  assignErr.value = "";
  try {
    const ok = await assign(assignTargetId.value, phone);
    uni.showToast({ title: ok ? "已指定" : "指定失败", icon: ok ? "success" : "none" });
    if (ok) {
      // 可选：刷新列表
      try {
        devices.value = await getDevices();
      } catch {
        // 刷新失败时静默处理
      }
      assignVisible.value = false;
    }
  } finally {
    assigning.value = false;
  }
};

const removeAdmin = async (deviceId: number, userId: number) => {
  if (!userId) return;
  const ok = await unassign(deviceId, userId);
  uni.showToast({ title: ok ? "已移除" : "移除失败", icon: ok ? "success" : "none" });
  if (ok) {
    try {
      devices.value = await getDevices();
    } catch {
      // 刷新失败时静默处理
    }
  }
};

const onTagInput = (idx: number, e: any) => {
  const v = (e?.detail?.value ?? "") as string;
  const item = devices.value[idx];
  if (!item) return;
  // 本地更新
  devices.value[idx] = { ...item, tag: v };
  // 防抖自动保存
  const id = item.id;
  if (tagTimers.value[id]) {
    clearTimeout(tagTimers.value[id]);
  }
  tagTimers.value[id] = setTimeout(async () => {
    try {
      saving.value[id] = true;
      await putDevice(id, { tag: v || "" });
      uni.showToast({ title: "已保存", icon: "success", duration: 800 });
    } catch (err) {
      uni.showToast({ title: "保存失败", icon: "none" });
    } finally {
      saving.value[id] = false;
      delete tagTimers.value[id];
    }
  }, 600) as unknown as number;
};

// 提取设备类型：优先 setup.type，其次 deviceType/type 字段，兜底 "-"
const getDeviceType = (d: DeviceType): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = d?.setup || {};
  return s.type || s.deviceType || (d as any).deviceType || (d as any).type || "-";
};

const goBack = () => {
  uni.navigateBack();
};

onMounted(async () => {
  try {
    id.value = await login();
    devices.value = await getDevices();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <view class="admin-page">
    <view class="header">
      <text class="title">root用户管理</text>
    </view>

    <view v-if="loading" class="card">加载中...</view>

    <view v-else>
      <view class="card">
        <view class="row">
          <text class="label">当前用户</text>
          <text class="value">{{ id?.user?.nickname || id?.openid || "未登录" }}</text>
        </view>
        <view class="row">
          <text class="label">角色</text>
          <text class="value">{{ id?.user?.role || "-" }}</text>
        </view>
      </view>
      <view class="divider" />
      <view class="title small">设备列表</view>
      <view class="device-list">
        <view class="device-item card" v-for="(d, i) in devices" :key="d.id">
          <view class="line">
            <text class="k">标签</text>
            <input
              class="input"
              :value="d.tag"
              placeholder="输入标签"
              @input="(e) => onTagInput(i, e)"
            />
          </view>
          <view class="line"
            ><text class="k">ID</text><text class="v">{{ d.id }}</text></view
          >
          <view class="line"
            ><text class="k">UUID</text><text class="v mono">{{ d.uuid }}</text></view
          >
          <view class="line"
            ><text class="k">IP</text><text class="v">{{ d.ip || "-" }}</text></view
          >
          <view class="hr" />
          <ArrayListInput
            :title="'管理员'"
            :readonly="true"
            @set-value="
              (v) => {
                changeAdmin(v, d);
              }
            "
            :items="adminList(d)"
          />
          <view class="hr" />
          <view class="line">
            <text class="k">操作</text>
            <button size="mini" class="btn danger block" @tap="openDelete(d.id)">删除设备</button>
          </view>
          <view class="ops" v-if="saving[d.id]">
            <text class="saving">保存中...</text>
          </view>
        </view>
      </view>

      <!-- 指定手机号弹窗 -->
      <view class="mask" v-if="assignVisible" @tap="closeAssign">
        <view class="modal" @tap.stop>
          <view class="modal-title">指定管理员手机号</view>
          <input
            class="input"
            placeholder="请输入11位手机号"
            :value="assignPhone"
            @input="onAssignPhoneInput"
          />
          <view class="err" v-if="assignErr">{{ assignErr }}</view>
          <view class="modal-actions">
            <button class="btn" @tap="closeAssign">取消</button>
            <button class="btn primary" :loading="assigning" @tap="confirmAssign">确定</button>
          </view>
        </view>
      </view>

      <!-- 删除设备弹窗 -->
      <view class="mask" v-if="deleteVisible" @tap="closeDelete">
        <view class="modal" @tap.stop>
          <view class="modal-title">删除设备</view>
          <view style="color: #666; font-size: 26rpx">确定要删除该设备吗？此操作不可恢复。</view>
          <view class="modal-actions">
            <button class="btn" @tap="closeDelete">取消</button>
            <button class="btn primary" :loading="deleting" @tap="confirmDelete">确定</button>
          </view>
        </view>
      </view>

      <view
        class="tips"
        v-if="id && !['root', 'manager'].includes((id.user?.role || '').toLowerCase())"
      >
        当前账号未具备管理权限。仅用于演示。
      </view>

      <view class="actions">
        <!--
        <button class="btn small block" @tap="console.log('添加设备')">添加设备</button>
        -->
        <!--返回上一页按钮-->
        <button class="btn small block" @tap="goBack">返回</button>
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
  .btn.primary {
    background: #2e73ff;
    color: #fff;
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
.line.top {
  align-items: flex-start;
}
.k {
  width: 120rpx;
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
.btn.danger {
  background: #e54d42;
  color: #fff;
}
.btn.small {
  font-size: 24rpx;
  padding: 12rpx 16rpx;
}
.btn.block {
  width: 100%;
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
.admin-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.admin-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}
.admin-name {
  font-size: 26rpx;
  color: #333;
}
.hr {
  width: 100%;
  height: 2rpx;
  background: #e9ecef;
  margin: 16rpx 0;
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
</style>
