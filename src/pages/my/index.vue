<template>
  <scroll-view
    class="viewport"
    scroll-y
    enable-back-to-top
    refresher-enabled
    :refresher-triggered="isRefreshing"
    @refresherrefresh="onRefresh"
  >
    <!-- 个人资料 -->
    <view class="profile" :style="{ paddingTop: safeAreaInsets?.top + 'px' }">
      <view class="overview">
        <view class="avatar-container">
          <image class="avatar" mode="aspectFill" :src="userData.avatar"></image>
          <view class="level">Lv.{{ userData.level }}</view>
        </view>
        <view class="meta">
          <view class="nickname">{{ userData.nickname }}</view>
          <view class="user-stats">
            <text class="stat-item">连续打卡 {{ userData.continuousCheckin }} 天</text>
            <text class="stat-divider">|</text>
            <text class="stat-item">积分 {{ userData.points }}</text>
          </view>
        </view>
        <view class="settings">
          <text class="icon-setting"></text>
        </view>
      </view>
    </view>

    <!-- AR打卡数据概览 -->
    <view class="ar-stats">
      <view class="ar-stat-item">
        <view class="ar-stat-value">{{ userData.totalCheckins }}</view>
        <view class="ar-stat-label">总打卡次数</view>
      </view>
      <view class="ar-stat-item">
        <view class="ar-stat-value">{{ userData.weeklyRanking }}</view>
        <view class="ar-stat-label">周排名</view>
      </view>
      <view class="ar-stat-item">
        <view class="ar-stat-value">{{ userData.monthlyPoints }}分</view>
        <view class="ar-stat-label">本月积分</view>
      </view>
    </view>

    <!-- AR打卡功能区 -->
    <view class="feature-cards">
      <view class="feature-card">
        <view class="card-content">
          <view class="card-icon ar-checkin"></view>
          <view class="card-info">
            <view class="card-title">AR打卡</view>
            <view class="card-desc">今日尚未打卡</view>
          </view>
        </view>
        <text class="icon-arrow-right"></text>
      </view>

      <view class="feature-card">
        <view class="card-content">
          <view class="card-icon ar-history"></view>
          <view class="card-info">
            <view class="card-title">打卡记录</view>
            <view class="card-desc">查看历史打卡记录</view>
          </view>
        </view>
        <text class="icon-arrow-right"></text>
      </view>

      <view class="feature-card">
        <view class="card-content">
          <view class="card-icon ar-reward"></view>
          <view class="card-info">
            <view class="card-title">积分兑换</view>
            <view class="card-desc">{{ userData.points }}积分待兑换</view>
          </view>
        </view>
        <text class="icon-arrow-right"></text>
      </view>
    </view>

    <!-- 每日任务 -->
    <view class="daily-tasks">
      <view class="section-title">
        <text>每日任务</text>
        <text class="section-subtitle">完成任务得积分</text>
      </view>

      <view class="task-list">
        <view class="task-item">
          <view class="task-icon task-ar"></view>
          <view class="task-content">
            <view class="task-title">AR打卡</view>
            <view class="task-desc">完成AR打卡获得5积分</view>
          </view>
          <view class="task-status incomplete">
            <text>去打卡</text>
          </view>
        </view>

        <view class="task-item">
          <view class="task-icon task-share"></view>
          <view class="task-content">
            <view class="task-title">分享打卡</view>
            <view class="task-desc">分享打卡获得2积分</view>
          </view>
          <view class="task-status completed">
            <text>已完成</text>
          </view>
        </view>

        <view class="task-item">
          <view class="task-icon task-invite"></view>
          <view class="task-content">
            <view class="task-title">邀请好友</view>
            <view class="task-desc">邀请好友获得10积分</view>
          </view>
          <view class="task-status incomplete">
            <text>去邀请</text>
          </view>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useUserStore } from "@/stores";

const userStore = useUserStore();
const { safeAreaInsets } = uni.getWindowInfo();

const userData = ref({
  avatar: "https://picsum.photos/200", // 随机头像
  nickname: "不加班用户",
  level: 5,
  points: 350,
  continuousCheckin: 7,
  totalCheckins: 28,
  weeklyRanking: 12,
  monthlyPoints: 120,
});

const isRefreshing = ref(false);

const onRefresh = () => {
  isRefreshing.value = true;
  // 在这里处理刷新逻辑
  setTimeout(() => {
    isRefreshing.value = false;
  }, 1000);
};
</script>

<style lang="scss">
page {
  height: 100%;
  background-color: #f7f7f8;
}

.viewport {
  height: 100%;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 420rpx;
    background: linear-gradient(to bottom, #4bb0ff, #6fcfff);
    z-index: -1;
  }
}

.profile {
  position: relative;
  z-index: 2;
  padding: 30rpx 0;

  .overview {
    display: flex;
    align-items: center;
    padding: 0 30rpx;
    color: #fff;
  }

  .avatar-container {
    position: relative;
  }

  .avatar {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    border: 4rpx solid rgba(255, 255, 255, 0.8);
  }

  .level {
    position: absolute;
    bottom: -6rpx;
    right: -6rpx;
    background: #ffd700;
    color: #333;
    font-size: 20rpx;
    border-radius: 20rpx;
    padding: 4rpx 12rpx;
    font-weight: bold;
  }

  .meta {
    flex: 1;
    margin-left: 24rpx;
  }

  .nickname {
    font-size: 36rpx;
    font-weight: 500;
    margin-bottom: 12rpx;
  }

  .user-stats {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
  }

  .stat-item {
    display: inline-block;
  }

  .stat-divider {
    margin: 0 12rpx;
    opacity: 0.6;
  }

  .settings {
    font-size: 40rpx;
    color: #fff;
  }
}

