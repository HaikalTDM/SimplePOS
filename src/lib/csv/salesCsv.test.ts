import { describe, expect, it } from "vitest";
import type { Sale, SaleItem } from "../../types";
import { exportSalesCsv } from "./salesCsv";

// Timestamps are built from local Date parts so the local Date/Time columns
// are deterministic regardless of the machine's timezone.
const SALE_EARLY: Sale = {
  id: "s-early",
  timestamp: new Date(2026, 8, 8, 9, 0).toISOString(),
  total: 800,
  paymentMethod: "qr",
  currency: "MYR",
};

const SALE_LATE: Sale = {
  id: "s-late",
  timestamp: new Date(2026, 8, 8, 14, 35).toISOString(),
  total: 550,
  paymentMethod: "cash",
  currency: "MYR",
};

const ITEMS: SaleItem[] = [
  { id: "i1", saleId: "s-late", productId: "p1", productName: "Milo, Hot", quantity: 2, unitPrice: 200, unitCost: 80, subtotal: 400 },
  { id: "i2", saleId: "s-late", productId: "p2", productName: 'Nasi Goreng "Special"', quantity: 1, unitPrice: 150, unitCost: null, subtotal: 150 },
  { id: "i3", saleId: "s-early", productId: "p3", productName: "Teh Tarik", quantity: 3, unitPrice: 100, unitCost: 50, subtotal: 300 },
];

async function csvBytes(file: { blob: Blob }): Promise<Uint8Array> {
  return new Uint8Array(await file.blob.arrayBuffer());
}

async function csvText(file: { blob: Blob }): Promise<string> {
  return file.blob.text();
}

describe("exportSalesCsv", () => {
  it("writes the exact header with UTF-8 BOM and CRLF, and an empty filename range", async () => {
    const file = exportSalesCsv([], [], "YayaCake", "MYR");
    // Blob.text() strips the BOM while decoding, so assert on raw bytes.
    const bytes = await csvBytes(file);
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
    const text = await csvText(file);
    expect(text.split("\r\n")).toEqual([
      "Date,Time,Items,Quantity,Total,PaymentMethod,Profit",
      "",
    ]);
    expect(file.filename).toBe("SimplePOS-Sales-YayaCake-empty.csv");
  });

  it("sorts rows chronologically and formats Date/Time/Quantity/Total/PaymentMethod/Profit", async () => {
    const file = exportSalesCsv([SALE_LATE, SALE_EARLY], ITEMS, "YayaCake", "MYR");
    const lines = (await csvText(file)).split("\r\n");
    expect(lines[0]).toBe("Date,Time,Items,Quantity,Total,PaymentMethod,Profit");
    expect(lines[1]).toBe("2026-09-08,09:00,Teh Tarik x3,3,8.00,QR,1.50");
    expect(lines[2]).toBe(
      '2026-09-08,14:35,"Milo, Hot x2 | Nasi Goreng ""Special"" x1",3,5.50,Cash,',
    );
  });

  it("leaves Profit empty when any line lacks a cost, and fills it when all costs exist", async () => {
    const file = exportSalesCsv([SALE_LATE, SALE_EARLY], ITEMS, "YayaCake", "MYR");
    const lines = (await csvText(file)).split("\r\n");
    expect(lines[1]).toContain(",1.50");
    expect(lines[2].endsWith(",")).toBe(true);
  });

  it("escapes commas, quotes, and newlines in item names", async () => {
    const newlineItem: SaleItem = { ...ITEMS[0], productName: "Milo, Hot\nFresh" };
    const file = exportSalesCsv([SALE_LATE], [newlineItem], "YayaCake", "MYR");
    const text = await csvText(file);
    expect(text).toContain('"Milo, Hot\nFresh x2"');
    const quoteItem: SaleItem = { ...ITEMS[0], productName: 'Milo "Ice"' };
    const file2 = exportSalesCsv([SALE_LATE], [quoteItem], "YayaCake", "MYR");
    expect(await csvText(file2)).toContain('"Milo ""Ice"" x2"');
  });

  it("uses a single-date filename range for same-day sales and a span for multiple days", async () => {
    const sameDay = exportSalesCsv([SALE_LATE, SALE_EARLY], ITEMS, "YayaCake", "MYR");
    expect(sameDay.filename).toBe("SimplePOS-Sales-YayaCake-2026-09-08.csv");

    const nextDay: Sale = {
      ...SALE_LATE,
      id: "s-next",
      timestamp: new Date(2026, 8, 10, 10, 0).toISOString(),
    };
    const span = exportSalesCsv([nextDay, SALE_EARLY], ITEMS, "YayaCake", "MYR");
    expect(span.filename).toBe("SimplePOS-Sales-YayaCake-2026-09-08-to-2026-09-10.csv");
  });

  it("sanitizes the stall name in the filename", () => {
    const file = exportSalesCsv([], [], "Yaya/Cake: Best", "MYR");
    expect(file.filename).toBe("SimplePOS-Sales-Yaya-Cake- Best-empty.csv");
  });

  it("renders plain major-unit money without a currency symbol", async () => {
    const sale: Sale = {
      ...SALE_EARLY,
      total: 4550,
      id: "s-big",
    };
    const file = exportSalesCsv([sale], [ITEMS[2]], "YayaCake", "MYR");
    const lines = (await csvText(file)).split("\r\n");
    expect(lines[1]).toContain(",45.50,");
    expect(lines[1]).not.toContain("RM");
  });
});
