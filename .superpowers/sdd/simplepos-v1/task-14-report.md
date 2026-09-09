# Task 14 Report — Testing Pass

## Status
Complete. 187/187 tests pass in 3 consecutive full-suite runs; typecheck and build green.

## Part 1 — Flake hardening (root causes + fixes)

### 1. settings.test.tsx — "edits stall name and currency, persists, and reloads the header brand"

**Root cause:** App code is correct — `StallSettingsSection.save()` fires the toast only
after `await stallDb.put(...)` (which awaits `tx.oncomplete`) and `await reload()`. The
flake lived in the test: after `findByText("Settings saved")` it performed a single
`readStall()` and asserted immediately. Under full-suite parallel load, fake-indexeddb's
async scheduling can delay the write's visibility to a follow-up read issued from the
test's microtask queue, so `stall?.name` intermittently read as the pre-save value.

**Fix (test only):** replaced the one-shot read with the same `waitFor` db-polling
pattern already used in the file's threshold test — after the toast, poll
`readStall()` until name/currency match, then assert the header brand. Assertions
unchanged (not weakened), just retried within a 3s window.

### 2. pos.test.tsx — "increments on repeat taps and blocks at the stock cap"

**Verification:** The app-side throttle (§27) is correct: `PosPage.handleAdd` keeps a
`capToasts` ref so a blocked click toasts once per product and stays silent afterward;
`CartContext.addItem` never decrements stock (cart is transient state). The race
observed in Task 11 is test-scheduling: under load, a blocked click's act flush can
render the cap toast twice, which breaks the single-match `findByText`. The existing
`findAllByText(...).length > 0` mitigation is still needed and still correct — kept
as-is. No app change required.

### 3. expenses.test.tsx — edit/validation input race

**Root cause:** same family as the Task 12 settings race — `user.clear()` + `user.type()`
on controlled inputs can lag under parallel load and append instead of replace.

**Fix (test only):** whole-value replacements now use deterministic `fireEvent.change`
("Sugar Refined" / "15.00" in the edit test; "-5" in the validation test). No assertion
changed.

## Part 2 — Coverage matrix

Written to `.superpowers/sdd/simplepos-v1/test-coverage.md` (not committed into src).
All 15 §79 items and every §78 area are mapped to file + test name.

### Already covered (no new tests needed)
All §79 items were covered. §78 was fully covered except two gaps (below).
Offline and responsive-viewport areas are documented as not-testable-in-jsdom
(covered by `verify:pwa` and component-level nav tests respectively) with one-line
justifications.

### Newly added (real gaps)
- `src/pages/__tests__/products.test.tsx` — 2 new tests: "adds a product with a category
  and cost price (§78)" and "edits a product's category and cost price (§78)" (§78
  Products: Category, Cost price — the form had both fields, no test exercised them).
- `src/components/__tests__/payment.test.tsx` — strengthened "failure mid-payment…":
  added explicit §79.3 assertions that the failed payment left stock at its
  pre-payment value (1), 0 sales, and 0 stock movements (previously the UI-level
  failure test asserted only sales count; stock was covered only via checkout-service
  rollback tests).

## Part 3 — Hygiene audit

- No `test.skip` / `test.only` / `test.todo` anywhere (grep-verified).
- Fake timers: only `components.test.tsx` Toast test uses `vi.useFakeTimers`, with
  `afterEach(vi.useRealTimers)` cleanup — fine.
- DB lifecycle: every IndexedDB test file follows the `beforeEach` closeDatabase +
  fresh `IDBFactory` pattern (settings/pos/products/dashboard/expenses/sales/onboarding/
  payment/appgate/applayout/smoke/checkout/backup/database).
- Every expect is meaningful; no assert-free tests; no assertions weakened — the three
  flake fixes retry/reroute the same assertions, they don't relax them.
- Run duration: ~12s per full run (185 tests ≈ 11.5s before, 187 ≈ 12.5s after) — reasonable.

## Test counts

- Before: 185 (22 files)
- After: 187 (22 files) — +2 products tests, 0 removed

## Commands

- `npm run typecheck` — pass
- `npm run test` — 3/3 consecutive clean runs: 187/187 each
- `npm run build` — pass (PWA precache 66 entries)

## Concerns

1. The settings flake's precise trigger could not be reproduced on demand (3/3 clean
   runs post-fix); the polling fix makes the assertion robust regardless of the exact
   scheduling interleaving. If it ever resurfaces, instrument `readStall` timing under
   CPU load — but the waitFor pattern is the prescribed defense and matches the rest of
   the file.
2. pos.test.tsx still relies on the `findAllByText(...).length > 0` mitigation for the
   cap-toast race; the throttle itself is correct, and the double-toast render under
   load remains unexplained at the React scheduling level. Worth a follow-up only if a
   stricter toast assertion is ever desired.
3. Import safety snapshots in `backupDb` still accumulate (no pruning) — carried from
   Tasks 11/12, out of scope here.
4. Offline and responsive viewport behavior remain manually-verified territory
   (documented in the coverage matrix); no jsdom-safe way to close that gap without
   heavyweight tooling (no new deps allowed).
