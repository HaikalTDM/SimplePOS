# Task 4 Report — Onboarding (SimplePOS V1)

Status: DONE

## Files touched

New:
- `src/components/AppGate.tsx` — §7 launch gate. Opens DB, reads stall on mount AND on every pathname change (silently re-reads so completing onboarding / importing a backup is reflected without a splash flash). Splash (brand + "…") until first load; error EmptyState "We couldn't open your data" + Retry; no completed stall → `<Navigate to="/onboarding" replace />` unless already on /onboarding.
- `src/pages/onboarding/StallStep.tsx` — step 1 (spec §8). StallDraft interface exported here.
- `src/pages/onboarding/ProductsStep.tsx` — step 2 (spec §9). Products persisted immediately via `productsDb.put` with `newId()`, `active: true`, `category: null`, timestamps; "N added" counter; Yes/Done/Skip; prices via `parseMoneyInput` + `toMinorUnits` (integer minor units, never float math).
- `src/pages/onboarding/PaymentStep.tsx` — step 3 (spec §10). Cash row + "Enabled" badge (not toggleable), QR toggle + hidden file input (label-wrapped keycap button), type/size validation toasts, 64px preview with remove X, Card toggle. PaymentDraft interface exported here. §10 guard ("At least one payment method must stay enabled") exists and blocks submit even though cash makes it unreachable.
- `src/styles/onboarding.css` — onboarding + gate styles (imported in main.tsx).
- `src/pages/__tests__/onboarding.test.tsx` — 9 tests.
- `src/components/__tests__/appgate.test.tsx` — 4 tests (incl. openDatabase rejection via `vi.mock` + `vi.hoisted`).

Modified:
- `src/pages/OnboardingPage.tsx` — orchestrator: step state, stallDraft/payment drafts, Step X of 3 indicator with dots (active/done/upcoming), aria-live polite step text, stall creation ONLY at the very end (no partial state; drafts live in React state), try/catch → error toast, `navigate("/pos")` + "Welcome to {name} POS!".
- `src/App.tsx` — AppGate wraps the Routes block; routes unchanged.
- `src/main.tsx` — ToastProvider added around App (was missing).
- `src/components/Select.tsx` — label span now gets an id and trigger `aria-labelledby` (was unlabelled; fixes a11y and testing by accessible name).
- `src/test/smoke.test.tsx` — updated for the gate: seeds a completed stall, asserts /pos and / redirect.

## Key APIs
- `AppGate({ children })` — reads `stallDb.getAll` via `openDatabase`; re-checks on `location.pathname`.
- `StallDraft { name, currency, businessType }`; `PaymentDraft { cash, qrOn, cardOn, qrImage: Blob | null }`.
- OnboardingPage persists: `Stall` with `paymentMethods { cash: true, qr: { enabled, image }, card }`, `lowStockThreshold: 10`, `onboardingCompletedAt`.

## Tests
56/56 pass (42 existing + 14 new). `npm run typecheck`, `npm run test`, `npm run build` all green.

## Concerns
1. **Blob round-trip in tests**: fake-indexeddb clones values with Node's `structuredClone`, which serializes jsdom's pure-JS Blob/File to `{}`. Real browsers clone Blobs natively, so app code stores the File/Blob unchanged (production-correct). The one test asserting the persisted QR blob uses a Node-native File (via `process.getBuiltinModule("node:buffer")`, no @types/node needed) and asserts `instanceof` against the Node Blob plus size/type. A future settings-page QR test (task 8+) will need the same trick or a setup.ts helper.
2. **user-event upload + accept**: `userEvent.upload` silently drops files that don't match the input's `accept` attribute, so the bad-type rejection test uses `fireEvent.change`.
3. Step 2 "Done" with a partially-filled form validates and blocks; a fully empty form skips straight to step 3 (matches "optional").
4. AppGate re-reads the stall on every pathname change (single small record, cached connection) — cheap and keeps the gate honest after onboarding/import.
