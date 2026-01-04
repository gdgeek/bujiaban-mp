import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "../modules/user";
import type { UserInfo } from "@/types/user";

describe("stores/modules/user.ts", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("useUserStore", () => {
    it("should initialize with undefined userInfo", () => {
      const store = useUserStore();
      expect(store.userInfo).toBeUndefined();
    });

    describe("setUserInfo", () => {
      it("should set user info correctly", () => {
        const store = useUserStore();
        const mockUser: UserInfo = {
          id: 1,
          nickname: "Test User",
          avatar: "https://example.com/avatar.png",
          role: "user",
          tel: "13800138000",
        };
        store.setUserInfo(mockUser);
        expect(store.userInfo).toEqual(mockUser);
      });
    });

    describe("clearUserInfo", () => {
      it("should clear user info", () => {
        const store = useUserStore();
        store.setUserInfo({
          id: 1,
          nickname: "Test",
          avatar: "",
          role: "user",
          tel: "",
        });
        store.clearUserInfo();
        expect(store.userInfo).toBeUndefined();
      });
    });

    describe("isAdmin", () => {
      it("should return true for root user", () => {
        const store = useUserStore();
        store.setUserInfo({
          id: 1,
          nickname: "Root",
          avatar: "",
          role: "root",
          tel: "",
        });
        expect(store.isAdmin()).toBe(true);
      });

      it("should return true for manager user", () => {
        const store = useUserStore();
        store.setUserInfo({
          id: 1,
          nickname: "Manager",
          avatar: "",
          role: "manager",
          tel: "",
        });
        expect(store.isAdmin()).toBe(true);
      });

      it("should return false for regular user", () => {
        const store = useUserStore();
        store.setUserInfo({
          id: 1,
          nickname: "User",
          avatar: "",
          role: "user",
          tel: "",
        });
        expect(store.isAdmin()).toBe(false);
      });

      it("should return false when no user info", () => {
        const store = useUserStore();
        expect(store.isAdmin()).toBe(false);
      });

      it("should be case insensitive for role check", () => {
        const store = useUserStore();
        store.setUserInfo({
          id: 1,
          nickname: "Root",
          avatar: "",
          role: "ROOT",
          tel: "",
        });
        expect(store.isAdmin()).toBe(true);
      });
    });

    describe("isRoot", () => {
      it("should return true for root user", () => {
        const store = useUserStore();
        store.setUserInfo({
          id: 1,
          nickname: "Root",
          avatar: "",
          role: "root",
          tel: "",
        });
        expect(store.isRoot()).toBe(true);
      });

      it("should return false for manager user", () => {
        const store = useUserStore();
        store.setUserInfo({
          id: 1,
          nickname: "Manager",
          avatar: "",
          role: "manager",
          tel: "",
        });
        expect(store.isRoot()).toBe(false);
      });

      it("should return false for regular user", () => {
        const store = useUserStore();
        store.setUserInfo({
          id: 1,
          nickname: "User",
          avatar: "",
          role: "user",
          tel: "",
        });
        expect(store.isRoot()).toBe(false);
      });
    });
  });
});
