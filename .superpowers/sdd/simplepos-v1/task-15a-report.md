# Task 15a Report — README + Production Verification

## README.md

Written at repo root, ~122 lines, covering every §89 bullet:

- What SimplePOS is + tagline "Your cute shop machine. Fast selling, zero fuss."
- Features (verified against actual src/): onboarding, POS search/categories/cart,
  cash/QR/card checkout, products + stock with movements, dashboard, sales history +
  detail, expenses, profit estimation, settings, JSON backup/import with safety
  snapshot, sales CSV, PWA installable + offline
- Tech stack (reality check: React **19** not 18 — package.json says ^19.2.8, README
  documents React 19), TypeScript, Vite, custom CSS, native IndexedDB, Workbox via
  vite-plugin-pwa, React Router, Vitest/Testing Library + fake-indexeddb + jsdom
- Local storage architecture: IndexedDB stores stall/products/sales/saleItems/
  stockMovements/expenses/backup; integer minor units (MYR/SGD/PHP/THB=2, IDR/VND=0);
  db layer in src/lib/db; no backend/cloud/analytics/auth
- IndexedDB internals: versioned DB, MIGRATIONS registry in src/lib/db/database.ts,
  created on first open, checkout = single readwrite transaction
- Backup/restore: SimplePOS-Backup-<Stall>-<Date>.json, QR as data URL, full
  validation then automatic safety backup then replace
- Commands: npm install / dev / test / typecheck / build / verify:pwa (+preview)
- Local testing: vitest jsdom + fake-indexeddb; offline/SW + mobile viewport via
  build + verify:pwa + manual browser QA (project test matrix)
- PWA testing: build → npm run preview → DevTools Application → Service Workers /
  offline mode → install prompt
- Vercel: static SPA, vercel.json rewrites all → index.html, zero env vars, Vite preset
- Data-loss warning (§53, calm tone)
- V1 limitations: no multi-user/auth, receipt printing, barcode scanning,
  discounts/tax, cloud sync, payment gateway (QR/card cashier-confirmed), sale deletion

## Production verification

| Check | Result |
|---|---|
| npm run typecheck | PASS (exit 0, no output) |
| npm run test | PASS — 187/187 (22 files), 11.42s |
| npm run build | PASS — 92 modules, dist/ with sw.js + workbox, 66 precache entries |
| npm run verify:pwa | PASS — 12/12 checks incl. manifest fields + precache |
| Preview smoke `/` | 200, HTML contains `<div id="root"></div>` |
| Preview smoke `/manifest.webmanifest` | 200 (JSON) |
| Preview smoke `/sw.js` | 200 |
| vercel.json | present, valid JSON, 1 rewrite `/(.*)` → `/index.html` |
| .gitignore | already covers node_modules, dist, dev-dist — no fix needed |
| .env* files | none anywhere (scan clean) |
| git status before commit | only README.md + .superpowers ledger |

Nothing needed fixing; .gitignore and vercel.json were already correct.

## Commit

`c54ce27` — docs: README with architecture, offline, backup and deployment guidance
(README.md new, .superpowers ledger updated; 2 files, 122 insertions)
