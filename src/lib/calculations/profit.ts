// Shared profit math (§51) — integer minor units only. SaleItem snapshots are
// the ONLY cost source (§40); when any cost is missing the answer is null,
// never invented. Dashboard (Task 8) has its own inline copy in dashboard.ts;
// these helpers are additive and it may adopt them later.

import type { Expense, SaleItem } from "../../types";

/** Σ unitCost × quantity over items with a known cost. */
export function cogs(saleItems: SaleItem[]): number {
  return saleItems.reduce(
    (sum, i) => sum + (i.unitCost ?? 0) * i.quantity,
    0
  );
}

export function hasFullCostData(saleItems: SaleItem[]): boolean {
  return saleItems.length > 0 && saleItems.every((i) => i.unitCost !== null);
}

/** Σ (unitPrice − unitCost) × quantity, or null when any cost is missing. */
export function grossProfit(saleItems: SaleItem[]): number | null {
  if (!hasFullCostData(saleItems)) return null;
  return saleItems.reduce(
    (sum, i) => sum + (i.unitPrice - (i.unitCost ?? 0)) * i.quantity,
    0
  );
}

/** grossProfit − Σ expense amounts; null when costs are incomplete. */
export function netProfit(
  saleItems: SaleItem[],
  expenses: Expense[]
): number | null {
  const gross = grossProfit(saleItems);
  if (gross === null) return null;
  return gross - expenses.reduce((sum, e) => sum + e.amount, 0);
}
