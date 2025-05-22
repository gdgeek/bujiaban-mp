<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";

// 定义接口类型
interface CheckinInfo {
  created_at: string;
  token: string;
  openid: string;
  status: string;
  updated_at: string;
}

interface FileInfo {
  token: string;
  key: string;
  openid: string;
  created_at: string;
}

interface StatusData {
  checkin: CheckinInfo;
  file?: FileInfo | null;
}

interface ApiResponse {
  scuess: boolean;
  message: string;
  data: StatusData;
}

const openid = ref<string | null>(null);
const token = ref<string | null>(null);
const status = ref<StatusData | null>(null);
const _ready = computed(() => {
  return !!(status.value && status.value.checkin.status == "ready");
});
const currentStep = computed(() => {
  if (!status.value) return 0;
  if (status.value.file != null) return 3;
  if (status.value.checkin.status == "ready") return 2;
  if (status.value.checkin.status == "linked") return 1;
  return 0;
});
const loadingState = ref(true);
const animationActive = ref(false);
const showDevInfo = ref(false);
const { safeAreaInsets } = uni.getWindowInfo();

// 测试进度条的函数
const testProgressStep = () => {
  // 首先重置到初始状态
  status.value = {
    checkin: {
      created_at: new Date().toISOString(),
      token: token.value || "test",
      openid: openid.value || "test",
      status: "",
      updated_at: new Date().toISOString(),
    },
  };

  // 使用延时器依次展示各个状态
  setTimeout(() => {
    if (status.value) {
      status.value.checkin.status = "linked";
    }

    setTimeout(() => {
      if (status.value) {
        status.value.checkin.status = "ready";
      }

      setTimeout(() => {
        if (status.value) {
          status.value.file = {
            token: status.value.checkin.token,
            key: "recode/test123.mp4",
            openid: status.value.checkin.openid,
            created_at: new Date().toISOString(),
          };
        }
      }, 1500);
    }, 1500);
  }, 500);
};

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
const _refresh = async (token: string): Promise<ApiResponse> => {
  return new Promise((resolve, reject) => {
    console.error("refresh:");
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/status?token=" + token,
      method: "GET",
      success: function (res) {
        console.log("验证成功！" + JSON.stringify(res.data));
        resolve(res.data as ApiResponse);
      },
      fail: function (res) {
        console.log("请求失败！" + res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};

//得到 token
const getQueryString = (url: string, name: string): string | null => {
  var reg = new RegExp("(^|&|/?)" + name + "=([^&|/?]*)(&|/?|$)", "i");
  var r = url.substring(1).match(reg);
  if (r != null) {
    return r[2];
  }
  return null;
};

const refresh = async () => {
  if (token.value) {
    const ret = await _refresh(token.value);
    status.value = ret.data;
  }
};
const login = async (): Promise<{ openid: string }> => {
  return new Promise((resolve, reject) => {
    wx.login({
      success: function (res) {
        if (res.code) {
          wx.request({
            url: "https://w.4mr.cn/v1/we-chat/openid",
            data: {
              code: res.code,
            },
            method: "POST",
            success: function (res) {
              resolve(res.data as { openid: string });
            },
            fail: function (res) {
              console.log("请求失败！" + res.errMsg);
              reject(res.errMsg);
            },
          });
        } else {
          console.log("登录失败！" + res.errMsg);
          reject(res.errMsg);
        }
      },
      fail: function (res) {
        console.log("登录失败！" + res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};
const begin = async () => {
  animationActive.value = true;
  setTimeout(async () => {
    const ret = await ready();
    status.value = ret.data;
    animationActive.value = false;
  }, 800);
};
const stop = async () => {
  animationActive.value = true;
  setTimeout(async () => {
    const ret = await over();
    status.value = ret.data;
    animationActive.value = false;
  }, 800);
};
const over = async (): Promise<ApiResponse> => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/status-over",
      method: "POST",
      data: {
        openid: openid.value,
        token: token.value,
      },
      success: function (res) {
        console.log("openid" + openid.value);
        resolve(res.data as ApiResponse);
      },
      fail: function (res) {
        console.log("请求失败！" + res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};
const linked = async (): Promise<ApiResponse> => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/status-linked",
      method: "POST",
      data: {
        openid: openid.value,
        token: token.value,
      },
      success: function (res) {
        console.log("openid" + openid.value);
        resolve(res.data as ApiResponse);
      },
      fail: function (res) {
        console.log("请求失败！" + res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};
const show = (key: string) => {
  console.error(key); //recode/test123.mp4
  // 跳转到网页端展示视频
  uni.navigateTo({
    url: `/pages/webview/index?key=${encodeURIComponent(key)}`,
    success: () => {
      console.log(`成功跳转到视频页面，key: ${key}`);
    },
    fail: (err) => {
      console.error(`跳转失败: ${JSON.stringify(err)}`);
      uni.showToast({
        title: "页面跳转失败",
        icon: "none",
      });
    },
  });
};
const ready = async (): Promise<ApiResponse> => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/status-ready",
      method: "POST",
      data: {
        openid: openid.value,
        token: token.value,
      },
      success: function (res) {
        console.log("openid" + openid.value);
        resolve(res.data as ApiResponse);
      },
      fail: function (res) {
        console.log("请求失败！" + res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};
const close = () => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/close?openid=" + openid.value,
      method: "DELETE",
      success: function (res) {
        console.log("删除成功！！！" + JSON.stringify(res.data));
        resolve(res.data);
      },
      fail: function (res) {
        console.log("请求失败！" + res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};

interface PageInstance {
  options: {
    q: string;
  };
}

const getToken = () => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1] as unknown as PageInstance;
  const query = currentPage.options;
  const decodedUrl = decodeURIComponent(query.q);
  const result = getQueryString(decodedUrl, "k");
  if (!result) {
    return "test123";
  }
  return result;
};
onLoad(async () => {
  token.value = getToken(); //得到token
  //本页面所有操作都具有token
  try {
    const ret = await login();

    openid.value = ret.openid; //得到openid

    //本页面所有操作都得到openid
  } catch (error) {
    console.error("openid 请求失败！" + error);
    return;
  }
  try {
    if (token.value) {
      const ret = await _refresh(token.value);

      if (!ret.scuess || ret.data.checkin.openid != openid.value) {
        //没有状态，证明没有链接，这里要链接

        const linkedRet = await linked();
        console.log("链接成功！" + JSON.stringify(linkedRet));
        status.value = linkedRet.data;
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
</script>
<template>
  <view class="ar-checkin" :style="{ paddingTop: (safeAreaInsets?.top || 0) + 'px' }">
    <!-- 顶部导航栏 -->
    <view class="header">
      <view class="header-row">
        <view class="logo-container">
          <image class="logo" src="/static/images/ar_logo.png" mode="aspectFit"></image>
        </view>
        <view class="title">不加班AR打卡平台</view>
      </view>
      <view class="slogan">
        <image class="slogan-icon" src="/static/icons/slogan.png" mode="aspectFit"></image>
        <text class="slogan-text">科技赋能生活，记录每一次精彩时刻！</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="loading-container" v-if="loadingState">
      <view class="loading-spinner"></view>
      <view class="loading-text">连接中...</view>
    </view>

    <!-- 主内容区域 -->
    <view class="main-content" v-else>
      <!-- 进度指示器 -->
      <view class="progress-tracker">
        <view class="step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
          <view class="step-circle">1</view>
          <view class="step-label">连接</view>
        </view>
        <view
          class="step-line"
          :class="{ active: currentStep >= 1, completed: currentStep > 1 }"
        ></view>
        <view class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
          <view class="step-circle">2</view>
          <view class="step-label">准备</view>
        </view>
        <view
          class="step-line"
          :class="{ active: currentStep >= 2, completed: currentStep > 2 }"
        ></view>
        <view class="step" :class="{ active: currentStep >= 3, completed: currentStep > 3 }">
          <view class="step-circle">3</view>
          <view class="step-label">完成</view>
        </view>
      </view>

      <!-- 状态卡片 -->
      <view class="status-card" :class="{ 'animation-active': animationActive }">
        <block v-if="status && status.file != null">
          <view class="status-icon success-icon">
            <image src="/static/icons/success.png" mode="aspectFit"></image>
          </view>
          <view class="status-title">录制完成</view>
          <view class="status-description">您的AR打卡视频已成功生成</view>
          <view class="file-info">
            <view class="file-icon">
              <image src="/static/icons/video_icon.png" mode="aspectFit"></image>
            </view>
            <view class="file-name">{{ status.file.key.split("/").pop() }}</view>
          </view>
          <button class="action-button view-button" @click="show(status.file.key)">
            <view class="button-icon"
              ><image src="/static/icons/view_video.png" mode="aspectFit"></image
            ></view>
            <text>查看视频</text>
          </button>
        </block>

        <block v-else-if="status && status.checkin.status == 'linked'">
          <view class="status-icon linked-icon">
            <image src="/static/icons/linked.png" mode="aspectFit"></image>
          </view>
          <view class="status-title">已连接</view>
          <view class="status-description">您的设备已成功连接，准备好开始录制了吗？</view>
          <view class="ar-instruction">
            <view class="instruction-step">
              <view class="instruction-number">1</view>
              <view class="instruction-text">手机对准目标</view>
            </view>
            <view class="instruction-step">
              <view class="instruction-number">2</view>
              <view class="instruction-text">保持稳定录制</view>
            </view>
            <view class="instruction-step">
              <view class="instruction-number">3</view>
              <view class="instruction-text">完成AR打卡</view>
            </view>
          </view>
          <button class="action-button begin-button" @click="begin">
            <view class="button-icon"
              ><image src="/static/icons/start_recording.png" mode="aspectFit"></image
            ></view>
            <text>开始录制</text>
          </button>
        </block>

        <block v-else-if="status && status.checkin.status == 'ready'">
          <view class="status-icon ready-icon">
            <image src="/static/icons/recording.png" mode="aspectFit"></image>
          </view>
          <view class="status-title">录制中</view>
          <view class="status-description">正在进行AR打卡录制，请保持设备稳定...</view>
          <view class="recording-indicator">
            <view class="recording-pulse"></view>
            <view class="recording-time">录制中</view>
          </view>
          <button class="action-button cancel-button" @click="stop">
            <view class="button-icon"
              ><image src="/static/icons/stop_recording.png" mode="aspectFit"></image
            ></view>
            <text>停止录制</text>
          </button>
        </block>

        <block v-else>
          <view class="status-icon waiting-icon">
            <image src="/static/icons/waiting.png" mode="aspectFit"></image>
          </view>
          <view class="status-title">等待连接</view>
          <view class="status-description">正在等待AR设备连接...</view>
          <view class="connection-tips">
            <view class="tip-item">
              <image src="/static/icons/tip.png" mode="aspectFit"></image>
              <text>请确保您的设备已开启AR功能</text>
            </view>
            <view class="tip-item">
              <image src="/static/icons/tip.png" mode="aspectFit"></image>
              <text>保持良好的网络连接</text>
            </view>
          </view>
        </block>
      </view>

      <!-- 开发信息 (可隐藏) -->
      <view class="dev-info">
        <view class="dev-info-toggle" @click="showDevInfo = !showDevInfo">
          <text>{{ showDevInfo ? "隐藏" : "显示" }}开发信息</text>
        </view>
        <view class="dev-info-content" v-if="showDevInfo">
          <view class="dev-info-item">
            <text class="dev-info-label">OpenID:</text>
            <text class="dev-info-value">{{ openid }}</text>
          </view>
          <view class="dev-info-item">
            <text class="dev-info-label">Token:</text>
            <text class="dev-info-value">{{ token }}</text>
          </view>
          <view class="dev-info-item">
            <text class="dev-info-label">状态:</text>
            <text class="dev-info-value">{{ status?.checkin.status }}</text>
          </view>
          <view class="test-progress-btn" @click="testProgressStep">
            <text>测试进度条</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部装饰 -->
    <view class="footer-copyright">
      <text>© 2025 不加班AR平台 版权所有</text>
    </view>
  </view>
</template>

<style lang="scss">
.ar-checkin {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
  padding: 40rpx 30rpx;
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
}

// 顶部导航栏
.header {
  padding-bottom: 30rpx;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  margin-bottom: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  .header-row {
    display: flex;
    align-items: center;
    width: 100%;
    margin-bottom: 4rpx;
  }

  .logo-container {
    width: 80rpx;
    height: 80rpx;
    border-radius: 20rpx;
    overflow: hidden;
    background: #ffffff;
    box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 18rpx;
    .logo {
      width: 80rpx;
      height: 80rpx;
    }
  }

  .title {
    font-size: 36rpx;
    font-weight: 600;
    color: #333;
  }

  .slogan {
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    letter-spacing: 2rpx;
    margin-top: 4rpx;
    margin-bottom: 4rpx;
    text-align: left;
    background: linear-gradient(90deg, #4a90e2 0%, #52c41a 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    .slogan-icon {
      width: 60rpx;
      height: 60rpx;
    }
    .slogan-text {
      margin-left: 10rpx;
      font-size: 28rpx;
      font-weight: 700;
      color: inherit;
      background: none;
      -webkit-text-fill-color: inherit;
    }
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
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.05);
  padding: 40rpx;
  margin-bottom: 40rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 1;

    .step-circle {
      width: 60rpx;
      height: 60rpx;
      border-radius: 50%;
      background: #e0e0e0;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28rpx;
      font-weight: 600;
      margin-bottom: 10rpx;
      transition: all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
    }

    .step-label {
      font-size: 24rpx;
      color: #999;
      transition: all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
    }

    &.active {
      .step-circle {
        background: #52c41a;
        box-shadow: 0 0 10rpx rgba(82, 196, 26, 0.4);
        transform: scale(1.05);
      }
      .step-label {
        color: #52c41a;
        font-weight: 500;
      }
    }

    &.completed {
      .step-circle {
        background: #52c41a;
        box-shadow: 0 0 10rpx rgba(82, 196, 26, 0.4);
      }
    }
  }

  .step-line {
    height: 4rpx;
    flex: 1;
    background: #e0e0e0;
    margin: 0 10rpx;
    position: relative;
    top: -24rpx;
    transition: all 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55);

    &.active {
      background: #52c41a;
    }

    &.completed {
      background: #52c41a;
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
      image {
        width: 100rpx;
        height: 100rpx;
      }
    }

    &.ready-icon {
      background: rgba(250, 173, 20, 0.1);
      animation: pulse 2s infinite;
    }

    &.success-icon {
      background: rgba(82, 196, 26, 0.1);
    }

    &.waiting-icon {
      background: rgba(170, 170, 170, 0.1);
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

    .tip-item {
      display: flex;
      align-items: center;
      margin-bottom: 20rpx;

      image {
        width: 40rpx;
        height: 40rpx;
        margin-right: 16rpx;
      }

      text {
        font-size: 26rpx;
        color: #666;
      }
    }
  }

  // 按钮样式
  .action-button {
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5rpx 30rpx;
    border-radius: 20rpx;
    font-size: 30rpx;
    font-weight: 500;
    color: #fff;
    box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;

    .button-icon {
      width: 80rpx;
      height: 80rpx;
      margin-right: 10rpx;

      image {
        width: 100%;
        height: 100%;
      }
    }

    &.begin-button {
      background: #4a90e2;
      &:active {
        background: #3a80d2;
        transform: translateY(2rpx);
      }
    }

    &.cancel-button {
      background: #ff4d4f;
      &:active {
        background: #ff3a3d;
        transform: translateY(2rpx);
      }
    }

    &.view-button {
      background: #52c41a;
      &:active {
        background: #49ad17;
        transform: translateY(2rpx);
      }
    }
  }
}

// 开发信息
.dev-info {
  margin-top: auto;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding-top: 20rpx;

  .dev-info-toggle {
    text-align: center;
    font-size: 24rpx;
    color: #999;
    margin-bottom: 10rpx;
  }

  .dev-info-content {
    background: rgba(255, 255, 255, 0.8);
    border-radius: 16rpx;
    padding: 20rpx;

    .dev-info-item {
      display: flex;
      margin-bottom: 10rpx;
      font-size: 24rpx;

      .dev-info-label {
        color: #999;
        width: 120rpx;
        flex-shrink: 0;
      }

      .dev-info-value {
        color: #666;
        word-break: break-all;
      }
    }

    .test-progress-btn {
      margin-top: 20rpx;
      background: #4a90e2;
      color: #fff;
      text-align: center;
      padding: 10rpx 0;
      border-radius: 8rpx;
      font-size: 24rpx;
      transition: all 0.3s ease;

      &:active {
        background: #3a80d2;
        transform: translateY(2rpx);
      }
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
</style>
