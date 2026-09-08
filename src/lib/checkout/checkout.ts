import type {
  Currency,
  PaymentMethod,
  Product,
  Sale,
  SaleItem,
  StockMovement,
} from "../../types";
import {
  STORE_PRODUCTS,
  STORE_SALES,
  STORE_SALE_ITEMS,
  STORE_STOCK_MOVEMENTS,
  openDatabase,
  requestToPromise,
  runInTransaction,
} from "../db";
import { newId } from "../../utils/id";

export interface CheckoutItem {
  productId: string;
  qty: number;
}

export interface StockChange {
  productId: string;
  name: string;
  before: number;
  after: number;
}

export interface CheckoutArgs {
  items: CheckoutItem[];
  paymentMethod: PaymentMethod;
  currency: Currency;
}

export interface CheckoutResult {
  sale: Sale;
  stockChanges: StockChange[];
}

/**
 * Validation failure inside the checkout transaction. The tx has already
 * aborted when the caller sees this — nothing persisted, cart untouched.
 */
export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

/**
 * §39: validate → snapshot → create Sale/SaleItems → decrease stock →
 * record movements, ALL inside one readwrite transaction over the four
 * stores. Any failure aborts the whole transaction: no partial state.
 *
 * Fresh product reads inside the tx are authoritative; the service never
 * trusts caller-side totals and never touches the cart (the caller clears
 * it only after this resolves).
 */
export async function completeCheckout(args: CheckoutArgs): Promise<CheckoutResult> {
  const { items, paymentMethod, currency } = args;
  if (items.length === 0) throw new CheckoutError("Cart is empty");

  const db = await openDatabase();

  return runInTransaction(
    db,
    [STORE_PRODUCTS, STORE_SALES, STORE_SALE_ITEMS, STORE_STOCK_MOVEMENTS],
    "readwrite",
    async (tx) => {
      const productsStore = tx.objectStore(STORE_PRODUCTS);
      const salesStore = tx.objectStore(STORE_SALES);
      const saleItemsStore = tx.objectStore(STORE_SALE_ITEMS);
      const movementsStore = tx.objectStore(STORE_STOCK_MOVEMENTS);

      // Merge duplicate lines per product so a product can't be oversold by
      // splitting it across lines (§29/§79).
      const qtyByProduct = new Map<string, number>();
      for (const item of items) {
        if (!Number.isInteger(item.qty) || item.qty <= 0) {
          throw new CheckoutError("Invalid quantity");
        }
        qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.qty);
      }

      const lines: { product: Product; qty: number }[] = [];
      for (const [productId, qty] of qtyByProduct) {
        const product = (await requestToPromise(
          productsStore.get(productId),
        )) as Product | undefined;
        if (!product) throw new CheckoutError("A product in the cart no longer exists");
        if (!product.active) throw new CheckoutError(`"${product.name}" is no longer active`);
        if (product.stock < qty) {
          throw new CheckoutError(`Not enough stock for "${product.name}"`);
        }
        lines.push({ product, qty });
      }

      // Integer minor-unit math only (§58); snapshots come from this tx's reads.
      const timestamp = new Date().toISOString();
      const total = lines.reduce((sum, l) => sum + l.product.sellingPrice * l.qty, 0);
      const sale: Sale = { id: newId(), timestamp, total, paymentMethod, currency };

      const saleItems: SaleItem[] = lines.map(({ product, qty }) => ({
        id: newId(),
        saleId: sale.id,
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice: product.sellingPrice,
        unitCost: product.costPrice,
        subtotal: product.sellingPrice * qty,
      }));

      const stockChanges: StockChange[] = lines.map(({ product, qty }) => ({
        productId: product.id,
        name: product.name,
        before: product.stock,
        after: product.stock - qty,
      }));

      const movements: StockMovement[] = lines.map(({ product, qty }) => ({
        id: newId(),
        productId: product.id,
        type: "sale",
        quantity: qty,
        timestamp,
        saleId: sale.id,
      }));

      salesStore.put(sale);
      for (const item of saleItems) saleItemsStore.put(item);
      for (const { product, qty } of lines) {
        productsStore.put({ ...product, stock: product.stock - qty, updatedAt: timestamp });
      }
      for (const movement of movements) movementsStore.put(movement);

      return { sale, stockChanges };
    },
  );
}
