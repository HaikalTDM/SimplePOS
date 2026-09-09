import type {
  Backup,
  Category,
  Expense,
  Product,
  Sale,
  SaleItem,
  Stall,
  StockMovement,
} from "../../types";
import {
  ALL_STORES,
  STORE_BACKUP,
  STORE_CATEGORIES,
  STORE_EXPENSES,
  STORE_PRODUCTS,
  STORE_SALES,
  STORE_SALE_ITEMS,
  STORE_STALL,
  STORE_STOCK_MOVEMENTS,
} from "./database";
import { requestToPromise, runInTransaction, txDone } from "./promise";

// lib.dom types getAll()/get() as IDBRequest<IDBAny[]> (IDBAny = any);
// cast to T once at this boundary.

export async function getAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  const tx = db.transaction(store, "readonly");
  const done = txDone(tx);
  const raw = await requestToPromise(tx.objectStore(store).getAll());
  await done;
  return raw as T[];
}

export async function get<T>(
  db: IDBDatabase,
  store: string,
  id: IDBValidKey,
): Promise<T | undefined> {
  const tx = db.transaction(store, "readonly");
  const done = txDone(tx);
  const raw = await requestToPromise(tx.objectStore(store).get(id));
  await done;
  return raw as T | undefined;
}

export async function put<T>(
  db: IDBDatabase,
  store: string,
  value: T,
): Promise<void> {
  const tx = db.transaction(store, "readwrite");
  const done = txDone(tx);
  await requestToPromise(tx.objectStore(store).put(value));
  await done;
}

export async function bulkPut<T>(
  db: IDBDatabase,
  store: string,
  values: T[],
): Promise<void> {
  if (values.length === 0) return;
  const tx = db.transaction(store, "readwrite");
  const done = txDone(tx);
  const os = tx.objectStore(store);
  for (const value of values) os.put(value);
  await done;
}

export async function del(
  db: IDBDatabase,
  store: string,
  id: IDBValidKey,
): Promise<void> {
  const tx = db.transaction(store, "readwrite");
  const done = txDone(tx);
  await requestToPromise(tx.objectStore(store).delete(id));
  await done;
}

export async function clear(db: IDBDatabase, store: string): Promise<void> {
  const tx = db.transaction(store, "readwrite");
  const done = txDone(tx);
  await requestToPromise(tx.objectStore(store).clear());
  await done;
}

export async function getAllByIndex<T>(
  db: IDBDatabase,
  store: string,
  indexName: string,
  value: IDBValidKey,
): Promise<T[]> {
  const tx = db.transaction(store, "readonly");
  const done = txDone(tx);
  const raw = await requestToPromise(
    tx.objectStore(store).index(indexName).getAll(value),
  );
  await done;
  return raw as T[];
}

export async function count(db: IDBDatabase, store: string): Promise<number> {
  const tx = db.transaction(store, "readonly");
  const done = txDone(tx);
  const result = await requestToPromise(tx.objectStore(store).count());
  await done;
  return result;
}

export async function countByIndex(
  db: IDBDatabase,
  store: string,
  indexName: string,
  value: IDBValidKey,
): Promise<number> {
  const tx = db.transaction(store, "readonly");
  const done = txDone(tx);
  const result = await requestToPromise(
    tx.objectStore(store).index(indexName).count(value),
  );
  await done;
  return result;
}

export interface StoreFacade<T> {
  getAll(db: IDBDatabase): Promise<T[]>;
  get(db: IDBDatabase, id: IDBValidKey): Promise<T | undefined>;
  put(db: IDBDatabase, value: T): Promise<void>;
  bulkPut(db: IDBDatabase, values: T[]): Promise<void>;
  del(db: IDBDatabase, id: IDBValidKey): Promise<void>;
  clear(db: IDBDatabase): Promise<void>;
  count(db: IDBDatabase): Promise<number>;
}

function makeFacade<T>(storeName: string): StoreFacade<T> {
  return {
    getAll: (db) => getAll<T>(db, storeName),
    get: (db, id) => get<T>(db, storeName, id),
    put: (db, value) => put<T>(db, storeName, value),
    bulkPut: (db, values) => bulkPut<T>(db, storeName, values),
    del: (db, id) => del(db, storeName, id),
    clear: (db) => clear(db, storeName),
    count: (db) => count(db, storeName),
  };
}

export const stallDb = makeFacade<Stall>(STORE_STALL);
export const productsDb = makeFacade<Product>(STORE_PRODUCTS);
export const categoriesDb = makeFacade<Category>(STORE_CATEGORIES);
export const salesDb = makeFacade<Sale>(STORE_SALES);
export const saleItemsDb = makeFacade<SaleItem>(STORE_SALE_ITEMS);
export const stockMovementsDb = makeFacade<StockMovement>(STORE_STOCK_MOVEMENTS);
export const expensesDb = makeFacade<Expense>(STORE_EXPENSES);
export const backupDb = makeFacade<Backup>(STORE_BACKUP);

/** "Delete all data" (§85): clear every store in ONE transaction. */
export async function resetAllData(db: IDBDatabase): Promise<void> {
  await runInTransaction(db, [...ALL_STORES], "readwrite", async (tx) => {
    for (const store of ALL_STORES) tx.objectStore(store).clear();
  });
}
