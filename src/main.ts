import { createSSRApp } from "vue";
import pinia from "./stores";
import config from "./config";

import App from "./App.vue";

// 全局初始化云开发
wx.cloud.init({
  env: config.cloudEnv,
  traceUser: true,
});

export function createApp() {
  const app = createSSRApp(App);

  app.use(pinia);
  return {
    app,
  };
}
