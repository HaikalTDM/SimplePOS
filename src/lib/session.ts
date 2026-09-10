import type { Expense, Sale, SaleItem, Session } from "../types";

// Pure session math (integer minor units). Kept out of the context so the
// numbers are easy to reason about and reuse for both close and history.

export interface SessionTotals {
  sales: number;
  transactions: number;
  items: number;
}

export interface SessionPayments {
  cash: number;
  qr: number;
  card: number;
}

export interface SessionBreakdown {
  totals: SessionTotals;
  payments: SessionPayments;
}

/** Aggregate a set of sales (+ their items) into the close snapshot. */
export function summarizeSales(sales: Sale[], saleItems: SaleItem[]): SessionBreakdown {
  const saleIds = new Set(sales.map((s) => s.id));
  const items = saleItems.filter((i) => saleIds.has(i.saleId));

  const payments: SessionPayments = { cash: 0, qr: 0, card: 0 };
  let salesTotal = 0;
  for (const sale of sales) {
    salesTotal += sale.total;
    payments[sale.paymentMethod] += sale.total;
  }

  return {
    totals: {
      sales: salesTotal,
      transactions: sales.length,
      items: items.reduce((sum, i) => sum + i.quantity, 0),
    },
    payments,
  };
}

/** Expenses recorded on a given local YYYY-MM-DD. */
export function expensesOnDate(expenses: Expense[], localDate: string): Expense[] {
  return expenses.filter((e) => e.date === localDate);
}

/**
 * Cash that should be in the drawer: opening float + cash sales − expenses
 * paid during the session. Expenses aren't tagged with a payment method, so
 * they're all treated as cash out (documented in the UI).
 */
export function expectedCash(
  openingFloat: number | null,
  cashSales: number,
  expenseTotal: number,
): number {
  return (openingFloat ?? 0) + cashSales - expenseTotal;
}

/** Counted − expected. Positive = over, negative = short, null when unknown. */
export function cashDifference(
  countedCash: number | null,
  expected: number | null,
): number | null {
  if (countedCash === null || expected === null) return null;
  return countedCash - expected;
}

/** An empty open session to persist on "Start Sale". */
export function newSession(
  id: string,
  currency: string,
  openingFloat: number | null,
  openedAt: string,
): Session {
  return {
    id,
    openedAt,
    closedAt: null,
    openingFloat,
    countedCash: null,
    expectedCash: null,
    totals: { sales: 0, transactions: 0, items: 0 },
    payments: { cash: 0, qr: 0, card: 0 },
    expenseTotal: 0,
    currency,
  };
}
