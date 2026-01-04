<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import logger from "@/utils/logger";

onLaunch(() => {
  logger.info("App", "Launch");
});
onShow(() => {
  logger.info("App", "Show");
});
onHide(() => {
  logger.info("App", "Hide");
});
</script>

<style lang="scss">
// 字体图标
@use "@/styles/fonts.scss";

view,
navigator,
input,
scroll-view {
  box-sizing: border-box;
}

button::after {
  border: none;
}

swiper,
scroll-view {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

image {
  width: 100%;
  height: 100%;
  vertical-align: middle;
}

// 两行省略
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
