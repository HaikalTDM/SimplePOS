import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { ToastProvider } from "../../components";
import {
  closeDatabase,
  openDatabase,
  productsDb,
  saleItemsDb,
  stallDb,
  stockMovementsDb,
} from "../../lib/db";
import type { Product, SaleItem, Stall } from "../../types";
import { StallProvider } from "../../contexts/StallContext";
import { ProductsProvider } from "../../contexts/ProductsContext";
import ProductsPage from "../ProductsPage";

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <StallProvider>
          <ProductsProvider>
            <ProductsPage />
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

async function openAddModal(user: ReturnType<typeof userEvent.setup>) {
  const buttons = await screen.findAllByRole("button", { name: "Add Product" });
  await user.click(buttons[0]);
}

beforeEach(() => {
  closeDatabase();
  globalThis.indexedDB = new IDBFactory();
});

describe("ProductsPage", () => {
  it("renders the empty state when there are no products", async () => {
    await seedStall();
    renderPage();
    expect(await screen.findByText("No products yet.")).toBeInTheDocument();
    expect(
      screen.getByText("Add your first product to start selling.")
    ).toBeInTheDocument();
  });

  it("adds a product with minor-unit price and stock", async () => {
    await seedStall();
    renderPage();
    const user = userEvent.setup();
    await openAddModal(user);

    await user.type(screen.getByLabelText("Product Name"), "Milo");
    await user.type(screen.getByLabelText("Selling Price"), "3.00");
    await user.clear(screen.getByLabelText("Initial Stock"));
    await user.type(screen.getByLabelText("Initial Stock"), "20");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Product added")).toBeInTheDocument();
    expect(screen.getByText("Milo")).toBeInTheDocument();
    const db = await openDatabase();
    const products = await productsDb.getAll(db);
    expect(products).toHaveLength(1);
    expect(products[0].sellingPrice).toBe(300);
    expect(products[0].stock).toBe(20);
    expect(products[0].active).toBe(true);
  });

  it("edits a product and persists the changes", async () => {
    await seedStall();
    const original = await seedProduct();
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Edit Milo" }));
    const nameInput = screen.getByLabelText("Product Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Milo Ice");
    const priceInput = screen.getByLabelText("Selling Price");
    await user.clear(priceInput);
    await user.type(priceInput, "4.00");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Product updated")).toBeInTheDocument();
    expect(screen.getByText("Milo Ice")).toBeInTheDocument();
    const db = await openDatabase();
    const saved = (await productsDb.getAll(db))[0];
    expect(saved.name).toBe("Milo Ice");
    expect(saved.sellingPrice).toBe(400);
    expect(saved.stock).toBe(original.stock);
    expect(saved.updatedAt).not.toBe(original.updatedAt);
  });

  it("blocks an empty name and an invalid price", async () => {
    await seedStall();
    renderPage();
    const user = userEvent.setup();
    await openAddModal(user);

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Product name is required")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Product Name"), "Milo");
    await user.type(screen.getByLabelText("Selling Price"), "-5");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Enter a valid price")).toBeInTheDocument();

    const db = await openDatabase();
    expect(await productsDb.getAll(db)).toHaveLength(0);
  });

  it("adjusts stock up atomically with a manual_add movement", async () => {
    await seedStall();
    await seedProduct(); // stock 10
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Adjust stock for Milo" }));
    expect(
      screen.getByText((_, el) => el?.textContent === "Current stock: 10")
    ).toBeInTheDocument();

    const stockInput = screen.getByLabelText("New Stock");
    await user.clear(stockInput);
    await user.type(stockInput, "18");
    expect(screen.getByText("+8 units in")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Reason" }));
    await user.click(screen.getByRole("option", { name: "Restock" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Stock updated: 10 → 18")).toBeInTheDocument();
    const db = await openDatabase();
    const product = (await productsDb.getAll(db))[0];
    expect(product.stock).toBe(18);
    const movements = await stockMovementsDb.getAll(db);
    expect(movements).toHaveLength(1);
    expect(movements[0].type).toBe("manual_add");
    expect(movements[0].quantity).toBe(8);
    expect(movements[0].reason).toBe("Restock");
    expect(movements[0].productId).toBe("p1");
  });

  it("records a manual_reduce movement with a positive quantity", async () => {
    await seedStall();
    await seedProduct(); // stock 10
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Adjust stock for Milo" }));
    const stockInput = screen.getByLabelText("New Stock");
    await user.clear(stockInput);
    await user.type(stockInput, "4");
    expect(screen.getByText("-6 units out")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Reason" }));
    await user.click(screen.getByRole("option", { name: "Damaged" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Stock updated: 10 → 4")).toBeInTheDocument();
    const db = await openDatabase();
    expect((await productsDb.getAll(db))[0].stock).toBe(4);
    const movements = await stockMovementsDb.getAll(db);
    expect(movements).toHaveLength(1);
    expect(movements[0].type).toBe("manual_reduce");
    expect(movements[0].quantity).toBe(6);
  });

  it("deletes a never-sold product after confirmation", async () => {
    await seedStall();
    await seedProduct();
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Delete Milo" }));
    expect(
      screen.getByText("This will permanently remove Milo. This can't be undone.")
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("No products yet.")).toBeInTheDocument();
    const db = await openDatabase();
    expect(await productsDb.getAll(db)).toHaveLength(0);
  });

  it("hides Delete for products with sales but keeps Deactivate", async () => {
    await seedStall();
    await seedProduct();
    const db = await openDatabase();
    const item: SaleItem = {
      id: "si1",
      saleId: "s1",
      productId: "p1",
      productName: "Milo",
      quantity: 1,
      unitPrice: 300,
      unitCost: null,
      subtotal: 300,
    };
    await saleItemsDb.put(db, item);
    renderPage();

    expect(await screen.findByText("Milo")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Delete Milo" })).not.toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Deactivate Milo" })).toBeInTheDocument();
  });

  it("deactivates a product and shows the Inactive badge", async () => {
    await seedStall();
    await seedProduct();
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Deactivate Milo" }));
    expect(await screen.findByText("Inactive")).toBeInTheDocument();
    const db = await openDatabase();
    expect((await productsDb.getAll(db))[0].active).toBe(false);
  });

  it("reactivates a deactivated product", async () => {
    await seedStall();
    await seedProduct({ active: false });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Reactivate Milo" }));
    const db = await openDatabase();
    await waitFor(async () =>
      expect((await productsDb.getAll(db))[0].active).toBe(true)
    );
  });

  it("filters case-insensitively and restores with the clear button", async () => {
    await seedStall();
    await seedProduct();
    await seedProduct({ id: "p2", name: "Teh Tarik", category: null });
    renderPage();
    const user = userEvent.setup();

    const search = await screen.findByLabelText("Search products");
    await user.type(search, "TEH");
    expect(screen.queryByText("Milo")).not.toBeInTheDocument();
    expect(screen.getByText("Teh Tarik")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("Milo")).toBeInTheDocument();
    expect(screen.getByText("Teh Tarik")).toBeInTheDocument();
  });
});
