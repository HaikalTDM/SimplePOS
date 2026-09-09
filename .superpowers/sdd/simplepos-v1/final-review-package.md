75e7096 feat: scaffold SimplePOS foundation (Vite+TS+PWA+router+CSS tokens)
a2be799 feat: data layer ΓÇö types, native IndexedDB service with migrations, money/date/validation utils + tests
47720fb feat: core UI system ΓÇö keycap buttons, inputs, select, toggle, modal, cards, badges, toasts, nav, custom SVG icons
4df3620 feat: onboarding ΓÇö stall identity, optional products, payment methods with QR upload, app gate routing
06f3879 feat: product management ΓÇö CRUD, deactivation, atomic stock adjustments with movements, stall/products contexts
557f9b0 feat: app layout ΓÇö shared header/bottom navigation shell wired into all main routes
ee45386 feat: POS ΓÇö product grid, search, categories, transient cart with stock-capped quantities, responsive split layout
e7707bc docs: task 6 report
2414464 feat: checkout ΓÇö cash/QR/card payment flow with atomic IndexedDB transaction, historical snapshots, stock movements, success feedback
0418f6e feat: dashboard ΓÇö today's sales hero, quick stats, top sellers, low stock, profit estimate, start-selling CTA, optional walkthrough
77b4e82 feat: sales ΓÇö history list with date filter and sale detail from historical snapshots
13f8557 docs: task 9 report
79bffba feat: expenses ΓÇö CRUD with categories and shared profit calculation helpers
cc19fcc docs: task 10 report
17ae945 feat: backup ΓÇö JSON export/import with full validation, safety snapshot, QR data-URL serialization, Excel-safe sales CSV
30a7f4e feat: settings ΓÇö stall, payment methods with QR management, stock preferences, backup/import/CSV actions, delete-all with type-to-confirm, about
2f245f2 docs: task 12 report
aac0966 chore: PWA offline precache verification, iOS install meta, responsive and accessibility polish
294ce8b test: harden flaky settings/POS tests, complete data-integrity coverage matrix, add missing tests
c54ce27 docs: README with architecture, offline, backup and deployment guidance

=== FILE LIST ===
.gitignore
.superpowers/sdd/simplepos-v1/progress.md
.superpowers/sdd/simplepos-v1/task-1-report.md
.superpowers/sdd/simplepos-v1/task-10-report.md
.superpowers/sdd/simplepos-v1/task-11-report.md
.superpowers/sdd/simplepos-v1/task-12-report.md
.superpowers/sdd/simplepos-v1/task-14-report.md
.superpowers/sdd/simplepos-v1/task-2-report.md
.superpowers/sdd/simplepos-v1/task-3-report.md
.superpowers/sdd/simplepos-v1/task-4-report.md
.superpowers/sdd/simplepos-v1/task-5-report.md
.superpowers/sdd/simplepos-v1/task-5b-report.md
.superpowers/sdd/simplepos-v1/task-6-report.md
.superpowers/sdd/simplepos-v1/task-7-report.md
.superpowers/sdd/simplepos-v1/task-8-report.md
.superpowers/sdd/simplepos-v1/task-9-report.md
.superpowers/sdd/simplepos-v1/test-coverage.md
README.md
SPEC.md
index.html
package-lock.json
package.json
public/icons/icon-192.png
public/icons/icon-512.png
public/icons/icon.svg
public/icons/maskable-512.png
scripts/gen-icons.mjs
scripts/verify-pwa.mjs
src/App.tsx
src/components/AppGate.tsx
src/components/Badge.tsx
src/components/Card.tsx
src/components/CategoryBar.tsx
src/components/EmptyState.tsx
src/components/Input.tsx
src/components/KeycapButton.tsx
src/components/Modal.tsx
src/components/Navigation.tsx
src/components/PaymentModal.tsx
src/components/PosCart.tsx
src/components/ProductCard.tsx
src/components/ProductFormModal.tsx
src/components/Select.tsx
src/components/StockAdjustModal.tsx
src/components/Toast.tsx
src/components/Toggle.tsx
src/components/__tests__/appgate.test.tsx
src/components/__tests__/components.test.tsx
src/components/__tests__/payment.test.tsx
src/components/icons.tsx
src/components/index.ts
src/contexts/CartContext.tsx
src/contexts/ProductsContext.tsx
src/contexts/StallContext.tsx
src/layouts/AppLayout.tsx
src/layouts/__tests__/applayout.test.tsx
src/lib/backup/backup.test.ts
src/lib/backup/blobCodec.ts
src/lib/backup/download.ts
src/lib/backup/exportBackup.ts
src/lib/backup/importBackup.ts
src/lib/backup/types.ts
src/lib/backup/validateBackup.ts
src/lib/calculations/dashboard.test.ts
src/lib/calculations/dashboard.ts
src/lib/calculations/money.test.ts
src/lib/calculations/money.ts
src/lib/calculations/profit.test.ts
src/lib/calculations/profit.ts
src/lib/checkout/checkout.test.ts
src/lib/checkout/checkout.ts
src/lib/csv/salesCsv.test.ts
src/lib/csv/salesCsv.ts
src/lib/db/database.test.ts
src/lib/db/database.ts
src/lib/db/index.ts
src/lib/db/promise.ts
src/lib/db/stores.ts
src/lib/validation/product.test.ts
src/lib/validation/product.ts
src/main.tsx
src/pages/DashboardPage.tsx
src/pages/ExpensesPage.tsx
src/pages/OnboardingPage.tsx
src/pages/PosPage.tsx
src/pages/ProductsPage.tsx
src/pages/SaleDetailPage.tsx
src/pages/SalesPage.tsx
src/pages/SettingsPage.tsx
src/pages/__tests__/dashboard.test.tsx
src/pages/__tests__/expenses.test.tsx
src/pages/__tests__/onboarding.test.tsx
src/pages/__tests__/pos.test.tsx
src/pages/__tests__/products.test.tsx
src/pages/__tests__/sales.test.tsx
src/pages/__tests__/settings.test.tsx
src/pages/onboarding/PaymentStep.tsx
src/pages/onboarding/ProductsStep.tsx
src/pages/onboarding/StallStep.tsx
src/styles/base.css
src/styles/components.css
src/styles/expenses.css
src/styles/onboarding.css
src/styles/products.css
src/styles/sales.css
src/styles/settings.css
src/styles/variables.css
src/test/setup.ts
src/test/smoke.test.tsx
src/types/index.ts
src/utils/currency.test.ts
src/utils/currency.ts
src/utils/dates.test.ts
src/utils/dates.ts
src/utils/filename.ts
src/utils/id.ts
src/vite-env.d.ts
tsconfig.app.json
tsconfig.json
tsconfig.node.json
vercel.json
vite.config.ts

