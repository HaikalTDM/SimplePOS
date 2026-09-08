# SimplePOS V1 — Strict Implementation Prompt

You are implementing **SimplePOS V1**, an offline-first, local-only Progressive Web App for small businesses.

This is an implementation task, not a brainstorming task.

The specification below is the **source of truth**.

Do not invent features.
Do not redesign the product.
Do not replace the architecture without a strong technical reason.
Do not add unnecessary dependencies.
Do not turn this into a SaaS application.
Do not add authentication.
Do not add a backend.
Do not add cloud storage.
Do not add analytics or tracking.

Your job is to implement the approved product accurately, safely, and cleanly.

---

# 1. PRODUCT

Name:

**SimplePOS**

Branding:

**[Stall Name] POS by Captura**

Example:

**YayaCake POS by Captura**

Tagline:

> Your cute shop machine. Fast selling, zero fuss.

SimplePOS is a lightweight POS for:

- Small food sellers
- Drinks sellers
- Retail sellers
- Pop-up sellers
- Home businesses
- Online sellers with physical pickup

Core philosophy:

> Usability and speed always take priority over decoration.

The product should feel like a:

**mechanical keyboard + indie game + small shop tool**

It must feel:

- Cute
- Tactile
- Warm
- Friendly
- Modern
- Playful
- Fast
- Professional enough for real businesses

It must NOT feel:

- Corporate
- Enterprise
- Childish
- Overly pink
- Overdecorated
- Like a generic admin dashboard
- Like accounting software

The UI personality is decorative.

The POS workflow is the product.

---

# 2. ABSOLUTE ARCHITECTURAL RULES

These rules are mandatory.

## No backend

There must be no backend.

Do not create:

- API routes
- Server functions
- Express server
- Node backend
- Database server
- Authentication server

## No cloud database

Do not use:

- Supabase
- Firebase
- MongoDB
- PostgreSQL
- MySQL
- PlanetScale
- Convex
- Appwrite
- Any hosted database

## No cloud storage

Do not upload user data anywhere.

QR images must remain local.

Sales must remain local.

Products must remain local.

Expenses must remain local.

## No authentication

No:

- Login
- Signup
- Account
- Password
- Email authentication
- User profile

## No external API

Core application functionality must not depend on an external API.

The app must work offline after the initial application assets have been cached.

## No Dexie

Use the browser's native IndexedDB API directly.

Do not install Dexie.

Do not install another IndexedDB abstraction library unless explicitly approved.

Create a small internal database abstraction layer so the UI does not directly manipulate IndexedDB everywhere.

---

# 3. REQUIRED TECH STACK

Use:

- React
- TypeScript
- Vite
- Custom CSS
- CSS variables
- Native IndexedDB
- Service Worker
- PWA
- Vercel

Do NOT use Tailwind.

Do NOT introduce a component library such as:

- Material UI
- Ant Design
- Chakra
- Bootstrap
- shadcn/ui

The UI must use custom components.

Use custom SVG icons.

Do not use platform emoji as UI icons.

---

# 4. BEFORE WRITING CODE

Do not immediately start implementing screens.

First inspect the repository.

Determine:

- Existing files
- Existing package.json
- Existing dependencies
- Existing source structure
- Existing Vite configuration
- Existing TypeScript configuration
- Existing PWA/service-worker setup
- Existing CSS
- Existing tests

Then create an implementation plan.

The plan should cover:

1. Architecture
2. Folder structure
3. Data model
4. IndexedDB layer
5. Database versioning
6. Backup/import system
7. Application state
8. Routing
9. Shared UI components
10. Onboarding
11. Dashboard
12. POS
13. Product management
14. Stock management
15. Sales
16. Expenses
17. Settings
18. PWA/offline support
19. Accessibility
20. Testing
21. Build
22. Deployment

Do not skip planning.

After creating the plan, implement according to it.

If the repository already contains working code, preserve useful existing functionality instead of rewriting everything unnecessarily.

---

# 5. DO NOT OVERENGINEER

This is extremely important.

SimplePOS is intentionally simple.

Do not introduce:

- Redux
- Zustand
- MobX
- GraphQL
- ORM
- Repository frameworks
- Dependency injection frameworks
- Event buses
- Microservices
- Complex state machines
- Plugin systems
- Feature flag systems
- Analytics
- Logging platforms
- Cloud services

Use simple React state/context where appropriate.

Keep architecture understandable to one developer.

Prefer boring, reliable code.

---

# 6. APPLICATION STRUCTURE

Use a clear structure similar to:

src/
  components/
  pages/
  layouts/
  hooks/
  lib/
    db/
    backup/
    csv/
    calculations/
    validation/
  types/
  styles/
  utils/

You may adjust the exact structure if the existing project has a better organization.

However, keep responsibilities separated.

UI components must not contain large amounts of IndexedDB implementation logic.

---

# 7. ROUTES / SCREENS

Implement these application areas:

