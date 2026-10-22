/**
 * 微信支付相关服务
 */
import config from "@/config";
import { isLegacyApiUrl } from "@/config/backend";
import { get, request } from "@/utils/request";
import logger from "@/utils/logger";

/** 微信支付请求参数 */
interface WxPayOrderParams {
  file_id?: number;
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
    unlocked?: boolean;
  };
}

/** 订单号随机数范围 */
const ORDER_RANDOM_MIN = 100000;
const ORDER_RANDOM_MAX = 999999;

const requireFileId = (params: WxPayOrderParams): void => {
  if (!Number.isSafeInteger(params.file_id) || Number(params.file_id) <= 0) {
    throw new Error("文件信息不完整，请从记录页重新打开");
  }
};

/**
 * 创建微信支付订单
 */
export const createWxPayOrder = async (
  params: WxPayOrderParams,
  apiUrl = config.apiUrl,
): Promise<WxPayParams> => {
  const legacy = isLegacyApiUrl(apiUrl);
  if (!legacy) requireFileId(params);
  const data = legacy
    ? {
        openid: params.openid,
        amount: params.amount,
        out_trade_no: params.out_trade_no,
        ...(params.description !== undefined ? { description: params.description } : {}),
      }
    : params;
  try {
    const result = await request<WxPayOrderResponse>({
      url: "/wechat-pay/wxpay-order",
      method: "POST",
      data: data as unknown as Record<string, unknown>,
      baseUrl: apiUrl,
    });
    if (result?.code === 0 && result.data?.package) return result.data;

    throw new Error("创建微信支付订单失败");
  } catch (error) {
    console.error("[pay] 创建微信支付订单失败:", error);
    throw error;
  }
};

const requestWxPayment = (payParams: WxPayParams, legacy: boolean): Promise<boolean> =>
  new Promise<boolean>((resolve, reject) => {
    wx.requestPayment({
      timeStamp: payParams.timeStamp,
      nonceStr: payParams.nonceStr,
      package: payParams.package,
      signType: payParams.signType as "RSA",
      paySign: payParams.paySign,
      success: () => resolve(true),
      fail: (error) => {
        if (legacy || error.errMsg?.includes("cancel")) resolve(false);
        else reject(new Error("支付状态暂时未知，请稍后重新查询"));
      },
    });
  });

/**
 * 调用微信支付
 */
export const wxPay = async (
  params: WxPayOrderParams,
  apiUrl: string = config.apiUrl,
): Promise<boolean> => {
  if (isLegacyApiUrl(apiUrl)) {
    const payParams = await createWxPayOrder(params, apiUrl);
    return requestWxPayment(payParams, true);
  }
  requireFileId(params);
  const pendingKey = `AR_PENDING_PAYMENT:${apiUrl}:${params.openid}:${params.file_id}`;
  let orderNo = params.out_trade_no;
  const pending = uni.getStorageSync(pendingKey);
  if (typeof pending === "string" && /^[A-Za-z0-9_-]{6,32}$/.test(pending)) {
    const previous = await queryWxPayOrder(pending, apiUrl);
    if (previous.trade_state === "SUCCESS" && previous.unlocked === true) {
      uni.removeStorageSync(pendingKey);
      return true;
    }
    if (previous.trade_state === "NOTPAY" || previous.trade_state === "USERPAYING") {
      orderNo = pending;
    } else if (previous.trade_state !== "CLOSED" && previous.trade_state !== "PAYERROR") {
      throw new Error("支付结果尚未确认，请稍后重试");
    }
  }
  const payParams = await createWxPayOrder({ ...params, out_trade_no: orderNo }, apiUrl);
  // This stores only an order to re-query, never a local paid/free entitlement.
  uni.setStorageSync(pendingKey, orderNo);
  const paid = await requestWxPayment(payParams, false);
  if (!paid) {
    uni.removeStorageSync(pendingKey);
    return false;
  }
  const confirmed = await queryWxPayOrder(orderNo, apiUrl);
  if (confirmed.trade_state !== "SUCCESS" || confirmed.unlocked !== true) {
    throw new Error("支付结果尚未确认，请稍后重新查询");
  }
  uni.removeStorageSync(pendingKey);
  logger.debug("pay", "服务端已确认文件解锁");
  return true;
};

/**
 * 查询微信支付订单
 */
export const queryWxPayOrder = async (
  out_trade_no: string,
  apiUrl = config.apiUrl,
): Promise<WxPayOrderQueryResponse["data"]> => {
  try {
    const result = await get<WxPayOrderQueryResponse>(
      "/wechat-pay/wxpay-query-order-by-out-trade-no",
      { out_trade_no },
      apiUrl,
    );
    if (result?.code === 0) return result.data;

    throw new Error(`查询微信支付订单失败: ${result?.message || "未知错误"}`);
  } catch (error) {
    console.error("[pay] 查询微信支付订单失败:", error);
    throw error;
  }
};

/**
 * 检查订单是否支付成功
 */
export const isOrderPaid = async (
  out_trade_no: string,
  apiUrl = config.apiUrl,
): Promise<boolean> => {
  try {
    const orderInfo = await queryWxPayOrder(out_trade_no, apiUrl);
    return (
      orderInfo.trade_state === "SUCCESS" && (isLegacyApiUrl(apiUrl) || orderInfo.unlocked === true)
    );
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
