import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { selectDeviceApiVersion } from "@/config/backend";

// Mock wx.request before importing
const mockWxRequest = vi.fn();
(global as any).wx = {
  ...(global as any).wx,
  request: mockWxRequest,
};

import {
  getDevices,
  postDevice,
  putDevice,
  putSetup,
  deleteDevice,
  getDevice,
  getDeviceWithSetup,
  manageDevice,
  type DeviceType,
  type SetupType,
} from "../device";

describe("device.ts", () => {
  beforeEach(() => {
    mockWxRequest.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getDevices", () => {
    it("should fetch device list without params", async () => {
      const mockDevices: DeviceType[] = [
        { id: 1, uuid: "uuid-1", tag: "tag1", ip: "192.168.1.1" },
        { id: 2, uuid: "uuid-2", tag: "tag2", ip: "192.168.1.2" },
      ];

      mockWxRequest.mockImplementation((options) => {
        expect(options.url).toContain("/devices");
        expect(options.url).toContain("expand=admin");
        options.success({ statusCode: 200, data: mockDevices });
      });

      const result = await getDevices();
      expect(result).toEqual(mockDevices);
    });

    it("should fetch device list with tag filter", async () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.url).toContain("tag=myTag");
        options.success({ statusCode: 200, data: [] });
      });

      await getDevices({ tag: "myTag" });
      expect(mockWxRequest).toHaveBeenCalled();
    });

    it("should fetch device list with pagination", async () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.url).toContain("page=2");
        expect(options.url).toContain("per-page=10");
        options.success({ statusCode: 200, data: [] });
      });

      await getDevices({ page: 2, pageSize: 10 });
      expect(mockWxRequest).toHaveBeenCalled();
    });
  });

  describe("postDevice", () => {
    it("should create a new device", async () => {
      const newDevice: DeviceType = { id: 0, uuid: "new-uuid", tag: "new", ip: "10.0.0.1" };
      const createdDevice: DeviceType = { ...newDevice, id: 3 };

      mockWxRequest.mockImplementation((options) => {
        expect(options.method).toBe("POST");
        expect(options.url).toContain("/devices");
        options.success({ statusCode: 200, data: createdDevice });
      });

      const result = await postDevice(newDevice);
      expect(result).toEqual(createdDevice);
    });
  });

  describe("putDevice", () => {
    it("should update a device", async () => {
      const updatedDevice: DeviceType = {
        id: 1,
        uuid: "uuid-1",
        tag: "updated",
        ip: "192.168.1.1",
      };

      mockWxRequest.mockImplementation((options) => {
        expect(options.method).toBe("PUT");
        expect(options.url).toContain("/devices/1");
        options.success({ statusCode: 200, data: updatedDevice });
      });

      const result = await putDevice(1, { tag: "updated" });
      expect(result).toEqual(updatedDevice);
    });
  });

  describe("putSetup", () => {
    it("should update device setup", async () => {
      const setup: SetupType = {
        money: 100,
        scene_id: 1,
        shots: [1, 2],
        slogans: ["test"],
        thumbs: [],
        pictures: [],
        title: "测试配置",
      };

      mockWxRequest.mockImplementation((options) => {
        expect(options.method).toBe("PUT");
        expect(options.url).toContain("/setups/1");
        options.success({ statusCode: 200, data: setup });
      });

      const result = await putSetup(1, { money: 100 });
      expect(result).toEqual(setup);
    });
  });

  describe("deleteDevice", () => {
    it("should delete a device and return true", async () => {
      mockWxRequest.mockImplementation((options) => {
        expect(options.method).toBe("DELETE");
        expect(options.url).toContain("/devices/1");
        options.success({ statusCode: 200, data: {} });
      });

      const result = await deleteDevice(1);
      expect(result).toBe(true);
    });
  });

  describe("getDevice", () => {
    it("should get a single device by id", async () => {
      const device: DeviceType = { id: 1, uuid: "uuid-1", tag: "tag1", ip: "192.168.1.1" };

      mockWxRequest.mockImplementation((options) => {
        expect(options.url).toContain("/devices/1");
        options.success({ statusCode: 200, data: device });
      });

      const result = await getDevice(1);
      expect(result).toEqual(device);
    });
  });

  describe("getDeviceWithSetup", () => {
    it("should get device with setup expanded", async () => {
      const device: DeviceType = {
        id: 1,
        uuid: "uuid-1",
        tag: "tag1",
        ip: "192.168.1.1",
        setup: {
          money: 50,
          scene_id: 1,
          shots: [],
          slogans: [],
          thumbs: [],
          pictures: [],
          title: "配置",
        },
      };

      mockWxRequest.mockImplementation((options) => {
        expect(options.url).toContain("/devices/1");
        expect(options.url).toContain("expand=setup");
        options.success({ statusCode: 200, data: device });
      });

      const result = await getDeviceWithSetup(1);
      expect(result.setup).toBeDefined();
    });
  });

  describe("manageDevice", () => {
    it("should get devices managed by current user", async () => {
      const devices: DeviceType[] = [{ id: 1, uuid: "uuid-1", tag: "tag1", ip: "192.168.1.1" }];

      mockWxRequest.mockImplementation((options) => {
        expect(options.url).toContain("/devices/manage");
        expect(options.url).toContain("expand=setup");
        options.success({ statusCode: 200, data: devices });
      });

      const result = await manageDevice();
      expect(result).toEqual(devices);
    });
  });
});

