/**
 * 微信支付相关服务
 */
import global from "@/utils/global";
// 定义微信支付请求参数类型
interface WxPayOrderParams {
  openid: string;
  out_trade_no: string;
  amount: number;
  description?: string;
}

// 定义微信支付订单响应类型
interface WxPayOrderResponse {
  code: number;
  data: {
    appId: string;
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: string;
    paySign: string;
  };
}

// 定义微信支付订单查询响应类型
interface WxPayOrderQueryResponse {
  code: number;
  message: string;
  data: {
    order_info: {
      amount: {
        payer_currency: string;
        total: number;
      };
      appid: string;
      mchid: string;
      out_trade_no: string;
      promotion_detail: any[];
      scene_info: {
        device_id: string;
      };
      trade_state: string;
      trade_state_desc: string;
    };
    trade_state: string;
    trade_state_desc: string;
  };
}

/**
 * 创建微信支付订单
 * @param params 支付参数
 * @returns 微信支付所需参数
 */
export const createWxPayOrder = async (
  params: WxPayOrderParams,
): Promise<WxPayOrderResponse["data"]> => {
  try {
    const response = await uni.request({
      url: `${global.url}/wechat/wxpay-order`,
      method: "POST",
      data: params,
    });

    // 将response.data转为WxPayOrderResponse类型
    const result = response.data as unknown as WxPayOrderResponse;

    if (response.statusCode === 200 && result && result.code === 0) {
      return result.data;
    }

    throw new Error("创建微信支付订单失败");
  } catch (error) {
    console.error("创建微信支付订单失败:", error);
    throw error;
  }
};

/**
 * 调用微信支付
 * @param params 支付参数
 * @returns Promise，支付成功返回 true，失败返回 false
 */
export const wxPay = async (params: WxPayOrderParams): Promise<boolean> => {
  try {
    // 创建支付订单获取支付参数
    const payParams = await createWxPayOrder(params);

    // 调用微信支付
    return new Promise((resolve, reject) => {
      // 在小程序环境中，直接使用wx.requestPayment
      const requestPayment =
        uni.getSystemInfoSync().platform === "devtools"
          ? mockPayment // 开发工具中模拟支付
          : uni.requestPayment;

      // 打印支付参数，方便调试
      console.log("支付参数:", payParams);

      // 正确传递支付参数，不需要包装在orderInfo中
      requestPayment({
        provider: "wxpay",
        appId: payParams.appId,
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType,
        paySign: payParams.paySign,
        success: () => {
          console.log("支付成功");
          resolve(true);
        },
        fail: (err: any) => {
          console.log("支付失败", err);
          resolve(false);
        },
        complete: () => {
          console.log("支付流程结束");
        },
      });
    });
  } catch (error) {
    console.error("发起支付失败:", error);
    throw error;
  }
};

// 在开发工具中模拟支付过程
const mockPayment = (options: any): void => {
  console.log("开发工具中模拟支付流程", options);
  uni.showModal({
    title: "模拟支付",
    content: "当前在开发工具中，无法真实唤起支付。是否模拟支付成功？",
    confirmText: "支付成功",
    cancelText: "支付失败",
    success: (res) => {
      if (res.confirm) {
        options.success && options.success({});
      } else {
        options.fail && options.fail({ errMsg: "模拟支付失败" });
      }
    },
    complete: options.complete,
  });
};

/**
 * 查询微信支付订单
 * @param out_trade_no 商户订单号
 * @returns 订单查询结果
 */
export const queryWxPayOrder = async (
  out_trade_no: string,
): Promise<WxPayOrderQueryResponse["data"]> => {
  try {
    const response = await uni.request({
      url: `${global.url}/wechat/wxpay-query-order-by-out-trade-no?out_trade_no=${out_trade_no}`,
      method: "GET",
    });

    // 将response.data转为WxPayOrderQueryResponse类型
    const result = response.data as unknown as WxPayOrderQueryResponse;

    if (response.statusCode === 200 && result && result.code === 0) {
      return result.data;
    }

    throw new Error(`查询微信支付订单失败: ${result.message || "未知错误"}`);
  } catch (error) {
    console.error("查询微信支付订单失败:", error);
    throw error;
  }
};

/**
 * 检查订单是否支付成功
 * @param out_trade_no 商户订单号
 * @returns 是否支付成功
 */
export const isOrderPaid = async (out_trade_no: string): Promise<boolean> => {
  try {
    const orderInfo = await queryWxPayOrder(out_trade_no);
    // 微信支付成功状态为 SUCCESS
    return orderInfo.trade_state === "SUCCESS";
  } catch (error) {
    console.error("检查订单支付状态失败:", error);
    return false;
  }
};

/**
 * 生成订单号
 * @returns 订单号（时间戳+6位随机数）
 */
export const generateOrderNo = (): string => {
  const timestamp = new Date().getTime().toString();
  const random = Math.floor(Math.random() * 900000 + 100000).toString();
  return `${timestamp}${random}`;
};