- `/onboarding`
- `/dashboard`
- `/pos`
- `/products`
- `/sales`
- `/sales/:id`
- `/expenses`
- `/settings`

Normal application launch behavior:

- First-time user → onboarding
- Onboarding incomplete → onboarding
- Onboarding complete → POS

The POS should be the fastest route to normal selling.

The dashboard remains accessible through navigation.

Do not force the user through:

Dashboard → Start Selling → POS

every time the app opens.

---

# 8. ONBOARDING

Onboarding is required on first launch.

All screens should be:

- Full screen
- Mobile first
- Simple
- Friendly
- Fast

## Screen 1 — Stall Identity

Title:

> Let's set up your stall

Fields:

### Stall Name

Required.

Placeholder:

> e.g., YayaCake, Local Coffee, Rein's Boutique

Maximum 50 characters.

### Currency

Required.

Options:

- MYR
- SGD
- PHP
- THB
- IDR
- VND

Default:

MYR

### Business Type

Required.

Options:

- Food & Beverage
- Retail
- Services
- Other

Business type is informational only in V1.

Button:

> Next

---

# 9. ONBOARDING PRODUCT SETUP

Title:

> Add your products (optional)

Subtitle:

> Add your top 3–5 items now, or add them later from the POS

Options:

### Add products

Fields:

- Product Name
- Selling Price
- Cost Price optional
- Initial Stock

Initial stock default:

10

After each product:

> Add another?

Options:

- Yes
- Done

### Skip for now

Proceed to payment methods.

---

# 10. ONBOARDING PAYMENT METHODS

Title:

> Payment methods

Subtitle:

> You can change these anytime in settings

Payment methods:

## Cash

Always available by default.

No additional configuration.

## QR

Fields:

- Enabled/disabled
- QR image upload

Accepted:

- PNG
- JPG
- WebP

QR image must be stored locally in IndexedDB.

Do NOT store the QR image in localStorage.

Do NOT upload it to any server.

Supported examples:

- GCash
- GrabPay
- Touch 'n Go
- Other merchant QR images

## Card

Enabled/disabled.

Manual confirmation only.

No payment gateway.

No card API.

No card verification.

### Important rule

At least one payment method must remain enabled.

Do not allow the user to disable every payment method.

Button:

> Let's go!

---

# 11. OPTIONAL DASHBOARD WALKTHROUGH

Title:

> Welcome to [Stall Name] POS

Show a preview of:

- Sales
- POS
- Cart
- Payment

Options:

> Show me around

or

> Start selling

The walkthrough must never block normal usage.

---

# 12. VISUAL DESIGN

## Color Palette

Use CSS variables.

Primary background:

`#F5F1E8`

Accent slate blue:

`#6B7C99`

Secondary amber/gold:

`#C99A4A`

Text charcoal:

`#2C2C2C`

Border/light gray:

`#E8E6E1`

Success:

`#4CAF50`

Error:

`#E74C3C`

Do not randomly introduce additional brand colors.

Additional neutral shades are allowed only when necessary for accessibility and hierarchy.

---

# 13. TYPOGRAPHY

Headings:

- Courier Prime OR JetBrains Mono
- Bold
- 28–40px

Body:

- Poppins OR DM Sans
- Regular
- 14–16px

Labels:

- Poppins OR DM Sans
- Medium
- 12–14px

Prices:

- JetBrains Mono
- Semi-bold
- 18–24px

Use typography consistently.

---

# 14. KEYCAP BUTTON SYSTEM

This is a major visual component.

Buttons should visually resemble mechanical keyboard keycaps.

Characteristics:

- Rounded corners: approximately 12px
- Raised surface
- Subtle shadow
- Clear depth
- Tactile pressed state

Normal:

- Raised
- Soft shadow

Hover:

- Slight scale increase
- Slightly stronger shadow

Pressed:

- Translate downward approximately 4px
- Shadow becomes smaller

Return:

- Approximately 120ms ease-out

Do not make animations excessive.

The interaction should feel tactile, not like a game animation.

---

# 15. ANIMATION RULES

Button press:

120ms

Micro interactions:

100–150ms

Success feedback:

approximately 200ms

Tab switch:

150ms

Modal open/close:

200ms

Never delay critical POS actions just for animation.

Respect:

`prefers-reduced-motion`

When reduced motion is enabled, minimize or disable nonessential animations.

---

# 16. INPUTS

Text inputs:

- 8px radius
- Clear borders
- Soft focus treatment
- No floating labels

Errors:

- Red border
- Clear error text below field

Inputs must be keyboard accessible.

---

# 17. CUSTOM DROPDOWNS

Dropdowns should visually match the keycap design.

Requirements:

- Keyboard accessible
- Enter/Space opens
- Escape closes
- Arrow navigation
- Visible focus
- Arrow rotates when opened
- Approximately 150ms open animation

---

# 18. TOGGLES

Use:

- 24px height
- Pill shape
- Circular knob

Inactive:

Gray

Active:

Slate blue

Animation:

Approximately 100ms spring-like transition.

