export function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

export function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () =>
      reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

/**
 * Run `fn` inside one transaction. Resolves with fn's result once the
 * transaction commits (tx.oncomplete); aborts and rethrows if fn throws.
 *
 * RULE: fn must NOT await anything outside the transaction's scope (timers,
 * network, other transactions). Only await IndexedDB requests on this tx —
 * a transaction auto-commits once its requests go idle, so an outside await
 * leaves later requests hitting an inactive transaction.
 */
export async function runInTransaction<T>(
  db: IDBDatabase,
  storeNames: string[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const tx = db.transaction(storeNames, mode);
  const done = txDone(tx);
  let result: T;
  try {
    result = await fn(tx);
  } catch (err) {
    tx.abort();
    await done.catch(() => {});
    throw err;
  }
  await done;
  return result;
}
