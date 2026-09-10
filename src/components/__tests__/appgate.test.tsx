import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { ToastProvider } from "../../components";
import AppGate from "../AppGate";
import { StallProvider } from "../../contexts/StallContext";
import { ProductsProvider } from "../../contexts/ProductsContext";
import { SessionProvider } from "../../contexts/SessionContext";
import { CartProvider } from "../../contexts/CartContext";
import { closeDatabase, openDatabase, stallDb } from "../../lib/db";
import type { Stall } from "../../types";
import App from "../../App";

const mocks = vi.hoisted(() => ({ failOpen: false }));
vi.mock("../../lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/db")>();
  return {
    ...actual,
    openDatabase: (version?: number) =>
      mocks.failOpen
        ? Promise.reject(new Error("blocked"))
        : actual.openDatabase(version),
  };
});

function renderApp(entry: string) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[entry]}>
        <AppGate>
          <StallProvider>
            <ProductsProvider>
              <SessionProvider>
                <CartProvider>
                  <App />
                </CartProvider>
              </SessionProvider>
            </ProductsProvider>
          </StallProvider>
        </AppGate>
      </MemoryRouter>
    </ToastProvider>
  );
}

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

beforeEach(() => {
  closeDatabase();
  globalThis.indexedDB = new IDBFactory();
  mocks.failOpen = false;
});

describe("AppGate", () => {
  it("redirects to onboarding when the db is empty", async () => {
    renderApp("/pos");
    await waitFor(() => expect(screen.getByText("Let's set up your stall")).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.queryByText("POS")).not.toBeInTheDocument();
  });

  it("redirects an unfinished stall to onboarding", async () => {
    const db = await openDatabase();
    const now = new Date().toISOString();
    await stallDb.put(db, {
      id: "stall-1",
      name: "YayaCake",
      currency: "MYR",
      businessType: "Retail",
      paymentMethods: { cash: true, qr: { enabled: false, image: null }, card: false },
      lowStockThreshold: 10,
      onboardingCompletedAt: "",
      createdAt: now,
      updatedAt: now,
    });
    renderApp("/pos");
    await waitFor(() => expect(screen.getByText("Let's set up your stall")).toBeInTheDocument(), { timeout: 3000 });
  });

  it("renders children when a completed stall exists", async () => {
    await seedCompletedStall();
    renderApp("/pos");
    await waitFor(() => expect(screen.getByText("POS")).toBeInTheDocument(), { timeout: 3000 });
  });

  it("shows the error screen when the db fails to open, and retries", async () => {
    mocks.failOpen = true;
    renderApp("/pos");
    await waitFor(() => expect(screen.getByText("We couldn't open your data")).toBeInTheDocument(), { timeout: 3000 });

    mocks.failOpen = false;
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText("Let's set up your stall")).toBeInTheDocument(), { timeout: 3000 });
  });
});
