import { describe, expect, it } from "vitest";
import { cogs, grossProfit, hasFullCostData, netProfit } from "./profit";
import type { Expense, SaleItem } from "../../types";

function item(
  id: string,
  qty: number,
  unitPrice: number,
  unitCost: number | null
): SaleItem {
  return {
    id,
    saleId: "s1",
    productId: `p-${id}`,
    productName: id,
    quantity: qty,
    unitPrice,
    unitCost,
    subtotal: unitPrice * qty,
  };
}

function expense(id: string, amount: number): Expense {
  return { id, description: id, amount, category: null, date: "2026-09-08", currency: "MYR" };
}

describe("cogs", () => {
  it("sums unitCost × quantity and ignores null-cost items", () => {
    const items = [
      item("a", 2, 300, 100),
      item("b", 3, 150, null),
      item("c", 1, 500, 250),
    ];
    expect(cogs(items)).toBe(2 * 100 + 1 * 250);
  });

  it("returns 0 for empty items", () => {
    expect(cogs([])).toBe(0);
  });
});

describe("hasFullCostData", () => {
  it("is true when items exist and every unitCost is known", () => {
    expect(hasFullCostData([item("a", 1, 300, 100)])).toBe(true);
  });

  it("is false when any item lacks unitCost", () => {
    expect(hasFullCostData([item("a", 1, 300, 100), item("b", 1, 150, null)])).toBe(false);
  });

  it("is false for empty items", () => {
    expect(hasFullCostData([])).toBe(false);
  });
});

describe("grossProfit", () => {
  it("computes Σ (unitPrice − unitCost) × quantity with integer math", () => {
    const items = [
      item("a", 2, 300, 100),
      item("b", 1, 150, 100),
    ];
    expect(grossProfit(items)).toBe((300 - 100) * 2 + (150 - 100) * 1);
  });

  it("returns null when any cost is missing", () => {
    expect(grossProfit([item("a", 2, 300, 100), item("b", 1, 150, null)])).toBeNull();
  });

  it("returns null for empty items", () => {
    expect(grossProfit([])).toBeNull();
  });

  it("allows negative gross profit", () => {
    expect(grossProfit([item("a", 2, 100, 300)])).toBe(-400);
  });
});

describe("netProfit", () => {
  it("subtracts all expense amounts from gross profit", () => {
    const items = [item("a", 2, 300, 100)];
    const expenses = [expense("e1", 200), expense("e2", 50)];
    expect(netProfit(items, expenses)).toBe(400 - 250);
  });

  it("propagates null when gross profit is null (missing cost)", () => {
    const items = [item("a", 2, 300, null)];
    expect(netProfit(items, [expense("e1", 200)])).toBeNull();
  });

  it("treats empty expenses as zero", () => {
    expect(netProfit([item("a", 2, 300, 100)], [])).toBe(400);
  });
});
