# SimplePOS

> Your cute shop machine. Fast selling, zero fuss.

SimplePOS is a lightweight, offline-first point-of-sale web app for small
sellers — food stalls, drinks sellers, retail counters, pop-ups, and home
businesses. It runs entirely in the browser as an installable PWA: there is no
backend, no account, and no cloud. You open it, tap products, get paid, and
stock updates. The checkout flow targets a 5-item sale in under 30 seconds.

## Features

- Onboarding — stall name, currency (MYR, SGD, PHP, THB, IDR, VND), business type, optional starter products, payment method setup
- POS — product grid with real-time search and category filter, keycap-tactile UI, stock-aware cart, fast checkout
- Checkout — cash (with change calculation), QR (locally stored merchant QR image), and card payment, all confirmed by the cashier
- Products & stock — create/edit/deactivate products, cost price, manual stock adjustments with recorded movements, low-stock alerts
- Categories — pre-add categories, assign them from a dropdown in the product form, or add a brand-new category inline while adding a product
- Dashboard — today's sales, transactions, items sold, top sellers, low stock, estimated profit
- Sales — history with date filter, per-sale detail with historical product snapshots (name/price/cost frozen at sale time)
- Expenses — simple tracking with categories (Stock, Delivery, Packaging, Other)
- Profit estimation — COGS-based gross profit and estimated net profit, only when cost data exists
- Settings — stall info, payment methods, low-stock threshold, data management, about
- Backup — full JSON export/import with validation and an automatic safety backup before import replaces data
- Sales CSV export — Excel-safe CSV per sale with profit column
- PWA — installable, works fully offline after the first load

## Tech stack

- React 19 + TypeScript
- Vite
- Custom CSS with CSS variables (no UI library, no Tailwind)
- Native IndexedDB (no Dexie) behind a small internal db layer
- Workbox service worker via `vite-plugin-pwa`
- React Router
- Vitest + Testing Library + jsdom + fake-indexeddb

## Local storage architecture

All data lives in the browser's IndexedDB. Nothing is ever sent to a server;
there is no cloud sync, no analytics, no auth. The database (`simplepos`) has
eight object stores: `stall`, `products`, `categories`, `sales`, `saleItems`,
`stockMovements`, `expenses`, and `backup` (automatic pre-import safety
snapshots). Products reference a category by name; the `categories` store holds
the pre-added list shown in the product form dropdown.

Money is stored as integer minor units per currency: MYR/SGD/PHP/THB use 2
decimals, IDR/VND use 0. Display formatting is locale-aware per currency.

The UI never touches IndexedDB directly. A small db layer in
`src/lib/db` (open/close/upgrade in `database.ts`, typed per-store helpers in
`stores.ts`) wraps everything else.

## How IndexedDB works here

The database is versioned (currently version 2) with an explicit migration
registry (`MIGRATIONS` in `src/lib/db/database.ts`). Version 2 added the
`categories` store; category names already in use by existing products are
backfilled automatically the next time the app loads. The database and its
stores are created automatically on first open; schema changes must bump the
version and add a migration — user data is never wiped on update. Checkout is
the critical write: the sale, sale items, stock decreases, and stock movements
are all written in one readwrite transaction, so a failure aborts everything
and leaves the cart intact.

## Backup / restore

Settings → Data & Backup → Export Backup downloads
`SimplePOS-Backup-<StallName>-<Date>.json`, which contains the stall,
products, sales, sale items, stock movements, expenses, and the QR image
(stored as a data URL in the file). Import validates the file completely
(app identifier, format version, types, relationships, IDs) and, only after
validation passes, makes an automatic safety backup of your current data and
then replaces it. A failed import never touches existing data.

## Development

```bash
npm install
npm run dev          # dev server
npm run test         # vitest run (jsdom + fake-indexeddb)
npm run typecheck    # tsc --noEmit
npm run build        # typecheck + production build
npm run verify:pwa   # checks the built PWA artifacts (manifest, sw.js, precache)
```

## Local testing

Unit and integration tests run in Vitest with jsdom and fake-indexeddb,
covering onboarding, products, POS, checkout integrity, dashboard
calculations, expenses, backup/import, and more. Service-worker/offline
behavior and mobile-viewport layouts can't be exercised by jsdom, so they are
verified via `npm run build` + `npm run verify:pwa` plus manual browser QA
per the project's test matrix.

## PWA testing

```bash
npm run build
npm run preview
```

Open the preview URL, then use DevTools → Application → Service Workers to
confirm the service worker is active, and Network → Offline to simulate
being offline (everything must keep working). Install via the browser's
install prompt; the app then launches standalone.

## Vercel deployment

SimplePOS deploys as a static Vite app with zero environment variables and no
secrets. `vercel.json` rewrites all routes to `index.html` for SPA routing.
Import the repo on Vercel, choose the Vite framework preset, and deploy.

## Data lives on this device

Your data is stored in this browser, on this device, only. Export a backup
regularly. Data can be lost if browser/site data is cleared, the device is
reset, or you switch devices without restoring a backup.

## V1 limitations

No multi-user or auth, no receipt printing, no barcode scanning, no
discounts/tax, no cloud sync, no payment gateway integration (QR and card are
cashier-confirmed), and no sale deletion (deleting a completed sale would
corrupt revenue, stock, and profit history).