.ar-stats {
  margin: 20rpx 30rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 0;
  display: flex;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  z-index: 10;
  position: relative;

  .ar-stat-item {
    flex: 1;
    text-align: center;
    border-right: 1rpx solid #eee;

    &:last-child {
      border-right: none;
    }
  }

  .ar-stat-value {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 4rpx;
  }

  .ar-stat-label {
    font-size: 24rpx;
    color: #999;
  }
}

.feature-cards {
  margin: 30rpx 30rpx 0;

  .feature-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #fff;
    border-radius: 16rpx;
    padding: 24rpx 30rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  }

  .card-content {
    display: flex;
    align-items: center;
  }

  .card-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 16rpx;
    margin-right: 20rpx;
    background-position: center;
    background-repeat: no-repeat;
    background-size: 50%;
  }

  .ar-checkin {
    background-color: #4bb0ff;
    background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yMCA0TDguMTIgMTUuODggNCA5LjUiLz48L3N2Zz4=");
  }

  .ar-history {
    background-color: #ffa500;
    background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PHBvbHlsaW5lIHBvaW50cz0iMTIgNiAxMiAxMiAxNiAxNCIvPjwvc3ZnPg==");
  }

  .ar-reward {
    background-color: #50c878;
    background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iOCIgcj0iNiIvPjxwYXRoIGQ9Ik0xNS40NyAxNS41MWwtMy41MSA2Ljk5LTEuOTctMy45MUw3IDE3LjAxbDMuNTEtNi45OSIvPjwvc3ZnPg==");
  }

  .card-info {
    flex: 1;
  }

  .card-title {
    font-size: 30rpx;
    font-weight: 500;
    color: #333;
    margin-bottom: 6rpx;
  }

  .card-desc {
    font-size: 24rpx;
    color: #999;
  }

  .icon-arrow-right {
    font-size: 36rpx;
    color: #ccc;
  }
}

.daily-tasks {
  margin: 30rpx 30rpx 50rpx;

  .section-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
    margin-bottom: 20rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-subtitle {
    font-size: 24rpx;
    color: #999;
    font-weight: normal;
  }

  .task-list {
    background: #fff;
    border-radius: 16rpx;
    overflow: hidden;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  }

  .task-item {
    display: flex;
    align-items: center;
    padding: 24rpx 30rpx;
    border-bottom: 1rpx solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }
  }

  .task-icon {
    width: 60rpx;
    height: 60rpx;
    border-radius: 12rpx;
    margin-right: 20rpx;
    background-position: center;
    background-repeat: no-repeat;
    background-size: 50%;
  }

  .task-ar {
    background-color: #4bb0ff;
    background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiA4YzIuMiAwIDQtMS44IDQtNHMtMS44LTQtNC00LTQgMS44LTQgNCAxLjggNCA0IDR6Ii8+PHBhdGggZD0iTTIwIDhWNmEyIDIgMCAwMC0yLTJoLTJNNCAxNnYyYTIgMiAwIDAwMiAyaDJNMTYgMTZoMmEyIDIgMCAwMDItMnYtMk0xNiA4SDZhMiAyIDAgMDAtMiAydjZhMiAyIDAgMDAyIDJoMTBhMiAyIDAgMDAyLTJ2LTZhMiAyIDAgMDAtMi0yIi8+PC9zdmc+");
  }

  .task-share {
    background-color: #ff6b6b;
    background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjE4IiBjeT0iNSIgcj0iMyIvPjxjaXJjbGUgY3g9IjYiIGN5PSIxMiIgcj0iMyIvPjxjaXJjbGUgY3g9IjE4IiBjeT0iMTkiIHI9IjMiLz48bGluZSB4MT0iOC41OSIgeTE9IjEzLjUxIiB4Mj0iMTUuNDIiIHkyPSIxNy40OSIvPjxsaW5lIHgxPSIxNS40MSIgeTE9IjYuNTEiIHgyPSI4LjU5IiB5Mj0iMTAuNDkiLz48L3N2Zz4=");
  }

  .task-invite {
    background-color: #9b59b6;
    background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xNiAyMXYtMmEyIDIgMCAwMC0yLTJINmEyIDIgMCAwMC0yIDJ2Mk0xNiA4YTQgNCAwIDExLTggMCA0IDQgMCAwMTggMHpNMjAgOEwyMSAxMk0yMCBsIDEgLTMiLz48L3N2Zz4=");
  }

  .task-content {
    flex: 1;
  }

  .task-title {
    font-size: 28rpx;
    color: #333;
    margin-bottom: 4rpx;
  }

  .task-desc {
    font-size: 24rpx;
    color: #999;
  }

  .task-status {
    font-size: 24rpx;
    padding: 4rpx 16rpx;
    border-radius: 30rpx;

    &.incomplete {
      color: #4bb0ff;
      background: rgba(75, 176, 255, 0.1);
    }

    &.completed {
      color: #50c878;
      background: rgba(80, 200, 120, 0.1);
    }
  }
}
</style>
