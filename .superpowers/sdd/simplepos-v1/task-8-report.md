# Task 8 Report — Dashboard

Commit: `0418f6e` — feat: dashboard — today's sales hero, quick stats, top sellers, low stock, profit estimate, start-selling CTA, optional walkthrough

## Files

- `src/lib/calculations/dashboard.ts` (new) — pure `todayStats()` + `DashboardStats`/`TopSeller` types. No db access, integer minor-unit math only.
- `src/lib/calculations/dashboard.test.ts` (new) — 11 pure tests.
- `src/pages/DashboardPage.tsx` (replaced placeholder) — full dashboard.
- `src/pages/__tests__/dashboard.test.tsx` (new) — 9 page tests.
- `src/styles/components.css` — appended Dashboard section (hero, start CTA, stats grid, list rows, walkthrough).

## DashboardStats shape

```ts
interface DashboardStats {
  totalSalesMinor: number;      // sum of today's sale totals
  transactionCount: number;     // today's sales count
  itemsSold: number;            // sum of today's saleItems quantities
  topSellers: { name: string; qty: number }[]; // today, top 3 by qty desc
  lowStock: { product: Product }[];           // active, stock <= threshold, 0 first
  profitMinor: number | null;   // gross - today's expenses; null if no sales today or any unitCost null
  expenseTotalMinor: number;    // today's expenses
}
```

## Decisions

- Today-scoping: sales filtered by `timestamp` in `[startOfDayISO(now), endOfDayISO(now)]` (ISO strings compare lexicographically; local timezone per §83). Expenses filtered by `expense.date === todayLocalISO()` (date field is local `YYYY-MM-DD` per Expense type).
- Profit (§51): `gross = Σ (unitPrice − unitCost) × qty` over today's items (historical snapshots only, §40); `profitMinor = gross − today's expenses`. Null when ANY today item has `unitCost === null` OR no sales today — never invented (§21). Negative allowed (honest).
- Low stock (§46): active products only, `stock ≤ threshold`, sorted 0-first then ascending; inactive products excluded (cannot be sold, so not a stock concern). Badges: 0 → error "OUT OF STOCK", <5 → error "Very low", else gold "Low". Card omitted entirely when empty (§71).
- Top sellers: Map aggregation preserves first-seen order; JS stable sort keeps ties in that order; slice 3.
- `todayStats` signature keeps `currency` per task spec but it's unused (`_currency`) — math is currency-agnostic minor units. noUnusedParameters satisfied.
- Hero amount uses `--gold-deep` (the AA amber text shade already in the design system) rather than raw `--accent-gold` (#C99A4A on white ≈ 2.9:1, fails large-text AA).
- Walkthrough (§11): session-only `useState(true)`, never persisted, X dismisses, ghost "Show me around" toggles 4 inline hint sentences, gold "Start selling" → /pos. Never blocks.
- START SELLING: `Link` styled with existing `keycap-btn` classes (PosPage empty-state pattern), full-width mobile / inline desktop, 56px min-height.
- On mount: `ProductsContext.refresh()` + parallel load of sales/saleItems/products/expenses; failure → error card + toast "We couldn't load your data." + Retry; loading shows muted "…".
- All money via `formatMoney(..., stall.currency ?? "MYR")` — no hardcoded RM.

## Test counts

- `dashboard.test.ts`: 11 (empty inputs, today-only filter, transactions/items counts, top-3 ties stable, profit all-costs, profit null on missing cost, profit null on no sales, negative profit, today-only expenses, low-stock filter+sort, threshold change + inactive exclusion).
- `dashboard.test.tsx`: 9 (hero total, quick stats, top seller "Milo — 15 sold", low stock badges, card omitted when none, START SELLING → /pos, walkthrough dismiss, walkthrough hints, empty db zero state).
- Total: 119 passed (99 existing + 20 new), 0 failures.

## Commands + results

- `npm run typecheck` — clean.
- `npm run test` — 16 files, 119/119 passed.
- `npm run build` — clean (tsc + vite, PWA precache 8 entries).

## Concerns

- Low-stock excludes inactive products (judgment call, documented above) — easy to change if product owner wants inactive stock listed.
- Dashboard loads all sales/saleItems into memory and filters in JS (`getAll` + in-memory filter); fine at V1 scale, ponytail note: add timestamp-range index queries only if history grows.
- The "0 transactions · 0 items" hero meta uses `txnLabel`/`itemLabel` helpers for singular/plural.
