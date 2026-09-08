// Integer math on minor units only. Never pass floats through here.

export function sum(...values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/** Change due in minor units; null when the payment is short. */
export function change(received: number, total: number): number | null {
  return received >= total ? received - total : null;
}

/** Line subtotal in minor units for a whole-number quantity. */
export function qtySubtotal(unitMinor: number, qty: number): number {
  return unitMinor * qty;
}
