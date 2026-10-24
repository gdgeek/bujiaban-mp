import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadSetup } from "../../pages/__tests__/setup-harness";

const legacyApi = "https://x.4mr.cn/v2";
const currentApi = "https://c.4mr.cn/api/v2";
let activeApi: string;
let navigate: ReturnType<typeof vi.fn>;
let signed: ReturnType<typeof vi.fn>;
beforeEach(() => {
  activeApi = currentApi;
  navigate = vi.fn();
  signed = vi.fn().mockResolvedValue("https://signed.invalid/video");
  uni.navigateTo = navigate as typeof uni.navigateTo;
});
const modules = () => ({
  "@/config": {
    default: {
      get apiUrl() {
        return activeApi;
      },
    },
  },
  "@/config/backend": { isLegacyApiUrl: (url: string) => url.replace(/\/+$/, "") === legacyApi },
  "@/utils/video": { getSignedVideoUrl: signed },
  "@/utils/logger": { default: { info: vi.fn() } },
});
const navigatedParams = () => {
  const url = navigate.mock.calls[0][0].url;
  return JSON.parse(decodeURIComponent(url.split("?params=")[1]));
};

describe("versioned download navigation", () => {
  it.each([legacyApi, currentApi])(
    "recording completion uses the matching protocol for %s",
    async (apiUrl) => {
      activeApi = apiUrl;
      const component = loadSetup("src/components/File.vue", modules(), {
        file: { file_id: 12, key: "recording.mp4" },
        setup: { money: 100, shots: [1, 2] },
      });
      await component.state.downloadVideo("recording.mp4");
      const params = navigatedParams();
      if (apiUrl === legacyApi) {
        expect(params).toMatchObject({ videoKey: "recording.mp4", price: 100, shots: [1, 2] });
        expect(params).not.toHaveProperty("videoId");
      } else {
        expect(params).toMatchObject({ videoId: 12, shots: [1, 2] });
        expect(params).not.toHaveProperty("price");
        expect(params).not.toHaveProperty("videoKey");
      }
    },
  );

  it.each([legacyApi, currentApi])(
    "record list uses the matching protocol for %s",
    async (apiUrl) => {
      activeApi = apiUrl;
      const component = loadSetup("src/components/file-card/index.vue", modules(), {
        video: { id: 12, key: "recording.mp4", created_at: "2026-10-23" },
      });
      await component.state.downloadVideo();
      const params = navigatedParams();
      if (apiUrl === legacyApi) {
        expect(params).toMatchObject({ videoKey: "recording.mp4", price: 0 });
        expect(params).not.toHaveProperty("videoId");
      } else {
        expect(params).toMatchObject({ videoId: 12 });
        expect(params).not.toHaveProperty("price");
        expect(params).not.toHaveProperty("videoKey");
      }
    },
  );

  it("keeps recording previews on the component backend while awaiting a signature", async () => {
    activeApi = legacyApi;
    const component = loadSetup("src/components/File.vue", modules(), {
      file: { file_id: 12, key: "recording.mp4" },
      setup: { money: 100, shots: [] },
    });
    signed.mockImplementation(async () => {
      activeApi = currentApi;
      return "https://signed.invalid/video";
    });
    await component.fire("mounted");
    expect(signed).toHaveBeenNthCalledWith(1, "recording.mp4", true, 0.01, legacyApi);
    expect(signed).toHaveBeenNthCalledWith(2, "recording.mp4", false, 0.01, legacyApi);
  });
});