---

# 19. HEADER

Every main screen should identify the stall.

Format:

`[Stall Name] POS by Captura`

Desktop/tablet:

Header navigation may be visible.

Mobile:

Use compact navigation.

The interface should not waste vertical space.

---

# 20. MOBILE NAVIGATION

On mobile, prefer a simple bottom navigation or equally fast navigation system.

Recommended:

- Home
- Sell
- Sales
- More

Products/settings can live under More.

The POS must always be easy to reach.

---

# 21. DASHBOARD

Purpose:

Answer:

> How much money did I make today?

## Header

Display:

`[Stall Name] POS by Captura`

and today's date.

Example:

`YayaCake POS by Captura — Today, Sept 8`

## Today's Sales

Hero card.

Example:

`RM 245.50`

Label:

`Today's Sales`

Use amber/gold emphasis.

## Quick Stats

Show:

- Transactions
- Items Sold
- Estimated Profit

Estimated Profit:

If enough cost information exists:

`RM 89.20`

Otherwise:

> Add product costs to estimate

Do not invent profit.

## Top Sellers

Show maximum 3.

Example:

- Milo — 15 sold
- Nasi Goreng — 12 sold
- Teh Tarik — 8 sold

## Low Stock

Show products below configured threshold.

Default:

10 units

If out of stock, use clear red warning.

Do not show the card if nothing is low.

## Start Selling

Large amber keycap.

Text:

> START SELLING

This is a primary action.

---

# 22. POS

This is the most important screen.

The POS must prioritize:

1. Product selection
2. Cart
3. Total
4. Payment

No unnecessary UI.

---

# 23. POS MOBILE

Mobile portrait layout:

Header

Search/categories

Product grid

Cart summary

Total

PAY button

Product grid:

- 2–3 columns depending on available width
- Large touch targets
- Fast rendering

---

# 24. POS TABLET

Tablet landscape:

Left:

- Search
- Categories
- Product grid

Right:

- Cart
- Total
- PAY

---

# 25. POS DESKTOP

Desktop can use a wider split layout.

Product grid:

4–5+ columns depending on width.

Cart should remain visible.

Do not create excessive empty whitespace.

---

# 26. PRODUCT CARDS

Each card shows:

- Product name
- Selling price
- Stock

Example:

Milo

RM 3.00

Stock: 20

Price should use JetBrains Mono.

---

# 27. PRODUCT CARD INTERACTION

First tap:

- Add quantity 1
- Animate keycap press
- Show quantity badge
- Update cart
- Update total

Repeated tap:

- Increase quantity
- Update badge
- Update total

Never decrease stock simply because an item was added to the cart.

Stock is only decreased after successful payment confirmation.

---

# 28. OUT OF STOCK

Out of stock products:

- Cannot be selected
- 50% opacity approximately
- Muted appearance
- Red text:

`OUT OF STOCK`

Do not allow adding them to cart.

---

# 29. STOCK VALIDATION

Never allow:

`cart quantity > available stock`

unless a future version explicitly introduces negative inventory.

V1 must prevent overselling.

---

# 30. SEARCH

Search:

`Search products...`

Requirements:

- Real-time filtering
- Case-insensitive
- Product name only
- Clear button
- Search icon
- Fast enough for normal product counts

Debounce only if necessary.

Do not overengineer search.

---

# 31. CATEGORIES

Horizontal scroll on mobile.

"All" category must exist.

Active category:

- Bold
- Amber underline

Inactive:

- Neutral text

If no category is assigned to a product, it should still appear under All.

---

# 32. CART

Mobile collapsed cart:

`3 items | RM 45.00`

Tap to expand.

Expanded cart shows:

Product name

Quantity

Subtotal

Quantity controls:

- Minus
- Current quantity
- Plus

Quantity can be edited.

Swipe left may delete an item.

Direct delete is acceptable.

Do not require an unnecessary confirmation dialog for every cart item removal.

---

# 33. CART RULES

Adding to cart does NOT modify stock.

Changing cart quantity does NOT modify stock.

Removing from cart does NOT modify stock.

Only successful checkout modifies stock.

If checkout fails:

**The cart must remain intact.**

---

# 34. PAY BUTTON

Always visible.

Large amber keycap.

Text:

`PAY`

Disabled when:

- Cart is empty
- Cart is invalid
- Products have insufficient stock

---

# 35. PAYMENT FLOW

## Step 1

Display enabled payment methods:

- CASH
- QR
- CARD

Only show enabled methods.

At least one must exist.

---

# 36. CASH

Display:

Total

Example:

`RM 45.00`

Optional:

Amount Received

If entered:

Calculate change.

Example:

`Change: RM 5.00`

Validation:

Amount received must be greater than or equal to total.

If the field is empty, allow exact-payment confirmation.

Button:

`CONFIRM PAID`

---

# 37. QR

Display:

Merchant's locally stored QR image.

Centered and prominent.

Text:

> Please confirm payment has been received

Button:

`PAID`

