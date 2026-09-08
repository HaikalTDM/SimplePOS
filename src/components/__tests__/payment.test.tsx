import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { PaymentModal, ToastProvider } from "..";
import type { StockChange } from "../../lib/checkout/checkout";
import { closeDatabase, openDatabase, productsDb, salesDb, stallDb } from "../../lib/db";
import type { Product, Stall } from "../../types";
import { CartProvider, useCart } from "../../contexts/CartContext";
type CartContextValue = ReturnType<typeof useCart>;
import { ProductsProvider, useProducts } from "../../contexts/ProductsContext";
import { StallProvider } from "../../contexts/StallContext";

// fake-indexeddb clones values with Node's structuredClone, which serializes
// jsdom's pure-JS Blob to {}. Node-native Blob round-trips as a real Blob,
// like browser IndexedDB does (same trick as the onboarding tests).
const nodeBuffer = (
  globalThis as unknown as {
    process: { getBuiltinModule: (spec: string) => { Blob: typeof Blob } };
  }
).process.getBuiltinModule("node:buffer");
const NodeBlob = nodeBuffer.Blob;

function qrBlob(): Blob {
  return new NodeBlob(["qrdata"], { type: "image/png" }) as unknown as Blob;
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Milo",
    sellingPrice: 300,
    costPrice: null,
    stock: 10,
    category: "Drinks",
    active: true,
    createdAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
    ...overrides,
  };
}

