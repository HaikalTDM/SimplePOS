import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Category, Product, StockMovement } from "../types";
import {
  STORE_PRODUCTS,
  STORE_STOCK_MOVEMENTS,
  categoriesDb,
  openDatabase,
  productsDb,
  requestToPromise,
  runInTransaction,
  saleItemsDb,
} from "../lib/db";
import { validateProduct } from "../lib/validation/product";
import type { ProductInput } from "../lib/validation/product";
import { newId } from "../utils/id";

/** Editable fields only — stock moves exclusively through adjustStock (§45). */
export type ProductPatch = Partial<
  Pick<Product, "name" | "sellingPrice" | "costPrice" | "category" | "active">
>;

// ponytail: saleItems has no productId index, so these helpers scan the store
// in memory. Fine at V1 product counts; add a productId index + countByIndex
// if it ever becomes a bottleneck.
export async function soldProductIdSet(): Promise<Set<string>> {
  const db = await openDatabase();
  const items = await saleItemsDb.getAll(db);
  return new Set(items.map((item) => item.productId));
}

export async function productHasSales(productId: string): Promise<boolean> {
  return (await soldProductIdSet()).has(productId);
}

/** Distinct non-null category names on products that aren't registered yet. */
export function missingCategoryNames(
  products: Product[],
  categories: Category[],
): string[] {
  const known = new Set(categories.map((c) => c.name.toLowerCase()));
  const missing = new Set<string>();
  for (const p of products) {
    const name = p.category?.trim();
    if (name && !known.has(name.toLowerCase())) missing.add(name);
  }
  return [...missing];
}

interface ProductsContextValue {
  products: Product[];
  categories: Category[];
  loading: boolean;
  refresh: () => Promise<void>;
  addProduct: (input: ProductInput) => Promise<Product>;
  updateProduct: (id: string, patch: ProductPatch) => Promise<void>;
  adjustStock: (productId: string, newStock: number, reason: string) => Promise<void>;
  deactivateProduct: (id: string) => Promise<void>;
  reactivateProduct: (id: string) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const db = await openDatabase();
    const [nextProducts, nextCategories] = await Promise.all([
      productsDb.getAll(db),
      categoriesDb.getAll(db),
    ]);
    // Backfill legacy/orphaned product categories (from before the categories
    // store existed, or old imports). Products reference categories by name,
    // so the dropdown must always contain every name in use.
    const missing = missingCategoryNames(nextProducts, nextCategories);
    if (missing.length > 0) {
      const now = new Date().toISOString();
      const added: Category[] = missing.map((name) => ({
        id: newId(),
        name,
        createdAt: now,
      }));
      // The reads above already succeeded; if the write fails the connection
      // is closing (component unmounted / tests tearing down). Still update
      // local state from the fresh reads — the next mount reloads from the db.
      try {
        await categoriesDb.bulkPut(db, added);
      } catch {
        // Ignore: DB closing under us. No state corruption either way.
      }
      nextCategories.push(...added);
      nextCategories.sort((a, b) => a.name.localeCompare(b.name));
    }
    setProducts(nextProducts);
    setCategories(nextCategories);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch {
        // Errors propagate on mutations; keep the last known list here.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const addProduct = useCallback(
    async (input: ProductInput): Promise<Product> => {
      const errors = validateProduct(input);
      if (errors.length > 0) throw new Error(errors[0]);
      const db = await openDatabase();
      const now = new Date().toISOString();
      const product: Product = {
        id: newId(),
        name: input.name,
        sellingPrice: input.sellingPrice,
        costPrice: input.costPrice,
        stock: input.stock,
        category: input.category,
        active: input.active,
        createdAt: now,
        updatedAt: now,
      };
      await productsDb.put(db, product);
      await refresh();
      return product;
    },
    [refresh]
  );

  const updateProduct = useCallback(
    async (id: string, patch: ProductPatch) => {
      const db = await openDatabase();
      const current = await productsDb.get(db, id);
      if (!current) throw new Error("Product not found");
      const next = { ...current, ...patch };
      const errors = validateProduct(next);
      if (errors.length > 0) throw new Error(errors[0]);
      await productsDb.put(db, { ...next, updatedAt: new Date().toISOString() });
      await refresh();
    },
    [refresh]
  );

  const adjustStock = useCallback(
    async (productId: string, newStock: number, reason: string) => {
      if (!Number.isInteger(newStock) || newStock < 0) {
        throw new Error("Stock must be a non-negative whole number");
      }
      const db = await openDatabase();
      await runInTransaction(
        db,
        [STORE_PRODUCTS, STORE_STOCK_MOVEMENTS],
        "readwrite",
        async (tx) => {
          const productStore = tx.objectStore(STORE_PRODUCTS);
          const current = (await requestToPromise(
            productStore.get(productId)
          )) as Product | undefined;
          if (!current) throw new Error("Product not found");
          const diff = newStock - current.stock;
          if (diff === 0) return;
          const movement: StockMovement = {
            id: newId(),
            productId,
            type: diff > 0 ? "manual_add" : "manual_reduce",
            quantity: Math.abs(diff),
            reason,
            timestamp: new Date().toISOString(),
          };
          const now = new Date().toISOString();
          productStore.put({ ...current, stock: newStock, updatedAt: now });
          tx.objectStore(STORE_STOCK_MOVEMENTS).put(movement);
        }
      );
      await refresh();
    },
    [refresh]
  );

  const deactivateProduct = useCallback(
    (id: string) => updateProduct(id, { active: false }),
    [updateProduct]
  );

  const reactivateProduct = useCallback(
    (id: string) => updateProduct(id, { active: true }),
    [updateProduct]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      if (await productHasSales(id)) {
        throw new Error("Products with sales cannot be deleted; deactivate instead");
      }
      const db = await openDatabase();
      await productsDb.del(db, id);
      await refresh();
    },
    [refresh]
  );

  const addCategory = useCallback(
    async (name: string): Promise<Category> => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Category name is required");
      const known = new Set(categories.map((c) => c.name.toLowerCase()));
      if (known.has(trimmed.toLowerCase())) {
        throw new Error("That category already exists");
      }
      const db = await openDatabase();
      const category: Category = {
        id: newId(),
        name: trimmed,
        createdAt: new Date().toISOString(),
      };
      await categoriesDb.put(db, category);
      await refresh();
      return category;
    },
    [categories, refresh]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const category = categories.find((c) => c.id === id);
      if (!category) return;
      const inUse = products.some((p) => p.category === category.name);
      if (inUse) {
        throw new Error(
          `"${category.name}" is used by products. Remove it from those products first.`
        );
      }
      const db = await openDatabase();
      await categoriesDb.del(db, id);
      await refresh();
    },
    [categories, products, refresh]
  );

  const value = useMemo<ProductsContextValue>(
    () => ({
      products,
      categories,
      loading,
      refresh,
      addProduct,
      updateProduct,
      adjustStock,
      deactivateProduct,
      reactivateProduct,
      deleteProduct,
      addCategory,
      deleteCategory,
    }),
    [products, categories, loading, refresh, addProduct, updateProduct, adjustStock, deleteProduct, addCategory, deleteCategory]
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts(): ProductsContextValue {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used within a ProductsProvider");
  return ctx;
}
