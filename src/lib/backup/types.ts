import type {
  Expense,
  Product,
  Sale,
  SaleItem,
  Stall,
  StockMovement,
} from "../../types";

export const BACKUP_APP = "SimplePOS" as const;
export const BACKUP_FORMAT_VERSION = "1.0" as const;

/**
 * §59 — what lands in the .json file. JSON cannot carry a Blob, so the QR
 * image is a base64 data-URL string (or null). Everything else matches the
 * live model (integer minor units, ISO strings).
 */
export interface SerializedStall extends Omit<Stall, "paymentMethods"> {
  paymentMethods: {
    cash: boolean;
    qr: {
      enabled: boolean;
      image: string | null;
    };
    card: boolean;
  };
}

export interface BackupFile {
  app: typeof BACKUP_APP;
  formatVersion: string;
  exportedAt: string;
  stall: SerializedStall | null;
  products: Product[];
  sales: Sale[];
  saleItems: SaleItem[];
  stockMovements: StockMovement[];
  expenses: Expense[];
}

export type ValidationResult =
  | { ok: true; backup: BackupFile }
  | { ok: false; errors: string[] };

/** §62 — shown to the user after a successful import. */
export interface ImportSummary {
  products: number;
  sales: number;
  saleItems: number;
  stockMovements: number;
  expenses: number;
}
