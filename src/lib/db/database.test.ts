import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Product } from "../../types";
import {
  closeDatabase,
  DB_NAME,
  DB_VERSION,
  MIGRATIONS,
  openDatabase,
  STORE_BACKUP,
  STORE_EXPENSES,
  STORE_PRODUCTS,
  STORE_SALES,
  STORE_SALE_ITEMS,
  STORE_STALL,
  STORE_STOCK_MOVEMENTS,
} from "./database";
import { requestToPromise, runInTransaction } from "./promise";
import { productsDb, resetAllData } from "./stores";

const p1: Product = {
  id: "p1",
  name: "Milo",
  sellingPrice: 300,
  costPrice: 100,
  stock: 20,
  category: "Drinks",
  active: true,
  createdAt: "2026-09-08T00:00:00.000Z",
  updatedAt: "2026-09-08T00:00:00.000Z",
};

const ALL_STORE_NAMES = [
  STORE_STALL,
  STORE_PRODUCTS,
  STORE_SALES,
  STORE_SALE_ITEMS,
  STORE_STOCK_MOVEMENTS,
  STORE_EXPENSES,
  STORE_BACKUP,
];

describe("database", () => {
  // Tracks the highest version reached so later tests don't try to reopen
  // the DB at a version below its current schema.
  let dbVersion: number = DB_VERSION;

  beforeEach(async () => {
    const db = await openDatabase(dbVersion);
    await resetAllData(db);
  });

  afterEach(() => {
    closeDatabase();
  });

  it("creates all 7 stores with expected indexes at version 1", async () => {
    const db = await openDatabase();
    expect(db.name).toBe(DB_NAME);
    expect(db.version).toBe(DB_VERSION);
    for (const name of ALL_STORE_NAMES) {
      expect(db.objectStoreNames.contains(name)).toBe(true);
    }
    expect([...db.transaction(STORE_PRODUCTS).objectStore(STORE_PRODUCTS).indexNames]).toContain("name");
    expect([...db.transaction(STORE_SALE_ITEMS).objectStore(STORE_SALE_ITEMS).indexNames]).toContain(
      "saleId",
    );
    expect([...db.transaction(STORE_STOCK_MOVEMENTS).objectStore(STORE_STOCK_MOVEMENTS).indexNames]).toContain(
      "productId",
    );
    expect([...db.transaction(STORE_STOCK_MOVEMENTS).objectStore(STORE_STOCK_MOVEMENTS).indexNames]).toContain(
      "timestamp",
    );
    expect([...db.transaction(STORE_SALES).objectStore(STORE_SALES).indexNames]).toContain("timestamp");
    expect([...db.transaction(STORE_EXPENSES).objectStore(STORE_EXPENSES).indexNames]).toContain("date");
    expect(
      Object.keys(MIGRATIONS).every((k) => /^\d+$/.test(k)),
    ).toBe(true);
  });

  it("preserves data across close/reopen at the same version", async () => {
    let db = await openDatabase();
    await productsDb.put(db, p1);
    closeDatabase();

    db = await openDatabase();
    expect(await productsDb.get(db, "p1")).toEqual(p1);
  });

  it("runs a registered migration on version bump and preserves data", async () => {
    const db0 = await openDatabase(dbVersion);
    await productsDb.put(db0, p1);
    closeDatabase();

    dbVersion = 2;
    MIGRATIONS[2] = () => {};
    try {
      const db = await openDatabase(2);
      expect(db.version).toBe(2);
      expect(await productsDb.get(db, "p1")).toEqual(p1);
    } finally {
      delete MIGRATIONS[2];
    }
  });

  it("rolls back writes when the transaction function throws", async () => {
    const db = await openDatabase(dbVersion);
    await expect(
      runInTransaction(db, [STORE_PRODUCTS], "readwrite", async (tx) => {
        await requestToPromise(tx.objectStore(STORE_PRODUCTS).put(p1));
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(await productsDb.count(db)).toBe(0);
  });

  it("commits writes when the transaction function succeeds", async () => {
    const db = await openDatabase(dbVersion);
    await runInTransaction(db, [STORE_PRODUCTS], "readwrite", async (tx) => {
      await requestToPromise(tx.objectStore(STORE_PRODUCTS).put(p1));
    });
    expect(await productsDb.get(db, "p1")).toEqual(p1);
  });
});
