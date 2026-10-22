<template>
  <view class="video-page" :style="{ paddingBottom: (safeAreaInsets?.bottom || 0) + 'px' }">
    <!-- 内容包裹器 -->
    <view class="content-wrapper">
      <!-- 视频列表 -->
      <view class="video-list-container">
        <block v-if="loading">
          <view class="loading-tips">
            <text>正在加载记录...</text>
          </view>
        </block>
        <block v-else-if="list.length === 0">
          <view class="empty-state">
            <text>暂无记录</text>
          </view>
        </block>
        <block v-else>
          <view class="video-list">
            <file-card v-for="video in list" :key="video.id" :video="video" />
            <!-- <video-card v-for="video in videoStore.videos" :key="video.id" :video="video" />-->
          </view>
        </block>
      </view>

      <!-- 页面底部提示 -->
      <view class="page-footer">
        <text class="footer-text">录制更多精彩视频，记录美好瞬间</text>
      </view>
    </view>

    <view class="flex-spacer"></view>
    <FooterCopyright />
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import config from "@/config";
defineOptions({ name: "VideoPage" });
import { onShow, onPullDownRefresh } from "@dcloudio/uni-app";
import FileCard from "@/components/file-card/index.vue";
import { getFileList } from "@/utils/common";
import FooterCopyright from "@/components/FooterCopyright.vue";
import type { FileType } from "@/api/checkin";
import { login } from "@/api/login";
const { safeAreaInsets } = uni.getWindowInfo();
const list = ref<FileType[]>([]);
const loading = ref(true);
let pendingRefresh: Promise<void> | null = null;

const refreshRecords = (): Promise<void> => {
  if (pendingRefresh) return pendingRefresh;
  const apiUrl = config.apiUrl;
  loading.value = true;
  pendingRefresh = (async () => {
    try {
      const id = await login(false, apiUrl);
      if (!id) {
        uni.showToast({ title: "请先登录系统", icon: "none" });
        return;
      }
      list.value = await getFileList(id.unionid, apiUrl);
    } catch {
      uni.showToast({ title: "获取视频列表失败", icon: "none" });
    } finally {
      loading.value = false;
      pendingRefresh = null;
    }
  })();
  return pendingRefresh;
};

onShow(refreshRecords);
onPullDownRefresh(async () => {
  try {
    await refreshRecords();
  } finally {
    uni.stopPullDownRefresh();
  }
});
</script>

<style lang="scss">
.video-page {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
  min-height: 100vh;
  padding: 20rpx 0 0 0;
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
}

.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.flex-spacer {
  flex-grow: 1;
}

.video-list-container {
  padding: 20rpx;
}

.loading-tips {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200rpx;
  color: #999;
  font-size: 28rpx;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300rpx;
  background-color: #fff;
  border-radius: 16rpx;
  color: #999;
  font-size: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.video-list {
  display: flex;
  flex-direction: column;
}

.page-footer {
  text-align: center;
  padding: 30rpx 0;
}

.footer-text {
  font-size: 24rpx;
  color: #999;
}
</style>
