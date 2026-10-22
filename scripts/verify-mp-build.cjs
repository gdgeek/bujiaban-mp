/* eslint-env node, es2021 */
/* eslint-disable no-console */
// Exercise the emitted CommonJS modules: source-level tests cannot catch uni's import lowering.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

const buildDir = fs.realpathSync(
  path.resolve(__dirname, "..", process.argv[2] || "dist/build/mp-weixin"),
);
const oldToken = "smoke-old-token";
const newToken = "smoke-new-token";
const unionid = "smoke-unionid";
const files = [{ id: 12, key: "smoke/video.mp4", price: 100, unlocked: 0 }];
const identity = (accessToken) => ({
  openid: "smoke-openid",
  unionid,
  user: null,
  token: { accessToken, refreshToken: "smoke-refresh-token", expires: "2099/01/01 12:00:00" },
});

async function withBuild(transport, check, version) {
  const vendorPath = path.join(buildDir, "common/vendor.js");
  for (const name of ["common/vendor.js", "utils/common.js", "api/login.js"]) {
    assert.ok(fs.existsSync(path.join(buildDir, name)), `Missing build module: ${name}`);
  }
  const clearModules = () => {
    for (const filename of Object.keys(require.cache)) {
      if (filename.startsWith(`${buildDir}${path.sep}`)) delete require.cache[filename];
    }
  };
  clearModules();
  const storage = new Map();
  const calls = [];
  const paymentCalls = [];
  let loginCount = 0;
  const wxStub = {
    request(options) {
      calls.push(options);
      const response = transport(options);
      queueMicrotask(() => options.success({ statusCode: 200, ...response }));
      return { abort() {} };
    },
    login(options) {
      loginCount++;
      queueMicrotask(() => options.success({ code: "smoke-wechat-code", errMsg: "login:ok" }));
    },
    requestPayment(options) {
      paymentCalls.push(options);
      queueMicrotask(() => options.success({ errMsg: "requestPayment:ok" }));
    },
  };
  const uniStub = {
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => storage.delete(key),
  };
  const previousWx = Object.getOwnPropertyDescriptor(globalThis, "wx");
  const previousUni = Object.getOwnPropertyDescriptor(globalThis, "uni");
  globalThis.wx = wxStub;
  globalThis.uni = uniStub;
  // Only platform APIs are replaced; config, logger, request, login and common run as built.
  const vendor = new Module(vendorPath);
  vendor.filename = vendorPath;
  vendor.loaded = true;
  vendor.exports = { wx$1: wxStub, index: uniStub };
  require.cache[vendorPath] = vendor;
  try {
    const common = require(path.join(buildDir, "utils/common.js"));
    const login = require(path.join(buildDir, "api/login.js"));
    const { config } = require(path.join(buildDir, "config/index.js"));
    const backend = require(path.join(buildDir, "config/backend.js"));
    backend.selectDeviceApiVersion(version);
    common.saveId(identity(oldToken), config.apiUrl);
    const pay = require(path.join(buildDir, "api/pay.js"));
    await check({
      common,
      login,
      pay,
      config,
      calls,
      paymentCalls,
      storage,
      loginCount: () => loginCount,
    });
  } finally {
    clearModules();
    if (previousWx) Object.defineProperty(globalThis, "wx", previousWx);
    else delete globalThis.wx;
    if (previousUni) Object.defineProperty(globalThis, "uni", previousUni);
    else delete globalThis.uni;
  }
}

