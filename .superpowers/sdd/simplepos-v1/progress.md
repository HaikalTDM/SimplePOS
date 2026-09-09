# SDD ledger — plan: .superpowers/sdd/simplepos-v1/plan.md

Spec authority: SPEC.md (repo root). Greenfield repo, no commits at start.

Rulings made before execution:
- Ruling: work directly on master (repo has zero commits; no main branch to protect). Cost if wrong: none — history is recoverable/rewritable pre-first-release.
- Ruling: per-phase review done by controller (spec-checklist + tsc/vitest/build verification) instead of a separate reviewer subagent per phase; one dedicated final whole-branch reviewer agent at the end. Cost if wrong: defects caught later than SDD default; mitigated by per-phase build/test gates and the final review.
- Ruling: confirmed decisions — per-currency decimals map (MYR/SGD/PHP/THB=2, IDR/VND=0), vite-plugin-pwa (Workbox), React Router, Vitest + Testing Library + fake-indexeddb.
- Ruling: implementer commits its own work per phase on master (user granted full access; per-phase commits = recoverable milestones).

Preflight scan: tasks are strictly sequential (each builds on prior's interfaces). Contract handoff = tell each implementer to READ the existing src/types, src/lib/db, src/styles, src/components files rather than pasting history. Conflicts between spec sections: §29 (no overselling) overrides §32 (quantity editing) — cart max = stock; §43 deletion rule overrides convenience. Spec §97/§98 order wins.

Tasks:
1. Foundation — scaffold Vite+React+TS, configs, CSS variables, PWA config, router shell, commit.
2. Data layer — types, native IndexedDB service + migrations, money/date/validation utils, unit tests.
3. Core UI — KeycapButton, Input, Select, Toggle, Modal, Card, Badge, EmptyState, Toast, Nav, ProductCard, CartItem.
4. Onboarding — 3 steps, QR upload, guards, completion.
5. Products — CRUD, deactivate, stock adjustment, categories.
6. POS — grid, search, categories, cart, stock validation, total.
7. Checkout — cash/QR/card, atomic IndexedDB transaction, success screen.
8. Dashboard — real calcs from DB.
9. Sales — history + date filter + detail.
10. Expenses & profit — CRUD + COGS/gross/net calcs.
11. Backup — JSON export/import w/ safety backup, sales CSV.
12. Settings — all sections + delete-all confirm + about.
13. PWA/offline + responsive + a11y polish pass.
14. Testing — full §78/§79 checklist incl. 15 data-integrity tests.
15. Production — final build, README, final whole-branch review.

Task 1: complete (commit 75e7096, controller-verified: manifest matches SPEC �64, palette/tokens match �12/�14/�15; typecheck+test+build pass. Minor (deferred): --legacy-peer-deps needed on install; @testing-library/dom added as RTL peer; fontsource full-subset bundles)

Task 2: complete (commit a2be799, 28/28 tests, controller-verified contract surface. Minor (deferred): backup store keyed by exportedAt; single cached db connection)

Task 3: complete (commit 47720fb, 42/42 tests re-run by controller. Minor (deferred): shade tokens local to components.css; RTL cleanup added to setup.ts)

Task 4: complete (commit 4df3620, 56/56 tests re-run by controller. Minor (deferred): Blob-in-test workaround uses node:buffer getBuiltinModule; report files swept into commits)

Task 5: complete (commit 06f3879, 67/67 tests. Minor (deferred): in-memory sold-check (no productId index, V1 scale); layout/nav wiring missing � added Task 5b)

Task 5b: complete (commit 557f9b0, 72/72 tests)

Task 6: complete (commits ee45386 + e7707bc, 82/82 tests. Minor (deferred): mobile sheet untested in jsdom � manual QA later; onPay stub left for Task 7)

Task 7: complete (commit 2414464, 99/99 tests; controller read checkout.ts � single tx, fresh reads, dup-line merge, snapshots, movements: correct)

Task 8: complete (commit 0418f6e, 119/119 tests. Minor (deferred): low-stock excludes inactive products; dashboard loads all rows in memory � V1 scale)

Task 9: complete (commits 77b4e82 + 13f8557, 125/125 tests. Minor (deferred): PaymentBadge duplicated across pages; slate badge variant)

Task 10: complete (commit 79bffba, 144/144 tests. Minor (deferred): dashboard keeps inline today-profit; shared profit helpers are additive)

Task 10: complete (commits 79bffba + cc19fcc, 144/144 tests. Minor (deferred): dashboard keeps inline today-profit; expense date displayed raw to avoid TZ shift)

Task 11: complete (commit 17ae945, 172/172 tests. Deferred to Task 12/14: safety snapshots accumulate in backupDb � add pruning UI; pos.test.tsx had a pre-existing flaky toast assertion hardened (no app change))

Task 12: complete (commits 30a7f4e + 2f245f2, 185/185 tests twice. Minor (deferred): lowStockAlertsEnabled optional field on Stall; controlled-input test races � Task 14 to harden)

Task 13: complete (commit aac0966 � finished by controller after subagent interruption: iOS meta, 44px targets, h1/a11y fixes, contrast fixes, verify:pwa script all PASS; 185/185 with one known flake � Task 14)

Task 14: complete (commit 294ce8b, 187 tests, 3/3 clean runs)

Task 15a: complete (commit c54ce27, all verification green: typecheck, 187 tests, build, verify:pwa 12/12, preview smoke 200/200/200)

Task 15: complete. Final whole-branch review: VERDICT SHIP, 0 critical, 2 important. Important #1 (CartContext cap toast race) fixed in 627cdf4 (187/187 x2). Important #2 = process item: real-device Airplane-mode offline QA before public release. Branch: 22 commits, working tree clean.
