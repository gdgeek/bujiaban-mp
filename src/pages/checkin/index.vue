<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getOpenidFromStorage } from "@/utils/video";
import { getCheckinStatus, wxLogin, setCheckinLinked, getQueryString } from "@/services/checkin";
import FooterCopyright from "@/components/FooterCopyright.vue";
import Exhibition from "@/components/Exhibition.vue";
import Recode from "@/components/Recode.vue";
import Checkin from "@/components/Checkin.vue";

const OPENID_STORAGE_KEY = "AR_CHECKIN_OPENID";
const AGREEMENT_STORAGE_KEY = "AR_AGREEMENT_CHECKED";
const openid = ref<string | null>(null);
const token = ref<string | null>(null);
const loadingState = ref(true);
const animationActive = ref(false);
const { safeAreaInsets } = uni.getWindowInfo();

// 隐私协议和免责声明相关状态
const agreementChecked = ref(false);
const showPrivacyModal = ref(false);
const showDisclaimerModal = ref(false);
const agreementType = ref("");
const agreementContent = ref("");

// 保存openid到本地存储
const saveOpenidToStorage = (id: string) => {
  try {
    uni.setStorageSync(OPENID_STORAGE_KEY, id);
    console.log("openid已成功保存到本地存储");
  } catch (e) {
    console.error("保存openid到本地存储失败:", e);
  }
};

// 保存协议勾选状态到本地存储
const saveAgreementToStorage = (checked: boolean) => {
  try {
    uni.setStorageSync(AGREEMENT_STORAGE_KEY, checked);
    console.log("协议勾选状态已成功保存到本地存储");
  } catch (e) {
    console.error("保存协议勾选状态到本地存储失败:", e);
  }
};

// 从本地存储获取协议勾选状态
const getAgreementFromStorage = (): boolean => {
  try {
    const checked = uni.getStorageSync(AGREEMENT_STORAGE_KEY);
    return !!checked;
  } catch (e) {
    console.error("获取协议勾选状态失败:", e);
    return false;
  }
};

// 更新勾选状态
const updateAgreementChecked = (checked: boolean) => {
  agreementChecked.value = checked;
  saveAgreementToStorage(checked);
};

const type = computed<undefined | null | string>(() => {
  //检查 token.value  第一个字母，是E还是C
  if (!token.value) return undefined;
  if (token.value.startsWith("E")) {
    return "E";
  } else if (token.value.startsWith("C")) {
    return "C";
  } else if (token.value.startsWith("R")) {
    return "R";
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

// 显示隐私协议详情
const showPrivacyDetail = () => {
  agreementType.value = "不加班AR打卡平台隐私协议";
  agreementContent.value = `
  1. 信息收集
     我们会收集您的设备信息、摄像头权限和必要的位置信息，用于提供AR打卡视频录制服务。在您使用拍摄服务时，我们需要获取您的相册访问权限。

  2. 视频存储与使用
     您在平台上录制的AR打卡视频将临时存储在我们的服务器上，方便您查看和保存。您可以通过支付少量服务费获得专业拍摄服务并保存视频。

  3. 付费内容
     平台提供的专业拍摄服务需要支付少量服务费。我们使用微信支付进行安全交易，不会存储您的银行卡等支付敏感信息。服务完成后，拍摄结果将保存到您的设备中。

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
  agreementType.value = "不加班AR打卡平台免责声明";
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

onLoad(async () => {
  token.value = getToken(); //得到token

  // 从本地存储中获取协议勾选状态
  agreementChecked.value = getAgreementFromStorage();

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
  /*
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
  }*/

  loadingState.value = false;
});

// 处理扫码功能
const handleScan = () => {
  // 如果未勾选协议，提示用户
  if (!agreementChecked.value) {
    uni.showToast({
      title: "请先阅读并同意隐私协议和免责声明",
      icon: "none",
      duration: 2000,
    });
    return;
  }

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
        {{ type }}
      </view>
    </view>

    <Exhibition :openid="openid" :token="token" v-if="type == 'E'" class="content-wrapper" />
    <Recode :openid="openid" :token="token" v-else-if="type == 'R'" class="content-wrapper" />
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

        <!-- 隐私协议和免责声明勾选框 -->
        <view class="agreement-checkbox">
          <view class="checkbox-wrapper" @click="updateAgreementChecked(!agreementChecked)">
            <view class="checkbox" :class="{ checked: agreementChecked }">
              <view class="checkbox-inner" v-if="agreementChecked"></view>
            </view>
            <text class="checkbox-text">我已阅读并同意</text>
            <text class="link" @click.stop="showPrivacyDetail">《隐私协议》</text>
            <text class="link-separator">和</text>
            <text class="link" @click.stop="showDisclaimerDetail">《免责声明》</text>
          </view>
        </view>
      </block>
    </view>

    <view class="flex-spacer"></view>

    <!-- 底部版权信息 -->
    <FooterCopyright />
  </view>

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
      width: 100%;
      height: 100%;
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

  // 协议勾选框样式
  .agreement-checkbox {
    width: 100%;
    margin-top: 20rpx;
    margin-bottom: 20rpx;

    .checkbox-wrapper {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-start;
      cursor: pointer;
    }

    .checkbox {
      width: 36rpx;
      height: 36rpx;
      border-radius: 6rpx;
      border: 2rpx solid #ccc;
      margin-right: 12rpx;
      position: relative;
      transition: all 0.3s ease;
      background: #fff;

      &.checked {
        border-color: #4a90e2;
        background: #4a90e2;
      }

      .checkbox-inner {
        position: absolute;
        width: 10rpx;
        height: 18rpx;
        border-right: 3rpx solid #fff;
        border-bottom: 3rpx solid #fff;
        transform: rotate(45deg);
        top: 4rpx;
        left: 12rpx;
      }
    }

    .checkbox-text {
      font-size: 26rpx;
      color: #666;
    }

    .link {
      color: #4a90e2;
      font-size: 26rpx;
      margin-left: 4rpx;
    }

    .link-separator {
      font-size: 26rpx;
      color: #666;
      margin: 0 4rpx;
    }
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

// 模态框动画
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
