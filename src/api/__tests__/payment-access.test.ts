import { beforeEach, describe, expect, it, vi } from "vitest";
const backend = vi.hoisted(() => ({ apiUrl: "https://c.4mr.cn/api/v2" }));
vi.mock("@/config", () => ({
  default: {
    get apiUrl() {
      return backend.apiUrl;
    },
  },
}));
import { createWxPayOrder, isOrderPaid, queryWxPayOrder, wxPay } from "../pay";
import { saveId } from "@/utils/common";

describe("authenticated file payment", () => {
  const request = vi.fn();
  const payment = vi.fn();
  const params = { file_id: 12, openid: "owner", amount: 100, out_trade_no: "test-order-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    backend.apiUrl = "https://c.4mr.cn/api/v2";
    wx.request = request;
    uni.request = ((options: Record<string, unknown>) =>
      new Promise((resolve) => {
        request({ ...options, success: resolve });
      })) as typeof uni.request;
    uni.requestPayment = payment;
    wx.requestPayment = payment;
    uni.removeStorageSync("AR_PENDING_PAYMENT:https://c.4mr.cn/api/v2:owner:12");
    uni.removeStorageSync("AR_PENDING_PAYMENT:https://x.4mr.cn/v2:owner:12");
    uni.removeStorageSync("AR_PENDING_PAYMENT:https://x.4mr.cn/v2:owner:undefined");
    saveId({
      openid: "owner",
      unionid: "union",
      user: null,
      token: {
        accessToken: "test-bearer",
        refreshToken: "refresh",
        expires: "2099/01/01 00:00:00",
      },
    });
    request.mockImplementation((options) => {
      options.success({
        statusCode: 200,
        data: {
          code: 0,
          data: {
            appId: "app",
            timeStamp: "1",
            nonceStr: "n",
            package: "prepay_id=x",
            signType: "RSA",
            paySign: "s",
          },
        },
      });
    });
    payment.mockImplementation((options) => options.success({}));
  });

  it("sends the business Bearer and file binding when creating an order", async () => {
    await createWxPayOrder(params);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({ Authorization: "Bearer test-bearer" }),
        data: expect.objectContaining({ file_id: 12 }),
      }),
    );
  });

  it("sends the business Bearer when querying an order", async () => {
    await queryWxPayOrder("test-order-123");
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        header: expect.objectContaining({ Authorization: "Bearer test-bearer" }),
      }),
    );
  });

  it("does not accept a client payment callback until the backend confirms unlocking", async () => {
    request.mockImplementation((options) =>
      options.success({
        statusCode: 200,
        data: {
          code: 0,
          data:
            options.method === "GET"
              ? { trade_state: "NOTPAY", unlocked: false }
              : { appId: "app", package: "prepay_id=x" },
        },
      }),
    );
    await expect(wxPay(params)).rejects.toThrow(/确认|查询/);
  });

  it("accepts only a confirmed SUCCESS with server unlocking", async () => {
    request.mockImplementation((options) =>
      options.success({
        statusCode: 200,
        data: {
          code: 0,
          data:
            options.method === "GET"
              ? { trade_state: "SUCCESS", unlocked: true }
              : { appId: "app", package: "prepay_id=x" },
        },
      }),
    );
    await expect(wxPay(params)).resolves.toBe(true);
    expect(payment).toHaveBeenCalledOnce();
    expect(request.mock.calls.some(([options]) => options.method === "GET")).toBe(true);
  });

  it("rechecks an uncertain payment before creating another order", async () => {
    uni.setStorageSync(
      "AR_PENDING_PAYMENT:https://c.4mr.cn/api/v2:owner:12",
      "previous-order-123",
    );
    request.mockImplementation((options) =>
      options.success({
        statusCode: 200,
        data: {
          code: 0,
          data: { trade_state: "SUCCESS", unlocked: true },
        },
      }),
    );
    await expect(wxPay(params)).resolves.toBe(true);
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][0].method).toBe("GET");
    expect(payment).not.toHaveBeenCalled();
  });

  it("resumes the same pending unpaid order instead of charging a new order", async () => {
    uni.setStorageSync(
      "AR_PENDING_PAYMENT:https://c.4mr.cn/api/v2:owner:12",
      "previous-order-123",
    );
    let queries = 0;
    request.mockImplementation((options) =>
      options.success({
        statusCode: 200,
        data: {
          code: 0,
          data:
            options.method === "GET"
              ? ++queries === 1
                ? { trade_state: "NOTPAY", unlocked: false }
                : { trade_state: "SUCCESS", unlocked: true }
              : { appId: "app", package: "prepay_id=x" },
        },
      }),
    );
    await expect(wxPay(params)).resolves.toBe(true);
    expect(
      request.mock.calls.find(([options]) => options.method === "POST")?.[0].data.out_trade_no,
    ).toBe("previous-order-123");
    expect(payment).toHaveBeenCalledOnce();
  });

  it("does not count SUCCESS without server unlocking as paid", async () => {
    request.mockImplementation((options) =>
      options.success({
        statusCode: 200,
        data: {
          code: 0,
          data:
            options.method === "GET"
              ? { trade_state: "SUCCESS", unlocked: false }
              : { appId: "app", package: "prepay_id=x" },
        },
      }),
    );
    await expect(wxPay(params)).rejects.toThrow(/确认/);
  });

  it("keeps creation and final confirmation on the original backend after the device switches", async () => {
    const originalApi = backend.apiUrl;
    request.mockImplementation((options) =>
      options.success({
        statusCode: 200,
        data: {
          code: 0,
          data:
            options.method === "GET"
              ? { trade_state: "SUCCESS", unlocked: true }
              : { appId: "app", package: "prepay_id=x" },
        },
      }),
    );
    payment.mockImplementation((options) => {
      backend.apiUrl = "https://x.4mr.cn/v2";
      options.success({});
    });

    await expect(wxPay(params)).resolves.toBe(true);
    expect(request.mock.calls.map(([options]) => options.url)).toEqual([
      `${originalApi}/wechat-pay/wxpay-order`,
      `${originalApi}/wechat-pay/wxpay-query-order-by-out-trade-no?out_trade_no=test-order-123`,
    ]);
  });

  it("keeps pending-order retries and storage within the backend where payment started", async () => {
    const originalApi = backend.apiUrl;
    const pendingKey = `AR_PENDING_PAYMENT:${originalApi}:owner:12`;
    const otherKey = "AR_PENDING_PAYMENT:https://x.4mr.cn/v2:owner:12";
    uni.setStorageSync(pendingKey, "previous-order-123");
    uni.setStorageSync(otherKey, "other-backend-order");
    let queries = 0;
    request.mockImplementation((options) => {
      if (options.method === "GET" && ++queries === 1) {
        backend.apiUrl = "https://x.4mr.cn/v2";
      }
      options.success({
        statusCode: 200,
        data: {
          code: 0,
          data:
            options.method === "GET"
              ? { trade_state: queries === 1 ? "NOTPAY" : "SUCCESS", unlocked: queries !== 1 }
              : { appId: "app", package: "prepay_id=x" },
        },
      });
    });

    await expect(wxPay(params)).resolves.toBe(true);
    expect(request.mock.calls.every(([options]) => options.url.startsWith(`${originalApi}/`))).toBe(
      true,
    );
    expect(
      request.mock.calls.find(([options]) => options.method === "POST")?.[0].data.out_trade_no,
    ).toBe("previous-order-123");
    expect(uni.getStorageSync(pendingKey)).toBeFalsy();
    expect(uni.getStorageSync(otherKey)).toBe("other-backend-order");
    uni.removeStorageSync(otherKey);
  });

  it("allows an operation to explicitly retain its starting backend for create and query", async () => {
    const originalApi = backend.apiUrl;
    backend.apiUrl = "https://x.4mr.cn/v2";
    await createWxPayOrder(params, originalApi);
    await queryWxPayOrder(params.out_trade_no, originalApi);
    expect(request.mock.calls.every(([options]) => options.url.startsWith(`${originalApi}/`))).toBe(
      true,
    );
  });

  it("allows payment-status checks to retain their starting backend", async () => {
    const originalApi = backend.apiUrl;
    backend.apiUrl = "https://x.4mr.cn/v2";
    request.mockImplementation((options) =>
      options.success({
        statusCode: 200,
        data: { code: 0, data: { trade_state: "SUCCESS", unlocked: true } },
      }),
    );
    await expect(isOrderPaid(params.out_trade_no, originalApi)).resolves.toBe(true);
    expect(request.mock.calls[0][0].url).toBe(
      `${originalApi}/wechat-pay/wxpay-query-order-by-out-trade-no?out_trade_no=test-order-123`,
    );
  });

  it("sends only the original order protocol to the legacy backend even when a file id is supplied", async () => {
    await createWxPayOrder({ ...params, description: "旧设备视频" }, "https://x.4mr.cn/v2");
    expect(request.mock.calls[0][0].data).toEqual({
      openid: params.openid,
      amount: params.amount,
      out_trade_no: params.out_trade_no,
      description: "旧设备视频",
    });
  });

  it("accepts real legacy payment success without a file id or server unlock query", async () => {
    const legacyApi = "https://x.4mr.cn/v2";
    saveId(
      {
        openid: "owner",
        unionid: "union",
        user: null,
        token: {
          accessToken: "legacy-bearer",
          refreshToken: "refresh",
          expires: "2099/01/01 00:00:00",
        },
      },
      legacyApi,
    );
    await expect(
      wxPay(
        {
          openid: "owner",
          amount: 100,
          out_trade_no: "legacy-order-123",
          description: "legacy video",
        },
        legacyApi,
      ),
    ).resolves.toBe(true);
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][0]).toMatchObject({
      url: `${legacyApi}/wechat-pay/wxpay-order`,
      method: "POST",
      header: { Authorization: "Bearer legacy-bearer" },
    });
    expect(request.mock.calls[0][0].data).not.toHaveProperty("file_id");
    expect(payment).toHaveBeenCalledOnce();
  });

  it("ignores the new pending-order protocol for legacy payments", async () => {
    const legacyApi = "https://x.4mr.cn/v2";
    const pendingKey = `AR_PENDING_PAYMENT:${legacyApi}:owner:12`;
    uni.setStorageSync(pendingKey, "new-flow-pending-123");
    await expect(wxPay(params, legacyApi)).resolves.toBe(true);
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][0].method).toBe("POST");
    expect(uni.getStorageSync(pendingKey)).toBe("new-flow-pending-123");
    uni.removeStorageSync(pendingKey);
  });

  it("returns false on legacy cancellation and allows another real payment attempt", async () => {
    payment.mockImplementationOnce((options) =>
      options.fail({ errMsg: "requestPayment:fail cancel" }),
    );
    const oldParams = { openid: "owner", amount: 100, out_trade_no: "legacy-order-123" };
    await expect(wxPay(oldParams, "https://x.4mr.cn/v2")).resolves.toBe(false);
    await expect(wxPay(oldParams, "https://x.4mr.cn/v2")).resolves.toBe(true);
    expect(payment).toHaveBeenCalledTimes(2);
    expect(request.mock.calls.every(([options]) => options.method === "POST")).toBe(true);
  });

  it("keeps a legacy payment on its captured API when the active backend changes", async () => {
    const legacyApi = "https://x.4mr.cn/v2";
    backend.apiUrl = legacyApi;
    payment.mockImplementation((options) => {
      backend.apiUrl = "https://c.4mr.cn/api/v2";
      options.success({});
    });
    await expect(
      wxPay({ openid: "owner", amount: 100, out_trade_no: "legacy-order-123" }),
    ).resolves.toBe(true);
    expect(request.mock.calls.map(([options]) => options.url)).toEqual([
      `${legacyApi}/wechat-pay/wxpay-order`,
    ]);
  });

  it("uses the old SUCCESS status check for legacy only", async () => {
    request.mockImplementation((options) =>
      options.success({
        statusCode: 200,
        data: { code: 0, data: { trade_state: "SUCCESS" } },
      }),
    );
    await expect(isOrderPaid("legacy-order-123", "https://x.4mr.cn/v2")).resolves.toBe(true);
    await expect(isOrderPaid("new-order-123", "https://c.4mr.cn/api/v2")).resolves.toBe(
      false,
    );
  });

  it.each([undefined, 0, -1, 1.5, NaN, Infinity, "12"])(
    "rejects invalid v1 file_id=%s before creating or restoring an order",
    async (fileId) => {
      const invalid = { ...params, file_id: fileId as number };
      await expect(createWxPayOrder(invalid)).rejects.toThrow(/文件|file_id/);
      await expect(wxPay(invalid)).rejects.toThrow(/文件|file_id/);
      expect(request).not.toHaveBeenCalled();
      expect(payment).not.toHaveBeenCalled();
    },
  );
});
