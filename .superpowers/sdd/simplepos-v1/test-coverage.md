# SimplePOS V1 — Test Coverage Matrix (Task 14)

Maps SPEC §78 (test checklist) and §79 (15 mandatory data-integrity tests) to the
test file + test name that covers each item. Generated after the Task 14 testing
pass: 187 tests, 3/3 consecutive clean full-suite runs.

## §79 — Data Integrity Tests (mandatory)

| # | Requirement | Covered by |
|---|---|---|
| 1 | Adding an item to cart does not change stock | `src/pages/__tests__/pos.test.tsx` — "never touches stock: add, edit, decrement and remove leave the db unchanged" |
| 2 | Removing an item from cart does not change stock | same test (decrement + remove steps end with stock assertion) |
| 3 | Failed payment does not change stock | `src/lib/checkout/checkout.test.ts` — "rolls back everything when quantity exceeds stock" (+ ghost-product and inactive-product rollback tests); `src/components/__tests__/payment.test.tsx` — "failure mid-payment: error toast, warning, cart intact, modal stays open" (asserts stock unchanged at 1, 0 sales, 0 movements — strengthened in Task 14) |
| 4 | Successful payment decreases stock exactly once | `src/lib/checkout/checkout.test.ts` — "completes a sale: snapshot saleItems, exact total, stock decrease, movements" (10→8, 5→4) and "is atomic once: a second checkout of the same cart fails and adds no rows" (stock stays 0); `src/components/__tests__/payment.test.tsx` — "cash: empty received + CONFIRM PAID…" (10→9) |
| 5 | Sale is created exactly once | `src/lib/checkout/checkout.test.ts` — "is atomic once…" (salesDb.count === 1 after second attempt fails) |
| 6 | SaleItems are created exactly once | same test (saleItemsDb.count === 1) |
| 7 | Stock movements are created exactly once | same test (stockMovementsDb.count === 1) |
| 8 | Cart clears only after successful checkout | `src/components/__tests__/payment.test.tsx` — "success path calls onSuccess and clears the cart" + "failure mid-payment…" (cart intact on failure) |
| 9 | Historical product name remains unchanged after rename | `src/lib/checkout/checkout.test.ts` — "keeps original snapshot values after the product is renamed and repriced (§79)"; `src/pages/__tests__/sales.test.tsx` — "renders historical snapshot rows, totals, payment method, and notes…" (product renamed to "Milo Ice", sale still shows "Milo") |
| 10 | Historical selling price remains unchanged after price change | `src/lib/checkout/checkout.test.ts` — "keeps original snapshot values…" (unitPrice stays 300 after repricing to 999) |
| 11 | Historical cost remains unchanged after cost price change | same test (unitCost stays 120 after change to 5) |
| 12 | Deactivated products remain visible in old sales | `src/pages/__tests__/sales.test.tsx` — "shows a deactivated product inside the sale detail (data integrity #12)" |
| 13 | Database updates do not erase existing data | `src/lib/db/database.test.ts` — "preserves data across close/reopen at the same version" + "runs a registered migration on version bump and preserves data" |
| 14 | Invalid backup does not destroy current data | `src/lib/backup/backup.test.ts` — "importBackup validation failures never touch existing data" (11 mutation cases incl. invalid JSON, wrong app, wrong/missing version, broken relationships, negative money, non-integer stock, duplicate ids, bad timestamps) + `src/pages/__tests__/settings.test.tsx` — "rejects garbage import with the verbatim error and keeps existing data" |
| 15 | Imported backup restores all required data | `src/lib/backup/backup.test.ts` — "restores every store, including the QR image as a Blob" + `src/pages/__tests__/settings.test.tsx` — "imports a valid backup, restores stores, and shows the summary" |

All 15 §79 items are covered. Item 3 was strengthened in Task 14 with explicit
stock + movement assertions at the UI level (previously covered only via the
checkout service rollback tests).

## §78 — Test Checklist

