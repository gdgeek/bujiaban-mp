import { describe, it, expect } from "vitest";
import { calculateHash, buildAuthHeader } from "../common";

describe("common.ts", () => {
  describe("calculateHash", () => {
    it("should generate a hash string", () => {
      const hash = calculateHash("token123", "1234567890", "user123");
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(32); // MD5 hash length
    });

    it("should generate different hashes for different inputs", () => {
      const hash1 = calculateHash("token1", "1234567890", "user1");
      const hash2 = calculateHash("token2", "1234567890", "user1");
      expect(hash1).not.toBe(hash2);
    });

    it("should generate consistent hashes for same inputs", () => {
      const hash1 = calculateHash("token", "time", "user");
      const hash2 = calculateHash("token", "time", "user");
      expect(hash1).toBe(hash2);
    });
  });

  describe("buildAuthHeader", () => {
    it("should return an object", () => {
      const header = buildAuthHeader();
      expect(header).toBeDefined();
      expect(typeof header).toBe("object");
    });
  });
});
