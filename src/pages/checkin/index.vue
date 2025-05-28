<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getObjectUrl } from "@/services/cloud";
import {
  getCheckinStatus,
  wxLogin,
  setCheckinReady,
  setCheckinOver,
  setCheckinLinked,
  deleteCheckin,
  getQueryString,
  type CheckinInfo,
  type FileInfo,
  type StatusData,
  type ApiResponse,
} from "@/services/checkin";
import { wxPay, generateOrderNo } from "@/services/pay"; // 导入支付相关函数

const OPENID_STORAGE_KEY = "AR_CHECKIN_OPENID"; // 添加一个常量用于存储键名
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
const previewImageLoading = ref(true);
const animationActive = ref(false);
const showDevInfo = ref(false);
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

// 从本地存储获取openid
const getOpenidFromStorage = (): string | null => {
  try {
    const storedOpenid = uni.getStorageSync(OPENID_STORAGE_KEY);
    return storedOpenid || null;
  } catch (e) {
    console.error("从本地存储获取openid失败:", e);
    return null;
  }
};

// 测试进度
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
      }, 5000);
    }, 5000);
  }, 5000);
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

// 停止录制
const stop = async () => {
  animationActive.value = true;
  setTimeout(async () => {
    if (openid.value && token.value) {
      const ret = await setCheckinOver(openid.value, token.value);
      status.value = ret.data;
    }
    animationActive.value = false;
  }, 800);
};

// 获取签名后的URL
const getSignedUrl = async (key: string, isPreview: boolean = false) => {
  try {
    const url = await getObjectUrl(key);
    if (isPreview) {
      // 预览图添加截图参数
      previewImageUrl.value = `${url}&ci-process=snapshot&time=0.01`;
    } else {
      videoUrl.value = url;
    }
    return url;
  } catch (error) {
    console.error("获取签名URL失败:", error);
    // 失败时使用默认无签名URL
    const defaultUrl = `https://game-1251022382.cos.ap-nanjing.myqcloud.com/${key}`;
    if (isPreview) {
      previewImageUrl.value = `${defaultUrl}?ci-process=snapshot&time=0.01`;
    } else {
      videoUrl.value = defaultUrl;
    }
    return defaultUrl;
  }
};

// 监听status.file变化，更新签名URL
watch(
  () => status.value?.file?.key,
  async (newKey) => {
    if (newKey) {
      previewImageLoading.value = true;
      await getSignedUrl(newKey, true); // 获取预览图URL
      await getSignedUrl(newKey); // 获取视频URL
    }
  },
);

