import { describe, expect, it } from "vitest";
import {
  endOfDayISO,
  formatDate,
  formatDateTime,
  formatTime,
  startOfDayISO,
  todayLocalISO,
} from "./dates";

describe("formatDate / formatTime / formatDateTime", () => {
  const iso = new Date(2026, 8, 8, 14, 35, 22).toISOString();

  it("formats ISO strings in local time", () => {
    expect(formatDate(iso)).toBe("2026-09-08");
    expect(formatTime(iso)).toBe("14:35");
    expect(formatDateTime(iso)).toBe("2026-09-08 14:35");
  });
});

describe("todayLocalISO", () => {
  it("returns the local date as YYYY-MM-DD", () => {
    const now = new Date();
    const expected =
      `${now.getFullYear()}-` +
      `${String(now.getMonth() + 1).padStart(2, "0")}-` +
      `${String(now.getDate()).padStart(2, "0")}`;
    expect(todayLocalISO()).toBe(expected);
    expect(todayLocalISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("startOfDayISO / endOfDayISO", () => {
  it("brackets a midday timestamp within its local day", () => {
    const midday = new Date(2026, 8, 8, 14, 35, 0);
    const start = new Date(startOfDayISO(midday));
    const end = new Date(endOfDayISO(midday));

    expect(midday.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(midday.getTime()).toBeLessThanOrEqual(end.getTime());
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });
});
