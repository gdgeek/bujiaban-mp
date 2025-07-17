<template>
  <view class="payment-page" :style="{ paddingBottom: (safeAreaInsets?.bottom || 0) + 'px' }">
    <!-- 隐藏的视频元素，用于获取视频时长 -->
    <video
      id="videoPlayer"
      :src="tempVideoUrl"
      style="width: 0; height: 0; position: absolute; opacity: 0"
      @loadedmetadata="onVideoMetadataLoaded"
      @error="onVideoError"
    ></video>

    <view class="content-wrapper">
      <view class="payment-card">
        <view class="payment-header">
          <!-- <text class="payment-title">拍摄服务</text> -->
          <text class="payment-title">{{
            alreadyPurchased || paymentInfo.price === 0 ? "文件下载" : "文件购买"
          }}</text>
        </view>

        <view class="payment-info">
          <view class="info-item">
            <text class="label">文件名称:</text>
            <text class="value">{{ paymentInfo.title || "视频文件" }}</text>
          </view>
          <view class="info-item">
            <text class="label">服务费用:</text>
            <text class="value purchased" v-if="alreadyPurchased">已购买</text>
            <text class="value purchased" v-else-if="paymentInfo.price === 0">免费</text>
            <text class="value" v-else>¥{{ ((paymentInfo.price || 0) / 100).toFixed(2) }}</text>
          </view>
        </view>

        <!-- 视频截帧图片选择 -->
        <view class="frame-select-section">
          <view class="frame-select-header">
            <text class="frame-title">视频截帧</text>
            <view class="select-actions">
              <text class="select-all" :class="{ active: isAllSelected }" @tap="toggleSelectAll">{{
                isAllSelected ? "取消全选" : "全选"
              }}</text>
            </view>
          </view>

          <view class="frames-container">
            <view
              v-for="(frame, index) in frameImages"
              :key="index"
              class="frame-item"
              :class="{ selected: frame.selected }"
              @tap="toggleSelectFrame(index)"
            >
              <view class="frame-image-container">
                <view class="frame-loading" v-if="frame.loading">
                  <view class="loading-spinner"></view>
                </view>
                <image
                  class="frame-image"
                  :src="frame.url"
                  mode="widthFix"
                  @load="frame.loading = false"
                  @error="onFrameError(index)"
                ></image>
                <view class="selection-indicator" :class="{ selected: frame.selected }">
                  <text v-if="frame.selected">{{ frame.selectionIndex }}</text>
                </view>
              </view>
              <text class="frame-time">{{ frame.timeLabel }}</text>
            </view>
          </view>
        </view>

        <!-- <button class="pay-button" @click="handlePay" :loading="loading">支付服务费</button> -->
        <button
          class="pay-button"
          @click="handlePay"
          :loading="loading"
          :class="{ 'already-purchased': alreadyPurchased || paymentInfo.price === 0 }"
        >
          {{ alreadyPurchased ? "直接下载" : paymentInfo.price === 0 ? "免费下载" : "支付服务费"
          }}{{ getSelectedFramesCount() > 0 ? `(含${getSelectedFramesCount()}张截图)` : "" }}
        </button>

        <button class="cancel-button" @click="handleCancel">取消</button>
      </view>
    </view>

    <view class="flex-spacer"></view>
    <FooterCopyright />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import FooterCopyright from "@/components/FooterCopyright.vue";
import {
  getSignedVideoUrl,
  getOpenidFromStorage,
  checkAlbumPermission,
  downloadAndSaveVideo,
  handlePayment,
} from "@/utils/video";

// 获取安全区域信息
const { safeAreaInsets } = uni.getWindowInfo();

// 支付相关状态
const paymentInfo = ref({
  videoId: 0,
  videoKey: "",
  price: 0,
  title: "",
  action: "",
  duration: 0, // 添加视频时长属性
});
const loading = ref(false);
// 视频签名URL
const videoUrl = ref<string>("");
// 是否已经购买过该文件
const alreadyPurchased = ref<boolean>(false);
const PURCHASED_FILES_STORAGE_KEY = "AR_PURCHASED_FILES";

