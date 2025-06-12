<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getOpenidFromStorage } from "@/utils/video";
import { getCheckinStatus, wxLogin, setCheckinLinked, getQueryString } from "@/services/checkin";
import FooterCopyright from "@/components/FooterCopyright.vue";
import Exhibition from "@/components/Exhibition.vue";
import Checkin from "@/components/Checkin.vue";

const OPENID_STORAGE_KEY = "AR_CHECKIN_OPENID";
const openid = ref<string | null>(null);
const token = ref<string | null>(null);
const loadingState = ref(true);
const animationActive = ref(false);
const { safeAreaInsets } = uni.getWindowInfo();

// 保存openid到本地存储
const saveOpenidToStorage = (id: string) => {
  try {
    uni.setStorageSync(OPENID_STORAGE_KEY, id);
    console.log("openid已成功保存到本地存储");
  } catch (e) {
    console.error("保存openid到本地存储失败:", e);
  }
};

const type = computed<undefined | null | string>(() => {
  //检查 token.value  第一个字母，是E还是C
  if (!token.value) return undefined;
  if (token.value.startsWith("E")) {
    return "E";
  } else if (token.value.startsWith("C")) {
    return "C";
  }
  return null;
});

const getToken = () => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1] as unknown as { options: { q: string } };
  const query = currentPage.options;
  const decodedUrl = decodeURIComponent(query.q);
  const result = getQueryString(decodedUrl, "k");

  return result;
};

onLoad(async () => {
  token.value = getToken(); //得到token

  // 首先尝试从本地存储中获取openid
  const storedOpenid = getOpenidFromStorage();
  if (storedOpenid) {
    console.log("从本地存储中恢复了openid");
    openid.value = storedOpenid;
  } else {
    // 如果本地没有存储openid，则请求新的
    try {
      const ret = await wxLogin();
      openid.value = ret.openid; //得到openid
      // 将新获取的openid保存到本地存储
      if (openid.value) {
        saveOpenidToStorage(openid.value);
      }
    } catch (error) {
      console.error("openid 请求失败！" + error);
      return;
    }
  }

  try {
    if (token.value) {
      const ret = await getCheckinStatus(token.value);

      if (!ret.success || ret.data.checkin.openid != openid.value) {
        //没有状态，证明没有链接，这里要链接
        if (openid.value && token.value) {
          const linkedRet = await setCheckinLinked(openid.value, token.value);
          console.log("链接成功！" + JSON.stringify(linkedRet));
        }
      }
    }
  } catch (error) {
    console.log("status 请求失败！" + error);
  } finally {
    loadingState.value = false;
  }
});

// 处理扫码功能
const handleScan = () => {
  uni.scanCode({
    scanType: ["qrCode"],
    success: (res) => {
      console.log("扫码结果：", res.result);
      // 解析扫码结果
      if (res.result && res.result.includes("w.4mr.cn/t")) {
        try {
          // 从URL中提取k参数（小程序兼容方式）
          const newToken = getQueryString(res.result, "k");

          if (newToken) {
            console.log("检测到AR打卡token:", newToken);
            // 跳转到当前页面并带上新token
            uni.reLaunch({
              url: `/pages/checkin/index?q=${encodeURIComponent(
                "https://w.4mr.cn/t?k=" + newToken,
              )}`,
              success: () => {
                uni.showToast({
                  title: "连接成功",
                  icon: "success",
                });
              },
              fail: (err) => {
                console.error("页面跳转失败:", err);
                uni.showToast({
                  title: "连接失败",
                  icon: "none",
                });
              },
            });
          }
        } catch (error) {
          console.error("解析扫码结果失败:", error);
          uni.showToast({
            title: "无效的二维码",
            icon: "none",
          });
        }
      } else {
        uni.showToast({
          title: "不支持的二维码格式",
          icon: "none",
        });
      }
    },
    fail: (err) => {
      console.error("扫码失败:", err);
      if (err.errMsg !== "scanCode:fail cancel") {
        uni.showToast({
          title: "扫码失败",
          icon: "none",
        });
      }
    },
  });
};
</script>

