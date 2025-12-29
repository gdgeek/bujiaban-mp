import { defineStore } from "pinia";
import { ref } from "vue";
import type { UserInfo } from "@/types/user";

// 定义 Store
export const useUserStore = defineStore(
  "user",
  () => {
    // 用户信息
    const userInfo = ref<UserInfo | undefined>();

    // 保存用户信息，登录时使用
    const setUserInfo = (val: UserInfo) => {
      userInfo.value = val;
    };

    // 清理用户信息，退出时使用
    const clearUserInfo = () => {
      userInfo.value = undefined;
    };

    // 检查是否是管理员
    const isAdmin = () => {
      const role = userInfo.value?.role?.toLowerCase() || "";
      return role === "root" || role === "manager";
    };

    // 检查是否是root用户
    const isRoot = () => {
      return userInfo.value?.role?.toLowerCase() === "root";
    };

    return {
      userInfo,
      setUserInfo,
      clearUserInfo,
      isAdmin,
      isRoot,
    };
  },
  // 持久化
  {
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