const show = (key: string) => {
  console.error(key); //recode/test123.mp4
  // 跳转到网页端展示视频，使用已获取的签名URL
  uni.navigateTo({
    url: `/pages/webview/index?key=${encodeURIComponent(key)}&url=${encodeURIComponent(
      videoUrl.value,
    )}`,
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

const downloadVideo = async (key: string) => {
  // 先检查用户是否登录
  if (!openid.value) {
    uni.showToast({
      title: "请先登录",
      icon: "none",
    });
    return;
  }

  try {
    // 先检查相册权限
    const authSetting = await uni.getSetting();
    if (!authSetting.authSetting["scope.writePhotosAlbum"]) {
      // 没有权限，请求授权
      uni.showLoading({
        title: "正在请求授权...",
        mask: true,
      });

      try {
        await new Promise<void>((resolve, reject) => {
          uni.authorize({
            scope: "scope.writePhotosAlbum",
            success: () => {
              console.log("相册授权成功");
              resolve();
            },
            fail: (err) => {
              console.error("相册授权失败:", err);
              uni.hideLoading();
              uni.showModal({
                title: "需要授权",
                content: "保存视频需要访问您的相册权限",
                confirmText: "前往设置",
                cancelText: "取消",
                success: (res) => {
                  if (res.confirm) {
                    uni.openSetting({
                      success: (settingRes) => {
                        if (settingRes.authSetting["scope.writePhotosAlbum"]) {
                          resolve();
                        } else {
                          uni.showToast({
                            title: "未获得权限，无法保存",
                            icon: "none",
                          });
                          reject(new Error("用户拒绝授权"));
                        }
                      },
                    });
                  } else {
                    uni.showToast({
                      title: "未获得权限，无法保存",
                      icon: "none",
                    });
                    reject(new Error("用户取消授权"));
                  }
                },
              });
            },
          });
        });
        uni.hideLoading();
      } catch (error) {
        console.error("相册授权过程中出错:", error);
        return; // 如果授权失败，直接返回，不进行后续操作
      }
    }

    // 授权成功后，弹窗确认支付
    const confirmRes = await new Promise<{ confirm: boolean }>((resolve) => {
      uni.showModal({
        title: "下载提示",
        content: "下载视频到本地需支付1分钱，确认继续吗？",
        confirmText: "确认支付",
        cancelText: "取消",
        success: (res) => {
          resolve(res);
        },
      });
    });

    if (!confirmRes.confirm) {
      return; // 用户取消支付
    }

    // 创建支付订单号
    const orderNo = generateOrderNo();

    // 显示支付中提示
    uni.showLoading({
      title: "正在发起支付...",
      mask: true,
    });

    // 调用微信支付接口
    const payResult = await wxPay({
      openid: openid.value,
      out_trade_no: orderNo,
      amount: 1, // 支付金额1分钱
      description: "AR打卡视频下载",
    });

    uni.hideLoading();

    if (!payResult) {
      uni.showToast({
        title: "支付已取消",
        icon: "none",
      });
      return;
    }

    // 确保我们有签名后的URL
    let downloadUrl = videoUrl.value;
    if (!downloadUrl) {
      downloadUrl = await getSignedUrl(key);
    }

    uni.showLoading({
      title: "正在下载视频...",
      mask: true,
    });

    // 下载视频文件
    uni.downloadFile({
      url: downloadUrl,
      success: (res) => {
        uni.hideLoading();

        if (res.statusCode === 200) {
          // 保存视频到相册
          uni.saveVideoToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              uni.showToast({
                title: "视频已保存到相册",
                icon: "success",
                duration: 2000,
              });
            },
            fail: (err) => {
              console.error("保存到相册失败：", err);
              uni.showModal({
                title: "保存失败",
                content: "无法保存视频到相册，请检查相册权限设置",
                showCancel: false,
              });
            },
          });
        } else {
          uni.showToast({
            title: "下载失败",
            icon: "none",
          });
        }
      },
      fail: (err) => {
        uni.hideLoading();
        console.error("下载失败：", err);
        uni.showToast({
          title: "网络异常，下载失败",
          icon: "none",
        });
      },
    });
  } catch (error) {
    console.error("下载过程中出错:", error);
    uni.hideLoading();
    uni.showToast({
      title: "下载视频失败",
      icon: "none",
    });
  }
};

