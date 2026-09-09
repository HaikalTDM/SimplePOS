# SimplePOS

> Your cute shop machine. Fast selling, zero fuss.

SimplePOS is a point-of-sale that lives in your browser and never phones
home. It's for food stalls, drink carts, retail counters, pop-ups, and the
person selling kuih from a folding table who deserves better than a
calculator and a prayer. Open it, tap products, take the money, and the
stock fixes itself. A five-item sale should take less than half a minute —
long enough to smile at the customer, short enough that nobody queues.

It looks like a little arcade keycap fell in love with an order book.
Buttons press like mechanical keys (it even makes the sound, see below),
the cream-and-slate palette is easy on tired eyes, and nothing about it
says "enterprise ERP." Your business is small and quick; your till should
match.

## What you get

- **Onboarding** — name your stall, pick your currency, say what you sell.
  You can add a few starter products or skip straight to the fun part.
- **POS** — a product grid with live search and category chips. Tap to add,
  tap again for more. The cart never touches your stock until you actually
  get paid (spec says so, and so does common sense).
- **Checkout** — cash with honest change math, QR (your own uploaded image),
  or card. QR and card are confirmed by you, the human — this is a till, not
  a payment gateway pretending to be one.
- **Products & stock** — create, edit, deactivate, price. Every stock change
  is recorded as a movement, so you always know whether it was sold,
  restocked, or sacrificed to the floor gods ("Damaged").
- **Categories** — pre-add them, assign them from a dropdown while adding a
  product, or invent a new one right there in the form. Give a category a
  lucide icon and it shows up on your products page.
- **Themes** — cream by default, or pick a preset (Sunrise, Mint, Ocean,
  Slate Night, Midnight Plum) or build your own background/text/accent. It
  applies instantly and survives restarts. Yes, you can have a dark till.
- **Key sounds** — buttons genuinely feel like a keyboard. Choose your
  switch: **Brown** (soft thock), **Blue** (crisp click), or **Mute** when
  the stall is finally quiet. Synthesized live — no audio files, no
  downloads, no "why is my POS playing mp3s."
- **Dashboard** — how much you made today, transactions, items sold, top
  sellers, low stock, and an estimated profit that refuses to invent numbers.
- **Sales history** — searchable by date, with per-sale detail. Prices and
  costs are frozen at the moment of sale, so editing a product later never
  rewrites your history. (Time travel is not a feature.)
- **Expenses** — simple tracking with friendly categories. No invoices, no
  double-entry, no tax lectures.
- **Backup & CSV** — one tap exports everything as JSON; import validates it
  first and keeps a safety copy of your current data before it dares touch
  anything. Sales export to an Excel-happy CSV.
- **Offline PWA** — install it, then use it in a basement with zero signal.
  The local database is the whole truth and nothing but the truth.

## The rules it lives by

- Your data never leaves the device. No account, no cloud, no analytics, no
  "we'll just sync it later." Later never comes.
- If a sale can't be completed cleanly, nothing is half-saved and your cart
  stays exactly where it was. Cashiers deserve transactions that are all-or-
  nothing.
- It's intentionally not an ERP. There is no user management, no receipt
  printer, no barcode scanner, no loyalty program, no 47-dashboard suite.
  Those are tomorrow's problems, and tomorrow can have its own app.

## Local storage architecture

Everything lives in the browser's IndexedDB. The database (`simplepos`) has
eight stores: `stall`, `products`, `categories`, `sales`, `saleItems`,
`stockMovements`, `expenses`, and `backup` (safety snapshots taken before an
import replaces your data). Products point at a category by name, and the
`categories` store is the source of truth for your dropdown.

Money is stored as **integer minor units** — RM 45.50 is `4550`, never a
float — with per-currency precision (MYR/SGD/PHP/THB = 2 decimals,
IDR/VND = 0). Floats are for people who enjoy surprise pennies.

The UI never touches IndexedDB directly. A thin layer in `src/lib/db` wraps
opening, upgrading, and every store, so the rest of the app stays readable
and the database stays consistent.

## How IndexedDB works here

The database is versioned (currently **version 2**) with an explicit
migration registry in `src/lib/db/database.ts`. Version 2 added the
`categories` store; category names already in use by your products are
backfilled automatically on the next load. Schema changes bump the version
and add a migration — your data is **never wiped on update** (we consider
that a feature).

Checkout is the one write that has to be perfect: the sale, its items,
stock decreases, and movements all happen inside a single readwrite
transaction. Any failure rolls everything back and your cart survives to
fight another day.

## Backup / restore

Settings → Data & Backup → **Export Backup** downloads
`SimplePOS-Backup-<StallName>-<Date>.json` — the stall, products, sales,
sale items, movements, expenses, and your QR image, all in one file.

**Import** validates the whole file first (app id, format version, types,
IDs, and that every item points at something real). Only then does it take a
safety snapshot of your current data and replace it. A bad file is rejected
with a clear message and your data stays exactly as it was. Import is
"replace everything," on purpose — merge logic is how backups get haunted.

## Development

```bash
npm install
npm run dev          # dev server
npm run test         # vitest (jsdom + fake-indexeddb)
npm run typecheck    # tsc
npm run build        # typecheck + production build
npm run verify:pwa   # sanity-check the built PWA artifacts
```

Unit and integration tests cover onboarding, products, the POS, checkout
integrity, dashboard math, expenses, backup/import, and the theme engine.
Service-worker and real-viewport behavior can't be faked in jsdom, so those
are checked with `verify:pwa` and a quick human pass in a browser.

## PWA / offline testing

```bash
npm run build
npm run preview
```

Open the preview, then DevTools → Application → Service Workers, flip to
offline, and make sure you can still sell, check sales, and export a backup.
Then install it via the browser prompt and enjoy the standalone mode.

## Deploying

Static Vite app, zero environment variables, zero secrets, zero servers.
`vercel.json` rewrites every route to `index.html` so deep links work.
Import the repo on Vercel, pick the Vite preset, deploy. That's the whole
deployment story — short on purpose.

## A word about your data

Your data lives in this browser, on this device. Export a backup regularly.
If the browser clears its data, the device resets, or you switch phones
without restoring a backup, the data goes with it. We don't like it either,
but honesty beats a fake cloud that claims otherwise.

## What V1 deliberately doesn't do

No multi-user or logins, no receipt printing, no barcode scanning, no
discounts or tax engine, no cloud sync, no payment-gateway integration (QR
and card are cashier-confirmed), and no sale deletion — deleting a completed
sale quietly corrupts revenue, stock, and profit history, which is the sort
of bug that haunts small businesses for months. Deactivate products with
history instead. Your past stays past.

Built with React, TypeScript, Vite, hand-rolled CSS that behaves, native
IndexedDB, and a service worker that only does its one job.
