<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { login } from "@/services/login";
import ArrayListInput from "@/components/ArrayListInput.vue";
import { getDeviceWithSetup, putSetup, type DeviceType, type SetupType } from "@/api/device.ts";
import { getCheckinList, type VerseType } from "@/api/a1.ts";
import type { UniInputEvent, UniPickerChangeEvent } from "@/types/events";
const deviceId = ref<number | null>(null);
const loading = ref(true);
const device = ref<DeviceType | null>(null);
const setupForm = ref({
  title: "",
  money: "",
  scene_id: "",
  slogans: [""],
  shots: [""],
  pictures: [""],
  thumbs: [""],
});
const saving = ref(false);
const verses = ref<VerseType[]>([]);
onLoad(async (opts) => {
  verses.value = await getCheckinList();
  const raw = (opts as Record<string, any>) || {};
  const idParam = Number(raw.deviceId ?? raw.id ?? 0);
  deviceId.value = Number.isFinite(idParam) && idParam > 0 ? idParam : null;
  try {
    await login();
    if (deviceId.value) {
      const d = await getDeviceWithSetup(deviceId.value);
      device.value = d;
      const s = (d.setup || {}) as Partial<SetupType>;
      setupForm.value = {
        title: s.title ?? "",
        money: s.money != null ? String(s.money) : "",
        scene_id: s.scene_id != null ? String(s.scene_id) : "",
        slogans: Array.isArray(s.slogans) && s.slogans.length ? [...s.slogans] : [""],
        shots: Array.isArray(s.shots) && s.shots.length ? s.shots.map((n) => String(n)) : [""],
        pictures:
          Array.isArray((s as any).pictures) && (s as any).pictures.length
            ? ([...(s as any).pictures] as string[])
            : [""],
        thumbs: Array.isArray(s.thumbs) && s.thumbs.length ? [...s.thumbs] : [""],
      };
    }
  } finally {
    loading.value = false;
  }
});

const goBack = () => {
  uni.navigateBack();
};

const onInput = (field: keyof typeof setupForm.value, e: UniInputEvent) => {
  const v = e.detail.value ?? "";
  setupForm.value[field] = v as never;
};

// 当前选中场景名称（用于下拉展示）
const selectedVerseName = computed(() => {
  const idNum = Number(setupForm.value.scene_id || 0);
  const found = verses.value.find((x) => x.verse_id === idNum);
  return found?.name || "";
});

const selectedVerseIndex = computed(() => {
  const idNum = Number(setupForm.value.scene_id || 0);
  return Math.max(
    0,
    verses.value.findIndex((x) => x.verse_id === idNum),
  );
});

// 选择场景（picker 返回的是所选项索引）
const onSceneChange = (e: UniPickerChangeEvent) => {
  const idx = Number(e.detail.value ?? -1);
  if (idx >= 0 && idx < verses.value.length) {
    const v = verses.value[idx];
    setupForm.value.scene_id = String(v.verse_id);
  }
};

const saveSetup = async () => {
  if (!device.value) return;
  const s = device.value.setup as SetupType | undefined;
  const toNumberArray = (txt: string[]) =>
    (txt || [])
      .map((x) => (x || "").trim())
      .filter(Boolean)
      .map((x) => Number(x))
      .filter((x) => !isNaN(x) && x > 0)
      .sort((a, b) => a - b);

  const payload: Partial<SetupType> = {
    title: (setupForm.value.title || "").trim(),
    money: setupForm.value.money ? Number(setupForm.value.money) : 0,
    scene_id: setupForm.value.scene_id ? Number(setupForm.value.scene_id) : null,
    slogans: (setupForm.value.slogans || []).map((x) => (x || "").trim()).filter(Boolean),
    shots: toNumberArray(setupForm.value.shots as unknown as string[]),
    pictures: (setupForm.value.pictures || []).map((x) => (x || "").trim()).filter(Boolean),
    thumbs: (setupForm.value.thumbs || []).map((x) => (x || "").trim()).filter(Boolean),
  } as Partial<SetupType>;

  saving.value = true;
  try {
    if (s?.id) {
      await putSetup(s.id, payload);
      uni.showToast({ title: "配置已保存", icon: "success" });
    } else {
      uni.showToast({ title: "缺少 setup.id，无法保存", icon: "none" });
    }
  } catch (e) {
    uni.showToast({ title: "保存失败", icon: "none" });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <view class="page">
    <view class="header">
      <text class="title">设备管理</text>
    </view>

    <view v-if="loading" class="card">加载中...</view>
    <view v-else class="card">
      <view v-if="!deviceId" class="empty">未提供设备ID</view>
      <view v-else>
        <view class="card">
          <view class="line"
            ><text class="k">设备ID</text><text class="v">{{ deviceId }}</text></view
          >
          <view v-if="device" class="line"
            ><text class="k">标签</text><text class="v">{{ device!.tag }}</text></view
          >
          <view v-if="device" class="line"
            ><text class="k">UUID</text><text class="v mono">{{ device!.uuid }}</text></view
          >
          <view v-if="device" class="line"
            ><text class="k">IP</text><text class="v">{{ device!.ip || "-" }}</text></view
          >
        </view>
        <view class="hr" />
        <view class="title small">设备配置</view>
        <view class="setup">
          <view class="line"
            ><text class="k">名称</text>
            <input
              class="input"
              :value="setupForm.title"
              placeholder="标题"
              @input="(e) => onInput('title', e)"
            />
          </view>
          <view class="line"
            ><text class="k">金额</text>
            <input
              class="input"
              type="number"
              :value="setupForm.money"
              placeholder="如 0"
              @input="(e) => onInput('money', e)"
            />
          </view>
          <view class="line"
            ><text class="k">场景</text>
            <picker
              mode="selector"
              :range="verses"
              range-key="name"
              :value="selectedVerseIndex"
              @change="onSceneChange"
            >
              <view class="input">{{ selectedVerseName || "请选择场景" }}</view>
            </picker>
          </view>
          <ArrayListInput
            :title="'口号'"
            :items="setupForm.slogans"
            @set-value="(v) => (setupForm.slogans = v)"
          />
          <view class="hr" />
          <ArrayListInput
            :title="'镜头'"
            :items="setupForm.shots"
            @set-value="(v) => (setupForm.shots = v)"
          />
          <view class="hr" />
          <ArrayListInput
            :title="'图片'"
            :items="setupForm.pictures"
            @set-value="(v) => (setupForm.pictures = v)"
          />
          <view class="hr" />
          <ArrayListInput
            :title="'缩略图'"
            :items="setupForm.thumbs"
            @set-value="(v) => (setupForm.thumbs = v)"
          />
          <view class="hr" />
        </view>

        <view class="hr" />
        <view class="actions">
          <button class="btn primary block" :loading="saving" @tap="saveSetup" size="mini">
            保存配置
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f7f8fa;
  padding: 32rpx;
}
.header {
  margin-bottom: 16rpx;
}
.title {
  font-size: 36rpx;
  font-weight: 600;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
}
.line {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.k {
  width: 140rpx;
  color: #666;
  font-size: 26rpx;
}
.v {
  color: #333;
  font-size: 28rpx;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
}
.empty {
  color: #999;
  font-size: 26rpx;
}
.actions {
  margin-top: 16rpx;
}
.btn {
  background: #f5f5f5;
  color: #333;
}
.btn.primary {
  background: #07c160;
  color: #fff;
}
.btn.block {
  width: 100%;
  display: block;
}

.hr {
  width: 100%;
  height: 1px;
  background: #ececec;
  margin: 16rpx 0;
  border-radius: 1px;
}
</style>
