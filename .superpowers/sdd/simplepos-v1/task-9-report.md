# Task 9 Report — Sales History + Detail

Status: COMPLETE — commit `77b4e82`

## Files

- `src/pages/SalesPage.tsx` — replaced placeholder. Title "Sales" (28px JetBrains Mono), subtitle "N sales", date filter (native `<input type="date">` via Input + ghost "All time" clear button when active), newest-first list of Card rows as `Link` to `/sales/:id` (mono timestamp, "N items | RM X.XX" qty-sum meta, payment badge, mono total + chevron), empty states ("No sales yet." / "No sales on this date."), error toast "We couldn't load your data." + retry.
- `src/pages/SaleDetailPage.tsx` — replaced placeholder. Back link (IconBack ghost → /sales), timestamp header + payment badge, snapshot item rows (`productName`, "RM x.xx × q", subtotal) read ONLY from saleItems, totals block (Total 24px mono semibold, "Paid by CASH" muted), notes rendered when present, "Sale not found." empty state. NO delete button (§49).
- `src/pages/__tests__/sales.test.tsx` — 6 tests (list order/qty-sum/badges, date filter + All time clear, empty db, snapshot rename-proof detail + notes + back nav, deactivated product visible §79#12, unknown id).
- `src/styles/sales.css` — new, imported in main.tsx.

## Helper additions

- `src/utils/dates.ts` — `localDateOf(iso)` exported (formatDate now delegates to it).
- `src/utils/currency.ts` — `asCurrency(code)` guard (Sale.currency is a plain string; falls back to MYR).
- `src/components/Badge.tsx` + `components.css` — `slate` variant for CARD badge (CASH neutral / QR accent / CARD slate).

## Tests

125 passed (119 prior + 6 new), 17 files, 0 failures.

## Commands + results

- `npm run typecheck` — clean
- `npm run test` — 125/125 passed
- `npm run build` — success (tsc + vite, PWA precache 8 entries)

## Concerns

- `StoreFacade` lacks `getAllByIndex`; detail page uses the standalone exported fn — fine, could be added to the facade later if needed.
- Group-by-day headings skipped (optional per task; plain list chosen).
- PaymentBadge + PAYMENT_LABEL are duplicated between SalesPage/SaleDetailPage (~12 lines) — extracting a shared component only if a third consumer appears.
- Badge `slate` variant added only because the task explicitly requested a distinct CARD color; visual check in a browser is recommended.
