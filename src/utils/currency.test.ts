import { describe, expect, it } from "vitest";
import {
  CURRENCIES,
  formatMoney,
  fromMinorUnits,
  parseMoneyInput,
  toMinorUnits,
} from "./currency";

describe("toMinorUnits / fromMinorUnits", () => {
  it("round-trips MYR values with 2 decimals", () => {
    expect(toMinorUnits("45.5", "MYR")).toBe(4550);
    expect(fromMinorUnits(4550, "MYR")).toBe(45.5);
    expect(toMinorUnits("0.99", "MYR")).toBe(99);
    expect(fromMinorUnits(99, "MYR")).toBe(0.99);
    expect(toMinorUnits("45", "MYR")).toBe(4500);
    expect(fromMinorUnits(4500, "MYR")).toBe(45);
  });

  it("rounds excess decimals half-up using string math", () => {
    expect(toMinorUnits("45.505", "MYR")).toBe(4551);
    expect(toMinorUnits("45.504", "MYR")).toBe(4550);
  });

  it("treats IDR/VND as 0-decimal and rounds half up", () => {
    expect(CURRENCIES.IDR.decimals).toBe(0);
    expect(CURRENCIES.VND.decimals).toBe(0);
    expect(toMinorUnits("45.5", "IDR")).toBe(46);
    expect(toMinorUnits("45.4", "IDR")).toBe(45);
    expect(toMinorUnits("45.5", "VND")).toBe(46);
  });

  it("accepts numbers as well as strings", () => {
    expect(toMinorUnits(45.5, "MYR")).toBe(4550);
    expect(toMinorUnits(45, "MYR")).toBe(4500);
    expect(toMinorUnits(0.1 + 0.2, "MYR")).toBe(30);
  });
});

describe("formatMoney", () => {
  it("formats symbol, thousands separators and currency decimals", () => {
    expect(formatMoney(4550, "MYR")).toBe("RM 45.50");
    expect(formatMoney(45500, "IDR")).toBe("Rp 45.500");
    expect(formatMoney(45000, "VND")).toBe("₫ 45.000");
    expect(formatMoney(123450, "SGD")).toBe("S$ 1,234.50");
    expect(formatMoney(500, "THB")).toBe("฿ 5.00");
  });

  it("shows no decimal fraction for 0-decimal currencies", () => {
    expect(formatMoney(0, "IDR")).toBe("Rp 0");
    expect(formatMoney(45, "VND")).toBe("₫ 45");
  });
});

describe("parseMoneyInput", () => {
  it("returns null for empty or invalid input", () => {
    expect(parseMoneyInput("", "MYR")).toBeNull();
    expect(parseMoneyInput("   ", "MYR")).toBeNull();
    expect(parseMoneyInput("abc", "MYR")).toBeNull();
    expect(parseMoneyInput("12abc", "MYR")).toBeNull();
    expect(parseMoneyInput("-5", "MYR")).toBeNull();
  });

  it("parses valid decimal strings into minor units", () => {
    expect(parseMoneyInput("45.5", "MYR")).toBe(4550);
    expect(parseMoneyInput("45", "MYR")).toBe(4500);
    expect(parseMoneyInput("45.505", "MYR")).toBe(4551);
  });
});
