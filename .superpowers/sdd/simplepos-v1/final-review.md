# SimplePOS V1 — Final Whole-Branch Review

**Reviewer verdict: SHIP**

Verified locally on the full branch (20 commits, clean tree apart from review
artifacts): `npm run typecheck` ✓, `npm run test` ✓ (187/187, 22 files),
`npm run build` ✓, `npm run verify:pwa` ✓ (12/12 checks, 66 precache entries).

---

## CRITICAL findings — none

Checked every must-pass area and found no violations:

1. **§2 absolute rules** — zero `fetch`/XHR/WebSocket/sendBeacon in src (grep
   over all of src/). Dependencies are fonts + React + react-router-dom +
   vite-plugin-pwa only. No Dexie, no Tailwind, no component library, no
   backend, no cloud, no auth, no env vars, no analytics.
2. **§39 checkout atomicity** — `src/lib/checkout/checkout.ts` runs the entire
   operation inside ONE readwrite transaction over
   products/sales/saleItems/stockMovements (checkout.ts:69-142). Validation
   uses fresh reads inside the tx (lines 90-100), duplicate cart lines are
   merged before stock checks (lines 81-87), stock is decremented exactly once
   per merged line, saleItems and movements are written in the same tx, and
   `runInTransaction` (promise.ts:28-46) aborts + rethrows on any failure. The
   cart is never touched by the service — `PosPage.handlePaymentSuccess` clears
   it only after resolve (PosPage.tsx:60-68).
3. **§61 import safety** — `importBackup` validates the full document before
   ANY mutation (importBackup.ts:40-45), writes the automatic safety snapshot
   before the replace (line 59), converts the QR data-URL outside the tx
   (lines 63-80), and replaces all six stores in one tx (lines 82-90).
   `validateBackup` checks types, ranges, unique IDs, cross-store references,
   and collects all errors.
4. **§58 money** — all persisted money is integer minor units (types/index.ts:1-4);
   no float math on money anywhere; `toFixed` appears only in display paths
   (currency.ts:61, salesCsv.ts:18) and is never persisted. Formatting goes
   through `formatMoney`/`fromMinorUnits` exclusively.
5. **§55/§80 migrations** — no `deleteDatabase` call anywhere (only a comment
   forbidding it, database.ts:5); explicit `DB_VERSION` + `MIGRATIONS` registry
   (database.ts:37-61); migration-preserves-data is tested (database.test.ts:89).
6. **§79 all 15 data-integrity items** — each mapped to a concrete passing test
   in `.superpowers/sdd/simplepos-v1/test-coverage.md`; verified the named
   tests exist and pass (checkout.test.ts, backup.test.ts, payment.test.tsx,
   sales.test.tsx, database.test.ts).
7. **§64 PWA** — manifest matches the spec byte-for-byte (verified by
   verify:pwa against dist output); SW precaches index.html, hashed JS/CSS,
   fonts. Zero network calls means no user data can leave the device.
8. **§91/§92** — every rendered button has a working handler; no placeholders,
   no seed/dummy data in production paths, no fake functionality.

---

## IMPORTANT findings (should fix, not merge-blocking)

### I1. Cart cap feedback relies on React eager evaluation — `src/contexts/CartContext.tsx:86-99`
`addItem` mutates a local `added` flag inside the `setItems` updater and reads
it synchronously after the call. This only works because React eagerly runs
the updater on a fiber's first update; for a second tap queued before
re-render, the flag reads stale and the "Only N in stock" cap toast can be
suppressed (or fire on a successful add). Cosmetic only — stock is never
affected (checkout re-validates) — but it's a fragile pattern in the hottest
POS path and behaves differently under concurrent rendering/StrictMode.
*Minimal fix:* compute the outcome before the updater, e.g.
`const already = items.find(...)?.qty ?? 0; if (already >= product.stock) return false;` inside a `useCallback` that depends on `items` (or return the cap
state via a ref updated in the same render).

### I2. Offline/mobile verified statically only — release checklist item
§97 requires "offline mode works" and "responsive layouts work", but §78
offline/responsive are covered only by `verify:pwa` (static dist assertions)
and jsdom component tests — no real browser/device pass (acknowledged in
test-coverage.md). For a local-first PWA this is the core value proposition.
*Action:* before public release, run one manual pass on a real phone with
Airplane mode on: full reload, POS checkout, dashboard, backup export/import,
QR display; plus 320px/tablet-landscape spot checks. This is a process step,
not a code change.