=== LOC ===
src/App.tsx	28
src/components/AppGate.tsx	72
src/components/Badge.tsx	17
src/components/Card.tsx	26
src/components/CategoryBar.tsx	24
src/components/EmptyState.tsx	19
src/components/Input.tsx	38
src/components/KeycapButton.tsx	35
src/components/Modal.tsx	121
src/components/Navigation.tsx	102
src/components/PaymentModal.tsx	244
src/components/PosCart.tsx	145
src/components/ProductCard.tsx	53
src/components/ProductFormModal.tsx	134
src/components/Select.tsx	151
src/components/StockAdjustModal.tsx	105
src/components/Toast.tsx	89
src/components/Toggle.tsx	23
src/components/__tests__/appgate.test.tsx	100
src/components/__tests__/components.test.tsx	195
src/components/__tests__/payment.test.tsx	265
src/components/icons.tsx	209
src/components/index.ts	26
src/contexts/CartContext.tsx	130
src/contexts/ProductsContext.tsx	175
src/contexts/StallContext.tsx	41
src/layouts/AppLayout.tsx	16
src/layouts/__tests__/applayout.test.tsx	104
src/lib/backup/backup.test.ts	313
src/lib/backup/blobCodec.ts	26
src/lib/backup/download.ts	35
src/lib/backup/exportBackup.ts	76
src/lib/backup/importBackup.ts	91
src/lib/backup/types.ts	47
src/lib/backup/validateBackup.ts	246
src/lib/calculations/dashboard.test.ts	193
src/lib/calculations/dashboard.ts	78
src/lib/calculations/money.test.ts	24
src/lib/calculations/money.ts	12
src/lib/calculations/profit.test.ts	79
src/lib/calculations/profit.ts	32
src/lib/checkout/checkout.test.ts	200
src/lib/checkout/checkout.ts	128
src/lib/csv/salesCsv.test.ts	94
src/lib/csv/salesCsv.ts	73
src/lib/db/database.test.ts	111
src/lib/db/database.ts	93
src/lib/db/index.ts	3
src/lib/db/promise.ts	44
src/lib/db/stores.ts	146
src/lib/validation/product.test.ts	54
src/lib/validation/product.ts	36
src/main.tsx	42
src/pages/DashboardPage.tsx	191
src/pages/ExpensesPage.tsx	323
src/pages/OnboardingPage.tsx	108
src/pages/PosPage.tsx	228
src/pages/ProductsPage.tsx	302
src/pages/SaleDetailPage.tsx	119
src/pages/SalesPage.tsx	150
src/pages/SettingsPage.tsx	568
src/pages/__tests__/dashboard.test.tsx	178
src/pages/__tests__/expenses.test.tsx	162
src/pages/__tests__/onboarding.test.tsx	172
src/pages/__tests__/pos.test.tsx	220
src/pages/__tests__/products.test.tsx	300
src/pages/__tests__/sales.test.tsx	218
src/pages/__tests__/settings.test.tsx	385
src/pages/onboarding/PaymentStep.tsx	151
src/pages/onboarding/ProductsStep.tsx	145
src/pages/onboarding/StallStep.tsx	72
src/styles/base.css	38
src/styles/components.css	1668
src/styles/expenses.css	104
src/styles/onboarding.css	208
src/styles/products.css	159
src/styles/sales.css	181
src/styles/settings.css	100
src/styles/variables.css	34
src/test/setup.ts	7
src/test/smoke.test.tsx	66
src/types/index.ts	104
src/utils/currency.test.ts	61
src/utils/currency.ts	64
src/utils/dates.test.ts	44
src/utils/dates.ts	52
src/utils/filename.ts	15
src/utils/id.ts	11
src/vite-env.d.ts	1
