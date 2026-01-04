/**
 * 微信支付相关服务
 */
import config from "@/config";
import logger from "@/utils/logger";

/** 微信支付请求参数 */
interface WxPayOrderParams {
  openid: string;
  out_trade_no: string;
  amount: number;
  description?: string;
}

/** 微信支付参数 */
interface WxPayParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

/** 微信支付订单响应 */
interface WxPayOrderResponse {
  code: number;
  data: WxPayParams;
}

/** 订单金额信息 */
interface OrderAmount {
  payer_currency: string;
  total: number;
}

/** 订单场景信息 */
interface OrderSceneInfo {
  device_id: string;
}

/** 订单详情 */
interface OrderInfo {
  amount: OrderAmount;
  appid: string;
  mchid: string;
  out_trade_no: string;
  promotion_detail: unknown[];
  scene_info: OrderSceneInfo;
  trade_state: string;
  trade_state_desc: string;
}

/** 微信支付订单查询响应 */
interface WxPayOrderQueryResponse {
  code: number;
  message: string;
  data: {
    order_info: OrderInfo;
    trade_state: string;
    trade_state_desc: string;
  };
}

/** 支付回调选项 */
interface PaymentOptions {
  provider?: string;
  appId?: string;
  timeStamp?: string;
  nonceStr?: string;
  package?: string;
  signType?: string;
  paySign?: string;
  success?: (res: unknown) => void;
  fail?: (err: { errMsg: string }) => void;
  complete?: () => void;
}

/** 订单号随机数范围 */
const ORDER_RANDOM_MIN = 100000;
const ORDER_RANDOM_MAX = 999999;

/**
 * 创建微信支付订单
 */
export const createWxPayOrder = async (params: WxPayOrderParams): Promise<WxPayParams> => {
  try {
    const response = await uni.request({
      url: `${config.apiUrl}/wechat-pay/wxpay-order`,
      method: "POST",
      data: params,
    });

    const result = response.data as unknown as WxPayOrderResponse;

    if (response.statusCode === 200 && result?.code === 0) {
      return result.data;
    }

    throw new Error("创建微信支付订单失败");
  } catch (error) {
    console.error("[pay] 创建微信支付订单失败:", error);
    throw error;
  }
};

/**
 * 调用微信支付
 */
export const wxPay = async (params: WxPayOrderParams): Promise<boolean> => {
  try {
    const payParams = await createWxPayOrder(params);

    return new Promise((resolve) => {
      const isDevtools = uni.getSystemInfoSync().platform === "devtools";
      const requestPayment = isDevtools ? mockPayment : uni.requestPayment;

      logger.debug("pay", "发起支付");

      requestPayment({
        provider: "wxpay",
        appId: payParams.appId,
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType,
        paySign: payParams.paySign,
        success: () => {
          logger.debug("pay", "支付成功");
          resolve(true);
        },
        fail: (err: { errMsg: string }) => {
          console.warn("[pay] 支付失败:", err);
          resolve(false);
        },
        complete: () => {
          logger.debug("pay", "支付流程结束");
        },
      });
    });
  } catch (error) {
    console.error("[pay] 发起支付失败:", error);
    throw error;
  }
};

/**
 * 开发工具中模拟支付
 */
const mockPayment = (options: PaymentOptions): void => {
  logger.debug("pay", "开发工具模拟支付");
  uni.showModal({
    title: "模拟支付",
    content: "当前在开发工具中，无法真实唤起支付。是否模拟支付成功？",
    confirmText: "支付成功",
    cancelText: "支付失败",
    success: (res) => {
      if (res.confirm) {
        options.success?.({});
      } else {
        options.fail?.({ errMsg: "模拟支付失败" });
      }
    },
    complete: options.complete,
  });
};

/**
 * 查询微信支付订单
 */
export const queryWxPayOrder = async (
  out_trade_no: string,
): Promise<WxPayOrderQueryResponse["data"]> => {
  try {
    const response = await uni.request({
      url: `${config.apiUrl}/wechat-pay/wxpay-query-order-by-out-trade-no?out_trade_no=${out_trade_no}`,
      method: "GET",
    });

    const result = response.data as unknown as WxPayOrderQueryResponse;

    if (response.statusCode === 200 && result?.code === 0) {
      return result.data;
    }

    throw new Error(`查询微信支付订单失败: ${result?.message || "未知错误"}`);
  } catch (error) {
    console.error("[pay] 查询微信支付订单失败:", error);
    throw error;
  }
};

/**
 * 检查订单是否支付成功
 */
export const isOrderPaid = async (out_trade_no: string): Promise<boolean> => {
  try {
    const orderInfo = await queryWxPayOrder(out_trade_no);
    return orderInfo.trade_state === "SUCCESS";
  } catch (error) {
    console.error("[pay] 检查订单支付状态失败:", error);
    return false;
  }
};

/**
 * 生成订单号（时间戳+6位随机数）
 */
export const generateOrderNo = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(
    Math.random() * (ORDER_RANDOM_MAX - ORDER_RANDOM_MIN + 1) + ORDER_RANDOM_MIN,
  ).toString();
  return `${timestamp}${random}`;
};
