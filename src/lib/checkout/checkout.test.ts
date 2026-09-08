import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { CheckoutError, completeCheckout } from "./checkout";
import {
  closeDatabase,
  openDatabase,
  productsDb,
  saleItemsDb,
  salesDb,
  stockMovementsDb,
} from "../db";
import type { Product } from "../../types";

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: "p1",
    name: "Milo",
    sellingPrice: 300,
    costPrice: null,
    stock: 10,
    category: "Drinks",
    active: true,
    createdAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
    ...overrides,
  };
}

async function seed(product: Product): Promise<void> {
  const db = await openDatabase();
  await productsDb.put(db, product);
}

beforeEach(() => {
  closeDatabase();
  globalThis.indexedDB = new IDBFactory();
});

describe("completeCheckout", () => {
  it("completes a sale: snapshot saleItems, exact total, stock decrease, movements", async () => {
    await seed(
      makeProduct({ id: "p1", name: "Milo", sellingPrice: 300, costPrice: 120, stock: 10 })
    );
    await seed(
      makeProduct({
        id: "p2",
        name: "Teh Tarik",
        sellingPrice: 250,
        costPrice: null,
        stock: 5,
      })
    );

    const result = await completeCheckout({
      items: [
        { productId: "p1", qty: 2 },
        { productId: "p2", qty: 1 },
      ],
      paymentMethod: "cash",
      currency: "MYR",
    });

    expect(result.sale.total).toBe(300 * 2 + 250);
    expect(result.sale.paymentMethod).toBe("cash");
    expect(result.sale.currency).toBe("MYR");
    expect(result.sale.timestamp).toBeTruthy();
    expect(result.stockChanges).toEqual([
      { productId: "p1", name: "Milo", before: 10, after: 8 },
      { productId: "p2", name: "Teh Tarik", before: 5, after: 4 },
    ]);

    const db = await openDatabase();
    const sales = await salesDb.getAll(db);
    expect(sales).toHaveLength(1);
    expect(sales[0].id).toBe(result.sale.id);

    const items = await saleItemsDb.getAll(db);
    expect(items).toHaveLength(2);
    const miloItem = items.find((i) => i.productId === "p1")!;
    expect(miloItem.saleId).toBe(result.sale.id);
    expect(miloItem.productName).toBe("Milo");
    expect(miloItem.quantity).toBe(2);
    expect(miloItem.unitPrice).toBe(300);
    expect(miloItem.unitCost).toBe(120);
    expect(miloItem.subtotal).toBe(600);
    const tehItem = items.find((i) => i.productId === "p2")!;
    expect(tehItem.unitPrice).toBe(250);
    expect(tehItem.unitCost).toBeNull();
    expect(tehItem.subtotal).toBe(250);

    const products = await productsDb.getAll(db);
    expect(products.find((p) => p.id === "p1")?.stock).toBe(8);
    expect(products.find((p) => p.id === "p2")?.stock).toBe(4);

    const movements = await stockMovementsDb.getAll(db);
    expect(movements).toHaveLength(2);
    for (const m of movements) {
      expect(m.type).toBe("sale");
      expect(m.quantity).toBeGreaterThan(0);
      expect(m.saleId).toBe(result.sale.id);
      expect(m.timestamp).toBe(result.sale.timestamp);
    }
    expect(movements.find((m) => m.productId === "p1")?.quantity).toBe(2);
    expect(movements.find((m) => m.productId === "p2")?.quantity).toBe(1);
  });

  it("is atomic once: a second checkout of the same cart fails and adds no rows", async () => {
    await seed(makeProduct({ stock: 2 }));
    const args = {
      items: [{ productId: "p1", qty: 2 }],
      paymentMethod: "cash" as const,
      currency: "MYR" as const,
    };

    await completeCheckout(args);
    await expect(completeCheckout(args)).rejects.toBeInstanceOf(CheckoutError);

    const db = await openDatabase();
    expect(await salesDb.count(db)).toBe(1);
    expect(await saleItemsDb.count(db)).toBe(1);
    expect(await stockMovementsDb.count(db)).toBe(1);
    expect((await productsDb.get(db, "p1"))?.stock).toBe(0);
  });

  it("rolls back everything when quantity exceeds stock", async () => {
    await seed(makeProduct({ stock: 2 }));

    await expect(
      completeCheckout({
        items: [{ productId: "p1", qty: 3 }],
        paymentMethod: "cash",
        currency: "MYR",
      })
    ).rejects.toBeInstanceOf(CheckoutError);

    const db = await openDatabase();
    expect(await salesDb.count(db)).toBe(0);
    expect(await saleItemsDb.count(db)).toBe(0);
    expect(await stockMovementsDb.count(db)).toBe(0);
    expect((await productsDb.get(db, "p1"))?.stock).toBe(2);
  });

  it("rolls back everything when a product does not exist", async () => {
    await seed(makeProduct({ stock: 2 }));

    await expect(
      completeCheckout({
        items: [{ productId: "ghost", qty: 1 }],
        paymentMethod: "cash",
        currency: "MYR",
      })
    ).rejects.toBeInstanceOf(CheckoutError);

    const db = await openDatabase();
    expect(await salesDb.count(db)).toBe(0);
    expect(await saleItemsDb.count(db)).toBe(0);
    expect(await stockMovementsDb.count(db)).toBe(0);
    expect((await productsDb.get(db, "p1"))?.stock).toBe(2);
  });

  it("rolls back everything when a product is inactive", async () => {
    await seed(makeProduct({ active: false, stock: 5 }));

    await expect(
      completeCheckout({
        items: [{ productId: "p1", qty: 1 }],
        paymentMethod: "cash",
        currency: "MYR",
      })
    ).rejects.toBeInstanceOf(CheckoutError);

    const db = await openDatabase();
    expect(await salesDb.count(db)).toBe(0);
    expect(await saleItemsDb.count(db)).toBe(0);
    expect(await stockMovementsDb.count(db)).toBe(0);
    expect((await productsDb.get(db, "p1"))?.stock).toBe(5);
  });

  it("keeps original snapshot values after the product is renamed and repriced (§79)", async () => {
    await seed(makeProduct({ sellingPrice: 300, costPrice: 120, stock: 10 }));

    await completeCheckout({
      items: [{ productId: "p1", qty: 2 }],
      paymentMethod: "cash",
      currency: "MYR",
    });

    const db = await openDatabase();
    await productsDb.put(db, {
      ...makeProduct({ name: "Milo V2", sellingPrice: 999, costPrice: 5, stock: 0 }),
      updatedAt: "2026-09-08T01:00:00.000Z",
    });

    const items = await saleItemsDb.getAll(db);
    expect(items).toHaveLength(1);
    expect(items[0].productName).toBe("Milo");
    expect(items[0].unitPrice).toBe(300);
    expect(items[0].unitCost).toBe(120);
    expect(items[0].subtotal).toBe(600);
  });

  it("rejects an empty cart", async () => {
    await expect(
      completeCheckout({ items: [], paymentMethod: "cash", currency: "MYR" })
    ).rejects.toBeInstanceOf(CheckoutError);

    const db = await openDatabase();
    expect(await salesDb.count(db)).toBe(0);
    expect(await saleItemsDb.count(db)).toBe(0);
    expect(await stockMovementsDb.count(db)).toBe(0);
  });

  it("aggregates duplicate lines so a product cannot be oversold across them", async () => {
    await seed(makeProduct({ stock: 3 }));

    await expect(
      completeCheckout({
        items: [
          { productId: "p1", qty: 2 },
          { productId: "p1", qty: 2 },
        ],
        paymentMethod: "cash",
        currency: "MYR",
      })
    ).rejects.toBeInstanceOf(CheckoutError);

    const db = await openDatabase();
    expect(await salesDb.count(db)).toBe(0);
    expect((await productsDb.get(db, "p1"))?.stock).toBe(3);
  });
});
