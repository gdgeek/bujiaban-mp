/**
 * Vitest 测试环境设置
 * 模拟 uni-app 和微信小程序全局对象
 */

// 模拟 uni 全局对象
const mockStorage: Record<string, string> = {};

(global as any).uni = {
  getStorageSync: (key: string) => {
    const value = mockStorage[key];
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return "";
  },
  setStorageSync: (key: string, value: any) => {
    mockStorage[key] = typeof value === "string" ? value : JSON.stringify(value);
  },
  removeStorageSync: (key: string) => {
    delete mockStorage[key];
  },
  showToast: () => {},
  showLoading: () => {},
  hideLoading: () => {},
  showModal: () => {},
  navigateTo: () => {},
  navigateBack: () => {},
  redirectTo: () => {},
  request: () => Promise.resolve({ data: {}, statusCode: 200 }),
  getSystemInfoSync: () => ({ platform: "devtools" }),
  getWindowInfo: () => ({ safeAreaInsets: { bottom: 0 } }),
  getSetting: () => Promise.resolve({ authSetting: {} }),
  authorize: () => Promise.resolve(),
  openSetting: () => Promise.resolve({ authSetting: {} }),
  downloadFile: () => Promise.resolve({ statusCode: 200, tempFilePath: "" }),
  saveVideoToPhotosAlbum: () => Promise.resolve(),
  saveImageToPhotosAlbum: () => Promise.resolve(),
  previewImage: () => {},
  getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
};

// 模拟 wx 全局对象
(global as any).wx = {
  ...(global as any).uni,
  login: (options: any) => {
    options.success?.({ code: "test-code" });
  },
  request: (options: any) => {
    options.success?.({ data: { success: true } });
  },
  getUserProfile: (options: any) => {
    options.success?.({
      userInfo: {
        nickName: "Test User",
        avatarUrl: "https://example.com/avatar.png",
        gender: 0,
        country: "",
        province: "",
        city: "",
        language: "zh_CN",
      },
    });
  },
  cloud: {
    init: () => {},
  },
  requestPayment: (options: any) => {
    options.success?.({});
  },
};

// 清理存储的辅助函数
export function clearMockStorage() {
  Object.keys(mockStorage).forEach((key) => {
    delete mockStorage[key];
  });
}
