<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";

// 定义接口类型
interface CheckinInfo {
  created_at: string;
  token: string;
  openid: string;
  status: string;
  updated_at: string;
}

interface FileInfo {
  token: string;
  key: string;
  openid: string;
  created_at: string;
}

interface StatusData {
  checkin: CheckinInfo;
  file?: FileInfo | null;
}

interface ApiResponse {
  scuess: boolean;
  message: string;
  data: StatusData;
}

const openid = ref<string | null>(null);
const token = ref<string | null>(null);
const status = ref<StatusData | null>(null);
const _ready = computed(() => {
  return !!(status.value && status.value.checkin.status == "ready");
});
let intervalId: number | null = null;
watch(
  () => _ready.value,
  (newVal) => {
    console.log("ready:" + newVal);
    if (newVal) {
      intervalId = setInterval(async () => {
        await refresh();
      }, 1800);
    } else {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  },
  { immediate: true },
);
const _refresh = async (token: string): Promise<ApiResponse> => {
  return new Promise((resolve, reject) => {
    console.error("refresh:");
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/status?token=" + token,
      method: "GET",
      success: function (res) {
        console.log("验证成功！" + JSON.stringify(res.data));
        resolve(res.data as ApiResponse);
      },
      fail: function (res) {
        console.log("请求失败！" + res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};

//得到 token
const getQueryString = (url: string, name: string): string | null => {
  var reg = new RegExp("(^|&|/?)" + name + "=([^&|/?]*)(&|/?|$)", "i");
  var r = url.substring(1).match(reg);
  if (r != null) {
    return r[2];
  }
  return null;
};

const refresh = async () => {
  if (token.value) {
    const ret = await _refresh(token.value);
    status.value = ret.data;
  }
};
const login = async (): Promise<{ openid: string }> => {
  return new Promise((resolve, reject) => {
    wx.login({
      success: function (res) {
        if (res.code) {
          wx.request({
            url: "https://w.4mr.cn/v1/we-chat/openid",
            data: {
              code: res.code,
            },
            method: "POST",
            success: function (res) {
              resolve(res.data as { openid: string });
            },
            fail: function (res) {
              console.log("请求失败！" + res.errMsg);
              reject(res.errMsg);
            },
          });
        } else {
          console.log("登录失败！" + res.errMsg);
          reject(res.errMsg);
        }
      },
      fail: function (res) {
        console.log("登录失败！" + res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};
const begin = async () => {
  const ret = await ready();
  status.value = ret.data;
};
const stop = async () => {
  const ret = await over();
  status.value = ret.data;
};
const over = async (): Promise<ApiResponse> => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/status-over",
      method: "POST",
      data: {
        openid: openid.value,
        token: token.value,
      },
      success: function (res) {
        console.log("openid" + openid.value);
        resolve(res.data as ApiResponse);
      },
      fail: function (res) {
        console.log("请求失败！" + res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};
const linked = async (): Promise<ApiResponse> => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/status-linked",
      method: "POST",
      data: {
        openid: openid.value,
        token: token.value,
      },
      success: function (res) {
        console.log("openid" + openid.value);
        resolve(res.data as ApiResponse);
      },
      fail: function (res) {
        console.log("请求失败！" + res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};
const show = (key: string) => {
  console.error(key); //recode/test123.mp4
  // 跳转到网页端展示视频
  uni.navigateTo({
    url: `/pages/webview/index?key=${encodeURIComponent(key)}`,
    success: () => {
      console.log(`成功跳转到视频页面，key: ${key}`);
    },
    fail: (err) => {
      console.error(`跳转失败: ${JSON.stringify(err)}`);
      uni.showToast({
        title: "页面跳转失败",
        icon: "none",
      });
    },
  });
};
const ready = async (): Promise<ApiResponse> => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/status-ready",
      method: "POST",
      data: {
        openid: openid.value,
        token: token.value,
      },
      success: function (res) {
        console.log("openid" + openid.value);
        resolve(res.data as ApiResponse);
      },
      fail: function (res) {
        console.log("请求失败！" + res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};
const close = () => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/close?openid=" + openid.value,
      method: "DELETE",
      success: function (res) {
        console.log("删除成功！！！" + JSON.stringify(res.data));
        resolve(res.data);
      },
      fail: function (res) {
        console.log("请求失败！" + res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};

interface PageInstance {
  options: {
    q: string;
  };
}

const getToken = () => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1] as unknown as PageInstance;
  const query = currentPage.options;
  const decodedUrl = decodeURIComponent(query.q);
  const result = getQueryString(decodedUrl, "k");
  if (!result) {
    return "test123";
  }
  return result;
};
onLoad(async () => {
  token.value = getToken(); //得到token
  //本页面所有操作都具有token
  try {
    const ret = await login();

    openid.value = ret.openid; //得到openid

    //本页面所有操作都得到openid
  } catch (error) {
    console.error("openid 请求失败！" + error);
    return;
  }
  try {
    if (token.value) {
      const ret = await _refresh(token.value);

      if (!ret.scuess || ret.data.checkin.openid != openid.value) {
        //没有状态，证明没有链接，这里要链接

        const linkedRet = await linked();
        console.log("链接成功！" + JSON.stringify(linkedRet));
        status.value = linkedRet.data;
      } else {
        //有状态，证明已经链接，这里要刷新
        status.value = ret.data;
      }
    }
  } catch (error) {
    console.log("status 请求失败！" + error);
  }
});
</script>
<template>
  <view class="index">
    checkin
    <p>openid~:{{ openid }}</p>
    <p>token:{{ token }}</p>
    <p>status:{{ status }}</p>
    <p>_ready:{{ _ready }}</p>

    <view v-if="status && status.file != null">
      <p>文件名:{{ status.file.key }}</p>
      <button @click="show(status.file.key)">打开文件</button>
    </view>
    <view v-else-if="status && status.checkin.status == 'linked'">
      <button @click="begin">准备开始</button>
    </view>
    <view v-else-if="status && status.checkin.status == 'ready'">
      <button @click="stop">放弃录制</button>
    </view>
  </view>
</template>

<style lang="scss">
//
</style>
