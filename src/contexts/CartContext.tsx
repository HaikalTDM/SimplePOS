import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Product } from "../types";
import { useToast } from "../components";
import { useProducts } from "./ProductsContext";

export interface CartItem {
  productId: string;
  qty: number;
}

/** Cart line resolved against the product catalog at render time. */
export interface CartEntry {
  product: Product;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  entries: CartEntry[];
  totalQty: number;
  totalMinor: number;
  /** True when any line's qty exceeds the product's current stock (§29). */
  invalid: boolean;
  /** Returns false when the product is already at its stock cap. */
  addItem: (product: Product) => boolean;
  /** Clamps to 1..product.stock; drops the line if the product is gone/inactive. */
  setQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  getQty: (productId: string) => number;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * §81: the cart is TRANSIENT application state — never persisted, and it never
 * touches stock (§33). Lines store only productId + qty; products are resolved
 * from ProductsContext at render, so deactivated/deleted products fall out of
 * the cart automatically.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { products } = useProducts();
  const { toast } = useToast();

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const entries = useMemo<CartEntry[]>(
    () =>
      items.flatMap((item) => {
        const product = byId.get(item.productId);
        if (!product || !product.active) return [];
        return [{ product, qty: item.qty }];
      }),
    [items, byId]
  );

  // Prune lines whose product was deactivated/deleted elsewhere; toast once.
  useEffect(() => {
    if (items.length === 0) return;
    const dropped = items.filter((item) => {
      const p = byId.get(item.productId);
      return !p || !p.active;
    });
    if (dropped.length === 0) return;
    setItems((prev) =>
      prev.filter((item) => {
        const p = byId.get(item.productId);
        return p !== undefined && p.active;
      })
    );
    toast({ message: "Some items were removed from your cart", variant: "info" });
  }, [items, byId, toast]);

  const totalQty = useMemo(() => entries.reduce((sum, e) => sum + e.qty, 0), [entries]);

  // Integer minor-unit math only (§58).
  const totalMinor = useMemo(
    () => entries.reduce((sum, e) => sum + e.product.sellingPrice * e.qty, 0),
    [entries]
  );

  const invalid = useMemo(() => entries.some((e) => e.qty > e.product.stock), [entries]);

  const addItem = useCallback((product: Product): boolean => {
    let added = false;
    setItems((prev) => {
      const current = prev.find((i) => i.productId === product.id);
      const qty = current?.qty ?? 0;
      if (qty >= product.stock) return prev;
      added = true;
      const nextQty = Math.min(qty + 1, product.stock);
      return current
        ? prev.map((i) => (i.productId === product.id ? { ...i, qty: nextQty } : i))
        : [...prev, { productId: product.id, qty: nextQty }];
    });
    return added;
  }, []);

  const setQty = useCallback(
    (productId: string, qty: number) => {
      const product = byId.get(productId);
      setItems((prev) => {
        if (!product || !product.active) {
          return prev.filter((i) => i.productId !== productId);
        }
        const clamped = Math.min(Math.max(Math.trunc(qty), 1), product.stock);
        return prev.map((i) => (i.productId === productId ? { ...i, qty: clamped } : i));
      });
    },
    [byId]
  );

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const getQty = useCallback(
    (productId: string) => items.find((i) => i.productId === productId)?.qty ?? 0,
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      entries,
      totalQty,
      totalMinor,
      invalid,
      addItem,
      setQty,
      removeItem,
      clear,
      getQty,
    }),
    [items, entries, totalQty, totalMinor, invalid, addItem, setQty, removeItem, clear, getQty]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