SimplePOS does not verify the payment.

It only records the cashier's confirmation.

---

# 38. CARD

Display:

Total.

Text:

> Please process the card payment on your card reader/terminal

Button:

`PAID`

SimplePOS does not verify the card transaction.

---

# 39. CHECKOUT TRANSACTION

This is a critical operation.

When payment is confirmed, perform the following as one logical operation:

1. Validate cart
2. Validate products still exist
3. Validate products are active
4. Validate stock
5. Calculate totals
6. Capture historical product information
7. Create Sale
8. Create SaleItems
9. Decrease stock
10. Create StockMovement records
11. Clear cart
12. Show success

Avoid partial state.

If anything fails, do not leave the application with:

- Sale recorded but stock unchanged
- Stock changed but sale missing
- Sale items missing
- Cart cleared without a sale

Use an IndexedDB transaction where appropriate.

---

# 40. HISTORICAL SALE SNAPSHOTS

This is mandatory.

SaleItems must store historical values.

At minimum:

```typescript
{
  saleId: string,
  productId: string,
  productName: string,
  quantity: number,
  unitPrice: number,
  unitCost: number | null,
  subtotal: number
}
```

Why:

If a product's name, selling price, or cost changes later, old sales must remain historically accurate.

Never calculate historical profit using the product's current cost price.

---

# 41. SUCCESS SCREEN

After successful checkout:

Show briefly:

`Stock updated ✓`

Then show affected products:

`Milo: 20 → 18`

`Nasi Goreng: 5 → 4`

`Teh Tarik: 10 → 7`

Use subtle success feedback.

No loud confetti.

No long animation.

After approximately 1–2 seconds:

- Clear cart
- Return to POS
- Refresh product stock
- Dashboard statistics should reflect the sale

---

# 42. PRODUCT MANAGEMENT

Product list:

- Search
- Add Product
- Product cards
- Edit
- Stock adjustment

Product fields:

- Product Name
- Selling Price
- Cost Price optional
- Stock Quantity
- Category optional
- Active/Inactive

---

# 43. PRODUCT DELETION RULE

Do NOT permanently delete products that have historical sales.

Preferred behavior:

`Deactivate`

A deactivated product:

- Cannot be sold
- Remains in historical sales
- Remains available for historical reporting

If a product has never appeared in a sale, permanent deletion may be allowed.

If there is any doubt, deactivate instead of deleting.

---

# 44. STOCK MANAGEMENT

Automatic stock decrease:

Only after payment confirmation.

Stock movement types:

```typescript
"sale"
"adjustment"
"manual_add"
"manual_reduce"
```

Stock movement:

```typescript
{
  id: string,
  productId: string,
  type: "sale" | "adjustment" | "manual_add" | "manual_reduce",
  quantity: number,
  reason?: string,
  timestamp: string,
  saleId?: string
}
```

---

# 45. MANUAL STOCK ADJUSTMENT

Allow:

Current stock

New stock

Reason

Examples:

- Damaged
- Restock
- Inventory check

Create StockMovement.

Do not silently modify stock without recording the movement.

---

# 46. LOW STOCK

Default threshold:

10

Configurable in Settings.

Display:

- Low stock warning below threshold
- Stronger warning below 5
- Out of stock at 0

Do not use alarming visuals for normal low stock.

---

# 47. SALES HISTORY

Sales list must show:

- Date
- Time
- Items
- Quantity
- Total
- Payment method

Allow filtering by date.

Example:

`2026-09-08 14:35`

`3 items | RM 45.00`

`Payment: CASH`

---

# 48. SALE DETAIL

Show:

- Timestamp
- Products
- Quantity
- Unit price
- Subtotal
- Total
- Payment method
- Notes if present

Historical values must come from SaleItems.

---

# 49. SALE DELETION

If implementing sale deletion, do not simply delete the sale.

Deleting a completed sale can corrupt:

- Revenue
- Stock
- Profit
- Stock movements

Therefore V1 should preferably avoid a direct "Delete Sale" action.

If deletion is implemented, it must be treated as a reversal operation with corresponding stock and reporting changes.

Do not implement unsafe deletion.

---

# 50. EXPENSES

Simple expense tracking only.

Fields:

- Description
- Amount
- Date
- Category

Categories:

- Stock
- Delivery
- Packaging
- Other

No accounting system.

No invoices.

No tax accounting.

No double-entry bookkeeping.

---

# 51. PROFIT CALCULATION

If product costs exist:

```text
COGS = Sum(SaleItem.unitCost × SaleItem.quantity)

Gross Profit = Sales Revenue - COGS

Estimated Net Profit = Gross Profit - Expenses
```

Only use cost data captured in SaleItems.

If cost data is missing:

Display:

> Profit data unavailable

or:

> Add product costs to estimate profit

Never calculate:

`Sales - Starting Capital`

as profit.

Starting capital is not equivalent to profit.

---

# 52. SETTINGS

Settings sections:

## Stall Settings

- Stall Name
- Currency
- Business Type

