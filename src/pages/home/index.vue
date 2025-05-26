<template>
  <button @click="handleRecharge('10')">测试支付</button>
</template>

<script setup lang="ts">
const handleRecharge = async (amount: string) => {
  try {
    // const amountTotal = await getAmountTotal(amount);
    // if (!amountTotal) return;

    const amountInCents = Math.round(parseFloat(amount) * 100);
    const { paymentData, outTradeNo } = await createOrder(amountInCents);
    await requestPayment(paymentData, outTradeNo);
  } catch (error) {
    handlePaymentError(error);
  }
};

const createOrder = async (amountInCents: number) => {
  const res = await wx.cloud.callFunction({
    name: "wxpayFunctions",
    data: {
      type: "wxpay_order",
      amountTotal: amountInCents,
    },
  });

  if (!res.result || typeof res.result !== "object") {
    throw new Error("支付数据获取失败！");
  }

  const { timeStamp, nonceStr, packageVal, paySign } = res.result.data;

  if (!timeStamp || !nonceStr || !packageVal || !paySign) {
    throw new Error("支付数据缺失！");
  }

  return {
    paymentData: { timeStamp, nonceStr, package: packageVal, paySign },
    outTradeNo: res.result.outTradeNo,
  };
};

const requestPayment = async (paymentData: any, outTradeNo: string) => {
  await wx.requestPayment({
    ...paymentData,
    signType: "RSA",
    success: () => {
      uni.showToast({ title: "支付成功", icon: "success" });
      // queryOrderDetail(outTradeNo);
    },
    fail: (error: { errMsg: string | string[] }) => {
      if (error.errMsg.includes("requestPayment:fail cancel")) {
        uni.showToast({ title: "支付已取消", icon: "none" });
      } else {
        uni.showToast({ title: "支付失败", icon: "none" });
      }
    },
  });
};

// const queryOrderDetail = async (outTradeNo: string) => {
//   if (!outTradeNo) {
//     console.error("订单号不能为空！");
//     uni.showToast({ title: "订单号缺失，无法查询详情", icon: "none" });
//     return;
//   }

//   try {
//     const res = await wx.cloud.callFunction({
//       name: "wxpayFunctions",
//       data: {
//         type: "wxpay_query_order_by_out_trade_no",
//         out_trade_no: String(outTradeNo),
//       },
//     });

//     if (res.result && typeof res.result === "object") {
//       const orderDetails = res.result.data;
//       await updateUserBalance(orderDetails.amount.total);
//     } else {
//       throw new Error("未能获取订单详情");
//     }
//   } catch (err) {
//     console.error("查询订单详情失败：", err);
//     uni.showToast({ title: "查询订单详情失败", icon: "none" });
//   }
// };

// const updateUserBalance = async (totalAmount: number) => {
//   try {
//     const result = await rechargeAPI(totalAmount);

//     if (result.message === "success") {
//       uni.showToast({
//         title: "充值成功",
//         icon: "success",
//         duration: 3000,
//       });
//     } else {
//       throw new Error(result.message || "更新余额失败");
//     }
//   } catch (error) {
//     console.error("更新余额失败:", error);
//     uni.showToast({
//       title: "更新余额失败",
//       icon: "none",
//     });
//   }
// };

const handlePaymentError = (error: any) => {
  console.error("支付过程出错：", error);
  if (error.errMsg?.includes("requestPayment:fail")) {
    uni.showToast({ title: "支付被取消或失败", icon: "none" });
  } else {
    uni.showToast({ title: "支付失败", icon: "none" });
  }
};
</script>

<style lang="scss"></style>
