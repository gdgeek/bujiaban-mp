<template>
  <view class="container">
    <view class="title">接口功能测试</view>
    <text class="openid-info" v-if="openid">当前用户OpenID: {{ openid }}</text>
    <text class="openid-info" v-else>未获取到OpenID</text>

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

    <!-- 本地刷新接口测试 -->
    <view class="section">
      <view class="section-title">本地刷新接口测试</view>
      <input v-model="refreshToken" type="text" placeholder="请输入token" class="input" />
      <view class="selector-group">
        <text>选择刷新类型:</text>
        <radio-group @change="onRefreshTypeChange">
          <label v-for="(item, index) in refreshTypes" :key="index" class="radio-item">
            <radio :value="item.value" :checked="item.value === refreshType" />
            <text>{{ item.label }}</text>
          </label>
        </radio-group>
      </view>
      <input
        v-model="refreshParam"
        type="text"
        :placeholder="`请输入${refreshTypeLabel}`"
        class="input"
      />
      <input v-model="refreshStatus" type="text" placeholder="请输入状态(可选)" class="input" />
      <input
        v-model="refreshData"
        type="text"
        placeholder="请输入数据(可选，JSON格式)"
        class="input"
      />
      <button @click="testLocalRefresh" type="primary" class="btn">测试本地刷新</button>
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
import { ref, onMounted, computed } from "vue";
import { wxPay, generateOrderNo, queryWxPayOrder, isOrderPaid } from "@/services/pay";
import { localRefresh, type IDType } from "@/services/checkin";
import { login } from "@/services/login";

// 响应式数据
const amount = ref<string>("1"); // 默认支付金额：1分
const orderNo = ref<string>(generateOrderNo()); // 初始生成一个订单号
const result = ref<string>(""); // 结果展示
const isDevtools = ref<boolean>(false); // 是否在开发工具中运行
//const openid = ref<string | null>(null); // 用户openid
const id = ref<IDType | null>(null);

// 本地刷新接口测试相关数据
const refreshToken = ref<string>("A1234567890abcdef1234567890abcdef"); // 默认测试token
const refreshType = ref<string>("openid"); // 默认刷新类型：微信用户
const refreshParam = ref<string>(""); // 参数值
const refreshStatus = ref<string>("active"); // 状态
const refreshData = ref<string>('{"location":"北京"}'); // 附加数据

// 定义刷新类型选项
const refreshTypes = [
  { label: "微信用户", value: "openid" },
  { label: "设备", value: "device" },
  { label: "文件", value: "key" },
];

// 计算当前选择的刷新类型标签
const refreshTypeLabel = computed(() => {
  const type = refreshTypes.find((item) => item.value === refreshType.value);
  return type ? type.label : "参数";
});

// 刷新类型变更处理
const onRefreshTypeChange = (e: any) => {
  refreshType.value = e.detail.value;
  // 如果选择了openid且已有用户openid，则自动填充
  if (refreshType.value === "openid" && id.value?.openid) {
    refreshParam.value = id.value.openid;
  } else {
    refreshParam.value = "";
  }
};

/// 检查是否在开发工具中运行并获取openid
onMounted(async () => {
  try {
    const systemInfo = uni.getSystemInfoSync();
    isDevtools.value = systemInfo.platform === "devtools";
    console.log("当前运行环境:", systemInfo.platform);

    // 获取存储的openid
    id.value = await login();
    if (!id.value) {
      console.warn("未找到存储的openid，可能需要先访问打卡页面");
    } else {
      // 如果已有openid且当前选择的是openid类型，则自动填充
      if (refreshType.value === "openid") {
        refreshParam.value = id.value.openid;
      }
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

  if (!id.value?.openid) {
    result.value = "未找到openid，请先访问打卡页面";
    return;
  }

  try {
    result.value = "发起支付中...";

    const payResult = await wxPay({
      openid: id.value?.openid,
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

// 测试本地刷新接口
const testLocalRefresh = async () => {
  if (!refreshToken.value) {
    result.value = "请输入Token";
    return;
  }

  if (!refreshParam.value) {
    result.value = `请输入${refreshTypeLabel.value}`;
    return;
  }

  // 验证token格式
  const tokenRegex = /^[A-Z][0-9a-f]{32}$/i;
  if (!tokenRegex.test(refreshToken.value)) {
    result.value = "Token格式错误，应为[A-Z][0-9a-f]{32}";
    return;
  }

  try {
    result.value = "发送本地刷新请求中...";

    // 准备请求参数
    const options: any = {
      status: refreshStatus.value || undefined,
    };

    // 解析data字段
    if (refreshData.value) {
      try {
        options.data = JSON.parse(refreshData.value);
      } catch (e) {
        // 如果不是有效的JSON，则作为字符串处理
        options.data = refreshData.value;
      }
    }

    // 根据选择的类型设置参数
    if (refreshType.value === "openid") {
      options.openid = refreshParam.value;
    } else if (refreshType.value === "device") {
      options.device = refreshParam.value;
    } else if (refreshType.value === "key") {
      options.key = refreshParam.value;
    }

    // 发送请求
    const response = await localRefresh(refreshToken.value, options);

    // 格式化结果显示
    result.value = `
      本地刷新成功:
      ${JSON.stringify(response, null, 2)}
    `;
  } catch (error: any) {
    result.value = `本地刷新出错: ${error.message || error || "未知错误"}`;
    console.error("本地刷新错误:", error);
  }
};
</script>

<style lang="scss">
.container {
  padding: 30rpx;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  text-align: center;
}

.openid-info {
  font-size: 24rpx;
  color: #666;
  text-align: center;
  margin-bottom: 30rpx;
  word-break: break-all;
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
  padding: 10rpx;
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
  margin-bottom: 10rpx;
}

.selector-group {
  margin-bottom: 20rpx;
}

.radio-item {
  margin-right: 20rpx;
  font-size: 28rpx;
}
</style>
