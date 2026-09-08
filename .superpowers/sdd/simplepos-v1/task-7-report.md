# Task 7 — Checkout Report

## Status
COMPLETE — checkout flow shipped, all verification green, committed.

## Files
- `src/lib/checkout/checkout.ts` (new) — pure checkout service.
- `src/lib/checkout/checkout.test.ts` (new) — 8 service tests.
- `src/components/PaymentModal.tsx` (new) — full payment UI (replaces the onPay no-op).
- `src/components/__tests__/payment.test.tsx` (new) — 9 component tests.
- `src/pages/PosPage.tsx` — wired `onPay` → PaymentModal; success handler (cart.clear + ProductsContext.refresh + "Sale recorded" toast + close); removed the stub comment.
- `src/components/index.ts` — exports PaymentModal + PaymentModalProps.
- `src/styles/components.css` — payment modal styles (methods rows, total, change, QR img, success state).

## Checkout service API
```ts
completeCheckout({ items: { productId, qty }[], paymentMethod, currency }): Promise<CheckoutResult>
CheckoutResult = { sale: Sale; stockChanges: { productId, name, before, after }[] }
CheckoutError extends Error  // validation failures; tx already aborted when thrown
```
- ONE `runInTransaction(db, [products, sales, saleItems, stockMovements], "readwrite")` holds the full §39 logical operation; zero awaits outside the tx.
- Fresh `get` re-reads inside the tx are authoritative; validates existence, active, stock ≥ qty; empty cart rejected; duplicate productId lines are aggregated so a product can't be oversold across lines (§29/§79).
- Totals computed from the tx reads in integer minor units; SaleItems snapshot ALL fields (name, unitPrice = sellingPrice, unitCost = costPrice, quantity, subtotal) from the product read in this tx (§40).
- Stock decrement via `put` with updatedAt; one StockMovement per product (`type: "sale"`, POSITIVE quantity, timestamp = sale.timestamp, saleId set) (§44).
- Any throw aborts the tx (runInTransaction rethrows after abort) — nothing persists, and the service never touches the cart.

## UI flow decisions
- Steps: methods → cash | qr | card → success. State resets to methods whenever the modal reopens.
- Methods step: only enabled methods from stall.paymentMethods, 48px+ keycap rows with icon + label + aria-label (`Pay with cash/qr/card`); cash fallback guarantees at least one (§35).
- CASH (§36): big JetBrains Mono total (28px), optional Amount Received parsed via parseMoneyInput; empty = exact payment (CONFIRM PAID enabled); received < total → "Amount received is less than the total" + disabled; received ≥ total → green "Change: RM X.XX".
- QR (§37): object URL created when the pane mounts, revoked on cleanup (mirrors the onboarding PaymentStep guard pattern); no image → muted EmptyState "No QR image set / Add one in Settings"; "Please confirm payment has been received"; gold PAID. No verification — cashier-confirmed only.
- CARD (§38): total + "Please process the card payment on your card reader/terminal" + gold PAID. No verification.
- CONFIRM: loading spinner on the KeycapButton + submitting guard (double-submit blocked); completeCheckout re-validates against fresh DB state.
- FAILURE: toast verbatim "Sale could not be completed. Your cart is still here." (§70); inline warning "Some products changed — review your cart" for validation-type (CheckoutError) failures + ProductsContext.refresh(); modal stays open for retry; cart untouched.
- SUCCESS (§41): green check in a circle, "Stock updated ✓" (JetBrains Mono 20px), per-change lines "Milo: 10 → 9" (mono muted), no totals, no confetti. ~1.5s plain setTimeout → onSuccess (fires regardless of prefers-reduced-motion — a timer is not an animation). Manual close (X/overlay/Escape) is blocked during the success state so the cart clear can never be skipped after a recorded sale.
- No confirmation dialogs anywhere in the flow (§84).

## Tests
- Service (`checkout.test.ts`, 8): full success (sale 1 row, saleItems 2 rows with exact snapshot fields, stock 8 & 4, movements 2 rows positive qty with saleId, exact integer total); atomic-once (second run rejects, row counts unchanged); rollbacks for qty > stock, missing product, inactive product (nothing persisted, stock unchanged); snapshot integrity after rename/reprice (§79 #9–11); empty cart rejected; duplicate-line aggregation prevents overselling.
- Modal (`payment.test.tsx`, 9): enabled-methods-only list; cash empty-received success + sale paymentMethod "cash"; cash below-total error + disabled; cash change line + sale recorded; QR pane confirm text + paymentMethod "qr"; CARD pane + paymentMethod "card"; failure mid-payment (stock changed after modal opened) → error toast + warning + cart intact + modal open + zero sales; success → onSuccess called + cart cleared; QR no-image message.
- Total: 17 new tests. Full suite: **99 passed** (14 files) — all 82 pre-existing tests stay green; smoke/appgate unaffected (PosPage keeps its "POS" heading).

## Commands + results
- `npm run typecheck` — pass
- `npm run test` — 14 files / 99 tests passed
- `npm run build` — pass (tsc + vite build + PWA generateSW)

## Concerns
1. Success-state manual close is intentionally blocked (~1.5s) so a recorded sale can never leave the cart uncleared; if the cart was somehow empty at that point, the block is slightly awkward but harmless.
2. On payment failure the modal calls ProductsContext.refresh(); if a product was deleted elsewhere, CartContext's pre-existing prune effect removes that line (with its own toast). Checkout itself never clears the cart — pruning is existing Task-6 behavior, not checkout logic. The failure test therefore uses a stock change (not a deletion) so the "cart NOT cleared" assertion is observable.
3. jsdom lacks `URL.createObjectURL`, so QR image rendering is guarded (real browsers render it); tests cover the no-image state and pane text instead of the rendered blob URL.
4. QR/CARD record the cashier's confirmation only — by design (§37/§38), no payment verification exists and none is faked.
