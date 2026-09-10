import type { Currency, Product } from "../types";
import { formatMoney } from "../utils/currency";
import Badge from "./Badge";
// import { iconForKey } from "./categoryIcons"; // re-enable with the icon UI

interface ProductCardProps {
  product: Product;
  currency: Currency;
  /** Current qty of this product in the cart (drives the badge). */
  qty: number;
  lowStockThreshold: number;
  /** Lucide icon key of the product's category (optional). */
  categoryIcon?: string | null;
  /** Blocked (e.g. the day hasn't been started). */
  disabled?: boolean;
  onAdd: (product: Product) => void;
}

/**
 * §26–§28: whole-card add button. Stock display + badge rules mirror the
 * products page (≤ threshold "Low", <5 "Very low", 0 red "OUT OF STOCK").
 */
export default function ProductCard({
  product,
  currency,
  qty,
  lowStockThreshold,
  categoryIcon: _categoryIcon, // disabled while icon UI is paused
  disabled = false,
  onAdd,
}: ProductCardProps) {
  const soldOut = product.stock <= 0;
  const veryLow = !soldOut && product.stock < 5;
  const low = !soldOut && !veryLow && product.stock <= lowStockThreshold;
  const blocked = soldOut || disabled;
  // Icon disabled for now (overflow rework in progress). Keep resolution
  // commented so re-enabling is one step.
  // const Glyph = iconForKey(categoryIcon);

  return (
    <button
      type="button"
      className={
        (soldOut ? "product-card product-card--soldout" : "product-card") +
        (disabled && !soldOut ? " product-card--disabled" : "")
      }
      disabled={blocked}
      aria-disabled={blocked || undefined}
      aria-label={`Add ${product.name}, ${formatMoney(product.sellingPrice, currency)}`}
      onClick={() => onAdd(product)}
    >
      <span className="product-card__name">
        {/* Category icon disabled for now.
        {Glyph && (
          <span className="product-card__glyph" aria-hidden="true">
            <Glyph size={16} />
          </span>
        )}
        */}
        <span className="product-card__name-text">{product.name}</span>
      </span>
      <span className="product-card__price">{formatMoney(product.sellingPrice, currency)}</span>
      <span className="product-card__bottom">
        {soldOut ? (
          <span className="product-card__soldout">OUT OF STOCK</span>
        ) : (
          <span className="product-card__stock">
            Stock: {product.stock}
            {veryLow && <Badge variant="accent">Very low</Badge>}
            {low && <Badge variant="neutral">Low</Badge>}
          </span>
        )}
        {qty > 0 && !soldOut && (
          <Badge key={qty} variant="accent" className="product-card__qty" srOnly={`${qty} in cart`}>
            {qty}
          </Badge>
        )}
      </span>
    </button>
  );
}