async function main() {
  for (const version of [0, 1]) {
    await withBuild(
      () => ({ data: files }),
      async ({ common, config, calls }) => {
        assert.deepEqual(await common.getFileList(unionid), files);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, `${config.apiUrl}/files/list?unionid=${unionid}`);
        assert.equal(calls[0].method, "GET");
        assert.equal(calls[0].header.Authorization, `Bearer ${oldToken}`);
      },
      version,
    );
    console.log(`PASS v=${version} built getFileList sends Bearer and returns the server list`);

    await withBuild(
      (options) => {
        if (options.url.endsWith("/site/login")) {
          return { data: { success: true, message: "success", data: identity(newToken) } };
        }
        return options.header.Authorization === `Bearer ${oldToken}`
          ? { statusCode: 401, data: { message: "Unauthorized" } }
          : { data: files };
      },
      async ({ common, config, calls, loginCount }) => {
        assert.deepEqual(await common.getFileList(unionid), files);
        assert.equal(loginCount(), 1, "401 must run the built WeChat login flow once");
        assert.equal(calls.length, 3, "expected unauthorized request, login and one replay");
        assert.equal(calls[0].header.Authorization, `Bearer ${oldToken}`);
        assert.equal(calls[1].url, `${config.apiUrl}/site/login`);
        assert.equal(calls[1].method, "POST");
        assert.deepEqual(calls[1].data, { code: "smoke-wechat-code" });
        assert.equal(calls[1].header?.Authorization, undefined);
        assert.equal(calls[2].url, calls[0].url);
        assert.equal(calls[2].method, calls[0].method);
        assert.equal(calls[2].header.Authorization, `Bearer ${newToken}`);
        assert.equal(common.loadId(config.apiUrl).token.accessToken, newToken);
      },
      version,
    );
    console.log(`PASS v=${version} built 401 recovery logs in, saves credentials and replays once`);

    const profileResponse = { success: true, message: "success", data: { user: null } };
    await withBuild(
      () => ({ data: profileResponse }),
      async ({ login, config, calls }) => {
        assert.deepEqual(
          await login.profile("Smoke user", "https://example.invalid/avatar.png"),
          profileResponse,
        );
        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, `${config.apiUrl}/wechat/profile`);
        assert.equal(calls[0].method, "POST");
        assert.deepEqual(calls[0].data, {
          nickname: "Smoke user",
          avatar: "https://example.invalid/avatar.png",
        });
        assert.equal(calls[0].header.Authorization, `Bearer ${oldToken}`);
        assert.equal(calls[0].header["Content-Type"], "application/json");
      },
      version,
    );
    console.log(`PASS v=${version} built profile uses the authenticated request wrapper`);

    await withBuild(
      (options) => ({
        data: {
          code: 0,
          data:
            options.method === "POST"
              ? {
                  appId: "smoke-app",
                  timeStamp: "1",
                  nonceStr: "n",
                  package: "prepay_id=smoke",
                  signType: "RSA",
                  paySign: "smoke-signature",
                }
              : { trade_state: "SUCCESS", unlocked: true },
        },
      }),
      async ({ pay, config, calls, paymentCalls, storage }) => {
        const params = {
          openid: "smoke-openid",
          amount: 100,
          out_trade_no: "smoke-order-123",
          ...(version === 1 ? { file_id: 12 } : {}),
        };
        assert.equal(await pay.wxPay(params, config.apiUrl), true);
        assert.equal(paymentCalls.length, 1);
        assert.equal(calls.length, version === 0 ? 1 : 2);
        assert.equal(calls[0].url, `${config.apiUrl}/wechat-pay/wxpay-order`);
        assert.equal(Object.hasOwn(calls[0].data, "file_id"), version === 1);
        for (const call of calls) assert.equal(call.header.Authorization, `Bearer ${oldToken}`);
        assert.equal(
          [...storage.keys()].some((key) => key.startsWith("AR_PENDING_PAYMENT:")),
          false,
        );
      },
      version,
    );
    console.log(
      `PASS v=${version} built payment follows its own protocol without crossing API realms`,
    );
  }

  await withBuild(
    (options) => ({
      data: {
        code: 0,
        data:
          options.method === "POST"
            ? { appId: "smoke-app", package: "prepay_id=smoke" }
            : { trade_state: "SUCCESS" },
      },
    }),
    async ({ pay, config }) => {
      await assert.rejects(
        pay.wxPay(
          { file_id: 12, openid: "smoke-openid", amount: 100, out_trade_no: "smoke-order-123" },
          config.apiUrl,
        ),
        /确认/,
      );
    },
    1,
  );
  console.log("PASS v=1 built payment rejects SUCCESS without server unlocking");
}

// A broken compiled callback must fail CI rather than leave this smoke check hanging.
const timeout = setTimeout(() => {
  console.error("FAIL WeChat build smoke check timed out");
  process.exit(1);
}, 5000);
main()
  .catch((error) => {
    console.error("FAIL WeChat build smoke check:", error);
    process.exitCode = 1;
  })
  .finally(() => clearTimeout(timeout));
