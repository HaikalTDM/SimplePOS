# Task 6 Report — POS Screen

## Status
Complete. Commit `ee45386`.

## Files

| File | Role |
|---|---|
| `src/contexts/CartContext.tsx` (new) | `CartProvider` + `useCart()` — transient cart |
| `src/components/ProductCard.tsx` (new) | Whole-card add button, stock states, qty badge |
| `src/components/PosCart.tsx` (new) | Shared cart body: rows, qty controls, inline qty edit, total, PAY |
| `src/components/CategoryBar.tsx` (new) | "All" + sorted category chips, amber underline |
| `src/pages/PosPage.tsx` (rewritten) | Search, categories, grid, empty state, mobile bar+sheet, desktop split |
| `src/styles/components.css` | POS/product-card/cart styles appended; `.mobile-nav__link` now uses `--nav-height` |
| `src/styles/variables.css` | Added `--nav-height: 56px` |
| `src/components/index.ts` | Exports ProductCard, PosCart, CategoryBar |
| `src/main.tsx` | CartProvider wired inside ProductsProvider |
| `src/test/smoke.test.tsx`, `applayout.test.tsx`, `appgate.test.tsx` | Added CartProvider to render trees (PosPage now requires it) |
| `src/pages/__tests__/pos.test.tsx` (new) | 10 POS tests |

## CartContext API
- State: `items: { productId, qty }[]` — productId+qty only, never persisted, no db writes.
- `addItem(product): boolean` — false when already at stock cap (caller toasts).
- `setQty(productId, qty)` — clamps 1..stock; drops line if product gone/inactive.
- `removeItem(productId)`, `clear()`, `getQty(productId)`.
- Derived: `entries` (items resolved against active products at render; deactivated/deleted products fall out + one toast "Some items were removed from your cart"), `totalQty`, `totalMinor` (integer minor math), `invalid` (any line qty > current stock → PAY disabled + "Stock changed — review cart").

## UI decisions
- **Minus at 1 removes the row** (no confirm, §84). Chosen over "disable minus at 1" — fewer taps for cashiers.
- **Collapsed mobile bar**: fixed above MobileNav at `bottom: calc(var(--nav-height) + env(safe-area-inset-bottom) + 12px)`; `--nav-height: 56px` shared var so it can't drift from MobileNav. Tap opens a bottom sheet (70dvh, backdrop, close button, Escape); PAY stays on the bar, always visible.
- **Stock-cap toast throttle**: page keeps a ref Set of product ids already toasted; re-toasts only after qty drops below cap again.
- **jsdom/media queries**: PosPage uses `matchMedia("(max-width: 768px)")` to pick mobile bar+sheet vs desktop panel — jsdom matches false, so tests exercise the desktop panel (single PAY button, no duplicate controls). Mobile bar/sheet not covered by unit tests (see Concerns).
- PAY renders on both mobile bar and panel; disabled when cart empty or invalid. `onPay = () => {}` with `// Task 7 wires checkout here` — sheet stays open on PAY click.
- Low-stock badges mirror the products page (Low ≤ threshold neutral, Very low <5 accent, 0 → red OUT OF STOCK, card disabled + 50% opacity + pointer-events none).
- Out-of-stock card keeps aria-label "Add {name}, {price}" but is `disabled`/`aria-disabled` — not addable.

## Tests
`src/pages/__tests__/pos.test.tsx` — 10 tests: tap adds (badge 1, formatted total), repeat taps + cap toast, out-of-stock not addable, inactive not rendered, case-insensitive search + clear, category filter + All shows uncategorized, minus decrements/at-1 removes/delete removes, inline qty edit clamps to stock, PAY disabled/enabled, stock db value unchanged after add/edit/decrement/remove (§79).
Smoke test unchanged in expectation ("POS" text kept via h1); only provider wiring updated.

## Commands + results
- `npm run typecheck` — clean
- `npm run test` — 82 passed (12 files), 10 new POS tests
- `npm run build` — clean (tsc + vite, PWA precache 8 entries)

## Concerns
- Mobile bar/sheet interactions untested (jsdom has no media-query layout); desktop panel shares the same PosCart body, so row logic is covered. Manual QA on a real viewport advised.
- `addItem` uses a mutable flag inside the setState updater — correct under React 19 double-invoke (idempotent), but slightly unusual; revisit if it ever misbehaves.
- Collapsed bar shows "0 items | RM 0.00" when empty (PAY disabled) — spec §34 wants PAY always visible; hiding the whole bar when empty is an alternative if it feels noisy.
