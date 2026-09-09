import type { Stall } from "../../types";
import {
  backupDb,
  openDatabase,
  runInTransaction,
  STORE_CATEGORIES,
  STORE_EXPENSES,
  STORE_PRODUCTS,
  STORE_SALES,
  STORE_SALE_ITEMS,
  STORE_STALL,
  STORE_STOCK_MOVEMENTS,
} from "../db";
import { dataUrlToBlob } from "./blobCodec";
import { readAllStores } from "./exportBackup";
import type { ImportSummary } from "./types";
import { validateBackup } from "./validateBackup";

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

const DATA_STORES = [
  STORE_STALL,
  STORE_PRODUCTS,
  STORE_CATEGORIES,
  STORE_SALES,
  STORE_SALE_ITEMS,
  STORE_STOCK_MOVEMENTS,
  STORE_EXPENSES,
] as const;

/**
 * §61 — validate fully, snapshot the current data into the backup store, then
 * replace all six data stores in ONE transaction. Validation failure or a
 * failed transaction leaves existing data completely untouched.
 */
export async function importBackup(json: unknown): Promise<ImportSummary> {
  const result = validateBackup(json);
  if (!result.ok) {
    throw new ImportError(
      `This backup could not be imported. Your existing data is unchanged.\n${result.errors.join("\n")}`,
    );
  }
  const backup = result.backup;
  const serializedStall = backup.stall;
  if (!serializedStall) {
    // validateBackup requires an object, so this is unreachable — kept for
    // type-safety and defense in depth.
    throw new ImportError(
      "This backup could not be imported. Your existing data is unchanged.\nThe backup has no stall record.",
    );
  }

  const db = await openDatabase();

  // Automatic safety snapshot of current data, BEFORE any mutation.
  await backupDb.put(db, await readAllStores(db));

  // QR data URL -> Blob before the transaction: nothing async inside a tx.
  let stall: Stall;
  try {
    stall = {
      ...serializedStall,
      paymentMethods: {
        ...serializedStall.paymentMethods,
        qr: {
          ...serializedStall.paymentMethods.qr,
          image: serializedStall.paymentMethods.qr.image
            ? dataUrlToBlob(serializedStall.paymentMethods.qr.image)
            : null,
        },
      },
    };
  } catch {
    throw new ImportError(
      "This backup could not be imported. Your existing data is unchanged.\nThe QR image in the backup is corrupted.",
    );
  }

  await runInTransaction(db, [...DATA_STORES], "readwrite", async (tx) => {
    for (const store of DATA_STORES) tx.objectStore(store).clear();
    tx.objectStore(STORE_STALL).put(stall);
    for (const product of backup.products) tx.objectStore(STORE_PRODUCTS).put(product);
    for (const category of backup.categories ?? [])
      tx.objectStore(STORE_CATEGORIES).put(category);
    for (const sale of backup.sales) tx.objectStore(STORE_SALES).put(sale);
    for (const item of backup.saleItems) tx.objectStore(STORE_SALE_ITEMS).put(item);
    for (const movement of backup.stockMovements) tx.objectStore(STORE_STOCK_MOVEMENTS).put(movement);
    for (const expense of backup.expenses) tx.objectStore(STORE_EXPENSES).put(expense);
  });

  return {
    products: backup.products.length,
    sales: backup.sales.length,
    saleItems: backup.saleItems.length,
    stockMovements: backup.stockMovements.length,
    expenses: backup.expenses.length,
  };
}