<template>
  <view
    class="ar-checkin"
    :style="{
      paddingTop: (safeAreaInsets?.top || 0) + 'px',
      paddingBottom: (safeAreaInsets?.bottom || 0) + 'px',
    }"
  >
    <!-- 顶部导航栏 -->
    <view class="header">
      <view class="header-row">
        <view class="logo-container">
          <image class="logo" src="/static/images/ar_logo.png" mode="aspectFit"></image>
        </view>
        <view class="title" data-text="不加班AR打卡平台">不加班AR打卡平台</view>
      </view>
      <view class="slogan">
        <image class="slogan-icon" src="/static/icons/slogan.png" mode="aspectFit"></image>
        <text class="slogan-text">科技赋能生活，记录每一次精彩时刻！</text>
      </view>
    </view>

    <Exhibition :openid="openid" :token="token" v-if="type == 'E'" class="content-wrapper" />
    <Checkin :openid="openid" :token="token" v-else-if="type == 'C'" class="content-wrapper" />

    <view v-else class="status-card" :class="{ 'animation-active': animationActive }">
      <block>
        <view class="scan-code-container" @click="handleScan">
          <view class="scan-code-box">
            <!-- 四个角 -->
            <view class="corner top-left"></view>
            <view class="corner top-right"></view>
            <view class="corner bottom-left"></view>
            <view class="corner bottom-right"></view>
            <!-- 扫描线 -->
            <view class="scan-line"></view>
            <!-- 中心图标 -->
            <image class="scan-icon" src="/static/icons/qrcode.png" mode="aspectFit"></image>
          </view>
        </view>
        <view @click="handleScan" class="status-title">扫描二维码</view>
        <view class="status-description">扫描屏幕上二维码...</view>
        <view class="connection-tips">
          <view class="tip-item">
            <image src="/static/icons/tip.png" mode="aspectFit"></image>
            <text>请确认打卡机已经录制完视频</text>
          </view>
          <view class="tip-item">
            <image src="/static/icons/tip.png" mode="aspectFit"></image>
            <text>扫描屏幕上二维码</text>
          </view>
        </view>
      </block>
    </view>

    <view class="flex-spacer"></view>

    <!-- 底部版权信息 -->
    <FooterCopyright />
  </view>
</template>

<style lang="scss" scoped>
.ar-checkin {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
  padding: 40rpx 30rpx 0;
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
}

.flex-spacer {
  flex-grow: 1;
}

.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

