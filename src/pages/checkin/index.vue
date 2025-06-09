<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getSignedVideoUrl, getOpenidFromStorage } from "@/utils/video";
import {
  getCheckinStatus,
  wxLogin,
  setCheckinReady,
  setCheckinOver,
  setCheckinLinked,
  getQueryString,
  type StatusData,
} from "@/services/checkin";
import FooterCopyright from "@/components/FooterCopyright.vue";
import Exhibition from "@/components/Exhibition.vue";
import Checkin from "@/components/Checkin.vue";

const OPENID_STORAGE_KEY = "AR_CHECKIN_OPENID";
const openid = ref<string | null>(null);
const token = ref<string | null>(null);
const status = ref<StatusData | null>(null);
const _ready = computed(() => {
  return !!(status.value && status.value.checkin.status == "ready");
});

const loadingState = ref(true);
const previewImageLoading = ref(true);
const animationActive = ref(false);
const { safeAreaInsets } = uni.getWindowInfo();

// 隐私协议状态变量
const showPrivacyModal = ref(false);
const showDisclaimerModal = ref(false);
const agreementType = ref("");
const agreementContent = ref("");

// 预览图URL
const previewImageUrl = ref<string>("");
const videoUrl = ref<string>("");

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
let intervalId: number | null = null;
watch(
  () => _ready.value,
  (newVal) => {
    console.log("ready:" + newVal);
    if (newVal) {
      intervalId = setInterval(async () => {
        await refresh();
      }, 1800);
    } else {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  },
  { immediate: true },
);

// 刷新打卡状态
const refresh = async () => {
  if (token.value) {
    const ret = await getCheckinStatus(token.value);
    status.value = ret.data;
  }
};

// 开始录制
const begin = async () => {
  animationActive.value = true;
  setTimeout(async () => {
    if (openid.value && token.value) {
      const ret = await setCheckinReady(openid.value, token.value);
      status.value = ret.data;
    }
    animationActive.value = false;
  }, 800);
};

// 获取签名后的URL，使用工具函数
const getSignedUrl = async (key: string, isPreview: boolean = false) => {
  try {
    const url = await getSignedVideoUrl(key, isPreview);
    if (isPreview) {
      previewImageUrl.value = url;
    } else {
      videoUrl.value = url;
    }
    return url;
  } catch (error) {
    console.error("获取签名URL失败:", error);
    return "";
  }
};

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

  //本页面所有操作都具有token

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
          status.value = linkedRet.data;
        }
      } else {
        //有状态，证明已经链接，这里要刷新
        status.value = ret.data;
      }
    }
  } catch (error) {
    console.log("status 请求失败！" + error);
  } finally {
    loadingState.value = false;
  }
});

// 显示隐私协议详情
const showPrivacyDetail = () => {
  agreementType.value = "不加班AR平台隐私协议";
  agreementContent.value = `
  1. 信息收集
     我们会收集您的设备信息、摄像头权限和必要的位置信息，用于提供AR打卡视频录制服务。在您使用拍摄服务时，我们需要获取您的相册访问权限。

  2. 视频存储与使用
     您在平台上录制的AR打卡视频将临时存储在我们的服务器上，方便您查看和保存。您可以通过支付少量服务费获得专业拍摄服务并保存视频。

  3. 付费内容
     平台提供的专业拍摄服务需要支付少量服务费(¥0.01)。我们使用微信支付进行安全交易，不会存储您的银行卡等支付敏感信息。服务完成后，拍摄结果将保存到您的设备中。

  4. 视频分享
     您可以将下载的视频自由分享给他人或发布到社交媒体。请注意，一旦您分享视频，我们无法控制他人对视频的使用方式。

  5. 信息安全
     我们采取行业标准的安全措施保护您的个人信息和视频内容。您的视频将在您完成下载后的30天内从我们的服务器自动删除。

  6. 用户权利
     您有权随时下载和删除您的AR打卡视频。如您对隐私保护有任何疑问，可随时联系我们。
  `;
  showPrivacyModal.value = true;
};

