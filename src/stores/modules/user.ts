import { defineStore } from "pinia";
import { ref } from "vue";

// 定义 Store
export const useUserStore = defineStore(
  "user",
  () => {
    // 用户信息
    const userInfo = ref<any>();

    // 保存用户信息，登录时使用
    const setUserInfo = (val: any) => {
      userInfo.value = val;
    };

    // 清理用户信息，退出时使用
    const clearUserInfo = () => {
      userInfo.value = undefined;
    };

    return {
      userInfo,
      setUserInfo,
      clearUserInfo,
    };
  },
  // 持久化
  {
    // 网页端配置
    // persist: true,
    // 小程序端配置
    persist: {
      storage: {
        getItem(key) {
          return uni.getStorageSync(key);
        },
        setItem(key, value) {
          uni.setStorageSync(key, value);
        },
      },
    },
  },
);
