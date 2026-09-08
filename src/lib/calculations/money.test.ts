import { describe, expect, it } from "vitest";
import { change, qtySubtotal, sum } from "./money";

describe("sum", () => {
  it("stays integer-exact for large minor-unit values", () => {
    expect(sum(10000000, 9999999)).toBe(19999999);
    expect(sum(1, 2, 3, 4)).toBe(10);
    expect(sum()).toBe(0);
  });
});

describe("change", () => {
  it("returns the difference when received >= total", () => {
    expect(change(5000, 4550)).toBe(450);
    expect(change(4550, 4550)).toBe(0);
  });

  it("returns null when the payment is short", () => {
    expect(change(4000, 4550)).toBeNull();
  });
});

describe("qtySubtotal", () => {
  it("multiplies unit minor units by quantity", () => {
    expect(qtySubtotal(250, 3)).toBe(750);
    expect(qtySubtotal(0, 10)).toBe(0);
  });
});