// 显示免责声明详情
const showDisclaimerDetail = () => {
  agreementType.value = "免责声明";
  agreementContent.value = `
  1. 内容责任
     您对使用本平台录制的AR打卡视频内容负有全部责任。请确保您录制和分享的内容不违反法律法规，不侵犯他人权益。

  2. 服务可用性
     我们努力确保AR打卡服务的稳定性，但受网络环境和设备兼容性影响，无法保证服务在任何情况下都能正常运行。

  3. 视频分享风险
     您通过分享功能将视频分享给他人或发布到社交媒体时，应了解并承担可能带来的风险，包括但不限于视频被他人下载、修改或传播。

  4. 隐私保护
     在录制AR打卡视频时，请注意保护您自己和他人的隐私。避免在视频中包含敏感个人信息或未经许可的他人肖像。

  5. 最终解释权
     本声明的最终解释权归不加班AR打卡平台（上海不加班网络科技有限公司）所有。使用本平台即表示您已阅读并同意本免责声明的全部内容。
  `;
  showDisclaimerModal.value = true;
};

// 关闭协议详情弹窗
const closeAgreementModal = () => {
  showPrivacyModal.value = false;
  showDisclaimerModal.value = false;
};

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
  <view class="ar-checkin" :style="{ paddingTop: (safeAreaInsets?.top || 0) + 'px' }">
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
        <view class="status-icon" @click="handleScan">
          <image src="/static/icons/scan.png" mode="aspectFit"></image>
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
    <!-- 内容包裹器 -->

    <!-- 隐私协议详情模态框 -->
    <view class="agreement-modal" v-if="showPrivacyModal || showDisclaimerModal">
      <view class="modal-mask" @click="closeAgreementModal"></view>
      <view class="modal-content">
        <view class="modal-title">{{ agreementType }}</view>
        <scroll-view class="modal-body" scroll-y>
          <text class="modal-text">{{ agreementContent }}</text>
        </scroll-view>
        <view class="modal-footer">
          <button class="modal-btn" @click="closeAgreementModal">知道了</button>
        </view>
      </view>
    </view>

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

    .scan-icon-wrapper {
      width: 48rpx;
      height: 48rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 16rpx;

      .scan-icon {
        width: 36rpx;
        height: 36rpx;
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

// 加载状态
.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .loading-spinner {
    width: 80rpx;
    height: 80rpx;
    border: 4rpx solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top-color: #4a90e2;
    animation: spin 1s linear infinite;
    margin-bottom: 20rpx;
  }

  .loading-text {
    font-size: 28rpx;
    color: #666;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// 主内容区域
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

// 进度指示器
.progress-tracker {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 28rpx;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.06), 0 4rpx 8rpx rgba(0, 0, 0, 0.04);
  padding: 48rpx 40rpx;
  margin-bottom: 40rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  overflow: hidden;

  // 添加背景装饰
  &::before {
    content: "";
    position: absolute;
    top: -20rpx;
    right: -20rpx;
    width: 120rpx;
    height: 120rpx;
    background: radial-gradient(circle, rgba(82, 196, 26, 0.04) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
  }

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 1;
    position: relative;

    .step-circle {
      width: 68rpx;
      height: 68rpx;
      border-radius: 50%;
      background: #e5e7eb;
      color: #9ca3af;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28rpx;
      font-weight: 700;
      margin-bottom: 12rpx;
      transition: all 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55);
      position: relative;
      overflow: hidden;

      // 添加光泽效果
      &::before {
        content: "";
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
          45deg,
          transparent 30%,
          rgba(255, 255, 255, 0.3) 50%,
          transparent 70%
        );
        transform: translateX(-100%);
        transition: transform 0.6s ease;
      }

      text {
        position: relative;
        z-index: 2;
      }

      .step-success-icon {
        width: 36rpx;
        height: 36rpx;
        filter: brightness(1.1) drop-shadow(0 2rpx 4rpx rgba(0, 0, 0, 0.1));
        animation: success-bounce 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55);
      }
    }

    .step-label {
      font-size: 26rpx;
      color: #6b7280;
      font-weight: 500;
      transition: all 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55);
      letter-spacing: 0.5rpx;
    }

    &.active {
      .step-circle {
        background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
        color: #fff;
        box-shadow: 0 8rpx 20rpx rgba(82, 196, 26, 0.3), 0 4rpx 8rpx rgba(82, 196, 26, 0.2);
        transform: scale(1.08);

        &::before {
          transform: translateX(100%);
        }
      }

      .step-label {
        color: #52c41a;
        font-weight: 600;
        transform: translateY(-2rpx);
      }
    }

    &.completed {
      .step-circle {
        background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
        color: #fff;
        box-shadow: 0 8rpx 20rpx rgba(82, 196, 26, 0.25), 0 4rpx 8rpx rgba(82, 196, 26, 0.15);

        &::before {
          transform: translateX(100%);
        }
      }

      .step-label {
        color: #52c41a;
        font-weight: 600;
      }
    }
  }

  .step-line {
    height: 6rpx;
    flex: 1;
    background: #e5e7eb;
    margin: 0 16rpx;
    position: relative;
    top: -30rpx;
    border-radius: 3rpx;
    transition: all 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55);
    overflow: hidden;

    &:before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: 0;
      background: linear-gradient(90deg, #52c41a 0%, #73d13d 100%);
      border-radius: 3rpx;
      transition: width 0.8s ease-in-out;
      box-shadow: 0 2rpx 8rpx rgba(82, 196, 26, 0.3);
    }

    &.active {
      background: #e5e7eb;

      &:before {
        width: 100%;
        animation: line-glow 2s ease-in-out infinite;
      }
    }

    &.completed {
      background: #e5e7eb;

      &:before {
        width: 100%;
      }
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

  .status-icon {
    width: 120rpx;
    height: 120rpx;
    border-radius: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 30rpx;

    image {
      width: 100rpx;
      height: 100rpx;
    }

    &.linked-icon {
      background: rgba(74, 144, 226, 0.1);
      position: relative;
      overflow: visible;
      animation: connected-pulse 3s ease-in-out infinite;

      // 连接成功波纹效果
      &::before {
        content: "";
        position: absolute;
        top: -15rpx;
        left: -15rpx;
        right: -15rpx;
        bottom: -15rpx;
        border: 2rpx solid rgba(74, 144, 226, 0.4);
        border-radius: 50%;
        animation: connection-wave 2s ease-out infinite;
      }

      // 内层成功指示圆环
      &::after {
        content: "";
        position: absolute;
        top: -8rpx;
        left: -8rpx;
        right: -8rpx;
        bottom: -8rpx;
        border: 1rpx solid rgba(74, 144, 226, 0.6);
        border-radius: 50%;
        animation: success-ring 1.5s ease-in-out infinite;
      }

      image {
        width: 100rpx;
        height: 100rpx;
        position: relative;
        z-index: 2;
        filter: brightness(1.1) drop-shadow(0 4rpx 8rpx rgba(74, 144, 226, 0.3));
        animation: icon-breath 2.5s ease-in-out infinite;
      }
    }

    &.ready-icon {
      background: rgba(250, 173, 20, 0.1);
      animation: pulse 2s infinite;
      position: relative;
      overflow: visible;

      // 录制指示闪烁灯
      &::before {
        content: "";
        position: absolute;
        top: -8rpx;
        right: -8rpx;
        width: 24rpx;
        height: 24rpx;
        background: #ff4d4f;
        border-radius: 50%;
        border: 3rpx solid #fff;
        box-shadow: 0 0 0 2rpx rgba(255, 77, 79, 0.3);
        animation: recording-blink 1s ease-in-out infinite;
      }

      // 扫描旋转圈
      &::after {
        content: "";
        position: absolute;
        top: -15rpx;
        left: -15rpx;
        right: -15rpx;
        bottom: -15rpx;
        border: 2rpx solid transparent;
        border-top: 2rpx solid rgba(250, 173, 20, 0.8);
        border-right: 2rpx solid rgba(250, 173, 20, 0.6);
        border-radius: 50%;
        animation: recording-scan 2s linear infinite;
      }

      image {
        position: relative;
        z-index: 2;
        filter: brightness(1.1) drop-shadow(0 4rpx 12rpx rgba(250, 173, 20, 0.4));
        animation: recording-breath 3s ease-in-out infinite;
      }
    }

    &.success-icon {
      background: rgba(82, 196, 26, 0.1);
      position: relative;
      overflow: visible;
      animation: success-celebrate 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55);

      // 成功庆祝波纹效果
      &::before {
        content: "";
        position: absolute;
        top: -20rpx;
        left: -20rpx;
        right: -20rpx;
        bottom: -20rpx;
        border: 3rpx solid rgba(82, 196, 26, 0.4);
        border-radius: 50%;
        animation: success-wave 1.5s ease-out infinite;
      }

      // 成功光晕效果
      &::after {
        content: "";
        position: absolute;
        top: -30rpx;
        left: -30rpx;
        right: -30rpx;
        bottom: -30rpx;
        background: radial-gradient(circle, rgba(82, 196, 26, 0.1) 0%, transparent 70%);
        border-radius: 50%;
        animation: success-glow 2s ease-in-out infinite;
      }

      image {
        position: relative;
        z-index: 2;
        filter: brightness(1.2) drop-shadow(0 6rpx 15rpx rgba(82, 196, 26, 0.4));
        animation: success-bounce 2s ease-in-out infinite;
      }
    }

    &.waiting-icon {
      background: rgba(74, 144, 226, 0.08);
      position: relative;
      overflow: visible;

      // 外围扫描圆环
      &::before {
        content: "";
        position: absolute;
        top: -20rpx;
        left: -20rpx;
        right: -20rpx;
        bottom: -20rpx;
        border: 3rpx solid transparent;
        border-top: 3rpx solid #4a90e2;
        border-radius: 50%;
        animation: radar-scan 2s linear infinite;
        opacity: 0.8;
      }

      // 内层扫描波纹
      &::after {
        content: "";
        position: absolute;
        top: -10rpx;
        left: -10rpx;
        right: -10rpx;
        bottom: -10rpx;
        border: 2rpx solid rgba(74, 144, 226, 0.3);
        border-radius: 50%;
        animation: pulse-ring 3s ease-in-out infinite;
      }

      image {
        position: relative;
        z-index: 2;
        filter: brightness(1.1) drop-shadow(0 2rpx 6rpx rgba(74, 144, 226, 0.2));
        animation: gentle-glow 2s ease-in-out infinite alternate;
      }
    }
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

  // 文件信息样式
  .file-info {
    display: flex;
    align-items: center;
    background: #f7f9fc;
    padding: 20rpx 30rpx;
    border-radius: 16rpx;
    width: 100%;
    margin-bottom: 40rpx;

    .file-icon {
      width: 60rpx;
      height: 60rpx;
      margin-right: 20rpx;

      image {
        width: 100%;
        height: 100%;
      }
    }

    .file-name {
      font-size: 28rpx;
      color: #333;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  // 视频预览样式
  .video-preview {
    width: 100%;
    margin-top: 10rpx;
    margin-bottom: 20rpx;

    .preview-title {
      font-size: 28rpx;
      color: #666;
      margin-bottom: 15rpx;
      text-align: center;
      font-weight: 500;
    }

    .preview-container {
      position: relative;
      width: 100%;
      height: 350rpx;
      border-radius: 16rpx;
      overflow: hidden;
      background: #f0f0f0;
      box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.12);
    }

    .preview-loading {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(245, 247, 250, 0.9);
      z-index: 2;

      .loading-spinner {
        width: 60rpx;
        height: 60rpx;
        border: 4rpx solid rgba(74, 144, 226, 0.1);
        border-radius: 50%;
        border-top-color: #4a90e2;
        animation: spin 1s linear infinite;
        margin-bottom: 16rpx;
      }

      .loading-text {
        font-size: 24rpx;
        color: #666;
        font-weight: 500;
      }
    }

    .preview-image {
      width: 100%;
      height: 100%;
      border-radius: 16rpx;
      transition: all 0.3s ease;
      position: relative;
      opacity: 0;
      transform: scale(0.95);

      &.image-loaded {
        opacity: 1;
        transform: scale(1);
      }

      &::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 16rpx;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
        pointer-events: none;
      }

      &:active {
        transform: scale(0.98);
        box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.1);
      }
    }
  }

  // AR指导说明
  .ar-instruction {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 40rpx;

    .instruction-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;

      .instruction-number {
        width: 50rpx;
        height: 50rpx;
        border-radius: 25rpx;
        background: #4a90e2;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24rpx;
        font-weight: 500;
        margin-bottom: 10rpx;
      }

      .instruction-text {
        font-size: 24rpx;
        color: #666;
        text-align: center;
      }
    }
  }

  // 录制指示器
  .recording-indicator {
    position: relative;
    width: 140rpx;
    height: 140rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 40rpx;

    .recording-pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(250, 173, 20, 0.2);
      animation: recording-pulse 2s infinite;
    }

    .recording-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 2rpx solid rgba(250, 173, 20, 0.4);
      animation: pulse 2s infinite;
    }

    .recording-time {
      position: relative;
      background: #faad14;
      color: #fff;
      padding: 10rpx 20rpx;
      border-radius: 30rpx;
      font-size: 24rpx;
      font-weight: 600;
    }
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

  // 按钮容器样式
  .action-buttons {
    display: flex;
    width: 100%;
    gap: 20rpx;
  }

  // 按钮样式
  .action-button {
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20rpx 24rpx;
    border-radius: 20rpx;
    font-size: 28rpx;
    font-weight: 500;
    color: #fff;
    box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    flex: 1;
    min-height: 80rpx;
    line-height: 1;
    margin-bottom: 20rpx;

    &.full-width {
      width: 100%;
      margin-right: 0;
    }

    .button-icon {
      width: 40rpx;
      height: 40rpx;
      margin-right: 12rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      image {
        width: 100%;
        height: 100%;
        vertical-align: middle;
      }
    }

    text {
      line-height: 1;
      display: flex;
      align-items: center;
    }

    // 统一的激活状态效果
    &:active {
      transform: translateY(2rpx);
      box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.15);
    }

    &.begin-button {
      background: #4a90e2;
      &:active {
        background: #3a80d2;
      }
    }

    &.cancel-button {
      background: #ff4d4f;
      &:active {
        background: #ff3a3d;
      }
    }

    &.download-button {
      background: #1890ff;
      &:active {
        background: #177ddc;
      }
    }
  }

  // 支付提示样式
  .payment-tips {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 16rpx 24rpx;
    background: rgba(24, 144, 255, 0.05);
    border-radius: 16rpx;
    margin-bottom: 30rpx;

    .tip-icon {
      width: 32rpx;
      height: 32rpx;
      margin-right: 12rpx;
      flex-shrink: 0;
    }

    .tip-text {
      font-size: 24rpx;
      color: #666;
      line-height: 1.4;
    }
  }
}