---

## MINOR findings (may defer)

- **M1 — font payload:** `@fontsource` imports pull every language subset +
  woff/woff2 fallbacks (66 precache entries, ~1.14 MB total). Initial load
  only fetches latin subsets so §69 isn't broken, but install storage is
  inflated ~3x. Easy win later: import `*-latin-*.css` variants only.
- **M2 — unbounded safety snapshots:** `importBackup` puts a full-DB snapshot
  into the `backup` store on every import and never prunes (importBackup.ts:59).
  Consider keeping only the last N (e.g., 3) in V1.1.
- **M3 — PaymentBadge + PAYMENT_LABEL duplicated:** identical components in
  SalesPage.tsx:25-32 and SaleDetailPage.tsx:23-30, labels repeated in
  salesCsv.ts:11-15. Hoist one shared component/const.
- **M4 — duplicated profit math:** `profit.ts` exists but dashboard.ts:71-78
  has its own inline copy (admitted in profit.ts:1-4). Adopt the shared
  helpers when convenient.
- **M5 — dead helpers:** `change()`/`qtySubtotal()` in money.ts are unused in
  app code (tests cover them); PaymentModal computes change inline.
- **M6 — large files:** SettingsPage.tsx (568 LOC — acceptable, well-split into
  section components) and components.css (1668 LOC — design-system stylesheet;
  split per-component when it grows further).
- **M7 — `addItem`/`capToasts` bookkeeping:** PosPage uses a ref of capped
  product ids that is only cleared on a successful add; a product restocked
  mid-session while capped stays muted until tapped successfully. Cosmetic.

---

## Triage of deferred-minor list (a)-(n)

| Item | Decision | Note |
|---|---|---|
| (a) `--legacy-peer-deps` install | acceptable-with-note | lockfile committed; document the flag in README for fresh contributors |
| (b) `@testing-library/dom` devDep | acceptable-with-note | legitimate RTL peer |
| (c) fontsource all subsets | acceptable-with-note | see M1; switch to latin-only imports when convenient |
| (d) backup keyed by `exportedAt` | acceptable-with-note | collision requires two exports in the same ms — practically impossible |
| (e) single cached db connection | acceptable-with-note | multi-tab version-bump rejects with a clear error; fine for V1 |
| (f) sold-check scans saleItems in memory | acceptable-with-note | has a `ponytail:` comment with the upgrade path; fine at V1 counts |
| (g) PaymentBadge duplicated | acceptable-with-note | see M3 — hoist when touching either page |
| (h) dashboard loads all rows | acceptable-with-note | V1-scale; no virtualization per §69 |
| (i) safety snapshots accumulate | acceptable-with-note | see M2 — recommend a cap in V1.1 |
| (j) `lowStockAlertsEnabled` optional | acceptable | correct backward-compat decision, validation handles absence |
| (k) pos toast `findAllByText` length>0 | acceptable-with-note | pos.test.tsx:110; a pragmatic mitigation, no functional risk |
| (l) no real browser QA | **do-before-release (process)** | see I2 — required manual offline/mobile pass, not a code change |
| (m) React 19 vs spec React 18+ | acceptable | spec allows 18+; React 19 is compatible |
| (n) literal "POS" assertions | acceptable-with-note | smoke.test.tsx:51,68; appgate.test.tsx:96 — brittle to a title change, harmless |

None of (a)-(n) are merge blockers.

---

## What's genuinely good

- Checkout, import, and stock adjustment are exactly as strict as §39/§61/§45
  demand — fresh reads inside one transaction, validation-before-mutation, and
  tests that assert counts/stock at the DB level, not just UI text.
- Money discipline is complete: integer minor units end-to-end with a
  string-safe parser that avoids float multiplication entirely.
- The codebase is quiet: no `any`, no console.log, no TODOs, no network calls,
  no silent error swallowing (every catch either surfaces a toast or is
  justified in a comment), and the component/context split matches the spec's
  structure. The 187-test suite maps cleanly to §78/§79.

---

## Housekeeping

- Branch has **20 commits** (the review package lists 21 — one entry likely
  miscounted; no missing work detected).
- Uncommitted review artifacts present: modified
  `.superpowers/sdd/simplepos-v1/progress.md`, untracked
  `final-review-package.md` and `task-15a-report.md` — commit or drop them with
  the branch.
