import { useState } from "react";
import type { Currency, Product } from "../types";
import type { CartEntry } from "../contexts/CartContext";
import { formatMoney } from "../utils/currency";
import KeycapButton from "./KeycapButton";
import { IconCart, IconMinus, IconPlus, IconTrash } from "./icons";

interface PosCartProps {
  entries: CartEntry[];
  totalMinor: number;
  currency: Currency;
  invalid: boolean;
  payDisabled: boolean;
  onPay: () => void;
  onIncrease: (productId: string) => void;
  onDecrease: (productId: string) => void;
  onRemove: (productId: string) => void;
  onSetQty: (productId: string, qty: number) => void;
}

/**
 * Shared cart body (mobile sheet + desktop panel). Quantity is tap-to-edit
 * (§32); minus at 1 removes the row (direct delete, no confirm §84). PAY is
 * always rendered — disabled when the cart is empty or invalid (§34).
 */
export default function PosCart({
  entries,
  totalMinor,
  currency,
  invalid,
  payDisabled,
  onPay,
  onIncrease,
  onDecrease,
  onRemove,
  onSetQty,
}: PosCartProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const commit = (product: Product) => {
    if (editingId !== product.id) return;
    const qty = Math.trunc(Number(draft));
    if (Number.isFinite(qty) && qty > 0) onSetQty(product.id, qty);
    setEditingId(null);
  };

  return (
    <div className="pos-cart">
      {entries.length === 0 ? (
        <div className="pos-cart__empty">
          <IconCart size={24} />
          <p className="pos-cart__empty-title">Cart is empty</p>
          <p className="pos-cart__empty-hint">Tap products to add them.</p>
        </div>
      ) : (
        <ul className="pos-cart__items">
          {entries.map(({ product, qty }) => (
            <li key={product.id} className="pos-cart__row">
              <div className="pos-cart__main">
                <p className="pos-cart__name">{product.name}</p>
                <p className="pos-cart__unit">
                  {formatMoney(product.sellingPrice, currency)} × {qty}
                </p>
                <div className="pos-cart__controls">
                  <KeycapButton
                    variant="ghost"
                    size="sm"
                    aria-label={`Decrease ${product.name}`}
                    onClick={() => (qty <= 1 ? onRemove(product.id) : onDecrease(product.id))}
                  >
                    <IconMinus size={16} />
                  </KeycapButton>
                  {editingId === product.id ? (
                    <input
                      className="pos-cart__qty-input"
                      type="number"
                      min={1}
                      max={product.stock}
                      value={draft}
                      aria-label={`Quantity of ${product.name}`}
                      autoFocus
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commit(product)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commit(product);
                        } else if (e.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="pos-cart__qty"
                      aria-label={`Quantity of ${product.name}: ${qty}. Tap to edit.`}
                      onClick={() => {
                        setEditingId(product.id);
                        setDraft(String(qty));
                      }}
                    >
                      {qty}
                    </button>
                  )}
                  <KeycapButton
                    variant="ghost"
                    size="sm"
                    disabled={qty >= product.stock}
                    aria-label={`Increase ${product.name}`}
                    onClick={() => onIncrease(product.id)}
                  >
                    <IconPlus size={16} />
                  </KeycapButton>
                  <button
                    type="button"
                    className="pos-cart__delete"
                    aria-label={`Remove ${product.name}`}
                    onClick={() => onRemove(product.id)}
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              </div>
              <p className="pos-cart__subtotal">
                {formatMoney(product.sellingPrice * qty, currency)}
              </p>
            </li>
          ))}
        </ul>
      )}
      {invalid && <p className="pos-cart__warning">Stock changed — review cart</p>}
      <div className="pos-cart__total">
        <span className="pos-cart__total-label">Total</span>
        <span className="pos-cart__total-amount">{formatMoney(totalMinor, currency)}</span>
      </div>
      <KeycapButton
        variant="gold"
        size="lg"
        className="pos-cart__pay"
        disabled={payDisabled}
        onClick={onPay}
      >
        PAY
      </KeycapButton>
    </div>
  );
}