### Onboarding (`src/pages/__tests__/onboarding.test.tsx` unless noted)

| Area | Test |
|---|---|
| First launch | "renders step 1 on first load"; `src/components/__tests__/appgate.test.tsx` — "redirects to onboarding when the db is empty" / "redirects an unfinished stall to onboarding" |
| Required validation | "shows required error on empty name and does not advance" + "shows max-length error for a 51-char stall name" |
| Skip products | "Skip for now goes straight to payment methods" |
| Add products | "adds products with minor-unit prices and default stock 10" |
| QR upload | "accepts a PNG QR image and shows a preview; rejects bad types" |
| Payment toggle validation | Structural: Cash has no off switch (onboarding + settings), so §10 "at least one method enabled" cannot be violated; invariant asserted by `settings.test.tsx` — "persists card off, keeps cash on, and shows the Always available badge" and `onboarding.test.tsx` — "Let's go! …" (cash === true) |
| Completion | "Let's go! creates the stall, stores the QR blob, and navigates to POS" |

### Products (`src/pages/__tests__/products.test.tsx` unless noted)

| Area | Test |
|---|---|
| Create | "adds a product with minor-unit price and stock" (also onboarding add-products test) |
| Edit | "edits a product and persists the changes" |
| Deactivate | "deactivates a product and shows the Inactive badge" + "reactivates a deactivated product"; deletion guard: "hides Delete for products with sales but keeps Deactivate" |
| Stock adjustment | "adjusts stock up atomically with a manual_add movement" + "records a manual_reduce movement with a positive quantity" |
| Category | **NEW (Task 14)** "adds a product with a category and cost price (§78)" + "edits a product's category and cost price (§78)"; POS-side: `pos.test.tsx` — "filters by category; All shows uncategorized products" |
| Cost price | **NEW (Task 14)** same two tests (create with cost 1.80 → 180 minor; edit 2.25 → 225 minor) |

### POS (`src/pages/__tests__/pos.test.tsx`)

| Area | Test |
|---|---|
| Add product | "adds a product with one tap: badge 1 and formatted total" |
| Repeated product | "increments on repeat taps and blocks at the stock cap with a toast" |
| Quantity changes | "edits quantity inline and clamps to available stock" |
| Remove item | "decrements with minus, removes the row at 1, and deletes directly" |
| Search | "filters by name case-insensitively and clears back" |
| Category filtering | "filters by category; All shows uncategorized products" |
| Out of stock | "shows OUT OF STOCK and does not add when clicked" |
| Insufficient stock | "increments on repeat taps and blocks at the stock cap with a toast" |

### Checkout (`src/components/__tests__/payment.test.tsx` + `src/lib/checkout/checkout.test.ts`)

| Area | Test |
|---|---|
| Cash | payment — "cash: empty received + CONFIRM PAID…", "cash: received below the total…", "cash: received above the total shows the change…" |
| QR | payment — "qr: shows the confirmation text and records paymentMethod qr"; "qr without an image shows the no-image message" |
| Card | payment — "card: records paymentMethod card" |
| Correct totals | checkout — "completes a sale…" (300×2 + 250 = 850); payment cash tests (300, 600) |
| Correct stock decrease | checkout — "completes a sale…" (10→8, 5→4); payment — cash (10→9) |
| Correct sale creation | checkout — "completes a sale…" (sale row matches result) |
| Correct SaleItems | checkout — "completes a sale…" (names, quantities, unitPrice/unitCost/subtotal snapshots) |
| Correct StockMovements | checkout — "completes a sale…" (type "sale", quantity, saleId, timestamp) |
| Cart cleared only after success | payment — "success path calls onSuccess and clears the cart" + "failure mid-payment…" |

### Dashboard (`src/pages/__tests__/dashboard.test.tsx` + `src/lib/calculations/dashboard.test.ts`)

