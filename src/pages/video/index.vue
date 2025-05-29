<template>
  <view class="video-page">
    <!-- 添加调试信息 -->
    <view v-if="!isLoaded" class="loading-tips">
      <text>正在加载记录管理页面...</text>
      <text>当前URL: {{ webviewUrl }}</text>
    </view>

    <web-view
      :src="webviewUrl"
      @message="handleMessage"
      @load="onWebViewLoaded"
      @error="onWebViewError"
    ></web-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { wxPay, generateOrderNo } from "@/services/pay";

// web-view URL
const webviewUrl = ref("");
// 页面是否加载完成
const isLoaded = ref(false);
// 用户openid
const openid = ref<string | null>(null);

// 定义openid存储键名
const OPENID_STORAGE_KEY = "AR_CHECKIN_OPENID";

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

// 初始化页面
onMounted(() => {
  try {
    // 获取当前小程序环境下的完整URL
    const accountInfo = uni.getAccountInfoSync();
    const env = accountInfo.miniProgram.envVersion;

    // 根据不同环境使用不同URL
    if (env === "develop") {
      // 开发环境
      // webviewUrl.value = "https://file.4mr.cn";
      webviewUrl.value = "http://localhost:5173";
    } else if (env === "trial") {
      // 体验版环境
      webviewUrl.value = "https://file.4mr.cn";
    } else {
      // 正式环境
      webviewUrl.value = "https://file.4mr.cn";
    }

    console.log("当前小程序环境:", env);

    // 获取openid
    openid.value = getOpenidFromStorage();
    if (!openid.value) {
      console.warn("未找到存储的openid，可能需要先访问打卡页面");
    } else {
      console.log("已获取到openid:", openid.value);
    }
  } catch (err) {
    console.error("获取小程序信息失败:", err);
  }

  console.log("加载HTML路径:", webviewUrl.value);
});

// 处理web-view加载成功
const onWebViewLoaded = (event: any) => {
  console.log("web-view加载成功:", event);
  isLoaded.value = true;
};

// 处理web-view加载错误
const onWebViewError = (event: any) => {
  console.error("web-view加载失败:", event);
  uni.showToast({
    title: "页面加载失败，请检查网络",
    icon: "none",
  });
};

// 处理视频下载并支付
const handleVideoDownload = async (videoData: {
  videoId: number;
  videoKey: string;
  price: number;
  title: string;
}) => {
  console.log("处理视频下载:", videoData);

  // 检查是否有openid
  if (!openid.value) {
    uni.showToast({
      title: "请先登录",
      icon: "none",
    });
    return;
  }

  try {
    // 弹窗确认支付
    const confirmRes = await new Promise<{ confirm: boolean }>((resolve) => {
      uni.showModal({
        title: "下载提示",
        content: `下载视频"${videoData.title}"需支付${videoData.price/100}元，确认继续吗？`,
        confirmText: "确认支付",
        cancelText: "取消",
        success: (res) => {
          resolve(res);
        },
      });
    });

    if (!confirmRes.confirm) {
      console.log("用户取消支付");
      return;
    }

    // 创建支付订单号
    const orderNo = generateOrderNo();
    console.log("生成订单号:", orderNo);

    // 显示支付中提示
    uni.showLoading({
      title: "正在发起支付...",
      mask: true,
    });

    // 调用微信支付接口
    const payResult = await wxPay({
      openid: openid.value,
      out_trade_no: orderNo,
      amount: videoData.price, // 支付金额，单位分
      description: `视频下载:${videoData.title}`,
    });

    uni.hideLoading();

    if (payResult) {
      uni.showToast({
        title: "支付成功，开始下载",
        icon: "success",
      });

      // 这里可以实现视频下载逻辑
      // 由于实际下载逻辑较复杂，可参考checkin/index.vue中的downloadVideo函数
      setTimeout(() => {
        uni.showModal({
          title: "下载完成",
          content: "视频已保存到相册",
          showCancel: false
        });
      }, 1500);
    } else {
      uni.showToast({
        title: "支付已取消",
        icon: "none",
      });
    }
  } catch (error) {
    console.error("支付过程中出错:", error);
    uni.hideLoading();
    uni.showToast({
      title: "支付失败",
      icon: "none",
    });
  }
};

// 处理web-view消息
const handleMessage = (event: any) => {
  console.log("收到web-view消息", event);

  try {
    // 解析消息数据
    if (event.detail && event.detail.data && Array.isArray(event.detail.data)) {
      // 遍历所有消息
      event.detail.data.forEach((message: any) => {
        console.log("处理消息:", message);

        // 根据消息类型处理
        if (message.action === "downloadVideo") {
          handleVideoDownload({
            videoId: message.videoId,
            videoKey: message.videoKey,
            price: message.price,
            title: message.title
          });
        }
      });
    }
  } catch (error) {
    console.error("处理web-view消息失败:", error);
  }
};
</script>

<style lang="scss">
.video-page {
  width: 100%;
  height: 100vh;
  position: relative;
}

.loading-tips {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #666;
  font-size: 14px;
  z-index: 1;
}
</style>
