import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import App from "../App";
import { ToastProvider } from "../components";
import { StallProvider } from "../contexts/StallContext";
import { ProductsProvider } from "../contexts/ProductsContext";
import { SessionProvider } from "../contexts/SessionContext";
import { CartProvider } from "../contexts/CartContext";
import { closeDatabase, openDatabase, stallDb } from "../lib/db";
import type { Stall } from "../types";

async function seedCompletedStall() {
  const db = await openDatabase();
  const now = new Date().toISOString();
  const stall: Stall = {
    id: "stall-1",
    name: "YayaCake",
    currency: "MYR",
    businessType: "Retail",
    paymentMethods: { cash: true, qr: { enabled: false, image: null }, card: false },
    lowStockThreshold: 10,
    onboardingCompletedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await stallDb.put(db, stall);
}

beforeEach(async () => {
  closeDatabase();
  globalThis.indexedDB = new IDBFactory();
  await seedCompletedStall();
});

describe("App routing shell", () => {
  it("renders the POS page at /pos for an onboarded stall", async () => {
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={["/pos"]}>
          <StallProvider>
            <ProductsProvider>
            <SessionProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </SessionProvider>
          </ProductsProvider>
          </StallProvider>
        </MemoryRouter>
      </ToastProvider>
    );
    expect(await screen.findByText("POS")).toBeTruthy();
  });

  it("redirects / to the POS page", async () => {
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={["/"]}>
          <StallProvider>
            <ProductsProvider>
            <SessionProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </SessionProvider>
          </ProductsProvider>
          </StallProvider>
        </MemoryRouter>
      </ToastProvider>
    );
    expect(await screen.findByText("POS")).toBeTruthy();
  });
});
