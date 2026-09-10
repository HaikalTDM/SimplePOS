import type { Backup } from "../../types";
import {
  categoriesDb,
  expensesDb,
  openDatabase,
  productsDb,
  saleItemsDb,
  salesDb,
  sessionsDb,
  stallDb,
  stockMovementsDb,
} from "../db";
import { blobToDataUrl } from "./blobCodec";
import { buildBackupFile, triggerDownload } from "./download";
import type { BackupFile } from "./types";
import { BACKUP_APP, BACKUP_FORMAT_VERSION } from "./types";

export class BackupError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "BackupError";
  }
}

/** Read every store into a raw Backup (QR image stays a Blob). */
export async function readAllStores(db: IDBDatabase): Promise<Backup> {
  const [stalls, products, categories, sales, saleItems, stockMovements, expenses, sessions] =
    await Promise.all([
      stallDb.getAll(db),
      productsDb.getAll(db),
      categoriesDb.getAll(db),
      salesDb.getAll(db),
      saleItemsDb.getAll(db),
      stockMovementsDb.getAll(db),
      expensesDb.getAll(db),
      sessionsDb.getAll(db),
    ]);
  return {
    app: BACKUP_APP,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    stall: stalls[0] ?? null,
    products,
    sales,
    saleItems,
    stockMovements,
    expenses,
    categories,
    sessions,
  };
}

/** Serialize a raw Backup for the .json file (QR Blob -> data URL). */
export async function serializeBackup(raw: Backup): Promise<BackupFile> {
  const image = raw.stall?.paymentMethods.qr.image;
  const stall = raw.stall
    ? {
        ...raw.stall,
        paymentMethods: {
          ...raw.stall.paymentMethods,
          qr: {
            ...raw.stall.paymentMethods.qr,
            image: image ? await blobToDataUrl(image) : null,
          },
        },
      }
    : null;
  return { ...raw, stall };
}

/** §59 — full-database backup ready to write to a file. */
export async function exportBackup(): Promise<BackupFile> {
  try {
    const db = await openDatabase();
    const raw = await readAllStores(db);
    if (!raw.stall) throw new BackupError("No stall data to back up.");
    return await serializeBackup(raw);
  } catch (err) {
    if (err instanceof BackupError) throw err;
    throw new BackupError("Backup could not be created.", { cause: err });
  }
}

/** §60 — trigger a browser download of the backup file. */
export function downloadBackup(backup: BackupFile): void {
  triggerDownload(buildBackupFile(backup));
}
