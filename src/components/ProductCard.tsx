import type { Currency, Product } from "../types";
import { formatMoney } from "../utils/currency";
import Badge from "./Badge";

interface ProductCardProps {
  product: Product;
  currency: Currency;
  /** Current qty of this product in the cart (drives the badge). */
  qty: number;
  lowStockThreshold: number;
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
  onAdd,
}: ProductCardProps) {
  const soldOut = product.stock <= 0;
  const veryLow = !soldOut && product.stock < 5;
  const low = !soldOut && !veryLow && product.stock <= lowStockThreshold;

  return (
    <button
      type="button"
      className={soldOut ? "product-card product-card--soldout" : "product-card"}
      disabled={soldOut}
      aria-disabled={soldOut || undefined}
      aria-label={`Add ${product.name}, ${formatMoney(product.sellingPrice, currency)}`}
      onClick={() => onAdd(product)}
    >
      {qty > 0 && (
        <Badge key={qty} variant="accent" className="product-card__qty" srOnly={`${qty} in cart`}>
          {qty}
        </Badge>
      )}
      <span className="product-card__name">{product.name}</span>
      <span className="product-card__price">{formatMoney(product.sellingPrice, currency)}</span>
      {soldOut ? (
        <span className="product-card__soldout">OUT OF STOCK</span>
      ) : (
        <span className="product-card__stock">
          Stock: {product.stock}
          {veryLow && <Badge variant="accent">Very low</Badge>}
          {low && <Badge variant="neutral">Low</Badge>}
        </span>
      )}
    </button>
  );
}
