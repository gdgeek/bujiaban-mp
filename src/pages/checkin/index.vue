<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
const openid = ref<string | null>(null);
const token = ref<string | null>(null);
const status = ref<string | null>(null);
const getStatus = async (token: string) => {
  return new Promise((resolve, reject) => {
    console.error("refresh:");
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/status?token=" + token,
      method: "GET",
      success: function (res) {
        console.log("登录成功！" + JSON.stringify(res));
        resolve(res.data);
      },
      fail: function (res) {
        console.log("请求失败！" + res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};
//得到 openid
const getQueryString = (url: string, name: string): string | null => {
  var reg = new RegExp("(^|&|/?)" + name + "=([^&|/?]*)(&|/?|$)", "i");
  var r = url.substring(1).match(reg);
  if (r != null) {
    return r[2];
  }
  return null;
};

const refresh = async () => {
  const ready = await getStatus(token.value);
  status.value = ready.data.status;
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
  await ready();
  await refresh();
};
const stop = async () => {
  await close();
  await refresh();
};
const ready = async () => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: "https://w.4mr.cn/v1/checkin/ready",
      method: "POST",
      data: {
        openid: openid.value,
        token: token.value,
      },
      success: function (res) {
        console.log("请求成功！" + JSON.stringify(res));
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
        console.log("删除成功！！！" + JSON.stringify(res));
        resolve(res.data);
      },
      fail: function (res) {
        console.log("请求失败！" + res.errMsg);
        reject(res.errMsg);
      },
    });
  });
};
onLoad(async () => {
  try {
    const query = getCurrentPages()[getCurrentPages().length - 1].options;
    const decodedUrl = decodeURIComponent(query.q);
    token.value = getQueryString(decodedUrl, "k");
    if (!token.value) {
      token.value = "test123";
    }

    const ret = await login();
    openid.value = ret.openid;
    await refresh();
  } catch (error) {
    console.log("请求失败！" + error);
  }
});
</script>
<template>
  <view class="index">
    <p>openid:{{ openid }}</p>
    <p>token:{{ token }}</p>
    <p>status:{{ status }}</p>
    <view v-if="status == 'waiting'">
      <button @click="begin">准备开始</button>
    </view>
    <view v-if="status == 'ready'">
      <button @click="stop">放弃录制</button>
    </view>
  </view>
</template>

<style lang="scss">
//
</style>
