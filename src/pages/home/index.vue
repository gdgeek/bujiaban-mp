<template>
  <view class="container">
    <view class="title">微信支付功能测试</view>
    {{ openid }}
    <!-- 支付测试 -->
    <view class="section">
      <view class="section-title">支付测试</view>
      <input
        v-model="amount"
        type="number"
        placeholder="请输入支付金额（单位：分）"
        class="input"
      />
      <button @click="testWxPay" type="primary" class="btn">测试支付</button>
      <view class="tips" v-if="isDevtools"
        >开发工具中将会模拟支付流程，真机才能实际唤起微信支付</view
      >
    </view>

    <!-- 订单查询测试 -->
    <view class="section">
      <view class="section-title">订单查询测试</view>
      <input v-model="orderNo" type="text" placeholder="请输入订单号" class="input" />
      <view class="btn-group">
        <button @click="testQueryOrder" type="primary" class="btn">查询订单</button>
        <button @click="testIsOrderPaid" type="primary" class="btn">检查支付状态</button>
      </view>
    </view>

    <!-- 创建随机订单号 -->
    <view class="section">
      <button @click="generateNewOrderNo" type="default" class="btn">生成新订单号</button>
      <text class="order-no" v-if="orderNo">当前订单号: {{ orderNo }}</text>
    </view>

    <!-- 结果展示 -->
    <view class="section result-section" v-if="result">
      <view class="section-title">操作结果</view>
      <view class="result-content">
        <text class="result-text">{{ result }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { wxPay, generateOrderNo, queryWxPayOrder, isOrderPaid } from "@/services/pay";

// 定义openid存储键名（与checkin页面保持一致）
const OPENID_STORAGE_KEY = "AR_CHECKIN_OPENID";

// 响应式数据
const amount = ref<string>("1"); // 默认支付金额：1分
const orderNo = ref<string>(generateOrderNo()); // 初始生成一个订单号
const result = ref<string>(""); // 结果展示
const isDevtools = ref<boolean>(false); // 是否在开发工具中运行
const openid = ref<string | null>(null); // 用户openid

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

// 检查是否在开发工具中运行并获取openid
onMounted(() => {
  try {
    const systemInfo = uni.getSystemInfoSync();
    isDevtools.value = systemInfo.platform === "devtools";
    console.log("当前运行环境:", systemInfo.platform);

    // 获取存储的openid
    openid.value = getOpenidFromStorage();
    if (!openid.value) {
      console.warn("未找到存储的openid，可能需要先访问打卡页面");
    }
  } catch (err) {
    console.error("获取系统信息失败", err);
  }
});

// 测试微信支付
const testWxPay = async () => {
  if (!amount.value || Number(amount.value) <= 0) {
    result.value = "请输入有效的支付金额";
    return;
  }

  if (!openid.value) {
    result.value = "未找到openid，请先访问打卡页面";
    return;
  }

  try {
    result.value = "发起支付中...";

    const payResult = await wxPay({
      openid: openid.value,
      out_trade_no: orderNo.value,
      amount: Number(amount.value),
      description: "测试商品",
    });

    if (payResult) {
      result.value = "支付成功!";
    } else {
      result.value = "支付失败或已取消";
    }
  } catch (error: any) {
    result.value = `支付出错: ${error.message || "未知错误"}`;
    console.error("支付错误:", error);
  }
};

// 测试查询订单
const testQueryOrder = async () => {
  if (!orderNo.value) {
    result.value = "请输入订单号";
    return;
  }

  try {
    result.value = "查询订单中...";

    const orderInfo = await queryWxPayOrder(orderNo.value);

    result.value = `
      订单查询成功:
      - 交易状态: ${orderInfo.trade_state}
      - 状态描述: ${orderInfo.trade_state_desc}
      - 商户订单号: ${orderInfo.order_info.out_trade_no}
      - 金额: ${orderInfo.order_info.amount.total}分
    `;
  } catch (error: any) {
    result.value = `查询订单出错: ${error.message || "未知错误"}`;
    console.error("查询订单错误:", error);
  }
};

// 测试检查订单是否支付成功
const testIsOrderPaid = async () => {
  if (!orderNo.value) {
    result.value = "请输入订单号";
    return;
  }

  try {
    result.value = "检查支付状态中...";

    const paid = await isOrderPaid(orderNo.value);

    if (paid) {
      result.value = "订单已支付成功!";
    } else {
      result.value = "订单未支付或支付失败";
    }
  } catch (error: any) {
    result.value = `检查支付状态出错: ${error.message || "未知错误"}`;
    console.error("检查支付状态错误:", error);
  }
};

// 生成新的订单号
const generateNewOrderNo = () => {
  orderNo.value = generateOrderNo();
  result.value = `已生成新订单号: ${orderNo.value}`;
};
</script>

<style lang="scss">
.container {
  padding: 30rpx;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 40rpx;
  text-align: center;
}

.section {
  margin-bottom: 40rpx;
  background-color: #fff;
  padding: 20rpx;
  border-radius: 10rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  color: #333;
}

.input {
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  margin-bottom: 20rpx;
  font-size: 28rpx;
}

.btn {
  margin-bottom: 16rpx;
}

.btn-group {
  display: flex;
  gap: 20rpx;
}

.btn-group .btn {
  flex: 1;
}

.result-section {
  background-color: #f5f5f5;
}

.result-content {
  padding: 20rpx;
  border-radius: 8rpx;
  background-color: #fff;
  border-left: 6rpx solid #2979ff;
}

.result-text {
  font-size: 28rpx;
  line-height: 1.5;
  word-break: break-all;
  white-space: pre-wrap;
}

.order-no {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-top: 10rpx;
}

.tips {
  font-size: 24rpx;
  color: #ff9900;
  margin-top: 10rpx;
  padding: 10rpx;
  background-color: rgba(255, 153, 0, 0.1);
  border-radius: 6rpx;
}
</style>
