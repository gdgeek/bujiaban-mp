<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";
const openid = ref<string | null>(null);
const token = ref<string | null>(null);
const status = ref<string | null>(null);
const _ready = computed(() => {
  return !!(status.value && status.value.checkin.status == "ready");
});
let intervalId: NodeJS.Timeout | null = null;
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
const _refresh = async (token: string) => {
  return new Promise((resolve, reject) => {
    console.error("refresh:");
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/status?token=" + token,
      method: "GET",
      success: function (res) {
        console.log("验证成功！" + JSON.stringify(res.data));
        resolve(res.data);
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
  const ret = await _refresh(token.value);
  status.value = ret.data;
};
const login = async () => {
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
              //console.log("openid:" + res.data.openid);
              // openid.value = res.data.openid;
              //  console.error("openid!!!!:" + res.data);
              resolve(res.data);
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
const over = async () => {
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
        resolve(res.data);
      },
      fail: function (res) {
        console.log("请求失败！" + res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};
const linked = async () => {
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
        resolve(res.data);
      },
      fail: function (res) {
        console.log("请求失败！" + res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};
const ready = async () => {
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
        resolve(res.data);
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

const getToken = () => {
  const query = getCurrentPages()[getCurrentPages().length - 1].options;
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
    const ret = await _refresh(token.value);

    console.error("===" + JSON.stringify(ret));
    if (!ret.scuess || ret.data.checkin.openid != openid.value) {
      //没有状态，证明没有链接，这里要链接

      const ret = await linked();
      console.log("链接成功！" + JSON.stringify(ret));
      status.value = ret.data;
    } else {
      //有状态，证明已经链接，这里要刷新
      status.value = ret.data;
    }
  } catch (error) {
    console.log("status 请求失败！" + error);
  }
});
</script>
<template>
  <view class="index">
    <p>openid:{{ openid }}</p>
    <p>token:{{ token }}</p>
    <p>status:{{ status }}</p>
    <p>_ready:{{ _ready }}</p>

    <view v-if="status && status.checkin.status == 'linked'">
      <button @click="begin">准备开始</button>
    </view>
    <view v-if="status && status.checkin.status == 'ready'">
      <button @click="stop">放弃录制</button>
    </view>
  </view>
</template>

<style lang="scss">
//
</style>
