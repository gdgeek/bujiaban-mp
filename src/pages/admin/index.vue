<script setup lang="ts">
import { ref, onMounted } from "vue";
import { login } from "@/services/login";
import type { IDType } from "@/services/checkin";
import ArrayListInput from "@/components/ArrayListInput.vue";
import {
  putDevice,
  putSetup,
  type SetupType,
  type DeviceType,
  manageDevice,
} from "@/api/device.ts";
import { assign } from "@/api/root.ts";
const id = ref<IDType | null>(null);
const devices = ref<DeviceType[]>([]);
const loading = ref(true);
const saving = ref<Record<number, boolean>>({});
const tagTimers = ref<Record<number, number>>({});
// setup 编辑表单：以设备 id 为 key
const setupForm = ref<
  Record<
    number,
    {
      title: string;
      money: number;
      scene_id: string;
      slogans: string[]; // 每行一个口号
      shots: string[]; // 逗号分隔数字
      pictures: string[]; // 每行一个 URL
      thumbs: string[]; // 每行一个 URL
    }
  >
>({});
const setupSaving = ref<Record<number, boolean>>({});

onMounted(async () => {
  try {
    id.value = await login();
    devices.value = await manageDevice();
    initSetupForm();
  } finally {
    loading.value = false;
  }
});

const initSetupForm = () => {
  const map: Record<number, any> = {};
  devices.value.forEach((d) => {
    const s: SetupType | undefined = d.setup as unknown as SetupType;
    map[d.id] = {
      title: s?.title ?? "",
      money: s?.money != null ? String(s.money) : "",
      scene_id: s?.scene_id != null ? String(s.scene_id) : "",
      slogans:
        Array.isArray(s?.slogans) && s!.slogans.length ? [...(s!.slogans as string[])] : [""],
      //把shot这个number[]转成 string[]

      shots: Array.isArray(s?.shots)
        ? [...(s!.shots.map((num) => num.toString()) as string[])]
        : [""],
      pictures:
        Array.isArray(s?.pictures) && s!.pictures.length ? [...(s!.pictures as string[])] : [""],
      thumbs: Array.isArray(s?.thumbs) && s!.thumbs.length ? [...(s!.thumbs as string[])] : [""],
    };
  });
  setupForm.value = map;
};

const onSetupChange = (id: number, field: keyof (typeof setupForm.value)[number], e: any) => {
  const v = (e?.detail?.value ?? "") as string;
  setupForm.value[id] = { ...setupForm.value[id], [field]: v };
};

const saveSetup = async (deviceId: number) => {
  const form = setupForm.value[deviceId];
  if (!form) return;
  // 解析表单
  const toNumberArray = (txt: string[]) => {
    return txt
      .map((x) => (x || "").trim())
      .filter(Boolean)
      .map((x) => Number(x))
      .filter((x) => !isNaN(x) && x > 0)
      .sort((a, b) => a - b);
  };
  // 组织 setup 负载
  const setupPayload: Partial<SetupType> = {
    title: form.title.trim(),
    money: form.money ? Number(form.money) : 0,
    scene_id: form.scene_id ? Number(form.scene_id) : null,
    slogans: (form.slogans || []).map((x) => (x || "").trim()).filter(Boolean),
    shots: toNumberArray(form.shots),
    thumbs: (form.thumbs || []).map((x) => (x || "").trim()).filter(Boolean),
  };

  setupSaving.value[deviceId] = true;
  try {
    // 优先走独立接口：/setups/{id}
    const setupId = (devices.value.find((x) => x.id === deviceId)?.setup as any)?.id as
      | number
      | undefined;
    if (setupId) {
      const data = await putSetup(setupId, setupPayload);
      devices.value = devices.value.map((x) => (x.id === deviceId ? { ...x, setup: data } : x));
    } else {
      // 兜底：老接口（设备 PUT 携带 setup）
      await putDevice(deviceId, { setup: setupPayload } as any);
    }
    uni.showToast({ title: "配置已保存", icon: "success" });
  } catch (e) {
    uni.showToast({ title: "保存失败", icon: "none" });
  } finally {
    setupSaving.value[deviceId] = false;
  }
};

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
            <view class="card">
              <view class="line"
                ><text class="k">Tag</text><text class="v">{{ d.tag }}</text></view
              >
              <view class="line"
                ><text class="k">UUID</text><text class="v mono">{{ d.uuid }}</text></view
              >
              <view class="line"
                ><text class="k">IP</text><text class="v">{{ d.ip || "-" }}</text></view
              ></view
            >
            <view class="divider" />
            <view class="hr" />
            <!-- 设备配置 setup 展示与编辑 -->
            <view class="setup">
              <view class="line"
                ><text class="k">名称</text>
                <input
                  class="input"
                  :value="setupForm[d.id]?.title || ''"
                  placeholder="标题"
                  @input="(e) => onSetupChange(d.id, 'title', e)"
                />
              </view>
              <view class="line"
                ><text class="k">金额</text>
                <input
                  class="input"
                  type="number"
                  :value="setupForm[d.id]!.money.toString() || '0'"
                  placeholder="如 0"
                  @input="(e) => onSetupChange(d.id, 'money', e)"
                />
              </view>
              <view class="line"
                ><text class="k">场景</text>
                <input
                  class="input"
                  type="number"
                  :value="setupForm[d.id]!.scene_id.toString() || '0'"
                  placeholder="如 0"
                  @input="(e) => onSetupChange(d.id, 'scene_id', e)"
                />
              </view>
              <ArrayListInput
                :title="'口号'"
                @set-value="(v) => (setupForm[d.id].slogans = v)"
                :items="setupForm[d.id].slogans"
              />
              <view class="hr" />
              <ArrayListInput
                :title="'镜头'"
                @set-value="(v) => (setupForm[d.id].shots = v)"
                :items="setupForm[d.id].shots"
              />
              <view class="hr" />
              <ArrayListInput
                :title="'图片'"
                @set-value="(v) => (setupForm[d.id].pictures = v)"
                :items="setupForm[d.id].pictures"
              />

              <view class="hr" />
              <ArrayListInput
                :title="'缩略图'"
                @set-value="(v) => (setupForm[d.id].thumbs = v)"
                :items="setupForm[d.id].thumbs"
              />
              <view class="hr" />

              <button
                class="btn primary block"
                :loading="!!setupSaving[d.id]"
                @tap="saveSetup(d.id)"
                size="mini"
              >
                保存配置
              </button>
            </view>

            <view class="ops" v-if="saving[d.id]">
              <text class="saving">保存中...</text>
            </view>
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
