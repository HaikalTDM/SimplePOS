import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { ToastProvider } from "../../components";
import { closeDatabase, openDatabase, productsDb, saleItemsDb, salesDb, stallDb } from "../../lib/db";
import type { Product, Sale, SaleItem, Stall } from "../../types";
import { StallProvider } from "../../contexts/StallContext";
import { SessionProvider } from "../../contexts/SessionContext";
import { todayLocalISO } from "../../utils/dates";
import SalesPage from "../SalesPage";
import SaleDetailPage from "../SaleDetailPage";

function localDaysAgo(days: number, hour = 12): string {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - days,
    hour,
    0,
    0,
    0,
  ).toISOString();
}

function renderSales(initialEntry = "/sales") {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <StallProvider>
          <SessionProvider>
            <Routes>
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/sales/:id" element={<SaleDetailPage />} />
            </Routes>
          </SessionProvider>
        </StallProvider>
      </MemoryRouter>
    </ToastProvider>
  );
}

async function seedStall() {
  const db = await openDatabase();
  const now = new Date().toISOString();
  const stall: Stall = {
    id: "stall-1",
    name: "YayaCake",
    currency: "MYR",
    businessType: "Food & Beverage",
    paymentMethods: { cash: true, qr: { enabled: true, image: null }, card: true },
    lowStockThreshold: 10,
    onboardingCompletedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await stallDb.put(db, stall);
}

async function putSale(sale: Sale, items: SaleItem[]) {
  const db = await openDatabase();
  await salesDb.put(db, sale);
  for (const item of items) await saleItemsDb.put(db, item);
}

async function seedSales() {
  // Older sale, two days ago, QR, 7 units of Teh Tarik.
  await putSale(
    {
      id: "s-old",
      timestamp: localDaysAgo(2),
      total: 700,
      paymentMethod: "qr",
      currency: "MYR",
    },
    [
      {
        id: "si-old-1",
        saleId: "s-old",
        productId: "p-teh",
        productName: "Teh Tarik",
        quantity: 7,
        unitPrice: 100,
        unitCost: 40,
        subtotal: 700,
      },
    ]
  );

  // Newer sale, today, CASH, Milo x2 + Nasi Goreng x1 = 3 units.
  await putSale(
    {
      id: "s-new",
      timestamp: new Date().toISOString(),
      total: 450,
      paymentMethod: "cash",
      currency: "MYR",
      notes: "Extra spicy",
    },
    [
      {
        id: "si-new-1",
        saleId: "s-new",
        productId: "p-milo",
        productName: "Milo",
        quantity: 2,
        unitPrice: 100,
        unitCost: 50,
        subtotal: 200,
      },
      {
        id: "si-new-2",
        saleId: "s-new",
        productId: "p-nasi",
        productName: "Nasi Goreng",
        quantity: 1,
        unitPrice: 250,
        unitCost: 100,
        subtotal: 250,
      },
    ]
  );
}

async function seedProduct(overrides: Partial<Product> = {}): Promise<void> {
  const db = await openDatabase();
  const now = new Date().toISOString();
  const product: Product = {
    id: "p-milo",
    name: "Milo",
    sellingPrice: 100,
    costPrice: 50,
    stock: 20,
    category: "Drinks",
    active: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  await productsDb.put(db, product);
}

beforeEach(() => {
  closeDatabase();
  globalThis.indexedDB = new IDBFactory();
});

describe("SalesPage", () => {
  it("lists sales newest first with qty-sum item counts, totals, and payment badges", async () => {
    await seedStall();
    await seedSales();
    renderSales();

    expect(await screen.findByText("2 sales")).toBeInTheDocument();

    const rows = screen.getAllByRole("link");
    expect(rows).toHaveLength(2);

    const first = rows[0];
    expect(within(first).getByText("3 items | RM 4.50")).toBeInTheDocument();
    expect(within(first).getByText(/CASH/)).toBeInTheDocument();
    expect(within(first).getByText("RM 4.50")).toBeInTheDocument();

    const second = rows[1];
    expect(within(second).getByText("7 items | RM 7.00")).toBeInTheDocument();
    expect(within(second).getByText(/QR/)).toBeInTheDocument();
  });

  it("filters by date and clears with All time", async () => {
    await seedStall();
    await seedSales();
    renderSales();
    const user = userEvent.setup();

    await screen.findByText("2 sales");

    fireEvent.change(screen.getByLabelText("Filter by date"), {
      target: { value: todayLocalISO() },
    });

    expect(screen.getByText("1 sale")).toBeInTheDocument();
    expect(screen.getByText("3 items | RM 4.50")).toBeInTheDocument();
    expect(screen.queryByText("7 items | RM 7.00")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /All time/ }));

    expect(await screen.findByText("2 sales")).toBeInTheDocument();
    expect(screen.getByText("7 items | RM 7.00")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /All time/ })).not.toBeInTheDocument();
  });

  it("shows a friendly empty state when there are no sales", async () => {
    await seedStall();
    renderSales();

    expect(await screen.findByText("No sales yet.")).toBeInTheDocument();
    expect(
      screen.getByText("Your completed sales will appear here.")
    ).toBeInTheDocument();
  });
});

describe("SaleDetailPage", () => {
  it("renders historical snapshot rows, totals, payment method, and notes; back returns to the list", async () => {
    await seedStall();
    await seedProduct({ name: "Milo Ice" }); // product renamed AFTER the sale
    await seedSales();
    renderSales("/sales/s-new");
    const user = userEvent.setup();

    // Historical snapshot keeps the old name even though the product was renamed.
    expect(await screen.findByText("Milo")).toBeInTheDocument();
    expect(screen.queryByText("Milo Ice")).not.toBeInTheDocument();

    expect(screen.getByText("RM 1.00 × 2")).toBeInTheDocument();
    expect(screen.getByText("RM 2.50 × 1")).toBeInTheDocument();
    expect(screen.getByText("Nasi Goreng")).toBeInTheDocument();
    expect(screen.getByText("RM 4.50")).toBeInTheDocument();
    expect(screen.getByText("Paid by CASH")).toBeInTheDocument();
    expect(screen.getByText("Notes: Extra spicy")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Back to sales" }));

    expect(await screen.findByRole("heading", { name: "Sales" })).toBeInTheDocument();
    expect(screen.getByText("2 sales")).toBeInTheDocument();
  });

  it("shows a deactivated product inside the sale detail (data integrity #12)", async () => {
    await seedStall();
    await seedProduct({ id: "p-teh", name: "Teh Tarik", active: false });
    await seedSales();
    renderSales("/sales/s-old");

    expect(await screen.findByText("Teh Tarik")).toBeInTheDocument();
    expect(screen.getByText("RM 1.00 × 7")).toBeInTheDocument();
    expect(screen.getAllByText("RM 7.00")).toHaveLength(2); // subtotal + total
    expect(screen.getByText("Paid by QR")).toBeInTheDocument();
  });

  it("shows Sale not found for an unknown id", async () => {
    await seedStall();
    renderSales("/sales/nope");

    expect(await screen.findByText("Sale not found.")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Back to sales" }).length
    ).toBeGreaterThan(0);
  });
});
