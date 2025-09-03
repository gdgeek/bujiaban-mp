<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    placeholder?: string;
    addText?: string;
    deletable?: boolean;
    minRows?: number;
    urlPreview?: boolean; // 将每项视为 URL，展示缩略图并可预览
  }>(),
  {
    modelValue: () => [""],
    placeholder: "",
    addText: "增加一行",
    deletable: true,
    minRows: 1,
    urlPreview: false,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", v: string[]): void;
}>();

const rows = computed({
  get: () =>
    Array.isArray(props.modelValue) && props.modelValue.length
      ? props.modelValue
      : Array(props.minRows).fill(""),
  set: (v: string[]) => emit("update:modelValue", v),
});

const onInput = (idx: number, e: any) => {
  const v = (e?.detail?.value ?? "") as string;
  const next = rows.value.slice();
  next[idx] = v;
  rows.value = next;
};
const addRow = () => {
  const next = rows.value.slice();
  next.push("");
  rows.value = next;
};
const removeRow = (idx: number) => {
  if (!props.deletable) return;
  const next = rows.value.slice();
  next.splice(idx, 1);
  while (next.length < props.minRows) next.push("");
  rows.value = next;
};

// 预览
const urls = computed(() => rows.value.filter((x) => /^https?:\/\//.test((x || "").trim())));
const preview = (index = 0) => {
  if (!props.urlPreview) return;
  const arr = urls.value;
  if (!arr.length) return;
  uni.previewImage({ urls: arr, current: arr[index] || arr[0] });
};
</script>

<template>
  <view class="array-rows">
    <view class="row" v-for="(s, i) in rows" :key="i">
      <input
        class="input flex-1"
        :value="s"
        :placeholder="placeholder"
        @input="(e) => onInput(i, e)"
      />
      <button class="btn danger small" v-if="deletable" @tap="removeRow(i)">删除</button>
    </view>
    <button class="btn secondary small" @tap="addRow">{{ addText }}</button>

    <view v-if="urlPreview" class="grid" :class="{ mt: urls.length }">
      <image
        v-for="(u, ui) in urls"
        :key="u"
        class="thumb"
        :src="u"
        mode="aspectFill"
        @tap="preview(ui)"
      />
      <view class="empty" v-if="!urls.length">暂无图片</view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.array-rows {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.row {
  display: flex;
  gap: 12rpx;
}
.input {
  flex: 1;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  padding: 12rpx;
  font-size: 26rpx;
  background: #fff;
}
.btn {
  background: #f5f5f5;
  color: #333;
}
.btn.small {
  font-size: 24rpx;
  padding: 12rpx 16rpx;
}
.btn.secondary {
  background: #eff4ff;
  color: #2e73ff;
}
.btn.danger {
  background: #ffecec;
  color: #e54d42;
}
.flex-1 {
  flex: 1;
}
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin: 8rpx 0 12rpx;
}
.grid.mt {
  margin-top: 12rpx;
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
</style>