## Payment Methods

- Cash
- QR
- Card
- QR image upload/update

## Stock Settings

- Low stock threshold
- Alert preference

## Data & Backup

- Export Backup
- Import Backup
- Export Sales CSV
- Add Expense
- Delete all data

## About

Display:

- App version
- Local-data warning
- Support/contact link if configured

Message:

> Your data is stored on this device. Export a backup regularly.

---

# 53. LOCAL DATA WARNING

The application must clearly communicate:

> Your data is stored on this device. Export a backup regularly.

Explain that local browser data can be lost if:

- Browser/site data is cleared
- Device is reset
- Browser storage is removed
- User changes devices without restoring a backup

Do not scare the user.

Just make the limitation clear.

---

# 54. INDEXEDDB

Use native IndexedDB.

Create a versioned database.

Suggested stores:

- stall
- products
- sales
- saleItems
- stockMovements
- expenses
- backup

The exact implementation may differ, but the logical separation must remain.

---

# 55. DATABASE MIGRATIONS

Database version must be explicit.

Never wipe the database during application updates.

Never do:

```typescript
indexedDB.deleteDatabase(...)
```

as part of a normal deployment/update.

If schema changes:

Implement an explicit migration.

Existing user data must be preserved.

---

# 56. QR STORAGE

QR image must be stored as a Blob in IndexedDB.

Do NOT use:

```text
localStorage
```

for the QR image.

Do not upload QR images to Vercel.

Do not upload QR images to a CDN.

Do not send QR images to a backend.

---

# 57. DATA TYPES

Use TypeScript types.

Recommended:

```typescript
type PaymentMethod = "cash" | "qr" | "card";

type StockMovementType =
  | "sale"
  | "adjustment"
  | "manual_add"
  | "manual_reduce";
```

Product:

