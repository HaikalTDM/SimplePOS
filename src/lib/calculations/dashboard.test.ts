import { describe, expect, it } from "vitest";
import { todayStats } from "./dashboard";
import type { Expense, Product, Sale, SaleItem } from "../../types";
import { formatDate, todayLocalISO } from "../../utils/dates";

function ts(dayOffset: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 30, 0, 0);
  return d.toISOString();
}

function sale(id: string, total: number, timestamp: string): Sale {
  return { id, timestamp, total, paymentMethod: "cash", currency: "MYR" };
}

function item(
  id: string,
  saleId: string,
  productName: string,
  qty: number,
  unitPrice: number,
  unitCost: number | null
): SaleItem {
  return { id, saleId, productId: `p-${productName}`, productName, quantity: qty, unitPrice, unitCost, subtotal: unitPrice * qty };
}

function product(id: string, name: string, stock: number, active = true): Product {
  const now = new Date().toISOString();
  return { id, name, sellingPrice: 100, costPrice: 50, stock, category: null, active, createdAt: now, updatedAt: now };
}

function expense(id: string, amount: number, date: string): Expense {
  return { id, description: id, amount, category: null, date, currency: "MYR" };
}

describe("todayStats", () => {
  it("returns zeros and nulls for empty inputs", () => {
    const stats = todayStats([], [], [], [], 10, "MYR");
    expect(stats).toEqual({
      totalSalesMinor: 0,
      transactionCount: 0,
      itemsSold: 0,
      topSellers: [],
      lowStock: [],
      profitMinor: null,
      expenseTotalMinor: 0,
    });
  });

  it("filters to today's sales only (local timezone)", () => {
    const stats = todayStats(
      [sale("today", 1000, ts(0, 9)), sale("yesterday", 500, ts(-1, 9))],
      [],
      [],
      [],
      10,
      "MYR"
    );
    expect(stats.totalSalesMinor).toBe(1000);
    expect(stats.transactionCount).toBe(1);
  });

  it("counts transactions and sums items sold across today's sales only", () => {
    const stats = todayStats(
      [sale("a", 300, ts(0, 8)), sale("b", 700, ts(0, 11)), sale("c", 900, ts(-1, 12))],
      [
        item("i1", "a", "Milo", 2, 100, 50),
        item("i2", "b", "Teh", 3, 100, 50),
        item("i3", "c", "Old", 10, 100, 50),
      ],
      [],
      [],
      10,
      "MYR"
    );
    expect(stats.transactionCount).toBe(2);
    expect(stats.itemsSold).toBe(5);
    expect(stats.totalSalesMinor).toBe(1000);
  });

  it("aggregates top sellers by qty desc, top 3, ties keep first-seen order", () => {
    const stats = todayStats(
      [sale("s", 0, ts(0, 9))],
      [
        item("i1", "s", "A", 5, 100, 50),
        item("i2", "s", "B", 10, 100, 50),
        item("i3", "s", "C", 3, 100, 50),
        item("i4", "s", "D", 8, 100, 50),
        item("i5", "s", "E", 5, 100, 50),
      ],
      [],
      [],
      10,
      "MYR"
    );
    expect(stats.topSellers).toEqual([
      { name: "B", qty: 10 },
      { name: "D", qty: 8 },
      { name: "A", qty: 5 },
    ]);
  });

  it("computes profit as gross minus today's expenses when all costs exist", () => {
    const stats = todayStats(
      [sale("s", 450, ts(0, 9))],
      [
        item("i1", "s", "Milo", 2, 300, 100),
        item("i2", "s", "Teh", 1, 150, 100),
      ],
      [],
      [expense("e1", 200, todayLocalISO())],
      10,
      "MYR"
    );
    // gross = (300-100)*2 + (150-100)*1 = 450; net = 450 - 200
    expect(stats.profitMinor).toBe(250);
    expect(stats.expenseTotalMinor).toBe(200);
  });

  it("returns null profit when any today item lacks unitCost", () => {
    const stats = todayStats(
      [sale("s", 450, ts(0, 9))],
      [
        item("i1", "s", "Milo", 2, 300, 100),
        item("i2", "s", "Teh", 1, 150, null),
      ],
      [],
      [],
      10,
      "MYR"
    );
    expect(stats.profitMinor).toBeNull();
  });

  it("returns null profit when there are no sales today", () => {
    const stats = todayStats(
      [sale("old", 450, ts(-1, 9))],
      [item("i1", "old", "Milo", 2, 300, 100)],
      [],
      [expense("e1", 500, todayLocalISO())],
      10,
      "MYR"
    );
    expect(stats.profitMinor).toBeNull();
  });

  it("allows negative profit (honest estimate, never clamped)", () => {
    const stats = todayStats(
      [sale("s", 200, ts(0, 9))],
      [item("i1", "s", "Milo", 2, 100, 300)],
      [],
      [],
      10,
      "MYR"
    );
    expect(stats.profitMinor).toBe(-400);
  });

  it("sums only today's expenses by local date", () => {
    const stats = todayStats(
      [],
      [],
      [],
      [expense("today", 300, todayLocalISO()), expense("yday", 999, formatDate(ts(-1, 12)))],
      10,
      "MYR"
    );
    expect(stats.expenseTotalMinor).toBe(300);
  });

  it("collects low stock at or below threshold, 0 first then stock asc", () => {
    const stats = todayStats(
      [],
      [],
      [
        product("p1", "Milo", 20),
        product("p2", "Kuih", 0),
        product("p3", "Teh", 4),
        product("p4", "Roti", 10),
        product("p5", "Cake", 3),
      ],
      [],
      10,
      "MYR"
    );
    expect(stats.lowStock.map((e) => [e.product.name, e.product.stock])).toEqual([
      ["Kuih", 0],
      ["Cake", 3],
      ["Teh", 4],
      ["Roti", 10],
    ]);
  });

  it("respects a changed threshold and excludes inactive products", () => {
    const products = [
      product("p1", "Milo", 5),
      product("p2", "Kuih", 0),
      product("p3", "Hidden", 2, false),
    ];
    expect(todayStats([], [], products, [], 4, "MYR").lowStock.map((e) => e.product.name)).toEqual([
      "Kuih",
    ]);
    expect(todayStats([], [], products, [], 10, "MYR").lowStock.map((e) => e.product.name)).toEqual([
      "Kuih",
      "Milo",
    ]);
  });
});
