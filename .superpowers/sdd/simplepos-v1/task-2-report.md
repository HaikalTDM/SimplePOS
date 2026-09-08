# Task 2 Report — Data Layer

## Status: DONE

## Files created

| File | Purpose |
|---|---|
| `src/types/index.ts` | Domain models (spec §57 + StockMovement §44 + Backup §59) |
| `src/utils/currency.ts` | Currency metadata, minor-unit conversion, formatting, parsing |
| `src/utils/dates.ts` | Local-timezone date formatting + day boundaries (§83) |
| `src/utils/id.ts` | UUID via crypto.randomUUID with fallback |
| `src/utils/filename.ts` | Backup filename sanitization (§60) |
| `src/lib/calculations/money.ts` | Integer minor-unit math helpers |
| `src/lib/db/database.ts` | DB name/version, store constants, MIGRATIONS, openDatabase/closeDatabase |
| `src/lib/db/promise.ts` | IDB request/transaction promisification |
| `src/lib/db/stores.ts` | Generic store helpers + typed facades + resetAllData |
| `src/lib/db/index.ts` | Barrel re-export |
| `src/lib/validation/product.ts` | validateProduct |
| `src/utils/currency.test.ts` | 8 tests |
| `src/lib/calculations/money.test.ts` | 4 tests |
| `src/utils/dates.test.ts` | 3 tests |
| `src/lib/db/database.test.ts` | 5 tests |
| `src/lib/validation/product.test.ts` | 7 tests |

## Public API surface (CONTRACT for later tasks)

### `src/types/index.ts`
- `type PaymentMethod = "cash" | "qr" | "card"`
- `type StockMovementType = "sale" | "adjustment" | "manual_add" | "manual_reduce"`
- `type Currency = "MYR" | "SGD" | "PHP" | "THB" | "IDR" | "VND"`
- `interface Product { id, name, sellingPrice, costPrice, stock, category, active, createdAt, updatedAt }`
- `interface Sale { id, timestamp, total, paymentMethod, currency, notes? }`
- `interface SaleItem { id, saleId, productId, productName, quantity, unitPrice, unitCost, subtotal }`
- `interface Expense { id, description, amount, category, date, currency }`
- `interface Stall { id, name, currency: Currency, businessType, paymentMethods: { cash: boolean; qr: { enabled: boolean; image: Blob | null }; card: boolean }, lowStockThreshold, onboardingCompletedAt, createdAt, updatedAt }`
- `interface StockMovement { id, productId, type, quantity, reason?, timestamp, saleId? }`
- `interface Backup { app: "SimplePOS", formatVersion, exportedAt, stall: Stall | null, products, sales, saleItems, stockMovements, expenses }`

Money fields are INTEGER MINOR UNITS (sellingPrice, costPrice, unitPrice, unitCost, subtotal, total, amount). Dates are ISO strings. Sale.currency/Expense.currency stay `string` per spec §57 verbatim; Stall.currency is narrowed to `Currency`.

### `src/utils/currency.ts`
- `CURRENCIES: Record<Currency, { decimals, symbol, locale }>` — MYR/SGD/PHP/THB = 2 decimals; IDR/VND = 0. Symbols: RM, S$, ₱, ฿, Rp, ₫.
- `toMinorUnits(value: string | number, code: Currency): number` — string-safe, rounds half-up.
- `fromMinorUnits(minor: number, code: Currency): number` — display math only.
- `formatMoney(minor: number, code: Currency): string` — e.g. `"RM 45.50"`, `"Rp 45.500"`.
- `parseMoneyInput(raw: string, code: Currency): number | null` — null when empty/invalid.

### `src/utils/dates.ts`
- `formatDate(iso): string` — "YYYY-MM-DD" local
- `formatTime(iso): string` — "HH:mm" local
- `formatDateTime(iso): string` — "YYYY-MM-DD HH:mm" local
- `todayLocalISO(): string`
- `startOfDayISO(date: Date): string`, `endOfDayISO(date: Date): string` — for today-sale filtering, local tz.

### `src/utils/id.ts`
- `newId(): string`

### `src/utils/filename.ts`
- `sanitizeFilename(name: string): string` — safe chars, trim, ≤50 chars, fallback "SimplePOS".

### `src/lib/calculations/money.ts`
- `sum(...values: number[]): number`
- `change(received: number, total: number): number | null`
- `qtySubtotal(unitMinor: number, qty: number): number`

### `src/lib/db/index.ts` (barrel; all names below importable from here)
- `DB_NAME = "simplepos"`, `DB_VERSION = 1`
- `STORE_STALL/STORE_PRODUCTS/STORE_SALES/STORE_SALE_ITEMS/STORE_STOCK_MOVEMENTS/STORE_EXPENSES/STORE_BACKUP` ("stall","products","sales","saleItems","stockMovements","expenses","backup")
- `ALL_STORES` (readonly tuple of the 7 names)
- `MIGRATIONS: Record<number, (db: IDBDatabase) => void>` — MUTABLE registry (tests register extra entries). v1 creates all stores + indexes: products.name, saleItems.saleId, stockMovements.productId, stockMovements.timestamp, sales.timestamp, expenses.date. Never `deleteDatabase`.
- `openDatabase(version: number = DB_VERSION): Promise<IDBDatabase>` — caches single connection; rejects on downgrade/blocked/error/missing migration.
- `closeDatabase(): void`
- `requestToPromise<T>(req): Promise<T>`, `txDone(tx): Promise<void>`
- `runInTransaction<T>(db, storeNames, mode, fn): Promise<T>` — commits on tx.oncomplete, aborts + rethrows on fn error. RULE: fn must not await outside tx scope.
- Generic helpers (db first arg): `getAll`, `get`, `put`, `bulkPut`, `del`, `clear`, `getAllByIndex`, `count`, `countByIndex`
- Facades (methods take db as first arg): `stallDb`, `productsDb`, `salesDb`, `saleItemsDb`, `stockMovementsDb`, `expensesDb`, `backupDb` — each `{ getAll(db), get(db,id), put(db,v), bulkPut(db,vs), del(db,id), clear(db), count(db) }`
- `resetAllData(db): Promise<void>` — clears all 7 stores in ONE transaction.

### `src/lib/validation/product.ts`
- `interface ProductInput { name, sellingPrice, costPrice, stock, category, active }`
- `validateProduct(input: ProductInput): string[]` — empty = valid.

## Design decisions
- Money: integer minor units everywhere; IDR/VND 0-decimal inputs round half-up ("45.5" → 46).
- `backup` store uses keyPath `"exportedAt"` (Backup has no id field); all other stores keyPath `"id"`.
- formatMoney uses Intl.NumberFormat per-currency locale (en-MY/en-SG/en-PH/th-TH/id-ID/vi-VN) → matches spec examples ("RM 45.50", "Rp 45.500" via id-ID grouping).

## Verification
- `npm run typecheck` — PASS
- `npm run test` — PASS (28/28; smoke test still passes)
- `npm run build` — PASS

## Concerns
- `openDatabase` caches one connection; code holding `db` refs across `closeDatabase()` must re-acquire. Fine for this app's single-connection usage.
- test file `database.test.ts` bumps fake-indexeddb DB to v2 (migration test) and tracks version via `dbVersion` variable so later tests don't downgrade-open.
- `Sale.currency`/`Expense.currency` remain `string` per spec §57 verbatim (only Stall narrowed to `Currency` per task instruction). UI layers should type-check them against CURRENCIES keys before use if needed.