// 视频截帧相关
interface FrameImage {
  url: string;
  time: number; // 时间点（秒）
  timeLabel: string; // 显示的时间标签
  selected: boolean;
  loading: boolean;
  selectionIndex: number; // 选中顺序编号
}

const frameImages = ref<FrameImage[]>([]);
const isAllSelected = computed(() => {
  return frameImages.value.length > 0 && frameImages.value.every((frame) => frame.selected);
});

// 获取下一个可用的编号
const getNextSelectionIndex = () => {
  let maxIndex = 0;
  frameImages.value.forEach((frame) => {
    if (frame.selected && frame.selectionIndex > maxIndex) {
      maxIndex = frame.selectionIndex;
    }
  });
  return maxIndex + 1;
};

// 重新排序编号
const reorderSelectionIndexes = () => {
  // 获取所有选中的帧
  const selectedFrames = frameImages.value.filter((frame) => frame.selected);
  // 按现有编号排序
  selectedFrames.sort((a, b) => a.selectionIndex - b.selectionIndex);
  // 重新分配编号
  selectedFrames.forEach((frame, index) => {
    frame.selectionIndex = index + 1;
  });
};

// 获取选中的截帧数量
const getSelectedFramesCount = () => {
  return frameImages.value.filter((frame) => frame.selected).length;
};

// 切换全选/取消全选
const toggleSelectAll = () => {
  const newSelectedState = !isAllSelected.value;
  if (newSelectedState) {
    // 全选时按顺序分配编号
    frameImages.value.forEach((frame, index) => {
      frame.selected = true;
      frame.selectionIndex = index + 1;
    });
  } else {
    // 取消全选时重置编号
    frameImages.value.forEach((frame) => {
      frame.selected = false;
      frame.selectionIndex = 0;
    });
  }
};

// 切换单个截帧的选中状态
const toggleSelectFrame = (index: number) => {
  const frame = frameImages.value[index];

  if (!frame.selected) {
    // 选中时分配下一个编号
    frame.selected = true;
    frame.selectionIndex = getNextSelectionIndex();
  } else {
    // 取消选中时重置编号
    frame.selected = false;
    frame.selectionIndex = 0;
    // 重新排序其他已选中的帧
    reorderSelectionIndexes();
  }
};

// 处理截帧图片加载错误
const onFrameError = (index: number) => {
  console.log("截帧图片加载失败:", index);
  frameImages.value[index].loading = false;
  // 错误占位图
  frameImages.value[index].url = "/static/images/video_placeholder.png";
};

// 格式化时间为分:秒格式
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

// 检查文件是否已购买
const checkIfAlreadyPurchased = (videoKey: string): boolean => {
  try {
    const purchasedFiles = uni.getStorageSync(PURCHASED_FILES_STORAGE_KEY) || [];
    return purchasedFiles.includes(videoKey);
  } catch (error) {
    console.error("检查已购买文件出错:", error);
    return false;
  }
};

// 记录已购买的文件
const savePurchasedFile = (videoKey: string): void => {
  try {
    let purchasedFiles = uni.getStorageSync(PURCHASED_FILES_STORAGE_KEY) || [];
    if (!Array.isArray(purchasedFiles)) {
      purchasedFiles = [];
    }

    if (!purchasedFiles.includes(videoKey)) {
      purchasedFiles.push(videoKey);
      uni.setStorageSync(PURCHASED_FILES_STORAGE_KEY, purchasedFiles);
    }
  } catch (error) {
    console.error("保存已购买文件记录出错:", error);
  }
};

// 加载视频URL和时长相关
const tempVideoUrl = ref<string>("");
const videoDurationResolved = ref<boolean>(false);
const videoLoadTimeout = ref<number | null>(null);
const videoLoadResolve = ref<((duration: number | null) => void) | null>(null);

