# Task 10 Report — Expenses + Profit Calculation

## Files

- `src/lib/calculations/profit.ts` — NEW. Pure integer-math helpers (§51):
  - `cogs(saleItems)` = Σ unitCost × quantity (null costs skipped)
  - `hasFullCostData(saleItems)` = items.length > 0 && every unitCost !== null
  - `grossProfit(saleItems)` = null unless full cost data; else Σ (unitPrice − unitCost) × qty
  - `netProfit(saleItems, expenses)` = null unless full cost data; else gross − Σ expense.amount
  - Never "sales − capital". Additive — dashboard.ts untouched.
- `src/pages/ExpensesPage.tsx` — REWROTE placeholder. Header + gold "Add Expense" keycap; summary strip (This month / All time, muted, mono); list newest-first (date string desc, stable sort keeps load order for ties); each row: description, category Badge, date, mono amount, 44px Edit/Delete icon buttons with aria-labels; add/edit modal (Description, Amount via parseMoneyInput, native date input, Select category Stock/Delivery/Packaging/Other default Other); delete confirm modal; EmptyState "No expenses recorded."; load error state with Retry; db errors toast "We couldn't save your changes. Your data has not been cleared."
- `src/styles/expenses.css` — NEW; imported in `src/main.tsx`.
- `src/lib/calculations/profit.test.ts` — NEW, 12 tests.
- `src/pages/__tests__/expenses.test.tsx` — NEW, 7 tests.

## APIs

- `cogs(saleItems): number`
- `hasFullCostData(saleItems): boolean`
- `grossProfit(saleItems): number | null`
- `netProfit(saleItems, expenses: Expense[]): number | null`

## Date-normalization decision

Expense.date is persisted as the native `<input type="date">` value — a local `YYYY-MM-DD` string — exactly what the dashboard already reads (`e.date === todayLocalISO()`, dashboard.ts:69). Rows display the stored string directly rather than passing it through `formatDate()`; `new Date("YYYY-MM-DD")` parses as UTC midnight, which would shift the displayed day for users west of UTC.

## Test counts

- Before: 125 passed. After: 144 passed (12 profit + 7 expenses added). 19 files, all green.

## Commands + results

- `npm run typecheck` — clean (fixed one TS6133 unused const before final run)
- `npm run test` — 144/144 passed
- `npm run build` — tsc + vite build + PWA generateSW, clean

## Concerns

- Dashboard still computes today-profit inline (dashboard.ts). The new helpers are additive; adopting them there is a later refactor, not required for this task.
- List sorting is stable-by-date-only; ties fall back to IndexedDB key order, not insertion time (Expense has no createdAt).
- Summary strip is computed in memory over all expenses — fine at V1 scale.

## Commits

- `79bffba` feat: expenses — CRUD with categories and shared profit calculation helpers
- (docs commit with this report)
