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
