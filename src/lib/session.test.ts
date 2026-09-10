import { describe, expect, it } from "vitest";
import type { Expense, Sale, SaleItem } from "../types";
import {
  cashDifference,
  cashExpensesOnDate,
  expectedCash,
  expensesOnDate,
  newSession,
  summarizeSales,
} from "./session";

const sales: Sale[] = [
  { id: "s1", timestamp: "2026-09-08T02:00:00.000Z", total: 1000, paymentMethod: "cash", currency: "MYR" },
  { id: "s2", timestamp: "2026-09-08T02:05:00.000Z", total: 500, paymentMethod: "qr", currency: "MYR" },
  { id: "s3", timestamp: "2026-09-08T02:10:00.000Z", total: 300, paymentMethod: "card", currency: "MYR" },
];

const items: SaleItem[] = [
  { id: "i1", saleId: "s1", productId: "p1", productName: "Milo", quantity: 2, unitPrice: 300, unitCost: 100, subtotal: 600 },
  { id: "i2", saleId: "s1", productId: "p2", productName: "Teh", quantity: 1, unitPrice: 400, unitCost: null, subtotal: 400 },
  { id: "i3", saleId: "s2", productId: "p1", productName: "Milo", quantity: 1, unitPrice: 500, unitCost: 100, subtotal: 500 },
];

describe("summarizeSales", () => {
  it("totals sales, counts transactions, sums item quantities, splits payments", () => {
    const { totals, payments } = summarizeSales(sales, items);
    expect(totals).toEqual({ sales: 1800, transactions: 3, items: 4 });
    expect(payments).toEqual({ cash: 1000, qr: 500, card: 300 });
  });

  it("ignores items from sales not in the set", () => {
    const { totals } = summarizeSales([sales[0]], items);
    expect(totals.transactions).toBe(1);
    expect(totals.items).toBe(3);
  });

  it("handles an empty session", () => {
    expect(summarizeSales([], items)).toEqual({
      totals: { sales: 0, transactions: 0, items: 0 },
      payments: { cash: 0, qr: 0, card: 0 },
    });
  });
});

describe("expectedCash", () => {
  it("adds the float, adds cash sales, subtracts drawer expenses", () => {
    expect(expectedCash(5000, 1000, 300)).toBe(5700);
  });

  it("treats a null float as zero", () => {
    expect(expectedCash(null, 1000, 0)).toBe(1000);
  });
});

describe("cashDifference", () => {
  it("is counted minus expected and can be negative", () => {
    expect(cashDifference(5700, 5700)).toBe(0);
    expect(cashDifference(5800, 5700)).toBe(100);
    expect(cashDifference(5600, 5700)).toBe(-100);
  });

  it("is null when either side is unknown", () => {
    expect(cashDifference(null, 5700)).toBeNull();
    expect(cashDifference(5700, null)).toBeNull();
  });
});

describe("expense date filtering", () => {
  const expenses: Expense[] = [
    { id: "e1", description: "Sugar", amount: 500, category: "Stock", date: "2026-09-08", currency: "MYR", paidFromDrawer: true },
    { id: "e2", description: "Card fee", amount: 200, category: "Other", date: "2026-09-08", currency: "MYR", paidFromDrawer: false },
    { id: "e3", description: "Old", amount: 999, category: "Other", date: "2026-09-07", currency: "MYR" },
  ];

  it("expensesOnDate returns all on that day", () => {
    expect(expensesOnDate(expenses, "2026-09-08")).toHaveLength(2);
  });

  it("cashExpensesOnDate excludes non-cash and other days, keeps undefined as cash", () => {
    const cash = cashExpensesOnDate(expenses, "2026-09-08");
    expect(cash.map((e) => e.id)).toEqual(["e1"]);
    // An expense with no flag counts as cash (older records).
    expect(cashExpensesOnDate(expenses, "2026-09-07").map((e) => e.id)).toEqual(["e3"]);
  });
});

describe("newSession", () => {
  it("creates an open session with zeroed totals", () => {
    const session = newSession("sess-1", "MYR", 5000, "2026-09-08T00:00:00.000Z");
    expect(session.closedAt).toBeNull();
    expect(session.openingFloat).toBe(5000);
    expect(session.countedCash).toBeNull();
    expect(session.totals).toEqual({ sales: 0, transactions: 0, items: 0 });
    expect(session.payments).toEqual({ cash: 0, qr: 0, card: 0 });
  });
});