// 获取视频的不同时间点截帧
const loadVideoFrames = async () => {
  if (!paymentInfo.value.videoKey) return;

  try {
    // 获取视频URL
    const videoUrl = await getSignedVideoUrl(paymentInfo.value.videoKey);

    // 动态获取视频时长
    const duration = await getVideoDuration(videoUrl);

    if (!duration) {
      uni.showToast({
        title: "无法获取视频时长",
        icon: "error",
      });
      return;
    }

    generateFramePoints(duration);
  } catch (error) {
    console.error("加载视频帧出错:", error);
    uni.showToast({
      title: "获取视频信息失败",
      icon: "error",
    });
  }
};

// 生成帧点并获取截帧
const generateFramePoints = async (duration: number) => {
  const framePoints = [
    duration * 0.1, // 10% 处的截帧
    duration * 0.3, // 30% 处的截帧
    duration * 0.6, // 60% 处的截帧
    duration * 0.9, // 90% 处的截帧
  ];

  const frames: FrameImage[] = [];
  for (const time of framePoints) {
    try {
      // 获取特定时间点的视频截帧
      const url = await getSignedVideoUrl(paymentInfo.value.videoKey, true, time);
      frames.push({
        url,
        time,
        timeLabel: formatTime(time),
        selected: false,
        loading: true,
        selectionIndex: 0,
      });
    } catch (error) {
      console.error(`获取时间 ${time} 的截帧失败:`, error);
    }
  }
  frameImages.value = frames;
};

// 视频元数据加载完成事件
const onVideoMetadataLoaded = (event: any) => {
  clearVideoTimeout();
  const videoElement = event.target;
  if (videoElement && videoElement.duration && !videoDurationResolved.value) {
    console.log("视频元数据加载完成，时长:", videoElement.duration);
    videoDurationResolved.value = true;

    if (videoLoadResolve.value) {
      videoLoadResolve.value(videoElement.duration);
      videoLoadResolve.value = null;
    }

    tempVideoUrl.value = ""; // 重置视频URL
  }
};

// 视频加载错误事件
const onVideoError = (error: any) => {
  console.error("视频加载错误:", error);
  clearVideoTimeout();

  if (videoLoadResolve.value && !videoDurationResolved.value) {
    videoDurationResolved.value = true;
    videoLoadResolve.value(null);
    videoLoadResolve.value = null;
  }

  tempVideoUrl.value = "";
};

// 清除超时定时器
const clearVideoTimeout = () => {
  if (videoLoadTimeout.value) {
    clearTimeout(videoLoadTimeout.value);
    videoLoadTimeout.value = null;
  }
};

// 获取视频时长
const getVideoDuration = (url: string): Promise<number | null> => {
  return new Promise((resolve) => {
    // 重置状态
    videoDurationResolved.value = false;
    videoLoadResolve.value = resolve;
    tempVideoUrl.value = url;

    // 设置超时处理
    videoLoadTimeout.value = setTimeout(() => {
      if (!videoDurationResolved.value) {
        console.log("获取视频时长超时");
        videoDurationResolved.value = true;
        if (videoLoadResolve.value) {
          videoLoadResolve.value(null);
          videoLoadResolve.value = null;
        }
        tempVideoUrl.value = "";
      }
    }, 3000);
  });
};

