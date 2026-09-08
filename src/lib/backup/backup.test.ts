import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import type { BackupFile } from "./types";
import { BackupError, exportBackup } from "./exportBackup";
import { ImportError, importBackup } from "./importBackup";
import { validateBackup } from "./validateBackup";
import { blobToDataUrl, dataUrlToBlob } from "./blobCodec";
import { buildBackupFile, triggerDownload } from "./download";
import { localDateOf } from "../../utils/dates";
import {
  backupDb,
  closeDatabase,
  expensesDb,
  openDatabase,
  productsDb,
  resetAllData,
  saleItemsDb,
  salesDb,
  stallDb,
  stockMovementsDb,
} from "../db";
import type {
  Expense,
  Product,
  Sale,
  SaleItem,
  Stall,
  StockMovement,
} from "../../types";

// fake-indexeddb clones values with Node's structuredClone, which turns
// jsdom's pure-JS Blob into {}. A real browser stores Blobs natively, so the
// tests install Node's Blob as the global — matching production behavior.
const nodeBuffer = (
  globalThis as unknown as {
    process: { getBuiltinModule: (spec: string) => { Blob: typeof Blob } };
  }
).process.getBuiltinModule("node:buffer");
const NodeBlob = nodeBuffer.Blob;

const STALL: Stall = {
  id: "stall-1",
  name: "YayaCake",
  currency: "MYR",
  businessType: "Food & Beverage",
  paymentMethods: { cash: true, qr: { enabled: true, image: null }, card: false },
  lowStockThreshold: 10,
  onboardingCompletedAt: "2026-09-01T00:00:00.000Z",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const PRODUCTS: Product[] = [
  { id: "p-milo", name: "Milo", sellingPrice: 300, costPrice: 120, stock: 20, category: "Drinks", active: true, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" },
  { id: "p-teh", name: "Teh Tarik", sellingPrice: 250, costPrice: 90, stock: 5, category: "Drinks", active: true, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" },
  { id: "p-nasi", name: "Nasi Goreng", sellingPrice: 800, costPrice: null, stock: 10, category: "Food", active: true, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" },
];

const SALES: Sale[] = [
  { id: "s1", timestamp: "2026-09-08T06:35:00.000Z", total: 850, paymentMethod: "cash", currency: "MYR" },
  { id: "s2", timestamp: "2026-09-08T07:00:00.000Z", total: 800, paymentMethod: "qr", currency: "MYR", notes: "takeaway" },
];

const SALE_ITEMS: SaleItem[] = [
  { id: "si1", saleId: "s1", productId: "p-milo", productName: "Milo", quantity: 2, unitPrice: 300, unitCost: 120, subtotal: 600 },
  { id: "si2", saleId: "s1", productId: "p-teh", productName: "Teh Tarik", quantity: 1, unitPrice: 250, unitCost: 90, subtotal: 250 },
  { id: "si3", saleId: "s2", productId: "p-nasi", productName: "Nasi Goreng", quantity: 1, unitPrice: 800, unitCost: null, subtotal: 800 },
];

const MOVEMENTS: StockMovement[] = [
  { id: "m1", productId: "p-milo", type: "sale", quantity: 2, timestamp: "2026-09-08T06:35:00.000Z", saleId: "s1" },
  { id: "m2", productId: "p-teh", type: "sale", quantity: 1, timestamp: "2026-09-08T06:35:00.000Z", saleId: "s1" },
];

const EXPENSES: Expense[] = [
  { id: "e1", description: "Ice", amount: 500, category: "Stock", date: "2026-09-08", currency: "MYR" },
  { id: "e2", description: "Fuel", amount: 1000, category: "Delivery", date: "2026-09-07", currency: "MYR" },
];

beforeEach(() => {
  closeDatabase();
  globalThis.indexedDB = new IDBFactory();
  globalThis.Blob = NodeBlob as unknown as typeof Blob;
});

function qrBlob(): Blob {
  return new Blob(["qrdata"], { type: "image/png" });
}

async function seedFull(): Promise<void> {
  const db = await openDatabase();
  await stallDb.put(db, {
    ...STALL,
    paymentMethods: { cash: true, qr: { enabled: true, image: qrBlob() }, card: false },
  });
  await productsDb.bulkPut(db, PRODUCTS);
  await salesDb.bulkPut(db, SALES);
  await saleItemsDb.bulkPut(db, SALE_ITEMS);
  await stockMovementsDb.bulkPut(db, MOVEMENTS);
  await expensesDb.bulkPut(db, EXPENSES);
}

async function readState() {
  const db = await openDatabase();
  const [stalls, products, sales, saleItems, stockMovements, expenses] =
    await Promise.all([
      stallDb.getAll(db),
      productsDb.getAll(db),
      salesDb.getAll(db),
      saleItemsDb.getAll(db),
      stockMovementsDb.getAll(db),
      expensesDb.getAll(db),
    ]);
  const stall = stalls[0];
  const qr = stall?.paymentMethods.qr.image ?? null;
  return {
    stall: stall ? { id: stall.id, name: stall.name, currency: stall.currency } : null,
    qr: qr ? { type: qr.type, size: qr.size } : null,
    products,
    sales,
    saleItems,
    stockMovements,
    expenses,
  };
}

describe("exportBackup", () => {
  it("snapshots every store with app/formatVersion/exportedAt and serializes the QR image", async () => {
    await seedFull();
    const backup = await exportBackup();
    expect(backup.app).toBe("SimplePOS");
    expect(backup.formatVersion).toBe("1.0");
    expect(Number.isNaN(Date.parse(backup.exportedAt))).toBe(false);
    expect(backup.stall?.name).toBe("YayaCake");
    expect(backup.products).toHaveLength(3);
    expect(backup.sales).toHaveLength(2);
    expect(backup.saleItems).toHaveLength(3);
    expect(backup.stockMovements).toHaveLength(2);
    expect(backup.expenses).toHaveLength(2);
    expect(backup.stall?.paymentMethods.qr.image).toMatch(/^data:image\/png;base64,/);
    // Fully JSON-serializable: no Blobs left anywhere.
    expect(JSON.parse(JSON.stringify(backup))).toEqual(backup);
  });

  it("throws BackupError when the stall is missing", async () => {
    await expect(exportBackup()).rejects.toBeInstanceOf(BackupError);
    await expect(exportBackup()).rejects.toThrow("No stall data to back up.");
  });

  it("buildBackupFile names the file after the stall and date, download is a no-op in jsdom", async () => {
    await seedFull();
    const backup = await exportBackup();
    const file = buildBackupFile(backup);
    expect(file.filename).toBe(`SimplePOS-Backup-YayaCake-${localDateOf(backup.exportedAt)}.json`);
    expect(file.blob.type).toBe("application/json");
    expect(JSON.parse(await file.blob.text())).toEqual(backup);
    expect(() => triggerDownload(file)).not.toThrow();
  });
});

describe("blobCodec", () => {
  it("round-trips a Blob through a data URL with type and bytes intact", async () => {
    const blob = new Blob([new Uint8Array([0, 1, 2, 250, 255])], { type: "image/png" });
    const dataUrl = await blobToDataUrl(blob);
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    const back = dataUrlToBlob(dataUrl);
    expect(back.type).toBe("image/png");
    expect(new Uint8Array(await back.arrayBuffer())).toEqual(
      new Uint8Array([0, 1, 2, 250, 255]),
    );
  });

  it("dataUrlToBlob throws on malformed data URLs", () => {
    expect(() => dataUrlToBlob("not-a-data-url")).toThrow();
  });
});

describe("importBackup round trip", () => {
  it("restores every store, including the QR image as a Blob", async () => {
    await seedFull();
    const json = JSON.stringify(await exportBackup());

    const db = await openDatabase();
    await resetAllData(db);

    const summary = await importBackup(json);
    expect(summary).toEqual({
      products: 3,
      sales: 2,
      saleItems: 3,
      stockMovements: 2,
      expenses: 2,
    });

    const state = await readState();
    // IndexedDB getAll returns records in key order, not insertion order.
    const byId = <T extends { id: string }>(arr: T[]): T[] =>
      [...arr].sort((a, b) => a.id.localeCompare(b.id));
    expect(state.products).toEqual(byId(PRODUCTS));
    expect(state.sales).toEqual(byId(SALES));
    expect(state.saleItems).toEqual(byId(SALE_ITEMS));
    expect(state.stockMovements).toEqual(byId(MOVEMENTS));
    expect(state.expenses).toEqual(byId(EXPENSES));
    expect(state.stall).toEqual({ id: "stall-1", name: "YayaCake", currency: "MYR" });
    expect(state.qr).toEqual({ type: "image/png", size: 6 });
  });

  it("stores a safety snapshot of current data before replacing it", async () => {
    await seedFull();
    const minimal: BackupFile = {
      app: "SimplePOS",
      formatVersion: "1.0",
      exportedAt: new Date().toISOString(),
      stall: {
        ...STALL,
        name: "NewStall",
        paymentMethods: { cash: true, qr: { enabled: false, image: null }, card: false },
      },
      products: [PRODUCTS[0]],
      sales: [],
      saleItems: [],
      stockMovements: [],
      expenses: [],
    };
    await importBackup(JSON.stringify(minimal));

    const db = await openDatabase();
    const snapshots = await backupDb.getAll(db);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].stall?.name).toBe("YayaCake");
    expect(snapshots[0].products).toHaveLength(3);
    expect(snapshots[0].stall?.paymentMethods.qr.image).toBeInstanceOf(Blob);
  });
});

describe("importBackup validation failures never touch existing data", () => {
  async function expectRejectedUnchanged(mutate: (raw: Record<string, unknown>) => void): Promise<void> {
    await seedFull();
    const before = await readState();
    const raw = JSON.parse(JSON.stringify(await exportBackup())) as Record<string, unknown>;
    mutate(raw);
    await expect(importBackup(JSON.stringify(raw))).rejects.toBeInstanceOf(ImportError);
    const after = await readState();
    expect(after.products).toEqual(before.products);
    expect(after.sales).toEqual(before.sales);
    expect(after.saleItems).toEqual(before.saleItems);
    expect(after.stockMovements).toEqual(before.stockMovements);
    expect(after.expenses).toEqual(before.expenses);
    expect(after.stall).toEqual(before.stall);
    expect(after.qr).toEqual(before.qr);
  }

  it("rejects invalid JSON", async () => {
    await seedFull();
    await expect(importBackup("{not json")).rejects.toBeInstanceOf(ImportError);
  });

  it("rejects a wrong app identifier", async () => {
    await expectRejectedUnchanged((raw) => {
      raw.app = "OtherPOS";
    });
  });

  it("rejects a wrong format version", async () => {
    await expectRejectedUnchanged((raw) => {
      raw.formatVersion = "0.9";
    });
  });

  it("rejects a missing format version", async () => {
    await expectRejectedUnchanged((raw) => {
      delete raw.formatVersion;
    });
  });

  it("rejects a missing stall", async () => {
    await expectRejectedUnchanged((raw) => {
      raw.stall = null;
    });
  });

  it("rejects a sale item referencing a missing sale", async () => {
    await expectRejectedUnchanged((raw) => {
      (raw.saleItems as SaleItem[])[0].saleId = "missing-sale";
    });
  });

  it("rejects a sale item referencing a missing product", async () => {
    await expectRejectedUnchanged((raw) => {
      (raw.saleItems as SaleItem[])[1].productId = "missing-product";
    });
  });

  it("rejects a movement referencing a missing product", async () => {
    await expectRejectedUnchanged((raw) => {
      (raw.stockMovements as StockMovement[])[0].productId = "missing-product";
    });
  });

  it("rejects negative money", async () => {
    await expectRejectedUnchanged((raw) => {
      (raw.products as Product[])[0].sellingPrice = -1;
    });
  });

  it("rejects non-integer stock", async () => {
    await expectRejectedUnchanged((raw) => {
      (raw.products as Product[])[1].stock = 1.5;
    });
  });

  it("rejects duplicate ids", async () => {
    await expectRejectedUnchanged((raw) => {
      (raw.products as Product[])[1].id = (raw.products as Product[])[0].id;
    });
  });

  it("rejects a non-ISO timestamp", async () => {
    await expectRejectedUnchanged((raw) => {
      (raw.sales as Sale[])[0].timestamp = "not-a-date";
    });
  });

  it("collects multiple errors at once", async () => {
    const minimal: Record<string, unknown> = {
      app: "WrongApp",
      formatVersion: "0.5",
      exportedAt: "yesterday",
      stall: null,
      products: "not-an-array",
      sales: [],
      saleItems: [],
      stockMovements: [],
      expenses: [],
    };
    const result = validateBackup(minimal);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(3);
    }
  });

  it("validates a healthy backup as ok", async () => {
    await seedFull();
    const backup = await exportBackup();
    const result = validateBackup(JSON.stringify(backup));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.products).toHaveLength(3);
  });
});
