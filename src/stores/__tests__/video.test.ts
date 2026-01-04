import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useVideoStore } from "../modules/video";

describe("stores/modules/video.ts", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("useVideoStore", () => {
    it("should initialize with video list", () => {
      const store = useVideoStore();
      expect(store.videos).toBeDefined();
      expect(Array.isArray(store.videos)).toBe(true);
    });

    it("should have initial videos with correct structure", () => {
      const store = useVideoStore();
      expect(store.videos.length).toBeGreaterThan(0);

      store.videos.forEach((video) => {
        expect(video).toHaveProperty("id");
        expect(video).toHaveProperty("cosKey");
        expect(video).toHaveProperty("uploadDate");
      });
    });

    it("should have videos with cosKey starting with recode/", () => {
      const store = useVideoStore();
      store.videos.forEach((video) => {
        expect(video.cosKey).toMatch(/^recode\//);
      });
    });

    it("should have unique video ids", () => {
      const store = useVideoStore();
      const ids = store.videos.map((v) => v.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
