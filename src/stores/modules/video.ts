import { defineStore } from "pinia";
import { ref } from "vue";
import type { Video } from "@/types/video";

export const useVideoStore = defineStore("video", () => {
  // 视频列表数据
  const videos = ref<Video[]>([
    {
      id: 1,
      cosKey: "recode/test123.mp4",
      uploadDate: "2025-05-12",
    },
    {
      id: 2,
      cosKey: "recode/test456.mp4",
      uploadDate: "2025-05-12",
    },
    {
      id: 3,
      cosKey: "recode/test789.mp4",
      uploadDate: "2025-05-12",
    },
  ]);

  return {
    videos,
  };
});
