import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Product } from "../types";
import { formatMoney } from "../utils/currency";
import { EmptyState, IconCart, IconClear, IconProducts, IconSearch, Input, KeycapButton, PaymentModal, useToast } from "../components";
import type { StockChange } from "../lib/checkout/checkout";
import { useStall } from "../contexts/StallContext";
import { useProducts } from "../contexts/ProductsContext";
import { useCart } from "../contexts/CartContext";
import ProductCard from "../components/ProductCard";
import PosCart from "../components/PosCart";
import CategoryBar from "../components/CategoryBar";

function getMediaMatches(query: string): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(query).matches
  );
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => getMediaMatches(query));
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

const ALL = "All";

export default function PosPage() {
  const { stall } = useStall();
  const currency = stall?.currency ?? "MYR";
  const threshold = stall?.lowStockThreshold ?? 10;
  const { products, loading, refresh } = useProducts();
  const { items, entries, totalQty, totalMinor, invalid, addItem, setQty, removeItem, getQty, clear } =
    useCart();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const capToasts = useRef<Set<string>>(new Set());

  const onPay = () => {
    if (totalQty === 0) return;
    setPaymentOpen(true);
  };

  // The checkout service never touches the cart (§39): it is cleared only
  // here, after the transaction committed.
  const handlePaymentSuccess = useCallback(
    (_stockChanges: StockChange[]) => {
      clear();
      void refresh();
      toast({ message: "Sale recorded", variant: "success" });
      setPaymentOpen(false);
    },
    [clear, refresh, toast]
  );

  const active = useMemo(() => products.filter((p) => p.active), [products]);

  const categories = useMemo(
    () =>
      [
        ...new Set(active.map((p) => p.category).filter((c): c is string => c !== null)),
      ].sort((a, b) => a.localeCompare(b)),
    [active]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return active
      .filter((p) => q === "" || p.name.toLowerCase().includes(q))
      .filter((p) => category === ALL || p.category === category)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [active, search, category]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const handleAdd = (product: Product) => {
    if (addItem(product)) {
      capToasts.current.delete(product.id);
      return;
    }
    // Already at the stock cap — toast once, then stay silent (§27 feedback throttle).
    if (capToasts.current.has(product.id)) return;
    capToasts.current.add(product.id);
    toast({ message: `Only ${product.stock} ${product.name} in stock`, variant: "info" });
  };

  const payDisabled = totalQty === 0 || invalid;

  const cartProps = {
    entries,
    totalMinor,
    currency,
    invalid,
    payDisabled,
    onPay,
    onIncrease: (id: string) => setQty(id, getQty(id) + 1),
    onDecrease: (id: string) => setQty(id, getQty(id) - 1),
    onRemove: removeItem,
    onSetQty: (id: string, qty: number) => setQty(id, qty),
  };

  const searchBox = (
    <div className="pos-search">
      <IconSearch size={18} className="pos-search__icon" />
      <Input
        className="pos-search__input"
        aria-label="Search products"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search !== "" && (
        <button
          type="button"
          className="pos-search__clear"
          aria-label="Clear search"
          onClick={() => setSearch("")}
        >
          <IconClear size={16} />
        </button>
      )}
    </div>
  );

  return (
    <div className="pos-page">
      <div className="pos-layout">
        <div className="pos-layout__left">
          <h1 className="pos-title">POS</h1>
          {searchBox}
          {categories.length > 0 && (
            <CategoryBar categories={categories} active={category} onSelect={setCategory} />
          )}
          {!loading && products.length === 0 && (
            <EmptyState
              icon={<IconProducts size={28} />}
              title="No products yet."
              message="Add your first product to start selling."
              action={
                <Link to="/products" className="keycap-btn keycap-btn--gold">
                  Add Products
                </Link>
              }
            />
          )}
          {!loading && products.length > 0 && visible.length === 0 && (
            <EmptyState icon={<IconSearch size={28} />} title="No products match." />
          )}
          {visible.length > 0 && (
            <div className="pos-grid">
              {visible.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  currency={currency}
                  qty={getQty(p.id)}
                  lowStockThreshold={threshold}
                  onAdd={handleAdd}
                />
              ))}
            </div>
          )}
        </div>
        <aside className="pos-layout__cart" aria-label="Cart">
          <div className="pos-cartpanel">
            <h2 className="pos-cartpanel__title">Cart</h2>
            <PosCart {...cartProps} />
          </div>
        </aside>
      </div>

      {isMobile && (
        <div className="pos-cartbar">
          <button
            type="button"
            className="pos-cartbar__summary"
            aria-label={`Open cart, ${totalQty} items`}
            onClick={() => setSheetOpen(true)}
          >
            <IconCart size={20} />
            <span className="pos-cartbar__count" aria-live="polite">
              {totalQty} items | {formatMoney(totalMinor, currency)}
            </span>
          </button>
          <KeycapButton variant="gold" disabled={payDisabled} onClick={onPay}>
            PAY
          </KeycapButton>
        </div>
      )}

      {isMobile && sheetOpen && (
        <div className="pos-sheet-overlay" onClick={() => setSheetOpen(false)}>
          <div
            className="pos-sheet"
            role="dialog"
            aria-label="Cart"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-sheet__header">
              <h2 className="pos-sheet__title">Cart</h2>
              <button
                type="button"
                className="pos-sheet__close"
                aria-label="Close cart"
                onClick={() => setSheetOpen(false)}
              >
                <IconClear size={18} />
              </button>
            </div>
            <div className="pos-sheet__body">
              <PosCart {...cartProps} />
            </div>
          </div>
        </div>
      )}

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        items={items}
        totalMinor={totalMinor}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
