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
        <block v-else-if="videoStore.videos.length === 0">
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
import { ref, onMounted } from "vue";
defineOptions({ name: "VideoPage" });
import { onShow } from "@dcloudio/uni-app";
import { useVideoStore } from "@/stores/modules/video";
import FileCard from "@/components/file-card/index.vue";
import { getFileList } from "@/utils/common";
import FooterCopyright from "@/components/FooterCopyright.vue";
import type { IDType, FileType } from "@/api/checkin";
import global from "@/utils/global";
import { login } from "@/api/login";
const { safeAreaInsets } = uni.getWindowInfo();

const list = ref<FileType[] | null>(null);
// 加载状态
const loading = ref(true);
// 用户openid
const id = ref<IDType | null>(null);
// 视频store
const videoStore = useVideoStore();

// 初始化页面
onMounted(async () => {
  console.error(global.url);
  // 获取openid
  const storedId = await login();
  if (!storedId) {
    console.warn("未找到存储的openid，需要先访问打卡页面");
    // 提示用户先登录
    uni.showToast({
      title: "请先登录系统",
      icon: "none",
      duration: 2000,
    });
  } else {
    id.value = storedId;

    list.value = await getFileList(id.value.unionid);

    console.error("已获取到openid:", list);
  }
});

// 每次页面显示时刷新数据
onShow(async () => {
  try {
    loading.value = true;
  } catch (error) {
    console.error("获取视频列表失败:", error);
    uni.showToast({
      title: "获取视频列表失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
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
