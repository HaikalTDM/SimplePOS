import type { Currency } from "../types";

export interface CurrencyInfo {
  decimals: number;
  symbol: string;
  locale: string;
}

export const CURRENCIES: Record<Currency, CurrencyInfo> = {
  MYR: { decimals: 2, symbol: "RM", locale: "en-MY" },
  SGD: { decimals: 2, symbol: "S$", locale: "en-SG" },
  PHP: { decimals: 2, symbol: "₱", locale: "en-PH" },
  THB: { decimals: 2, symbol: "฿", locale: "th-TH" },
  IDR: { decimals: 0, symbol: "Rp", locale: "id-ID" },
  VND: { decimals: 0, symbol: "₫", locale: "vi-VN" },
};

/**
 * Convert a major-unit string or number to integer minor units.
 * String-safe: splits on ".", pads, and rounds half-up on the first dropped
 * digit — never a float multiply, so values like "45.505" or 0.1 + 0.2 are safe.
 * Returns 0 for unparseable input (gate user input through parseMoneyInput).
 */
export function toMinorUnits(value: string | number, code: Currency): number {
  const { decimals } = CURRENCIES[code];
  const raw = String(value).trim();
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [majorPart = "0", fracPart = ""] = unsigned.split(".");
  const major = Number.parseInt(majorPart, 10);
  if (Number.isNaN(major)) return 0;

  const fracMinor =
    decimals > 0
      ? Number.parseInt(fracPart.padEnd(decimals, "0").slice(0, decimals) || "0", 10)
      : 0;
  const dropped = fracPart[decimals] ?? "0";
  const roundUp = dropped >= "5" ? 1 : 0;

  const magnitude = major * 10 ** decimals + fracMinor + roundUp;
  return negative ? -magnitude : magnitude;
}

/** Minor units to a major-unit float. For display math only — never persist it. */
export function fromMinorUnits(minor: number, code: Currency): number {
  return minor / 10 ** CURRENCIES[code].decimals;
}

/** e.g. formatMoney(4550, "MYR") -> "RM 45.50"; (45500, "IDR") -> "Rp 45.500". */
export function formatMoney(minor: number, code: Currency): string {
  const { decimals, symbol, locale } = CURRENCIES[code];
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(fromMinorUnits(minor, code));
  return `${symbol} ${formatted}`;
}

/** Parse user-typed money into minor units, or null when empty/invalid. */
export function parseMoneyInput(raw: string, code: Currency): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || !/^\d+(\.\d+)?$/.test(trimmed)) return null;
  return toMinorUnits(trimmed, code);
}