// 底部装饰
.footer-copyright {
  width: 100%;
  text-align: center;
  color: #bbb;
  font-size: 24rpx;
  margin: 40rpx 0 10rpx 0;
  letter-spacing: 1rpx;
}

// 动画效果
@keyframes recording-pulse {
  0% {
    transform: scale(0.95);
    opacity: 1;
  }
  70% {
    transform: scale(1.1);
    opacity: 0.7;
  }
  100% {
    transform: scale(0.95);
    opacity: 1;
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(250, 173, 20, 0.4);
  }
  70% {
    box-shadow: 0 0 0 20rpx rgba(250, 173, 20, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(250, 173, 20, 0);
  }
}

// 成功庆祝缩放动画
@keyframes success-celebrate {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

// 成功弹跳动画
@keyframes success-bounce {
  0%,
  100% {
    transform: scale(1);
    filter: brightness(1.2) drop-shadow(0 6rpx 15rpx rgba(82, 196, 26, 0.4));
  }
  50% {
    transform: scale(1.05);
    filter: brightness(1.3) drop-shadow(0 8rpx 20rpx rgba(82, 196, 26, 0.5));
  }
}

// 成功庆祝波纹动画
@keyframes success-wave {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.4;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

// 成功光晕动画
@keyframes success-glow {
  0% {
    filter: brightness(1.1) drop-shadow(0 2rpx 6rpx rgba(82, 196, 26, 0.2));
  }
  100% {
    filter: brightness(1.3) drop-shadow(0 4rpx 12rpx rgba(82, 196, 26, 0.4));
  }
}

// 进度条发光动画
@keyframes line-glow {
  0%,
  100% {
    box-shadow: 0 2rpx 8rpx rgba(82, 196, 26, 0.3);
  }
  50% {
    box-shadow: 0 2rpx 12rpx rgba(82, 196, 26, 0.5);
  }
}

// 雷达扫描动画
@keyframes radar-scan {
  0% {
    transform: rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: rotate(360deg);
    opacity: 1;
  }
}

// 脉冲波纹动画
@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.4;
  }
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
}

// 图标轻微发光动画
@keyframes gentle-glow {
  0% {
    filter: brightness(1.1) drop-shadow(0 2rpx 6rpx rgba(74, 144, 226, 0.2));
  }
  100% {
    filter: brightness(1.3) drop-shadow(0 4rpx 12rpx rgba(74, 144, 226, 0.4));
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

// 连接成功背景脉冲动画
@keyframes connected-pulse {
  0%,
  100% {
    background: rgba(74, 144, 226, 0.1);
    box-shadow: 0 0 0 0 rgba(74, 144, 226, 0.1);
  }
  50% {
    background: rgba(74, 144, 226, 0.15);
    box-shadow: 0 0 15rpx 5rpx rgba(74, 144, 226, 0.1);
  }
}

// 连接波纹扩散动画
@keyframes connection-wave {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.4;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

// 成功指示圆环动画
@keyframes success-ring {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

// 图标呼吸动画
@keyframes icon-breath {
  0%,
  100% {
    transform: scale(1);
    filter: brightness(1.1) drop-shadow(0 4rpx 8rpx rgba(74, 144, 226, 0.3));
  }
  50% {
    transform: scale(1.05);
    filter: brightness(1.2) drop-shadow(0 6rpx 12rpx rgba(74, 144, 226, 0.4));
  }
}

// 录制指示闪烁动画
@keyframes recording-blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

// 录制扫描旋转动画
@keyframes recording-scan {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

// 录制呼吸动画
@keyframes recording-breath {
  0% {
    filter: brightness(1.1) drop-shadow(0 4rpx 8rpx rgba(250, 173, 20, 0.4));
  }
  50% {
    filter: brightness(1.2) drop-shadow(0 6rpx 12rpx rgba(250, 173, 20, 0.6));
  }
  100% {
    filter: brightness(1.1) drop-shadow(0 4rpx 8rpx rgba(250, 173, 20, 0.4));
  }
}

// 隐私协议和免责声明链接样式
.privacy-links {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20rpx;
  text-align: center;
  flex-wrap: wrap;
  padding: 10rpx 0;

  .link-text {
    font-size: 24rpx;
    color: #666;
    margin-bottom: 8rpx;
    width: 100%;
    text-align: center;
  }

  .link {
    color: #4a90e2;
    font-size: 24rpx;
    font-weight: 500;
  }

  .link-separator {
    font-size: 24rpx;
    color: #666;
    margin: 0 5rpx;
  }
}

// 隐私协议模态框样式
.agreement-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;

  .modal-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
  }

  .modal-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    max-height: 80%;
    background: #fff;
    border-radius: 20rpx;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.2);
    animation: modal-in 0.3s ease-out;
  }

  .modal-title {
    padding: 30rpx;
    font-size: 32rpx;
    font-weight: 600;
    text-align: center;
    color: #333;
    border-bottom: 1rpx solid #f0f0f0;
  }

  .modal-body {
    flex: 1;
    padding: 20rpx 30rpx;
    max-height: 800rpx;

    .modal-text {
      font-size: 28rpx;
      line-height: 1.6;
      color: #333;
      white-space: pre-wrap;
    }
  }

  .modal-footer {
    padding: 20rpx;
    border-top: 1rpx solid #f0f0f0;
    display: flex;
    justify-content: center;

    .modal-btn {
      background: #4a90e2;
      color: #fff;
      font-size: 28rpx;
      font-weight: 500;
      padding: 10rpx 24rpx;
      border-radius: 20rpx;
      border: none;
      min-width: 200rpx;
      text-align: center;
      box-shadow: 0 6rpx 20rpx rgba(74, 144, 226, 0.25);

      &:active {
        transform: translateY(2rpx);
        box-shadow: 0 4rpx 15rpx rgba(74, 144, 226, 0.2);
      }
    }
  }
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: translate(-50%, -60%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
</style>
