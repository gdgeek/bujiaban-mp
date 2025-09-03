<script setup lang="ts">
import { computed, ref, defineProps } from "vue";

const props = defineProps<{
  items: string[];
  title: string;
}>();
const emit = defineEmits<{
  (e: "setValue", v: string[]): void;
}>();

const updateSlogan = (idx: number, e: any) => {
  const v = (e?.detail?.value ?? "") as string;
  const arr = (props.items || []).slice();
  arr[idx] = v;
  emit("setValue", arr);
};
const addSlogan = () => {
  const arr = (props.items || []).slice();
  arr.push("");
  emit("setValue", arr);
};

const removeSlogan = (idx: number) => {
  const arr = (props.items || []).slice();
  arr.splice(idx, 1);
  emit("setValue", arr);
};
</script>

<template>
  <view class="card line column">
    <text class="k full">{{ props.title }}</text>
    <view class="slogans">
      <view class="slogan-row" v-for="(s, si) in props.items" :key="si">
        <input
          class="input flex-1"
          :value="s"
          :placeholder="'输入' + props.title"
          @input="(e) => updateSlogan(si, e)"
        />
        <button class="icon-btn mini" @tap="removeSlogan(si)">
          <icon type="clear" :size="20" color="#e54d42" />
        </button>
      </view>
      <button class="btn secondary block" size="mini" @tap="addSlogan()">增加一行</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.array-rows {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
</style>

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
    background: #2e73ff;
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
</style>