const getToken = () => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1] as unknown as { options: { q: string } };
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

      if (!ret.scuess || ret.data.checkin.openid != openid.value) {
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
     我们会收集您的设备信息、摄像头权限和必要的位置信息，用于提供AR打卡视频录制服务。在您使用下载功能时，我们需要获取您的相册访问权限。

  2. 视频存储与使用
     您在平台上录制的AR打卡视频将临时存储在我们的服务器上，方便您查看和下载。您可以通过支付少量费用下载这些视频到本地设备。

  3. 付费内容
     平台提供的视频下载功能需要支付少量费用(¥0.01)。我们使用微信支付进行安全交易，不会存储您的银行卡等支付敏感信息。支付成功后，您可以将视频永久保存到您的设备中。

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
     本声明的最终解释权归不加班AR平台所有。使用本平台即表示您已阅读并同意本免责声明的全部内容。
  `;
  showDisclaimerModal.value = true;
};

// 关闭协议详情弹窗
const closeAgreementModal = () => {
  showPrivacyModal.value = false;
  showDisclaimerModal.value = false;
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
          <view class="step-circle">
            <image
              v-if="currentStep > 0"
              class="step-success-icon"
              src="/static/icons/process_success.png"
              mode="aspectFit"
            ></image>
            <text v-else>1</text>
          </view>
          <view class="step-label">连接</view>
        </view>
        <view
          class="step-line"
          :class="{ active: currentStep >= 1, completed: currentStep > 1 }"
        ></view>
        <view class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
          <view class="step-circle">
            <image
              v-if="currentStep > 1"
              class="step-success-icon"
              src="/static/icons/process_success.png"
              mode="aspectFit"
            ></image>
            <text v-else>2</text>
          </view>
          <view class="step-label">准备</view>
        </view>
        <view
          class="step-line"
          :class="{ active: currentStep >= 2, completed: currentStep > 2 }"
        ></view>
        <view class="step" :class="{ active: currentStep >= 3, completed: currentStep > 3 }">
          <view class="step-circle">
            <image
              v-if="currentStep > 2"
              class="step-success-icon"
              src="/static/icons/process_success.png"
              mode="aspectFit"
            ></image>
            <text v-else>3</text>
          </view>
          <view class="step-label">完成</view>
        </view>
      </view>

      <!-- 状态卡片 -->
      <view class="status-card" :class="{ 'animation-active': animationActive }">
        <block v-if="status && status.file != null">
          <view class="status-icon success-icon">
            <image src="/static/icons/success.png" mode="aspectFit"></image>
          </view>
          <view class="status-title">🎉 录制完成！</view>
          <view class="status-description"
            >恭喜您！AR打卡视频已成功生成，快来查看您的精彩时刻吧！</view
          >
          <view class="file-info">
            <view class="file-icon">
              <image src="/static/icons/video_icon.png" mode="aspectFit"></image>
            </view>
            <view class="file-name">{{ status.file.key.split("/").pop() }}</view>
          </view>

          <!-- 视频第一帧预览 -->
          <view class="video-preview">
            <view class="preview-title">视频预览</view>
            <view class="preview-container">
              <!-- 加载动画 -->
              <view class="preview-loading" v-if="previewImageLoading">
                <view class="loading-spinner"></view>
                <text class="loading-text">加载预览中...</text>
              </view>
              <!-- 预览图 - 使用签名后的URL -->
              <image
                class="preview-image"
                :class="{ 'image-loaded': !previewImageLoading }"
                :src="previewImageUrl"
                mode="aspectFill"
                @click="show(status.file.key)"
                @load="previewImageLoading = false"
                @error="previewImageLoading = false"
              ></image>
            </view>
          </view>

          <!-- 按钮组 -->
          <view class="action-buttons">
            <!-- 查看视频按钮 -->
            <button class="action-button view-button" @click="show(status.file.key)">
              <view class="button-icon"
                ><image src="/static/icons/view_video.png" mode="aspectFit"></image
              ></view>
              <text>查看视频</text>
            </button>

            <!-- 下载视频按钮 -->
            <button class="action-button download-button" @click="downloadVideo(status.file.key)">
              <view class="button-icon"
                ><image src="/static/icons/download.png" mode="aspectFit"></image
              ></view>
              <text>付费下载(¥0.01)</text>
            </button>
          </view>

          <!-- 支付说明 -->
          <view class="payment-tips">
            <image src="/static/icons/tip.png" mode="aspectFit" class="tip-icon"></image>
            <text class="tip-text">下载视频需支付¥0.01，支付成功后即可永久保存到相册</text>
          </view>
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

          <view class="privacy-links">
            <text class="link-text">点击开始录制表示您已同意</text>
            <text class="link" @click="showPrivacyDetail">《不加班AR平台隐私协议》</text>
            <text class="link-separator">和</text>
            <text class="link" @click="showDisclaimerDetail">《免责声明》</text>
          </view>

          <button class="action-button begin-button full-width" @click="begin">
            <view class="button-icon"
              ><image src="/static/icons/start_recording.png" mode="aspectFit"></image
            ></view>
            <text>同意并开始录制</text>
          </button>
        </block>

        <block v-else-if="status && status.checkin.status == 'ready'">
          <view class="status-icon ready-icon">
            <image src="/static/icons/recording.png" mode="aspectFit"></image>
          </view>
          <view class="status-title">录制进行中</view>
          <view class="status-description">正在进行AR打卡录制，请保持设备稳定...</view>
          <view class="recording-indicator">
            <view class="recording-pulse"></view>
            <view class="recording-ring"></view>
            <view class="recording-time">● REC</view>
          </view>
          <button class="action-button cancel-button full-width" @click="stop">
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
              <text>保持良好的网络连接状态</text>
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

    &.view-button {
      background: #52c41a;
      &:active {
        background: #49ad17;
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
