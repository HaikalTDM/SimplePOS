import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { ToastProvider } from "../../components";
import { closeDatabase, openDatabase, productsDb, saleItemsDb, salesDb, stallDb } from "../../lib/db";
import type { Product, Sale, SaleItem, Stall } from "../../types";
import { StallProvider } from "../../contexts/StallContext";
import { ProductsProvider } from "../../contexts/ProductsContext";
import { SessionProvider } from "../../contexts/SessionContext";
import { CartProvider } from "../../contexts/CartContext";
import DashboardPage from "../DashboardPage";
import PosPage from "../PosPage";

function renderDashboard() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <StallProvider>
          <ProductsProvider>
            <SessionProvider>
              <CartProvider>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/pos" element={<PosPage />} />
                </Routes>
              </CartProvider>
            </SessionProvider>
          </ProductsProvider>
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
    paymentMethods: { cash: true, qr: { enabled: false, image: null }, card: false },
    lowStockThreshold: 10,
    onboardingCompletedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await stallDb.put(db, stall);
}

async function seedProduct(overrides: Partial<Product> = {}): Promise<void> {
  const db = await openDatabase();
  const now = new Date().toISOString();
  const product: Product = {
    id: "p1",
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

async function seedTodaySale() {
  const db = await openDatabase();
  const sale: Sale = {
    id: "s1",
    timestamp: new Date().toISOString(),
    total: 1500,
    paymentMethod: "cash",
    currency: "MYR",
  };
  const item: SaleItem = {
    id: "si1",
    saleId: "s1",
    productId: "p1",
    productName: "Milo",
    quantity: 15,
    unitPrice: 100,
    unitCost: 50,
    subtotal: 1500,
  };
  await salesDb.put(db, sale);
  await saleItemsDb.put(db, item);
}

beforeEach(() => {
  closeDatabase();
  globalThis.indexedDB = new IDBFactory();
});

describe("DashboardPage", () => {
  it("shows today's formatted total in the hero", async () => {
    await seedStall();
    await seedTodaySale();
    renderDashboard();

    expect(await screen.findByText("RM 15.00")).toBeInTheDocument();
    expect(screen.getByText("Today's Sales")).toBeInTheDocument();
  });

  it("shows quick stats: transactions, items sold, estimated profit", async () => {
    await seedStall();
    await seedTodaySale();
    renderDashboard();

    await screen.findByText("RM 15.00");
    const stats = screen.getByRole("region", { name: "Quick stats" });
    expect(within(stats).getByText("Transactions")).toBeInTheDocument();
    expect(within(stats).getByText("1")).toBeInTheDocument();
    expect(within(stats).getByText("Items Sold")).toBeInTheDocument();
    expect(within(stats).getByText("15")).toBeInTheDocument();
    expect(within(stats).getByText("Estimated Profit")).toBeInTheDocument();
    expect(within(stats).getByText("RM 7.50")).toBeInTheDocument();
  });

  it("lists today's top seller with quantity sold", async () => {
    await seedStall();
    await seedTodaySale();
    renderDashboard();

    expect(await screen.findByText("15 sold")).toBeInTheDocument();
    expect(screen.getByText("Milo")).toBeInTheDocument();
    expect(screen.getByText("Top Sellers")).toBeInTheDocument();
  });

  it("shows low stock products with warning badges", async () => {
    await seedStall();
    await seedProduct({ id: "p2", name: "Kuih", stock: 3 });
    await seedProduct({ id: "p3", name: "Roti", stock: 0 });
    renderDashboard();

    expect(await screen.findByText("Low Stock")).toBeInTheDocument();
    expect(screen.getByText("Kuih")).toBeInTheDocument();
    expect(screen.getByText(/Stock: 3/)).toBeInTheDocument();
    expect(screen.getByText("Very low")).toBeInTheDocument();
    expect(screen.getByText("OUT OF STOCK")).toBeInTheDocument();
  });

  it("omits the low stock card when everything is above threshold", async () => {
    await seedStall();
    await seedProduct({ id: "p1", name: "Milo", stock: 20 });
    renderDashboard();

    expect(await screen.findByText("Top Sellers")).toBeInTheDocument();
    expect(screen.queryByText("Low Stock")).not.toBeInTheDocument();
  });

  it("START SELLING navigates to the POS", async () => {
    await seedStall();
    await seedProduct();
    renderDashboard();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("link", { name: "START SELLING" }));

    expect(await screen.findByRole("heading", { name: "POS" })).toBeInTheDocument();
  });

  it("shows the walkthrough and dismisses it on X", async () => {
    await seedStall();
    renderDashboard();
    const user = userEvent.setup();

    expect(
      await screen.findByText("Welcome to YayaCake POS")
    ).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();
    expect(screen.getByText("POS")).toBeInTheDocument();
    expect(screen.getByText("Cart")).toBeInTheDocument();
    expect(screen.getByText("Payment")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dismiss walkthrough" }));

    expect(screen.queryByText("Welcome to YayaCake POS")).not.toBeInTheDocument();
  });

  it("reveals walkthrough hints on Show me around", async () => {
    await seedStall();
    renderDashboard();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Show me around" }));

    expect(
      screen.getByText(/Review every sale later under Sales/)
    ).toBeInTheDocument();
    expect(screen.getByText(/tap products and they land in the cart/)).toBeInTheDocument();
  });

  it("renders the empty state with a zero hero when there is no data", async () => {
    await seedStall();
    renderDashboard();

    expect(await screen.findByText("No sales yet today.")).toBeInTheDocument();
    expect(screen.getByText("RM 0.00")).toBeInTheDocument();
    expect(screen.getByText("Add product costs to estimate")).toBeInTheDocument();
    expect(screen.getByText(/0 transactions/)).toBeInTheDocument();
  });
});
