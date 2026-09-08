// Pure, integer-only dashboard math (§58) — no db access, no Date side effects
// beyond reading "now" through startOfDayISO/endOfDayISO (local timezone, §83).
// The page loads rows from IndexedDB and passes them in.

import type { Currency, Expense, Product, Sale, SaleItem } from "../../types";
import { endOfDayISO, startOfDayISO, todayLocalISO } from "../../utils/dates";

export interface TopSeller {
  name: string;
  qty: number;
}

export interface DashboardStats {
  /** Sum of today's sale totals, integer minor units. */
  totalSalesMinor: number;
  transactionCount: number;
  itemsSold: number;
  /** Today's saleItems aggregated by productName, top 3 by qty desc (§21). */
  topSellers: TopSeller[];
  /** Active products with stock <= threshold, out-of-stock first (§46). */
  lowStock: { product: Product }[];
  /**
   * Estimated net profit (§51): gross - today's expenses. Null when there are
   * no sales today OR any today item lacks unitCost — never invented (§21).
   */
  profitMinor: number | null;
  /** Today's expenses, integer minor units. */
  expenseTotalMinor: number;
}

function isTodayTimestamp(timestamp: string): boolean {
  const start = startOfDayISO(new Date());
  const end = endOfDayISO(new Date());
  return timestamp >= start && timestamp <= end;
}

export function todayStats(
  sales: Sale[],
  saleItems: SaleItem[],
  products: Product[],
  expenses: Expense[],
  threshold: number,
  _currency: Currency
): DashboardStats {
  const todaySales = sales.filter((s) => isTodayTimestamp(s.timestamp));
  const todayIds = new Set(todaySales.map((s) => s.id));
  const todayItems = saleItems.filter((i) => todayIds.has(i.saleId));

  const totalSalesMinor = todaySales.reduce((sum, s) => sum + s.total, 0);
  const itemsSold = todayItems.reduce((sum, i) => sum + i.quantity, 0);

  const byName = new Map<string, number>();
  for (const item of todayItems) {
    byName.set(item.productName, (byName.get(item.productName) ?? 0) + item.quantity);
  }
  // Array.sort is stable: equal qty keeps first-seen (map insertion) order.
  const topSellers: TopSeller[] = [...byName.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3);

  const lowStock = products
    .filter((p) => p.active && p.stock <= threshold)
    .sort((a, b) => a.stock - b.stock)
    .map((product) => ({ product }));

  const expenseTotalMinor = expenses
    .filter((e) => e.date === todayLocalISO())
    .reduce((sum, e) => sum + e.amount, 0);

  let profitMinor: number | null = null;
  if (todayItems.length > 0 && todayItems.every((i) => i.unitCost !== null)) {
    const gross = todayItems.reduce(
      (sum, i) => sum + (i.unitPrice - (i.unitCost ?? 0)) * i.quantity,
      0
    );
    profitMinor = gross - expenseTotalMinor;
  }

  return {
    totalSalesMinor,
    transactionCount: todaySales.length,
    itemsSold,
    topSellers,
    lowStock,
    profitMinor,
    expenseTotalMinor,
  };
}
