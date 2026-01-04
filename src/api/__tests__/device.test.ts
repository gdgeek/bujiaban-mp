import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
  DeviceType,
  SetupType,
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
