/**
 * 认证相关组合式函数
 * 提供统一的认证状态和权限检查
 */
import { ref, computed } from "vue";
import { login } from "@/services/login";
import type { IDType } from "@/services/checkin";

export function useAuth() {
  const id = ref<IDType | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  // 角色检查
  const isAdmin = computed(() => {
    const role = id.value?.user?.role?.toLowerCase() || "";
    return role === "root" || role === "manager";
  });

  const isRoot = computed(() => {
    return id.value?.user?.role?.toLowerCase() === "root";
  });

  const isManager = computed(() => {
    return id.value?.user?.role?.toLowerCase() === "manager";
  });

  const isLoggedIn = computed(() => {
    return !!id.value?.user;
  });

  // 执行登录
  async function doLogin(refresh = false) {
    loading.value = true;
    error.value = null;
    try {
      id.value = await login(refresh);
      return id.value;
    } catch (e) {
      error.value = e as Error;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  // 清除登录状态
  function clearAuth() {
    id.value = null;
  }

  return {
    id,
    loading,
    error,
    isAdmin,
    isRoot,
    isManager,
    isLoggedIn,
    doLogin,
    clearAuth,
  };
}
