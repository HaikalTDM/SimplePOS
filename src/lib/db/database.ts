// The ONLY module that touches raw IndexedDB lifecycle (open/close/upgrade).
//
// Versioning policy (§55, §80): the version is explicit; upgrades run
// registered migrations from oldVersion+1 up to the target version.
// NEVER call indexedDB.deleteDatabase — schema changes must migrate, never wipe.

export const DB_NAME = "simplepos";
export const DB_VERSION = 2;

export const STORE_STALL = "stall";
export const STORE_PRODUCTS = "products";
export const STORE_CATEGORIES = "categories";
export const STORE_SALES = "sales";
export const STORE_SALE_ITEMS = "saleItems";
export const STORE_STOCK_MOVEMENTS = "stockMovements";
export const STORE_EXPENSES = "expenses";
export const STORE_BACKUP = "backup";

export const ALL_STORES = [
  STORE_STALL,
  STORE_PRODUCTS,
  STORE_CATEGORIES,
  STORE_SALES,
  STORE_SALE_ITEMS,
  STORE_STOCK_MOVEMENTS,
  STORE_EXPENSES,
  STORE_BACKUP,
] as const;

/**
 * Migration registry keyed by integer version. Each entry receives the DB
 * mid-upgrade and must only create/delete stores or indexes — never wipe data.
 *
 * - v1: initial schema — all stores with keyPath "id", except "backup" which
 *   uses keyPath "exportedAt" (Backup records have no id field).
 * - v2: new "categories" store for pre-added product categories. Backfilling
 *   existing free-text product categories into it happens lazily in the
 *   products context (on load/refresh), not inside the migration — a store
 *   read + write during an upgrade transaction is brittle. This migration
 *   only creates the empty store; user data is preserved.
 *
 * To add a schema change: bump DB_VERSION, add MIGRATIONS[<newVersion>].
 */
export const MIGRATIONS: Record<number, (db: IDBDatabase) => void> = {
  1: (db) => {
    db.createObjectStore(STORE_STALL, { keyPath: "id" });

    const products = db.createObjectStore(STORE_PRODUCTS, { keyPath: "id" });
    products.createIndex("name", "name", { unique: false });

    const sales = db.createObjectStore(STORE_SALES, { keyPath: "id" });
    sales.createIndex("timestamp", "timestamp", { unique: false });

    const saleItems = db.createObjectStore(STORE_SALE_ITEMS, { keyPath: "id" });
    saleItems.createIndex("saleId", "saleId", { unique: false });

    const movements = db.createObjectStore(STORE_STOCK_MOVEMENTS, {
      keyPath: "id",
    });
    movements.createIndex("productId", "productId", { unique: false });
    movements.createIndex("timestamp", "timestamp", { unique: false });

    const expenses = db.createObjectStore(STORE_EXPENSES, { keyPath: "id" });
    expenses.createIndex("date", "date", { unique: false });

    db.createObjectStore(STORE_BACKUP, { keyPath: "exportedAt" });
  },
  2: (db) => {
    db.createObjectStore(STORE_CATEGORIES, { keyPath: "id" });
  },
};

let current: IDBDatabase | null = null;

export function openDatabase(version: number = DB_VERSION): Promise<IDBDatabase> {
  if (current) {
    if (current.version === version) return Promise.resolve(current);
    if (version < current.version) {
      return Promise.reject(
        new Error(
          `Cannot open ${DB_NAME} at version ${version}: already open at ${current.version}`,
        ),
      );
    }
    current.close();
    current = null;
  }

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, version);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      for (let v = event.oldVersion + 1; v <= db.version; v++) {
        const migrate = MIGRATIONS[v];
        if (!migrate) {
          throw new Error(`Missing migration for ${DB_NAME} version ${v}`);
        }
        migrate(db);
      }
    };
    req.onerror = () =>
      reject(req.error ?? new Error(`Failed to open ${DB_NAME}`));
    req.onblocked = () =>
      reject(new Error(`Opening ${DB_NAME} was blocked by another connection`));
    req.onsuccess = () => {
      current = req.result;
      resolve(req.result);
    };
  });
}

export function closeDatabase(): void {
  if (current) {
    current.close();
    current = null;
  }
}
