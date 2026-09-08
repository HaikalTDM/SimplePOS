import type { Currency, PaymentMethod, Sale, SaleItem } from "../../types";
import { CURRENCIES, fromMinorUnits } from "../../utils/currency";
import { formatDate, formatTime } from "../../utils/dates";
import { sanitizeFilename } from "../../utils/filename";
import type { DownloadFile } from "../backup/download";

// §63 — Excel-safe sales CSV. Header exactly: Date, Time, Items, Quantity,
// Total, PaymentMethod, Profit. Money cells are plain major-unit numbers
// (no currency symbol). CRLF line endings + UTF-8 BOM so Excel opens it right.

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  qr: "QR",
  card: "Card",
};

function majorString(minor: number, currency: Currency): string {
  return fromMinorUnits(minor, currency).toFixed(CURRENCIES[currency].decimals);
}

function escapeCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function exportSalesCsv(
  sales: Sale[],
  saleItems: SaleItem[],
  stallName: string,
  currency: Currency,
): DownloadFile {
  const sorted = [...sales].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const itemsBySale = new Map<string, SaleItem[]>();
  for (const item of saleItems) {
    const list = itemsBySale.get(item.saleId);
    if (list) list.push(item);
    else itemsBySale.set(item.saleId, [item]);
  }

  const rows: string[] = ["Date,Time,Items,Quantity,Total,PaymentMethod,Profit"];
  for (const sale of sorted) {
    const items = itemsBySale.get(sale.id) ?? [];
    const itemsCell = items.map((i) => `${i.productName} x${i.quantity}`).join(" | ");
    const quantity = items.reduce((acc, i) => acc + i.quantity, 0);
    // Honest profit: empty when any line lacks a cost — never invented.
    const profit = items.every((i) => i.unitCost !== null)
      ? majorString(
          items.reduce((acc, i) => acc + (i.unitPrice - (i.unitCost ?? 0)) * i.quantity, 0),
          currency,
        )
      : "";
    rows.push(
      [
        formatDate(sale.timestamp),
        formatTime(sale.timestamp),
        itemsCell,
        String(quantity),
        majorString(sale.total, currency),
        PAYMENT_LABELS[sale.paymentMethod],
        profit,
      ]
        .map(escapeCell)
        .join(","),
    );
  }

  let dateRange: string;
  if (sorted.length === 0) {
    dateRange = "empty";
  } else {
    const first = formatDate(sorted[0].timestamp);
    const last = formatDate(sorted[sorted.length - 1].timestamp);
    dateRange = first === last ? first : `${first}-to-${last}`;
  }

  return {
    blob: new Blob([`\uFEFF${rows.join("\r\n")}\r\n`], {
      type: "text/csv;charset=utf-8",
    }),
    filename: `SimplePOS-Sales-${sanitizeFilename(stallName)}-${dateRange}.csv`,
  };
}
