<template>
  <web-view :src="url" @message="handleMessage"></web-view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";

// 外部URL地址
const url = ref("");

// 接收页面参数
onLoad((query) => {
  if (query && query.url) {
    url.value = decodeURIComponent(query.url as string);
    console.log("正在加载网页:", url.value);
  } else {
    // 没有URL参数，返回上一页
    uni.showToast({
      title: "缺少URL参数",
      icon: "none",
    });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  }
});

// 处理网页消息
const handleMessage = (event: any) => {
  console.log("收到网页消息:", event);
  // 微信小程序网页消息处理
  if (event.detail && event.detail.data) {
    const data = event.detail.data;
    console.log("消息内容:", data);
  }
};
</script>

<style lang="scss">
page {
  width: 100%;
  height: 100%;
}
</style>