// 下载并保存图片到相册
const downloadAndSaveImage = async (url: string): Promise<boolean> => {
  try {
    // 下载图片文件
    const downloadRes = await new Promise<{
      statusCode: number;
      tempFilePath: string;
    }>((resolve, reject) => {
      uni.downloadFile({
        url,
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      });
    });

    if (downloadRes.statusCode === 200) {
      // 保存图片到相册
      await new Promise<void>((resolve, reject) => {
        uni.saveImageToPhotosAlbum({
          filePath: downloadRes.tempFilePath,
          success: () => {
            resolve();
          },
          fail: (err) => {
            console.error("保存图片到相册失败：", err);
            reject(err);
          },
        });
      });
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("图片处理过程中出错:", error);
    return false;
  }
};

// 接收页面参数
onLoad((query) => {
  try {
    if (query && query.params) {
      const params = JSON.parse(decodeURIComponent(query.params));
      console.log("接收到参数:", params);
      paymentInfo.value = { ...paymentInfo.value, ...params };

      // 检查是否已经购买过该文件
      if (paymentInfo.value.videoKey) {
        alreadyPurchased.value = checkIfAlreadyPurchased(paymentInfo.value.videoKey);
      }

      // 加载视频截帧
      loadVideoFrames();
    }
  } catch (error) {
    console.error("解析参数错误:", error);
    uni.showToast({
      title: "参数错误",
      icon: "error",
    });
  }
});

// 处理下载
const handlePay = async () => {
  // 获取openid
  const openid = getOpenidFromStorage();
  if (!openid) {
    uni.showToast({
      title: "请先登录",
      icon: "none",
    });

    // 跳转到登录或打卡页面获取openid
    setTimeout(() => {
      uni.redirectTo({
        url: "/pages/checkin/index",
      });
    }, 1500);
    return;
  }

  try {
    loading.value = true;

    // 先检查相册权限
    const hasPermission = await checkAlbumPermission();
    if (!hasPermission) {
      loading.value = false;
      return;
    }

    // 检查是否已经购买过该文件或价格为0，如果是则跳过支付流程
    let paySuccess = alreadyPurchased.value || paymentInfo.value.price === 0;

    if (!paySuccess) {
      paySuccess = await handlePayment({
        openid,
        amount: paymentInfo.value.price || 0,
        description: `AR打卡服务:${paymentInfo.value.title}`,
      });
    }

    // 支付成功或价格为0，记录为已购买
    if (paySuccess && paymentInfo.value.videoKey) {
      savePurchasedFile(paymentInfo.value.videoKey);
    }

    if (paySuccess) {
      if (!alreadyPurchased.value) {
        uni.showToast({
          title: paymentInfo.value.price === 0 ? "开始处理下载" : "支付成功，开始处理",
          icon: "success",
        });
      }

      uni.showToast({
        title: "准备下载文件",
        icon: "loading",
      });

      if (paymentInfo.value.videoKey) {
        // 获取签名URL
        const signedUrl = await getSignedVideoUrl(paymentInfo.value.videoKey);

        // 下载并保存视频
        const downloadSuccess = await downloadAndSaveVideo(signedUrl);

        // 下载选中的截帧图片
        const selectedFrames = frameImages.value.filter((frame) => frame.selected);
        let imageSuccessCount = 0;

        if (selectedFrames.length > 0) {
          uni.showLoading({
            title: "正在保存截图...",
            mask: true,
          });

          // 依次下载选中的截帧图片
          for (const frame of selectedFrames) {
            const success = await downloadAndSaveImage(frame.url);
            if (success) imageSuccessCount++;
          }

          uni.hideLoading();
        }

        if (downloadSuccess) {
          setTimeout(() => {
            const successMessage =
              selectedFrames.length > 0
                ? `文件已成功下载并保存到相册，${imageSuccessCount}张截图已保存`
                : "文件已成功下载并保存到相册";

            uni.showModal({
              title: "下载完成",
              content: successMessage,
              showCancel: false,
              success: () => {
                uni.navigateBack();
              },
            });
          }, 1000);
        }
      } else {
        uni.showToast({
          title: "文件信息不完整",
          icon: "error",
        });
      }
    } else {
      uni.showToast({
        title: "支付已取消",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("下载过程中出错:", error);
    uni.hideLoading();
    uni.showToast({
      title: "操作失败",
      icon: "error",
    });
  } finally {
    loading.value = false;
  }
};

// 取消下载
const handleCancel = () => {
  uni.navigateBack();
};
</script>

<style lang="scss">
.payment-page {
  padding: 30rpx;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  .content-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .flex-spacer {
    flex-grow: 1;
  }

  .payment-card {
    background: #fff;
    border-radius: 20rpx;
    padding: 50rpx 30rpx;
    box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.08);
    width: 100%;
    max-width: 750rpx;
    margin-bottom: 20rpx;

    .payment-header {
      text-align: center;
      margin-bottom: 60rpx;
      position: relative;
      padding-bottom: 20rpx;

      &:after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 80rpx;
        height: 4rpx;
        background: #4a90e2;
        border-radius: 2rpx;
      }

      .payment-title {
        font-size: 40rpx;
        font-weight: 600;
        color: #333;
      }
    }

    .payment-info {
      margin-bottom: 30rpx;
      background: #f9fafc;
      border-radius: 16rpx;
      padding: 20rpx 30rpx;

      .info-item {
        display: flex;
        padding: 24rpx 0;
        border-bottom: 1px solid #eef2f6;
        align-items: center;

        &:last-child {
          border-bottom: none;
        }

        .label {
          color: #666;
          width: 180rpx;
          font-size: 28rpx;
        }

        .value {
          color: #333;
          flex: 1;
          font-size: 30rpx;
          font-weight: 500;
          white-space: nowrap; // 不换行
          overflow: hidden; // 超出隐藏
          text-overflow: ellipsis; // 超出显示省略号

          &.purchased {
            color: #52c41a; // 已购买状态文本颜色
            font-weight: bold;
          }
        }
      }
    }

    // 视频截帧选择部分
    .frame-select-section {
      margin-bottom: 40rpx;

      .frame-select-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20rpx;

        .frame-title {
          font-size: 28rpx;
          font-weight: 500;
          color: #333;
        }

        .select-actions {
          .select-all {
            font-size: 24rpx;
            color: #1890ff;
            padding: 8rpx 16rpx;

            &.active {
              color: #ff4d4f;
            }
          }
        }
      }

      .frames-container {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;

        .frame-item {
          width: 48%;
          /* 设置为小于50%的值，确保一行能放下两个 */
          margin-bottom: 16rpx;
          border-radius: 12rpx;
          overflow: hidden;
          position: relative;

          &.selected {
            .frame-image-container {
              border: 2px solid #1890ff;
            }
          }

          .frame-image-container {
            position: relative;
            border-radius: 12rpx;
            border: 2px solid transparent;
            overflow: hidden;

            .frame-loading {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(245, 247, 250, 0.8);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 2;

              .loading-spinner {
                width: 40rpx;
                height: 40rpx;
                border: 3rpx solid rgba(24, 144, 255, 0.1);
                border-radius: 50%;
                border-top-color: #1890ff;
                animation: spin 0.8s linear infinite;
              }
            }

            .frame-image {
              width: 100%;
              display: block;
            }

            // 修改选择指示器样式
            .selection-indicator {
              position: absolute;
              top: 8rpx;
              right: 8rpx;
              width: 40rpx;
              height: 40rpx;
              border-radius: 50%;
              border: 2px solid #fff;
              background: rgba(255, 255, 255, 0.8);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.15);
              z-index: 4;
              box-sizing: border-box;

              // 选中状态样式
              &.selected {
                width: 40rpx;
                height: 40rpx;
                background: #1890ff;
                color: #fff;
                font-size: 24rpx;
                font-weight: bold;
                line-height: 40rpx;
                text-align: center;
                border: none; // 移除边框
              }
            }
          }

          .frame-time {
            display: block;
            text-align: center;
            font-size: 24rpx;
            color: #666;
            margin-top: 8rpx;
          }
        }
      }
    }

    .pay-button {
      background: #1890ff;
      color: #fff;
      margin-bottom: 30rpx;
      border-radius: 10px;
      height: 90rpx;
      line-height: 90rpx;
      font-size: 32rpx;
      font-weight: 500;
      letter-spacing: 2rpx;
      box-shadow: 0 8rpx 16rpx rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;

      &:active {
        background: #177ddc;
        transform: translateY(2rpx);
        box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.15);
      }

      &.already-purchased {
        background: #52c41a; // 已购买状态下按钮为绿色

        &:active {
          background: #49ad18;
        }
      }
    }

    .cancel-button {
      background: #f5f7fa;
      color: #666;
      border-radius: 10px;
      height: 90rpx;
      line-height: 90rpx;
      font-size: 32rpx;
      border: 1px solid #e0e5ec;
      transition: all 0.3s ease;

      &:active {
        background: #eef1f6;
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