```typescript
interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  costPrice: number | null;
  stock: number;
  category: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Sale:

```typescript
interface Sale {
  id: string;
  timestamp: string;
  total: number;
  paymentMethod: PaymentMethod;
  currency: string;
  notes?: string;
}
```

SaleItem:

```typescript
interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number | null;
  subtotal: number;
}
```

Expense:

```typescript
interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  date: string;
  currency: string;
}
```

Stall:

```typescript
interface Stall {
  id: string;
  name: string;
  currency: string;
  businessType: string;
  paymentMethods: {
    cash: boolean;
    qr: {
      enabled: boolean;
      image: Blob | null;
    };
    card: boolean;
  };
  lowStockThreshold: number;
  onboardingCompletedAt: string;
  createdAt: string;
  updatedAt: string;
}
```

Use ISO strings for persisted dates.

---

# 58. MONEY HANDLING

Do not rely on floating point arithmetic carelessly.

Money calculations must avoid visible rounding errors.

Use integer minor units where practical.

For example:

RM 45.50 → 4550 cents

or implement a reliable money calculation helper.

All displayed monetary values must be formatted according to the selected currency.

---

# 59. BACKUP FORMAT

Backup JSON must contain:

```json
{
  "app": "SimplePOS",
  "formatVersion": "1.0",
  "exportedAt": "2026-09-08T14:35:00.000Z",
  "stall": {},
  "products": [],
  "sales": [],
  "saleItems": [],
  "stockMovements": [],
  "expenses": []
}
```

The exact internal representation can differ, but the exported backup must contain everything required for restoration.

---

# 60. BACKUP FILENAME

Use:

```text
SimplePOS-Backup-[StallName]-[Date].json
```

Sanitize the stall name for filesystem safety.

---

# 61. IMPORT

V1 import should prioritize safety over convenience.

Recommended V1 behavior:

**Replace current data**

Do not implement complex merge logic unless absolutely necessary.

Before replacing data:

1. Create an automatic safety backup of current data.
2. Validate imported JSON completely.
3. Verify app identifier.
4. Verify backup format version.
5. Validate required fields.
6. Validate types.
7. Validate relationships.
8. Validate IDs.
9. Validate sale items reference valid sales.
10. Validate stock movements reference valid products.
11. Validate numeric values.
12. Only after validation, replace current data.

If validation fails:

**Do not modify existing data.**

Display a clear error.

---

# 62. IMPORT SUCCESS

Show:

> Import successful.

Then:

`X products`

`Y sales`

and other useful counts.

Reload application state safely.

---

# 63. EXPORT SALES CSV

Filename:

```text
SimplePOS-Sales-[StallName]-[DateRange].csv
```

Columns:

```text
Date
Time
Items
Quantity
Total
PaymentMethod
Profit
```

Example:

```text
2026-09-08,
14:35,
Milo x2 | Nasi Goreng x1,
3,
45.00,
Cash,
18.50
```

Ensure CSV escaping is correct.

It must open correctly in Excel.

---

# 64. PWA

SimplePOS must be installable.

Manifest:

```json
{
  "name": "SimplePOS",
  "short_name": "SimplePOS",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F5F1E8",
  "theme_color": "#6B7C99"
}
```

Include appropriate icons.

---

# 65. OFFLINE REQUIREMENTS

After initial successful load and cache:

The following must work without internet:

- POS
- Dashboard
- Products
- Stock management
- Sales
- Expenses
- Settings
- QR display
- Backup export
- CSV export
- Backup import

There is no cloud synchronization.

There is nothing to "sync".

The local database is the source of truth.

---

# 66. SERVICE WORKER

Cache application assets.

Do not cache private user data on a remote server.

Do not create a fake synchronization layer.

The service worker exists only to make the application available offline.

---

# 67. RESPONSIVE DESIGN

Mobile:

320px–768px

Tablet:

769px–1024px

Desktop:

1025px+

Design mobile first.

Touch targets:

minimum 44px.

Do not rely on hover for important functionality.

---

# 68. ACCESSIBILITY

Required:

- Semantic HTML
- Keyboard navigation
- Enter
- Escape
- Tab navigation
- Visible focus states
- ARIA labels where needed
- Screen reader-friendly controls
- Minimum 44px touch targets
- WCAG AA contrast target

Do not sacrifice accessibility for the visual style.

---

# 69. PERFORMANCE

Target:

Less than approximately 2 seconds initial load under reasonable mobile 3G conditions.

Avoid:

- Huge dependencies
- Large UI libraries
- unnecessary JavaScript
- unnecessary network requests

Do not implement virtualization unless testing shows it is actually required.

Do not add lazy-loading product images because V1 has no product image feature.

---

# 70. ERROR HANDLING

Every important operation must have clear failure handling.

Examples:

IndexedDB failure:

> We couldn't save your changes. Your data has not been cleared.

Backup failure:

> Backup could not be created.

Import failure:

> This backup could not be imported. Your existing data is unchanged.

Payment failure:

> Sale could not be completed. Your cart is still here.

Do not silently swallow errors.

Do not show raw stack traces to users.

---

# 71. EMPTY STATES

Create friendly but concise empty states.

Examples:

No products:

> No products yet.

> Add your first product to start selling.

No sales:

> No sales yet today.

No expenses:

> No expenses recorded.

No low stock:

Do not display a warning card.

---

# 72. V1 SCOPE

V1 MUST include:

- Onboarding
- Stall setup
- Currency
- Business type
- Product creation
- Product editing
- Product deactivation
- Dashboard
- POS
- Search
- Categories
- Cart
- Cash payment
- QR payment
- Card payment
- Stock management
- Low stock alerts
- Sales history
- Sale details
- Expenses
- Basic profit estimation
- Settings
- JSON backup
- JSON restore
- CSV export
- PWA
- Offline operation
- Responsive design
- Accessibility
- Custom keycap UI

---

# 73. EXPLICITLY DO NOT IMPLEMENT IN V1

Do NOT implement:

- Multi-user
- Staff accounts
- Login
- Signup
- Receipt printing
- Thermal printer support
- PDF receipts
- Barcode scanning
- Customer profiles
- Customer loyalty
- Discounts
- Promotions
- Tax calculations
- Advanced accounting
- Inventory forecasting
- Advanced analytics
- Payment gateway
- Stripe
- Xendit
- GrabPay API
- Touch 'n Go API
- Cloud sync
- API access
- AI
- Product image management
- Bulk product upload
- Multi-stall support
- Multi-device synchronization

These belong to V2+.

---

# 74. SECURITY / PRIVACY

SimplePOS should collect no user account data.

No analytics.

No tracking.

No advertising SDK.

No unnecessary external requests.

Do not transmit sales, products, expenses, QR images, or stall information anywhere.

---

# 75. UI QUALITY BAR

The interface must not look like:

- Bootstrap admin panel
- Generic SaaS dashboard
- Generic POS template
- Enterprise ERP
- Childrens' game

It should feel like:

**A beautifully designed little shop machine.**

Use:

- Keycap-like buttons
- Tactile depth
- Warm cream background
- Slate blue controls
- Amber important actions
- Monospace price typography
- Friendly rounded cards
- Small decorative details
- Subtle mechanical references

But always prioritize readability and speed.

---

# 76. DO NOT OVERDECORATE

Avoid:

- Excessive gradients
- Excessive shadows
- Floating objects everywhere
- Confetti
- Huge illustrations
- Animated backgrounds
- Excessive sparkles
- Excessive rounded containers
- Too many colors
- Long animations

Cute should come from the interaction and visual language, not clutter.

---

# 77. IMPORTANT POS UX RULE

A cashier should be able to perform:

```text
Open POS
↓
Tap 5 products
↓
PAY
↓
Choose payment
↓
Confirm
↓
Done
```

with minimal navigation.

Target:

**5-item sale in under 30 seconds.**

Do not put unnecessary confirmation dialogs between these steps.

---

# 78. TESTING

Test at minimum:

## Onboarding

- First launch
- Required validation
- Skip products
- Add products
- QR upload
- Payment toggle validation
- Completion

## Products

- Create
- Edit
- Deactivate
- Stock adjustment
- Category
- Cost price

## POS

- Add product
- Repeated product
- Quantity changes
- Remove item
- Search
- Category filtering
- Out of stock
- Insufficient stock

## Checkout

- Cash
- QR
- Card
- Correct totals
- Correct stock decrease
- Correct sale creation
- Correct SaleItems
- Correct StockMovements
- Cart cleared only after success

## Dashboard

- Sales
- Transactions
- Items sold
- Top sellers
- Low stock
- Profit

## Expenses

- Add
- Edit if implemented
- Delete
- Date
- Category
- Profit calculation

## Backup

- Export
- Import
- Invalid JSON
- Wrong version
- Corrupt data
- Restore
- Safety backup

## Offline

Disable internet and test:

- POS
- Checkout
- Dashboard
- Products
- Sales
- Expenses
- Backup
- Import
- QR

## Responsive

Test:

- 320px
- 375px
- 414px
- 768px
- Tablet landscape
- Desktop

---

# 79. DATA INTEGRITY TESTS

These are mandatory.

Test that:

1. Adding an item to cart does not change stock.
2. Removing an item from cart does not change stock.
3. Failed payment does not change stock.
4. Successful payment decreases stock exactly once.
5. Sale is created exactly once.
6. SaleItems are created exactly once.
7. Stock movements are created exactly once.
8. Cart clears only after successful checkout.
9. Historical product name remains unchanged after product rename.
10. Historical selling price remains unchanged after price change.
11. Historical cost remains unchanged after cost price change.
12. Deactivated products remain visible in old sales.
13. Database updates do not erase existing data.
14. Invalid backup does not destroy current data.
15. Imported backup restores all required data.

---

# 80. DATABASE VERSIONING

Implement explicit database versioning.

If version 1 exists and a future schema requires version 2:

Use an upgrade migration.

Never wipe existing stores simply because the schema changed.

Document migrations in code.

---

# 81. STATE MANAGEMENT

Keep state simple.

Use React Context or local state where appropriate.

Recommended state areas:

- Stall/settings
- Products
- Cart
- UI state

Cart should be transient application state.

Do not persist an unpaid cart as a completed sale.

---

# 82. CURRENCY

Support:

- MYR
- SGD
- PHP
- THB
- IDR
- VND

Use locale-aware formatting where appropriate.

Do not hard-code RM everywhere.

If currency is MYR:

`RM 45.00`

If another currency is selected, display the correct currency.

---

# 83. DATE/TIME

Store timestamps consistently as ISO strings.

Display according to the user's local device timezone.

Sales should show human-readable local dates/times.

Do not hard-code Malaysian timezone into every transaction.

---

# 84. NO UNNECESSARY CONFIRMATIONS

Do not make the user confirm:

- Every product tap
- Every cart quantity change
- Every cart removal
- Every payment method selection

Confirmation should only be used for destructive or important operations.

Examples:

- Delete all data
- Potentially destructive restore
- Permanent deletion

---

# 85. DELETE ALL DATA

This is dangerous.

Require explicit confirmation.

Use a strong confirmation UX.

Explain that it permanently removes local application data.

Do not allow accidental activation.

---

# 86. INSTALLATION

PWA should work on:

- Android
- iOS
- Desktop browsers

Do not create an Android APK.

Do not create a native Android application.

The product is a web application/PWA.

---

# 87. DEPLOYMENT

Deploy as a static Vite application on:

**Vercel**

No backend deployment.

No database deployment.

No API deployment.

The build should be deployable using the normal Vercel workflow.

---

# 88. ENVIRONMENT VARIABLES

Avoid environment variables unless genuinely required.

V1 should ideally require:

**zero environment variables.**

There are no API keys.

There are no database credentials.

There are no secrets.

---

# 89. README

Create/update README with:

- What SimplePOS is
- Features
- Tech stack
- Local storage architecture
- How IndexedDB works
- Backup/restore explanation
- Development commands
- Build command
- Local testing
- PWA testing
- Vercel deployment
- Data-loss warning
- V1 limitations

---

# 90. IMPLEMENTATION STYLE

Write clean TypeScript.

Prefer:

- Small functions
- Clear names
- Strong types
- Explicit validation
- Predictable state updates
- Reusable UI components
- Centralized money calculations
- Centralized date formatting
- Centralized database access

Avoid:

- Huge components
- 1000-line files
- duplicated business logic
- magic numbers everywhere
- unsafe `any`
- hidden side effects

---

# 91. NO FAKE FUNCTIONALITY

Do not create buttons that appear functional but do nothing.

Do not create:

- Fake payment verification
- Fake cloud sync
- Fake analytics
- Fake reports
- Fake API calls

If a feature is not implemented, do not pretend it is.

---

# 92. NO PLACEHOLDER UI IN FINAL V1

Do not leave:

- Lorem ipsum
- Placeholder dashboards
- Dummy products
- Fake transactions
- Fake statistics

Development seed data may be used locally for testing, but production should start empty.

---

# 93. DESIGN CONSISTENCY

Create reusable components for:

- KeycapButton
- SecondaryButton
- Input
- Select
- Toggle
- Modal
- Card
- ProductCard
- CartItem
- Badge
- EmptyState
- Toast/Feedback
- Navigation

Do not recreate button styles separately on every page.

---

# 94. PRODUCT CARD VISUAL PRIORITY

Product cards should make these immediately readable:

1. Product name
2. Price
3. Stock
4. Quantity in current cart

Do not hide important information behind menus.

---

# 95. DASHBOARD VISUAL PRIORITY

Order:

1. Today's sales
2. Start Selling
3. Quick stats
4. Top sellers
5. Low stock

Do not bury today's sales below decorative content.

---

# 96. SETTINGS VISUAL PRIORITY

Settings should be simple grouped sections.

Do not build a complex enterprise settings system.

---

# 97. FINAL DEFINITION OF DONE

The project is considered complete only when:

- App builds successfully
- TypeScript passes
- No critical console errors
- Onboarding works
- POS works
- Cash works
- QR works
- Card works
- Stock updates correctly
- Sales history works
- Expenses work
- Profit calculation works
- Backup export works
- Backup import works
- CSV export works
- IndexedDB persists data
- Database migrations are implemented
- PWA installs
- Offline mode works
- Responsive layouts work
- Accessibility basics work
- Destructive actions are protected
- Historical sales remain correct after product edits
- No backend exists
- No cloud database exists
- No authentication exists
- No external API is required
- No unnecessary dependency was introduced
- Vercel production build works

---

# 98. IMPLEMENTATION ORDER

Implement in this order:

## Phase 1 — Foundation

- Inspect repository
- Establish architecture
- Install only required dependencies
- Configure Vite
- Configure TypeScript
- Configure CSS variables
- Configure PWA
- Establish routing

## Phase 2 — Data Layer

- Define TypeScript models
- Create IndexedDB database
- Create stores
- Create database versioning
- Create migration system
- Create database service layer
- Create validation helpers
- Create money helpers
- Create date helpers

## Phase 3 — Core UI System

Build:

- Layout
- Header
- Navigation
- KeycapButton
- Inputs
- Select
- Toggle
- Modal
- Cards
- Toast/feedback
- Empty states

## Phase 4 — Onboarding

Implement complete onboarding.

## Phase 5 — Products

Implement:

- Product CRUD
- Deactivation
- Stock adjustment
- Categories
- Cost price

## Phase 6 — POS

Implement:

- Product grid
- Search
- Categories
- Cart
- Quantity controls
- Stock validation
- Total

## Phase 7 — Checkout

Implement:

- Cash
- QR
- Card
- Checkout transaction
- Stock movements
- Success state

## Phase 8 — Dashboard

Implement real calculations from IndexedDB.

No fake data.

## Phase 9 — Sales

Implement:

- History
- Date filter
- Details

## Phase 10 — Expenses & Profit

Implement:

- Expense CRUD
- COGS
- Gross profit
- Estimated net profit

## Phase 11 — Backup

Implement:

- JSON export
- JSON validation
- Safety backup
- Restore
- CSV export

## Phase 12 — Settings

Implement all settings.

## Phase 13 — Offline

Test service worker and offline behavior.

## Phase 14 — Accessibility & Responsive

Test mobile/tablet/desktop.

## Phase 15 — Testing

Run the full test checklist.

## Phase 16 — Production

- Production build
- Vercel deployment configuration
- Final README
- Final verification

---

# 99. DECISION RULE WHEN REQUIREMENTS CONFLICT

If two requirements appear to conflict, prioritize in this order:

1. Data integrity
2. POS usability
3. Offline reliability
4. Simplicity
5. Accessibility
6. Performance
7. Visual design
8. Decorative animation

Never sacrifice data integrity for visual polish.

Never sacrifice POS speed for decoration.

Never sacrifice local data safety for convenience.

---

# 100. IF YOU ARE UNCERTAIN

Do NOT silently invent a major product decision.

For small implementation details:

Choose the simplest solution consistent with this specification.

For major architectural/product decisions:

Stop and explain:

- What is ambiguous
- Why it matters
- Your recommended option
- What would change

Do not rewrite the specification yourself.

---

# 101. FINAL COMMAND

Now implement SimplePOS V1 according to this specification.

Start by inspecting the repository and producing the implementation plan.

Then implement phase by phase.

After each major phase:

1. Run type checking.
2. Run tests.
3. Fix errors.
4. Verify that existing functionality still works.
5. Continue.

Do not declare the project complete merely because the UI renders.

The final application must be a functional local-first POS.

The following principle must guide every implementation decision:

> **Open it → tap products → get paid → stock updates.**

SimplePOS is a cute shop machine, not an enterprise ERP.

Keep it simple.
Keep it fast.
Keep the data local.
Keep the checkout reliable.