// 顶部导航栏
.header {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 0 0 32rpx 32rpx;
  padding: 32rpx 24rpx 40rpx 24rpx;
  margin: -40rpx -30rpx 50rpx -30rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;

  // 背景装饰元素
  &::before {
    content: "";
    position: absolute;
    top: -50%;
    right: -50rpx;
    width: 300rpx;
    height: 300rpx;
    background: radial-gradient(circle, rgba(74, 144, 226, 0.06) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
  }

  &::after {
    content: "";
    position: absolute;
    bottom: -100rpx;
    left: -50rpx;
    width: 200rpx;
    height: 200rpx;
    background: radial-gradient(circle, rgba(82, 196, 26, 0.04) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
  }

  .header-row {
    display: flex;
    align-items: center;
    width: 100%;
    margin-bottom: 20rpx;
    position: relative;
    z-index: 2;
  }

  .logo-container {
    width: 88rpx;
    height: 88rpx;
    border-radius: 24rpx;
    overflow: hidden;
    background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
    box-shadow: 0 8rpx 20rpx rgba(74, 144, 226, 0.12), 0 2rpx 4rpx rgba(0, 0, 0, 0.05),
      inset 0 1rpx 0 rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
    position: relative;

    // 添加微妙的边框效果
    &::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 24rpx;
      padding: 1rpx;
      background: linear-gradient(135deg, rgba(74, 144, 226, 0.2), rgba(82, 196, 26, 0.2));
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: xor;
      -webkit-mask-composite: xor;
    }

    .logo {
      width: 72rpx;
      height: 72rpx;
      filter: drop-shadow(0 2rpx 4rpx rgba(0, 0, 0, 0.1));
    }
  }

  .title {
    font-size: 40rpx;
    font-weight: 700;
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: 1rpx;
    line-height: 1.2;
    position: relative;

    // 添加微妙的文字阴影效果
    &::after {
      content: attr(data-text);
      position: absolute;
      top: 0;
      left: 0;
      background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(82, 196, 26, 0.1));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      z-index: -1;
      transform: translate(1rpx, 1rpx);
    }
  }

  .slogan {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    background: linear-gradient(135deg, #f0f9ff 0%, #f0fdf4 100%);
    padding: 16rpx 20rpx;
    border-radius: 20rpx;
    box-shadow: 0 4rpx 12rpx rgba(74, 144, 226, 0.08), inset 0 1rpx 0 rgba(255, 255, 255, 0.8);
    border: 1rpx solid rgba(74, 144, 226, 0.08);
    position: relative;
    z-index: 2;

    .slogan-icon {
      width: 48rpx;
      height: 48rpx;
      filter: drop-shadow(0 2rpx 4rpx rgba(0, 0, 0, 0.1));
      animation: gentle-float 3s ease-in-out infinite;
    }

    .slogan-text {
      margin-left: 12rpx;
      font-size: 26rpx;
      font-weight: 600;
      background: linear-gradient(135deg, #4a90e2 0%, #52c41a 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: 0.5rpx;
      line-height: 1.3;
      flex: 1;
    }
  }
}

// 状态卡片
.status-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  transform: translateY(0);
  opacity: 1;

  &.animation-active {
    transform: translateY(20rpx);
    opacity: 0.7;
  }

  // 新的扫码容器样式
  .scan-code-container {
    width: 200rpx;
    height: 200rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 30rpx;
    position: relative;
    cursor: pointer;
  }

  .scan-code-box {
    width: 160rpx;
    height: 160rpx;
    position: relative;
    background-color: rgba(74, 144, 226, 0.05);
    border-radius: 8rpx;
    overflow: hidden;
  }

  // 四个角样式
  .corner {
    position: absolute;
    width: 30rpx;
    height: 30rpx;
    border-color: #4a90e2;
    border-style: solid;
    border-width: 0;
  }

  .top-left {
    top: 0;
    left: 0;
    border-top-width: 8rpx;
    border-left-width: 8rpx;
  }

  .top-right {
    top: 0;
    right: 0;
    border-top-width: 8rpx;
    border-right-width: 8rpx;
  }

  .bottom-left {
    bottom: 0;
    left: 0;
    border-bottom-width: 8rpx;
    border-left-width: 8rpx;
  }

  .bottom-right {
    bottom: 0;
    right: 0;
    border-bottom-width: 8rpx;
    border-right-width: 8rpx;
  }

  // 扫描线
  .scan-line {
    position: absolute;
    left: 0;
    width: 100%;
    height: 8rpx;
    background: linear-gradient(
      90deg,
      rgba(74, 144, 226, 0),
      rgba(74, 144, 226, 0.9),
      rgba(74, 144, 226, 0)
    );
    box-shadow: 0 0 10rpx rgba(74, 144, 226, 0.5);
    animation: scan-animation 2s ease-in-out infinite;
  }

  // 扫码图标
  .scan-icon {
    position: absolute;
    width: 100rpx;
    height: 100rpx;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    opacity: 0.7;
    z-index: 2;
  }

  .status-title {
    font-size: 36rpx;
    font-weight: 600;
    color: #333;
    margin-bottom: 16rpx;
  }

  .status-description {
    font-size: 28rpx;
    color: #666;
    text-align: center;
    margin-bottom: 40rpx;
  }

  // 连接提示
  .connection-tips {
    width: 100%;
    margin-bottom: 30rpx;
    padding: 24rpx;
    background: linear-gradient(135deg, rgba(74, 144, 226, 0.03) 0%, rgba(74, 144, 226, 0.06) 100%);
    border-radius: 16rpx;
    border: 1rpx solid rgba(74, 144, 226, 0.1);

    .tip-item {
      display: flex;
      align-items: center;
      margin-bottom: 20rpx;
      animation: tip-fade-in 0.5s ease-in-out;

      &:last-child {
        margin-bottom: 0;
      }

      image {
        width: 40rpx;
        height: 40rpx;
        margin-right: 16rpx;
        filter: drop-shadow(0 2rpx 4rpx rgba(74, 144, 226, 0.2));
      }

      text {
        font-size: 26rpx;
        color: #999;
        font-weight: 500;
        letter-spacing: 0.5rpx;
      }
    }
  }
}

// 添加图标浮动动画
@keyframes gentle-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4rpx);
  }
}

// 提示项淡入动画
@keyframes tip-fade-in {
  0% {
    opacity: 0;
    transform: translateX(-10rpx);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

// 扫描线动画
@keyframes scan-animation {
  0% {
    top: 10rpx;
    opacity: 0.3;
  }
  50% {
    top: 150rpx;
    opacity: 1;
  }
  100% {
    top: 10rpx;
    opacity: 0.3;
  }
}
</style>