async function seedStall(paymentMethods: Stall["paymentMethods"]): Promise<void> {
  const db = await openDatabase();
  const now = new Date().toISOString();
  await stallDb.put(db, {
    id: "stall-1",
    name: "YayaCake",
    currency: "MYR",
    businessType: "Retail",
    paymentMethods,
    lowStockThreshold: 10,
    onboardingCompletedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

const cashOnly = (): Stall["paymentMethods"] => ({
  cash: true,
  qr: { enabled: false, image: null },
  card: false,
});

async function seedProduct(overrides: Partial<Product> = {}): Promise<Product> {
  const product = makeProduct(overrides);
  const db = await openDatabase();
  await productsDb.put(db, product);
  return product;
}

interface HarnessApi {
  cart: CartContextValue;
  products: Product[];
}

function Harness({
  apiRef,
  onSuccess,
}: {
  apiRef: { current: HarnessApi | null };
  onSuccess: (changes: StockChange[]) => void;
}) {
  const cart = useCart();
  const { products } = useProducts();
  apiRef.current = { cart, products };
  return (
    <PaymentModal
      open
      onClose={() => {}}
      items={cart.items}
      totalMinor={cart.totalMinor}
      onSuccess={(changes) => {
        cart.clear();
        onSuccess(changes);
      }}
    />
  );
}

function renderPayment() {
  const apiRef: { current: HarnessApi | null } = { current: null };
  const onSuccess = vi.fn();
  const utils = render(
    <ToastProvider>
      <StallProvider>
        <ProductsProvider>
          <CartProvider>
            <Harness apiRef={apiRef} onSuccess={onSuccess} />
          </CartProvider>
        </ProductsProvider>
      </StallProvider>
    </ToastProvider>
  );
  return { ...utils, apiRef, onSuccess };
}

// Products load asynchronously; adding to the cart before they arrive would
// trip CartContext's prune effect. Wait for the product, then add.
async function addToCart(
  apiRef: { current: HarnessApi | null },
  product: Product,
  times = 1,
) {
  await waitFor(() =>
    expect(apiRef.current!.products.some((p) => p.id === product.id)).toBe(true)
  );
  act(() => {
    for (let i = 0; i < times; i++) apiRef.current!.cart.addItem(product);
  });
}

beforeEach(() => {
  closeDatabase();
  globalThis.indexedDB = new IDBFactory();
});

describe("PaymentModal", () => {
  it("lists only the enabled payment methods", async () => {
    await seedStall({ cash: true, qr: { enabled: true, image: qrBlob() }, card: false });
    await seedProduct();
    renderPayment();

    expect(await screen.findByRole("button", { name: "Pay with cash" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Pay with qr" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pay with card" })).not.toBeInTheDocument();
  });

  it("cash: empty received + CONFIRM PAID completes the sale and shows the success state", async () => {
    await seedStall(cashOnly());
    const product = await seedProduct();
    const { apiRef } = renderPayment();
    const user = userEvent.setup();

    await screen.findByRole("button", { name: "Pay with cash" });
    await addToCart(apiRef, product);

    await user.click(screen.getByRole("button", { name: "Pay with cash" }));
    expect(screen.getByText("RM 3.00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "CONFIRM PAID" }));

    expect(await screen.findByText("Stock updated ✓")).toBeInTheDocument();
    expect(screen.getByText("Milo: 10 → 9")).toBeInTheDocument();

    const db = await openDatabase();
    const sales = await salesDb.getAll(db);
    expect(sales).toHaveLength(1);
    expect(sales[0].paymentMethod).toBe("cash");
    expect(sales[0].total).toBe(300);
    expect((await productsDb.get(db, "p1"))?.stock).toBe(9);
  });

  it("cash: received below the total shows an error and disables confirm", async () => {
    await seedStall(cashOnly());
    const product = await seedProduct();
    const { apiRef } = renderPayment();
    const user = userEvent.setup();

    await screen.findByRole("button", { name: "Pay with cash" });
    await addToCart(apiRef, product, 2);

    await user.click(screen.getByRole("button", { name: "Pay with cash" }));
    await user.type(screen.getByLabelText("Amount Received"), "5");

    expect(screen.getByText("Amount received is less than the total")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CONFIRM PAID" })).toBeDisabled();
  });

  it("cash: received above the total shows the change and records the sale", async () => {
    await seedStall(cashOnly());
    const product = await seedProduct();
    const { apiRef } = renderPayment();
    const user = userEvent.setup();

    await screen.findByRole("button", { name: "Pay with cash" });
    await addToCart(apiRef, product, 2);

    await user.click(screen.getByRole("button", { name: "Pay with cash" }));
    await user.type(screen.getByLabelText("Amount Received"), "10");

    expect(screen.getByText("Change: RM 4.00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "CONFIRM PAID" }));

    expect(await screen.findByText("Stock updated ✓")).toBeInTheDocument();
    const db = await openDatabase();
    const sales = await salesDb.getAll(db);
    expect(sales).toHaveLength(1);
    expect(sales[0].total).toBe(600);
  });

  it("qr: shows the confirmation text and records paymentMethod qr", async () => {
    await seedStall({ cash: true, qr: { enabled: true, image: qrBlob() }, card: false });
    const product = await seedProduct();
    const { apiRef } = renderPayment();
    const user = userEvent.setup();

    await screen.findByRole("button", { name: "Pay with qr" });
    await addToCart(apiRef, product);

    await user.click(screen.getByRole("button", { name: "Pay with qr" }));
    expect(screen.getByText("Please confirm payment has been received")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "PAID" }));

    expect(await screen.findByText("Stock updated ✓")).toBeInTheDocument();
    const db = await openDatabase();
    const sales = await salesDb.getAll(db);
    expect(sales).toHaveLength(1);
    expect(sales[0].paymentMethod).toBe("qr");
  });

  it("card: records paymentMethod card", async () => {
    await seedStall({ cash: true, qr: { enabled: false, image: null }, card: true });
    const product = await seedProduct();
    const { apiRef } = renderPayment();
    const user = userEvent.setup();

    await screen.findByRole("button", { name: "Pay with card" });
    await addToCart(apiRef, product);

    await user.click(screen.getByRole("button", { name: "Pay with card" }));
    expect(
      screen.getByText("Please process the card payment on your card reader/terminal")
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "PAID" }));

    expect(await screen.findByText("Stock updated ✓")).toBeInTheDocument();
    const db = await openDatabase();
    const sales = await salesDb.getAll(db);
    expect(sales).toHaveLength(1);
    expect(sales[0].paymentMethod).toBe("card");
  });

  it("failure mid-payment: error toast, warning, cart intact, modal stays open", async () => {
    await seedStall(cashOnly());
    const product = await seedProduct({ stock: 2 });
    const { apiRef } = renderPayment();
    const user = userEvent.setup();

    await screen.findByRole("button", { name: "Pay with cash" });
    await addToCart(apiRef, product, 2);

    await user.click(screen.getByRole("button", { name: "Pay with cash" }));

    // Stock changes between opening the modal and confirming (§39 revalidation).
    const db = await openDatabase();
    await productsDb.put(db, { ...product, stock: 1, updatedAt: new Date().toISOString() });

    await user.click(screen.getByRole("button", { name: "CONFIRM PAID" }));

    expect(
      await screen.findByText("Sale could not be completed. Your cart is still here.")
    ).toBeInTheDocument();
    expect(screen.getByText("Some products changed — review your cart")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CONFIRM PAID" })).toBeInTheDocument();
    expect(apiRef.current!.cart.items).toEqual([
      { productId: "p1", qty: 2 },
    ]);
    expect(await salesDb.count(db)).toBe(0);
  });

  it("success path calls onSuccess and clears the cart", async () => {
    await seedStall(cashOnly());
    const product = await seedProduct();
    const { apiRef, onSuccess } = renderPayment();
    const user = userEvent.setup();

    await screen.findByRole("button", { name: "Pay with cash" });
    await addToCart(apiRef, product, 2);

    await user.click(screen.getByRole("button", { name: "Pay with cash" }));
    await user.click(screen.getByRole("button", { name: "CONFIRM PAID" }));
    expect(await screen.findByText("Stock updated ✓")).toBeInTheDocument();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1), { timeout: 4000 });
    expect(apiRef.current!.cart.items).toHaveLength(0);
  });

  it("qr without an image shows the no-image message", async () => {
    await seedStall({ cash: true, qr: { enabled: true, image: null }, card: false });
    await seedProduct();
    renderPayment();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Pay with qr" }));
    expect(screen.getByText("No QR image set")).toBeInTheDocument();
    expect(screen.getByText("Add one in Settings")).toBeInTheDocument();
  });
});
