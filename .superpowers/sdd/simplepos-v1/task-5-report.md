# Task 5 Report — Product Management

Status: DONE
Commit: 06f3879

## Files

New:
- `src/contexts/StallContext.tsx` — StallProvider + useStall
- `src/contexts/ProductsContext.tsx` — ProductsProvider + useProducts + soldProductIdSet/productHasSales helpers
- `src/components/ProductFormModal.tsx` — add/edit product modal
- `src/components/StockAdjustModal.tsx` — stock adjustment modal
- `src/pages/__tests__/products.test.tsx` — 11 tests
- `src/styles/products.css` — page + modal styles

Modified:
- `src/pages/ProductsPage.tsx` — full page (replaced placeholder)
- `src/main.tsx` — provider chain: BrowserRouter > ToastProvider > AppGate > StallProvider > ProductsProvider > App
- `src/App.tsx` — routes only (AppGate moved to main.tsx)
- `src/components/__tests__/appgate.test.tsx` — render helper updated for new provider chain
- `src/components/icons.tsx` — added IconEdit, IconAdjust, IconPower
- `src/utils/currency.ts` — added minorUnitsToInput (minor units -> major-unit input string)

## Exported APIs

StallContext: `{ stall: Stall | null, loading: boolean, reload(): Promise<void> }` via `useStall()`.
ProductsContext: `{ products, loading, refresh(), addProduct(input): Promise<Product>, updateProduct(id, patch: ProductPatch), adjustStock(productId, newStock, reason), deactivateProduct(id), reactivateProduct(id), deleteProduct(id) }` via `useProducts()`.
Helpers: `productHasSales(productId): Promise<boolean>`, `soldProductIdSet(): Promise<Set<string>>` (in-memory scan; saleItems has no productId index — ponytail comment notes the ceiling).

ProductPatch = Partial<Pick<Product, "name" | "sellingPrice" | "costPrice" | "category" | "active">> — stock is only mutable via adjustStock (§45).

adjustStock: runInTransaction([products, stockMovements], "readwrite"); diff===0 is a no-op; movement type manual_add/manual_reduce, quantity = Math.abs(diff), reason recorded, timestamp ISO, product.stock/updatedAt updated atomically.

deleteProduct: throws if any saleItem references the product (double protection with the UI hiding the button).

Page behavior: search (case-insensitive, clear button), 1-2-3 col grid, cards with name/price (formatMoney, stall currency)/stock + badges (0 -> OUT OF STOCK error; <5 -> Very low; <= threshold -> Low), category + Inactive badges, inactive at reduced opacity; icon ghost actions (44px, aria-labels incl. product name): Edit, Adjust stock, Deactivate/Reactivate, Delete (danger, hidden when sold); Delete has a confirm modal ("This will permanently remove X. This can't be undone."); edit/add/stock modals; empty states ("No products yet." / "No products match your search."). All db errors toast "We couldn't save your changes. Your data has not been cleared."

## Tests

11 new (src/pages/__tests__/products.test.tsx): empty state; add (minor-unit price 300 + stock 20 persisted); edit (name/price persisted, updatedAt changed); validation (empty name, negative price blocked); stock adjust up (manual_add qty 8, reason Restock); adjust down (manual_reduce positive qty 6); delete flow (confirm -> removed); sold product hides Delete, keeps Deactivate; deactivate (active false + Inactive badge); reactivate; search filters + clear.

## Commands + results

- `npm run typecheck` — clean
- `npm run test` — 67/67 pass (56 existing + 11 new)
- `npm run build` — clean (tsc -b && vite build, 71 modules, PWA generated)

## Concerns

- saleItems sold-check is an in-memory scan (no productId index in schema v1); fine for V1 counts. Add an index + countByIndex later if needed (ponytail comment in code).
- Products page has no HeaderNav/MobileNav — other pages are still placeholders without nav; wiring layout/nav presumably comes with the Dashboard task. Stall identification (§19) is not shown on this page yet for the same reason.
- StockAdjustModal requires a reason before saving (beyond the stated "invalid or equal" disable rule) to avoid empty-reason movements (§45); documented behavior.
- adjustStock's diff===0 no-op runs the transaction with no writes — harmless by design.
