import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    // 开发阶段启用源码映射：https://uniapp.dcloud.net.cn/tutorial/migration-to-vue3.html#需主动开启-sourcemap
    sourcemap: process.env.NODE_ENV === "development",
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler", // 使用新版 Sass API，消除弃用警告
      },
    },
  },
  plugins: [uni()],
});