| Area | Test |
|---|---|
| Sales | "shows today's formatted total in the hero" |
| Transactions | "shows quick stats: transactions, items sold, estimated profit" |
| Items sold | same test |
| Top sellers | "lists today's top seller with quantity sold" (lib: aggregation/ties/top-3 tests) |
| Low stock | "shows low stock products with warning badges" + "omits the low stock card when everything is above threshold" (lib: threshold/inactive sorting tests) |
| Profit | "shows quick stats…" (RM 7.50); empty state "renders the empty state…" ("Add product costs to estimate"); lib dashboard + `src/lib/calculations/profit.test.ts` |

### Expenses (`src/pages/__tests__/expenses.test.tsx` unless noted)

| Area | Test |
|---|---|
| Add | "adds an expense with minor-unit amount and local date" |
| Edit (implemented) | "edits an expense and persists the changes" |
| Delete | "deletes an expense after confirmation" + "keeps the expense when delete is cancelled" |
| Date | "adds an expense…" (date === todayLocalISO) + "sorts expenses newest-first by date" |
| Category | "adds an expense…" (category "Stock" persisted) |
| Profit calculation | `src/lib/calculations/dashboard.test.ts` — "computes profit as gross minus today's expenses when all costs exist" (+ `profit.test.ts` netProfit/cogs suites) |

### Backup (`src/lib/backup/backup.test.ts` + `src/pages/__tests__/settings.test.tsx`)

| Area | Test |
|---|---|
| Export | backup — "snapshots every store with app/formatVersion/exportedAt…", "buildBackupFile names the file…"; settings — "exports a backup with the SimplePOS-Backup filename and toasts" |
| Import | backup — "restores every store, including the QR image as a Blob"; settings — "imports a valid backup, restores stores, and shows the summary" |
| Invalid JSON | backup — "rejects invalid JSON"; settings — "rejects garbage import with the verbatim error and keeps existing data" |
| Wrong version | backup — "rejects a wrong format version" + "rejects a missing format version" |
| Corrupt data | backup — mutation suite: negative money, non-integer stock, duplicate ids, non-ISO timestamps, saleItems→sale and movements→product reference breaks, missing stall |
| Restore | backup — "restores every store…" |
| Safety backup | backup — "stores a safety snapshot of current data before replacing it" |

### Offline (§78 Offline) — NOT testable in jsdom

No real network or service worker in jsdom. Covered instead by `scripts/verify-pwa.mjs`
(`npm run verify:pwa`), which asserts the built `dist/` contains the service worker,
manifest, and precached assets for all app routes. Actual offline POS/checkout/backup
operation requires manual device testing — one-line justification: jsdom cannot
simulate SW interception or network loss, and the app performs no network calls
(verified by the architecture — all data flows through IndexedDB).

### Responsive (§78 Responsive) — partially testable

jsdom has no layout engine and `window.matchMedia` is unimplemented (PosPage guards
for it), so viewport CSS at 320/375/414/768/tablet-landscape/desktop cannot be
asserted. Component-level mobile behavior IS tested:
`src/components/__tests__/components.test.tsx` — "opens the More sheet with Settings
link from MobileNav"; `src/layouts/__tests__/applayout.test.tsx` — "renders the
mobile nav with Home, Sell, Sales and More". Actual viewport rendering requires
manual/browser testing.

## Items NOT covered (gaps)

| Gap | Resolution |
|---|---|
| §78 Products: Category (form-level) | **Filled in Task 14** — 2 new tests in `products.test.tsx` |
| §78 Products: Cost price (form-level) | **Filled in Task 14** — same 2 new tests |
| §79.3 failed payment: explicit stock/movement assertions at UI level | **Filled in Task 14** — strengthened `payment.test.tsx` failure test |
| §78 Offline | Not testable in jsdom — `verify:pwa` script + manual testing (see above) |
| §78 Responsive viewport CSS | Not testable in jsdom — component-level nav tests + manual testing (see above) |

## Test counts

- Before Task 14: 185 tests (22 files)
- After Task 14: 187 tests (22 files) — 2 new products tests; no test removed or weakened