describe("associated device pagination", () => {
  it("loads all pages instead of reporting the first 20 devices as the total", async () => {
    const all = Array.from({ length: 45 }, (_, index) => ({
      id: index + 1,
      uuid: `uuid-${index}`,
      tag: "",
      ip: "",
    }));
    mockWxRequest.mockClear();
    mockWxRequest.mockImplementation((options) => {
      const url = new URL(options.url);
      const page = Number(url.searchParams.get("page") || 1);
      expect(url.searchParams.get("per-page")).toBe("20");
      options.success({ statusCode: 200, data: all.slice((page - 1) * 20, page * 20) });
    });
    expect(await manageDevice()).toEqual(all);
    expect(mockWxRequest).toHaveBeenCalledTimes(3);
  });

  it("rejects a failed later page instead of returning an incorrect partial total", async () => {
    mockWxRequest.mockImplementation((options) => {
      const page = Number(new URL(options.url).searchParams.get("page") || 1);
      if (page === 2) return options.fail({ errMsg: "offline" });
      options.success({
        statusCode: 200,
        data: Array.from({ length: 20 }, (_, index) => ({ id: index + 1 })),
      });
    });
    await expect(manageDevice()).rejects.toThrow("offline");
  });
});

describe("Yii pagination boundary", () => {
  it("finishes when Yii clamps an out-of-range page to a full last page", async () => {
    const all = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      uuid: "",
      tag: "",
      ip: "",
    }));
    mockWxRequest.mockClear();
    mockWxRequest.mockImplementation((options) => {
      const requestedPage = Number(new URL(options.url).searchParams.get("page") || 1);
      const page = Math.min(requestedPage, 2);
      options.success({ statusCode: 200, data: all.slice((page - 1) * 20, page * 20) });
    });
    expect(await manageDevice()).toEqual(all);
    expect(mockWxRequest).toHaveBeenCalledTimes(3);
  });
});

describe("device API selection", () => {
  afterEach(() => selectDeviceApiVersion(1));

  it("keeps every page on the API where pagination began", async () => {
    selectDeviceApiVersion(0);
    const all = Array.from({ length: 21 }, (_, index) => ({
      id: index + 1,
      uuid: "",
      tag: "",
      ip: "",
    }));
    mockWxRequest.mockImplementation((options) => {
      const url = new URL(options.url);
      expect(url.origin + url.pathname).toBe("https://x.4mr.cn/v2/devices/manage");
      const page = Number(url.searchParams.get("page"));
      if (page === 1) selectDeviceApiVersion(1);
      options.success({ statusCode: 200, data: all.slice((page - 1) * 20, page * 20) });
    });
    expect(await manageDevice()).toEqual(all);
  });

  it("reads and saves an existing device in its captured API", async () => {
    selectDeviceApiVersion(1);
    const urls: string[] = [];
    mockWxRequest.mockImplementation((options) => {
      urls.push(options.url);
      options.success({ statusCode: 200, data: {} });
    });
    await getDeviceWithSetup(7, "https://x.4mr.cn/v2");
    await putSetup(70, { title: "old backend form" }, "https://x.4mr.cn/v2");
    expect(urls.every((url) => url.startsWith("https://x.4mr.cn/v2/"))).toBe(true);
  });
});
