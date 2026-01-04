import { describe, it, expect } from "vitest";
import { formatDuration, formatDate } from "../format";

describe("format.ts", () => {
  describe("formatDuration", () => {
    it("should format 0 seconds as 00:00", () => {
      expect(formatDuration(0)).toBe("00:00");
    });

    it("should format seconds less than 60", () => {
      expect(formatDuration(30)).toBe("00:30");
      expect(formatDuration(59)).toBe("00:59");
    });

    it("should format exactly 60 seconds as 01:00", () => {
      expect(formatDuration(60)).toBe("01:00");
    });

    it("should format minutes and seconds correctly", () => {
      expect(formatDuration(90)).toBe("01:30");
      expect(formatDuration(125)).toBe("02:05");
    });

    it("should handle large values", () => {
      expect(formatDuration(3600)).toBe("60:00");
      expect(formatDuration(3661)).toBe("61:01");
    });

    it("should floor decimal seconds", () => {
      expect(formatDuration(30.7)).toBe("00:30");
      expect(formatDuration(90.9)).toBe("01:30");
    });

    it("should pad single digit values with leading zero", () => {
      expect(formatDuration(5)).toBe("00:05");
      expect(formatDuration(65)).toBe("01:05");
    });
  });

  describe("formatDate", () => {
    it("should format Date object to YYYY-MM-DD", () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      expect(formatDate(date)).toBe("2025-01-15");
    });

    it("should format date string to YYYY-MM-DD", () => {
      expect(formatDate("2025-06-20")).toBe("2025-06-20");
    });

    it("should pad single digit month and day", () => {
      const date = new Date(2025, 4, 5); // May 5, 2025
      expect(formatDate(date)).toBe("2025-05-05");
    });

    it("should handle December correctly", () => {
      const date = new Date(2025, 11, 25); // December 25, 2025
      expect(formatDate(date)).toBe("2025-12-25");
    });

    it("should handle ISO date strings", () => {
      expect(formatDate("2025-03-10T10:30:00Z")).toBe("2025-03-10");
    });
  });
});
