# Task 5b Report — Layout & Navigation Wiring

Status: DONE
Commit: 557f9b0

## Files touched

- `src/layouts/AppLayout.tsx` (new) — HeaderNav + `<main class="app-layout__main">` + Outlet + MobileNav; stallName from `useStall()`, HeaderNav's existing `"SimplePOS"` fallback reused (passing `undefined` instead of duplicating fallback logic).
- `src/App.tsx` — routes nested under a pathless `<Route element={<AppLayout />}>` for /dashboard, /pos, /products, /sales, /sales/:id, /expenses, /settings; /onboarding stays outside; `/` → Navigate /pos; catch-all → Navigate /pos. AppGate untouched in main.tsx.
- `src/pages/{Dashboard,Pos,Sales,SaleDetail,Expenses,Settings}Page.tsx` — honest placeholders: h1 title (`.page`/`.page__title`), PosPage additionally renders stall brand from useStall. Kept exact "POS" text so appgate test stays green.
- `src/pages/ProductsPage.tsx` — only the wrapper tag `<main>` → `<div>` (avoids nested main landmark inside AppLayout's main). No internals changed.
- `src/styles/components.css` — appended `.app-layout__main` (16px/24px padding, max-width 1200, bottom padding `calc(96px + env(safe-area-inset-bottom))` on mobile) + `.page` placeholder styles.
- `src/styles/products.css` — removed `.products-page` outer max-width/padding (now owned by layout; page had its own 20px+96px chrome which would double up).
- `src/test/smoke.test.tsx` — wrapped App in StallProvider (AppLayout now requires StallContext).
- `src/layouts/__tests__/applayout.test.tsx` (new) — 5 tests.

## Verified (no fixes needed)

- MobileNav already hides ≥769px, HeaderNav already sticky, nav landmarks + aria-labels already present in Navigation.tsx.
- MobileNav already handles `env(safe-area-inset-bottom)`.

## What I had to fix

1. Layout tests initially matched "YayaCake POS by Captura" twice (header brand + PosPage brand paragraph) — switched to `findByRole("link", ...)`.
2. Smoke test crashed: AppLayout uses `useStall` but smoke rendered App without StallProvider — added StallProvider.
3. Products smoke test race: stall context loads async — await brand link.

## Tests

- 72/72 pass (67 existing + 5 new). `npm run typecheck` clean, `npm run build` clean.

## Concerns

- POS page is still a placeholder; when later tasks replace it, keep exact-text "POS" assertion in mind or update smoke/appgate tests.
- Desktop bottom padding is 24px (bottom nav hidden there) — fine per spec.
