import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { ToastProvider } from "../../components";
import { closeDatabase, openDatabase, productsDb, sessionsDb, stallDb } from "../../lib/db";
import type { Product, Session, Stall } from "../../types";
import { StallProvider } from "../../contexts/StallContext";
import { ProductsProvider } from "../../contexts/ProductsContext";
import { SessionProvider } from "../../contexts/SessionContext";
import { CartProvider } from "../../contexts/CartContext";
import PosPage from "../PosPage";

function renderPos() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={["/pos"]}>
        <StallProvider>
          <ProductsProvider>
            <SessionProvider>
              <CartProvider>
                <PosPage />
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
  // Selling is gated behind an open register session.
  const session: Session = {
    id: "sess-1",
    openedAt: now,
    closedAt: null,
    openingFloat: null,
    countedCash: null,
    expectedCash: null,
    totals: { sales: 0, transactions: 0, items: 0 },
    payments: { cash: 0, qr: 0, card: 0 },
    expenseTotal: 0,
    currency: "MYR",
  };
  await sessionsDb.put(db, session);
}

async function seedProduct(overrides: Partial<Product> = {}): Promise<Product> {
  const db = await openDatabase();
  const now = new Date().toISOString();
  const product: Product = {
    id: "p1",
    name: "Milo",
    sellingPrice: 300,
    costPrice: null,
    stock: 10,
    category: "Drinks",
    active: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  await productsDb.put(db, product);
  return product;
}

async function getStock(productId: string): Promise<number> {
  const db = await openDatabase();
  return (await productsDb.getAll(db)).find((p) => p.id === productId)?.stock ?? -1;
}

const miloCard = () => screen.getByRole("button", { name: "Add Milo, RM 3.00" });
const cartPanel = () => screen.getByRole("complementary", { name: "Cart" });

beforeEach(() => {
  closeDatabase();
  globalThis.indexedDB = new IDBFactory();
});

describe("PosPage", () => {
  it("adds a product with one tap: badge 1 and formatted total", async () => {
    await seedStall();
    await seedProduct();
    renderPos();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Add Milo, RM 3.00" }));

    expect(within(miloCard()).getByText("1")).toBeInTheDocument();
    const cart = cartPanel();
    expect(within(cart).getByText("Milo")).toBeInTheDocument();
    const totalRow = within(cart).getByText("Total").parentElement!;
    expect(within(totalRow).getByText("RM 3.00")).toBeInTheDocument();
  });

  it("increments on repeat taps and blocks at the stock cap with a toast", async () => {
    await seedStall();
    await seedProduct({ stock: 3 });
    renderPos();
    const user = userEvent.setup();
    const card = await screen.findByRole("button", { name: "Add Milo, RM 3.00" });

    await user.click(card);
    await user.click(card);
    await user.click(card);
    await user.click(card); // blocked at cap

    expect(within(card).getByText("3")).toBeInTheDocument();
    expect(await screen.findByText("Only 3 Milo in stock")).toBeInTheDocument();

    await user.click(card); // still blocked, still capped
    expect(within(card).getByText("3")).toBeInTheDocument();
    expect(
      within(cartPanel()).getByRole("button", { name: "Quantity of Milo: 3. Tap to edit." })
    ).toBeInTheDocument();
  });

  it("shows OUT OF STOCK and does not add when clicked", async () => {
    await seedStall();
    await seedProduct({ stock: 0 });
    renderPos();

    const card = await screen.findByRole("button", { name: "Add Milo, RM 3.00" });
    expect(card).toBeDisabled();
    expect(screen.getByText("OUT OF STOCK")).toBeInTheDocument();

    fireEvent.click(card);

    expect(within(cartPanel()).getByText("Cart is empty")).toBeInTheDocument();
    expect(screen.queryByText("Only 0 Milo in stock")).not.toBeInTheDocument();
  });

  it("does not render inactive products", async () => {
    await seedStall();
    await seedProduct();
    await seedProduct({ id: "p2", name: "Hidden", active: false });
    renderPos();

    expect(
      await screen.findByRole("button", { name: "Add Milo, RM 3.00" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add Hidden/ })).not.toBeInTheDocument();
  });

  it("filters by name case-insensitively and clears back", async () => {
    await seedStall();
    await seedProduct();
    await seedProduct({ id: "p2", name: "Teh Tarik", category: null });
    renderPos();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Search products"), "TEH");

    expect(screen.queryByRole("button", { name: /Add Milo/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Teh Tarik, RM 3.00" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear search" }));

    expect(screen.getByRole("button", { name: /Add Milo/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Teh Tarik, RM 3.00" })).toBeInTheDocument();
  });

  it("filters by category; All shows uncategorized products", async () => {
    await seedStall();
    await seedProduct(); // Milo, Drinks
    await seedProduct({ id: "p2", name: "Kuih", category: null });
    renderPos();
    const user = userEvent.setup();

    expect(await screen.findByRole("button", { name: /Add Kuih/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Drinks" }));

    expect(screen.getByRole("button", { name: /Add Milo/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add Kuih/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "All" }));

    expect(screen.getByRole("button", { name: /Add Kuih/ })).toBeInTheDocument();
  });

  it("decrements with minus, removes the row at 1, and deletes directly", async () => {
    await seedStall();
    await seedProduct();
    renderPos();
    const user = userEvent.setup();
    const card = await screen.findByRole("button", { name: "Add Milo, RM 3.00" });
    await user.click(card);
    await user.click(card);
    const cart = cartPanel();

    await user.click(within(cart).getByRole("button", { name: "Decrease Milo" }));
    expect(
      within(cart).getByRole("button", { name: "Quantity of Milo: 1. Tap to edit." })
    ).toBeInTheDocument();

    // Minus at 1 removes the row (no confirm, §84).
    await user.click(within(cart).getByRole("button", { name: "Decrease Milo" }));
    expect(within(cart).getByText("Cart is empty")).toBeInTheDocument();

    await user.click(card);
    await user.click(card);
    await user.click(within(cart).getByRole("button", { name: "Remove Milo" }));
    expect(within(cart).getByText("Cart is empty")).toBeInTheDocument();
  });

  it("edits quantity inline and clamps to available stock", async () => {
    await seedStall();
    await seedProduct({ stock: 3 });
    renderPos();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Add Milo, RM 3.00" }));
    const cart = cartPanel();

    await user.click(
      within(cart).getByRole("button", { name: "Quantity of Milo: 1. Tap to edit." })
    );
    const input = within(cart).getByLabelText("Quantity of Milo");
    await user.clear(input);
    await user.type(input, "5{Enter}");

    expect(
      within(cart).getByRole("button", { name: "Quantity of Milo: 3. Tap to edit." })
    ).toBeInTheDocument();
  });

  it("disables PAY when the cart is empty and enables it with items", async () => {
    await seedStall();
    await seedProduct();
    renderPos();
    const user = userEvent.setup();

    expect(screen.getByRole("button", { name: "PAY" })).toBeDisabled();

    await user.click(await screen.findByRole("button", { name: "Add Milo, RM 3.00" }));

    expect(screen.getByRole("button", { name: "PAY" })).toBeEnabled();
  });

  it("never touches stock: add, edit, decrement and remove leave the db unchanged", async () => {
    await seedStall();
    await seedProduct({ stock: 10 });
    expect(await getStock("p1")).toBe(10);
    renderPos();
    const user = userEvent.setup();
    const card = await screen.findByRole("button", { name: "Add Milo, RM 3.00" });
    const cart = cartPanel();

    await user.click(card);
    await user.click(card);
    await user.click(card);
    await user.click(
      within(cart).getByRole("button", { name: "Quantity of Milo: 3. Tap to edit." })
    );
    const input = within(cart).getByLabelText("Quantity of Milo");
    await user.clear(input);
    await user.type(input, "7{Enter}");
    await user.click(within(cart).getByRole("button", { name: "Decrease Milo" }));
    await user.click(within(cart).getByRole("button", { name: "Remove Milo" }));

    expect(await getStock("p1")).toBe(10);
  });
});
