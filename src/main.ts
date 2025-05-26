import { createSSRApp } from "vue";
import pinia from "./stores";

import App from "./App.vue";

// 全局初始化云开发
wx.cloud.init({
  env: "game-9ghhigyq57e00dc3", // 云开发环境ID
  traceUser: true, // 是否开启用户跟踪
});
export function createApp() {
  const app = createSSRApp(App);

  app.use(pinia);
  return {
    app,
  };
}
