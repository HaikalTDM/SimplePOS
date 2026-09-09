// All money fields in this file (sellingPrice, costPrice, unitPrice, unitCost,
// subtotal, total, amount) are INTEGER MINOR UNITS — e.g. RM 45.50 is stored as
// 4550. Convert to/from display values with src/utils/currency.ts. Never use
// floats for persisted or calculated money.
//
// All date/time fields are ISO 8601 strings. Display in local time
// (src/utils/dates.ts).

export type PaymentMethod = "cash" | "qr" | "card";

export type StockMovementType =
  | "sale"
  | "adjustment"
  | "manual_add"
  | "manual_reduce";

export type Currency = "MYR" | "SGD" | "PHP" | "THB" | "IDR" | "VND";

/** User-chosen POS theme: three hex colors. Background & text are the two
 *  poles of the palette; accent drives buttons, toggles and highlights. */
export interface ThemeColors {
  bg: string;
  text: string;
  accent: string;
}

export interface Product {
  id: string;
  name: string;
  /** Integer minor units. */
  sellingPrice: number;
  /** Integer minor units, null when unknown. */
  costPrice: number | null;
  stock: number;
  category: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A pre-added category a user can assign products to. Products reference
 *  categories by NAME (Product.category is the name string), so deleting a
 *  category is only allowed while no product uses it. */
export interface Category {
  id: string;
  name: string;
  createdAt: string;
  /** Optional lucide icon key shown on product cards / the POS grid. */
  icon?: string;
}

export interface Sale {
  id: string;
  timestamp: string;
  /** Integer minor units. */
  total: number;
  paymentMethod: PaymentMethod;
  currency: string;
  notes?: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  /** Historical snapshot — never read from the current Product record (§40). */
  productName: string;
  quantity: number;
  /** Integer minor units. */
  unitPrice: number;
  /** Integer minor units, null when unknown. */
  unitCost: number | null;
  /** Integer minor units. */
  subtotal: number;
}

export interface Expense {
  id: string;
  description: string;
  /** Integer minor units. */
  amount: number;
  category: string | null;
  /** Local YYYY-MM-DD. */
  date: string;
  currency: string;
}

export interface Stall {
  id: string;
  name: string;
  // Spec §57 declares this as string; narrowed to the 6 supported codes (§82).
  currency: Currency;
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
  /** §52 stock "alert preference". Optional: records from before Task 12
   *  (and older backups) lack it — undefined means alerts ON. */
  lowStockAlertsEnabled?: boolean;
  /** Optional: when undefined the built-in Cream theme is used. */
  theme?: ThemeColors;
  onboardingCompletedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** §44 — every stock change is recorded as a movement. */
export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  reason?: string;
  timestamp: string;
  saleId?: string;
}

/** §59 — full-database backup payload. */
export interface Backup {
  app: "SimplePOS";
  formatVersion: string;
  exportedAt: string;
  stall: Stall | null;
  products: Product[];
  sales: Sale[];
  saleItems: SaleItem[];
  stockMovements: StockMovement[];
  expenses: Expense[];
  /** Present from backup format 1.0+ on; optional so older backups import. */
  categories?: Category[];
}
