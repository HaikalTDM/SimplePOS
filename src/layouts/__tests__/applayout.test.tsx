import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { ToastProvider } from "../../components";
import { StallProvider } from "../../contexts/StallContext";
import { ProductsProvider } from "../../contexts/ProductsContext";
import { CartProvider } from "../../contexts/CartContext";
import { closeDatabase, openDatabase, stallDb } from "../../lib/db";
import type { Stall } from "../../types";
import AppLayout from "../AppLayout";
import DashboardPage from "../../pages/DashboardPage";
import PosPage from "../../pages/PosPage";
import ProductsPage from "../../pages/ProductsPage";
import SalesPage from "../../pages/SalesPage";
import SaleDetailPage from "../../pages/SaleDetailPage";
import ExpensesPage from "../../pages/ExpensesPage";
import SettingsPage from "../../pages/SettingsPage";

function renderLayout(entry = "/pos") {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[entry]}>
        <StallProvider>
          <ProductsProvider>
            <CartProvider>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/pos" element={<PosPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/sales" element={<SalesPage />} />
                  <Route path="/sales/:id" element={<SaleDetailPage />} />
                  <Route path="/expenses" element={<ExpensesPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Routes>
            </CartProvider>
          </ProductsProvider>
        </StallProvider>
      </MemoryRouter>
    </ToastProvider>
  );
}

async function seedStall(name = "YayaCake") {
  const db = await openDatabase();
  const now = new Date().toISOString();
  const stall: Stall = {
    id: "stall-1",
    name,
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

beforeEach(() => {
  closeDatabase();
  globalThis.indexedDB = new IDBFactory();
});

describe("AppLayout", () => {
  it("shows the stall brand in the header when a stall exists", async () => {
    await seedStall();
    renderLayout();
    expect(
      await screen.findByRole("link", { name: "YayaCake POS by Captura" })
    ).toBeInTheDocument();
  });

  it("falls back to SimplePOS when no stall exists", async () => {
    renderLayout();
    expect(await screen.findByRole("link", { name: "SimplePOS" })).toBeInTheDocument();
  });

  it("renders the header nav links", async () => {
    await seedStall();
    renderLayout();
    await screen.findByRole("link", { name: "YayaCake POS by Captura" });
    const header = screen.getByRole("navigation", { name: "Main navigation" });
    for (const label of ["Dashboard", "Sell", "Products", "Sales", "Expenses", "Settings"]) {
      expect(within(header).getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("renders the mobile nav with Home, Sell, Sales and More", async () => {
    await seedStall();
    renderLayout();
    await screen.findByRole("link", { name: "YayaCake POS by Captura" });
    const mobile = screen.getByRole("navigation", { name: "Mobile navigation" });
    for (const label of ["Home", "Sell", "Sales"]) {
      expect(within(mobile).getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(within(mobile).getByRole("button", { name: "More" })).toBeInTheDocument();
  });

  it("renders the products page inside the layout at /products", async () => {
    await seedStall();
    renderLayout("/products");
    expect(await screen.findByPlaceholderText("Search products...")).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "YayaCake POS by Captura" })
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
