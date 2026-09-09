import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { ToastProvider } from "../../components";
import {
  closeDatabase,
  expensesDb,
  openDatabase,
  productsDb,
  resetAllData,
  saleItemsDb,
  salesDb,
  stallDb,
  stockMovementsDb,
} from "../../lib/db";
import type { Expense, Product, Sale, SaleItem, Stall } from "../../types";
import { exportBackup } from "../../lib/backup/exportBackup";
import { triggerDownload } from "../../lib/backup/download";
import { StallProvider } from "../../contexts/StallContext";
import AppLayout from "../../layouts/AppLayout";
import SettingsPage from "../SettingsPage";

vi.mock("../../lib/backup/download", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../lib/backup/download")>();
  return { ...mod, triggerDownload: vi.fn(mod.triggerDownload) };
});

// fake-indexeddb clones values with Node's structuredClone, which serializes
// jsdom's pure-JS Blob/File to {}. Node-native Blob/File round-trip as real
// Blobs (same trick as onboarding.test.tsx).
const nodeBuffer = (
  globalThis as unknown as {
    process: { getBuiltinModule: (spec: string) => { File: typeof File; Blob: typeof Blob } };
  }
).process.getBuiltinModule("node:buffer");
const NodeFile = nodeBuffer.File;
const NodeBlob = nodeBuffer.Blob;

function renderSettings() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={["/settings"]}>
        <StallProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </StallProvider>
      </MemoryRouter>
    </ToastProvider>
  );
}

async function seedStall(overrides: Partial<Stall> = {}): Promise<Stall> {
  const db = await openDatabase();
  const now = new Date().toISOString();
  const stall: Stall = {
    id: "stall-1",
    name: "YayaCake",
    currency: "MYR",
    businessType: "Food & Beverage",
    paymentMethods: { cash: true, qr: { enabled: false, image: null }, card: true },
    lowStockThreshold: 10,
    lowStockAlertsEnabled: true,
    onboardingCompletedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  await stallDb.put(db, stall);
  return stall;
}

async function readStall(): Promise<Stall | undefined> {
  const db = await openDatabase();
  return (await stallDb.getAll(db))[0];
}

async function seedProduct(overrides: Partial<Product> = {}): Promise<void> {
  const db = await openDatabase();
  const now = new Date().toISOString();
  await productsDb.put(db, {
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
  });
}

async function seedSaleWithItem(): Promise<void> {
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

async function seedExpense(): Promise<void> {
  const db = await openDatabase();
  const expense: Expense = {
    id: "e1",
    description: "Packaging",
    amount: 500,
    category: "Packaging",
    date: "2026-09-01",
    currency: "MYR",
  };
  await expensesDb.put(db, expense);
}

function sectionOf(title: string): HTMLElement {
  const heading = screen.getByText(title);
  const section = heading.closest("section");
  if (!section) throw new Error(`No section for ${title}`);
  return section;
}

beforeEach(() => {
  closeDatabase();
  globalThis.indexedDB = new IDBFactory();
  vi.mocked(triggerDownload).mockClear();
});

describe("SettingsPage — stall settings", () => {
  it("edits stall name and currency, persists, and reloads the header brand", async () => {
    await seedStall();
    renderSettings();
    const user = userEvent.setup();
    await screen.findByText("Stall Settings");

    const stallSection = sectionOf("Stall Settings");
    const nameInput = within(stallSection).getByLabelText("Stall Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Rein's Boutique");
    await user.click(within(stallSection).getByRole("combobox", { name: "Currency" }));
    await user.click(within(stallSection).getByRole("option", { name: "SGD" }));
    // Guard: the controlled inputs must have committed before Save reads state.
    await waitFor(() => expect(nameInput).toHaveValue("Rein's Boutique"));
    await user.click(within(stallSection).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Settings saved", {}, { timeout: 3000 })).toBeInTheDocument();
    // The toast only fires after stallDb.put + reload complete, but under
    // full-suite parallel load the follow-up read can still land before the
    // write is visible — poll the db instead of reading it once (same
    // pattern as the threshold test below).
    await waitFor(async () => {
      const stall = await readStall();
      expect(stall?.name).toBe("Rein's Boutique");
      expect(stall?.currency).toBe("SGD");
    }, { timeout: 3000 });
    expect(
      await screen.findByText("Rein's Boutique POS by Captura")
    ).toBeInTheDocument();
  });

  it("blocks an empty stall name with an inline error", async () => {
    await seedStall();
    renderSettings();
    const user = userEvent.setup();
    await screen.findByText("Stall Settings");

    const stallSection = sectionOf("Stall Settings");
    fireEvent.change(within(stallSection).getByLabelText("Stall Name"), {
      target: { value: "" },
    });
    await user.click(within(stallSection).getByRole("button", { name: "Save" }));

    expect(within(stallSection).getByText("Stall name is required")).toBeInTheDocument();
    const stall = await readStall();
    expect(stall?.name).toBe("YayaCake");
  });
});

describe("SettingsPage — stock settings", () => {
  it("saves a valid threshold and blocks invalid ones", async () => {
    await seedStall();
    renderSettings();
    const user = userEvent.setup();
    await screen.findByText("Stock Settings");

    const stockSection = sectionOf("Stock Settings");
    const input = within(stockSection).getByLabelText("Low stock threshold");

    const setThreshold = (value: string) =>
      fireEvent.change(input, { target: { value } });

    setThreshold("5");
    await user.click(within(stockSection).getByRole("button", { name: "Save" }));
    await waitFor(async () => {
      expect((await readStall())?.lowStockThreshold).toBe(5);
    }, { timeout: 3000 });

    setThreshold("0");
    await user.click(within(stockSection).getByRole("button", { name: "Save" }));
    expect(
      within(stockSection).getByText("Enter a whole number between 1 and 999")
    ).toBeInTheDocument();
    expect((await readStall())?.lowStockThreshold).toBe(5);

    setThreshold("9000");
    await user.click(within(stockSection).getByRole("button", { name: "Save" }));
    expect(
      within(stockSection).getByText("Enter a whole number between 1 and 999")
    ).toBeInTheDocument();

    setThreshold("abc");
    await user.click(within(stockSection).getByRole("button", { name: "Save" }));
    expect(
      within(stockSection).getByText("Enter a whole number between 1 and 999")
    ).toBeInTheDocument();
    expect((await readStall())?.lowStockThreshold).toBe(5);
  });
});

describe("SettingsPage — payment methods", () => {
  it("enables QR, uploads a PNG as a Blob, then removes it", async () => {
    await seedStall();
    renderSettings();
    const user = userEvent.setup();
    await screen.findByText("Payment Methods");

    await user.click(screen.getByRole("switch", { name: "QR payments" }));
    await waitFor(async () => {
      expect((await readStall())?.paymentMethods.qr.enabled).toBe(true);
    }, { timeout: 3000 });
    expect(await screen.findByText("Payment methods updated", {}, { timeout: 3000 })).toBeInTheDocument();

    const file = new NodeFile([new Uint8Array([113, 114, 100, 97, 116, 97])], "qr.png", {
      type: "image/png",
    });
    await user.upload(screen.getByLabelText("Upload QR image"), file);
    expect(await screen.findByAltText("QR image preview")).toBeInTheDocument();
    await waitFor(async () => {
      const image = (await readStall())?.paymentMethods.qr.image;
      expect(image).toBeInstanceOf(NodeBlob);
      expect((image as Blob).size).toBe(file.size);
    }, { timeout: 3000 });

    await user.click(screen.getByRole("button", { name: "Remove QR image" }));
    await waitFor(async () => {
      expect((await readStall())?.paymentMethods.qr.image).toBeNull();
    }, { timeout: 3000 });
  });

  it("rejects a non-image QR upload with a toast", async () => {
    await seedStall();
    renderSettings();
    const user = userEvent.setup();
    await screen.findByText("Payment Methods");

    await user.click(screen.getByRole("switch", { name: "QR payments" }));
    await screen.findByLabelText("Upload QR image");
    const bad = new File([new Blob(["y"], { type: "text/plain" })], "qr.txt", {
      type: "text/plain",
    });
    fireEvent.change(screen.getByLabelText("Upload QR image"), {
      target: { files: [bad] },
    });

    expect(
      screen.getByText("Only PNG, JPG, or WebP images are supported")
    ).toBeInTheDocument();
    expect((await readStall())?.paymentMethods.qr.image).toBeNull();
  });

  it("persists card off, keeps cash on, and shows the Always available badge", async () => {
    await seedStall();
    renderSettings();
    const user = userEvent.setup();
    await screen.findByText("Payment Methods");

    expect(screen.getByText("Always available")).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Card payments" }));
    await waitFor(async () => {
      const stall = await readStall();
      expect(stall?.paymentMethods.card).toBe(false);
      expect(stall?.paymentMethods.cash).toBe(true);
    }, { timeout: 3000 });
    expect(await screen.findByText("Payment methods updated", {}, { timeout: 3000 })).toBeInTheDocument();
  });
});

describe("SettingsPage — data & backup", () => {
  it("exports a backup with the SimplePOS-Backup filename and toasts", async () => {
    await seedStall();
    renderSettings();
    const user = userEvent.setup();
    await screen.findByText("Data & Backup");

    await user.click(screen.getByRole("button", { name: /Export Backup/ }));

    expect(await screen.findByText("Backup exported")).toBeInTheDocument();
    expect(triggerDownload).toHaveBeenCalledTimes(1);
    const filename = vi.mocked(triggerDownload).mock.calls[0][0].filename;
    expect(filename).toMatch(/^SimplePOS-Backup-YayaCake-.*\.json$/);
  });

  it("imports a valid backup, restores stores, and shows the summary", async () => {
    await seedStall();
    await seedProduct();
    await seedSaleWithItem();
    await seedExpense();
    renderSettings();
    const user = userEvent.setup();
    await screen.findByText("Data & Backup");

    const backup = await exportBackup();
    const text = JSON.stringify(backup);
    const db = await openDatabase();
    await resetAllData(db);
    expect(await productsDb.count(db)).toBe(0);

    const file = new NodeFile([text], "backup.json", { type: "application/json" });
    await user.upload(screen.getByLabelText("Import Backup"), file);

    expect(await screen.findByText("Import successful.")).toBeInTheDocument();
    expect(
      await screen.findByText("1 products · 1 sales · 1 expenses")
    ).toBeInTheDocument();
    await waitFor(async () => {
      expect(await productsDb.count(db)).toBe(1);
      expect(await salesDb.count(db)).toBe(1);
      expect(await saleItemsDb.count(db)).toBe(1);
      expect(await expensesDb.count(db)).toBe(1);
      expect(await stallDb.count(db)).toBe(1);
    }, { timeout: 3000 });
  });

  it("rejects garbage import with the verbatim error and keeps existing data", async () => {
    await seedStall();
    await seedProduct();
    renderSettings();
    const user = userEvent.setup();
    await screen.findByText("Data & Backup");

    const file = new NodeFile(["not a backup"], "bad.json", { type: "application/json" });
    await user.upload(screen.getByLabelText("Import Backup"), file);

    expect(
      screen.getByText("This backup could not be imported. Your existing data is unchanged.")
    ).toBeInTheDocument();
    expect(screen.getByText("Backup file is not valid JSON.")).toBeInTheDocument();
    const db = await openDatabase();
    expect(await productsDb.count(db)).toBe(1);
    expect(await stallDb.count(db)).toBe(1);
  });

  it("exports sales CSV with the SimplePOS-Sales filename", async () => {
    await seedStall();
    await seedProduct();
    await seedSaleWithItem();
    renderSettings();
    const user = userEvent.setup();
    await screen.findByText("Data & Backup");

    await user.click(screen.getByRole("button", { name: "Export Sales CSV" }));

    expect(await screen.findByText("Sales CSV exported")).toBeInTheDocument();
    const filename = vi.mocked(triggerDownload).mock.calls[0][0].filename;
    expect(filename).toMatch(/^SimplePOS-Sales-YayaCake-.*\.csv$/);
  });

  it("toasts when there are no sales to export", async () => {
    await seedStall();
    renderSettings();
    const user = userEvent.setup();
    await screen.findByText("Data & Backup");

    await user.click(screen.getByRole("button", { name: "Export Sales CSV" }));

    expect(await screen.findByText("No sales to export.")).toBeInTheDocument();
    expect(triggerDownload).not.toHaveBeenCalled();
  });

  it("delete all: type-to-confirm then wipes every store", async () => {
    await seedStall();
    await seedProduct();
    renderSettings();
    const user = userEvent.setup();
    await screen.findByText("Data & Backup");

    await user.click(screen.getByRole("button", { name: "Delete all data" }));
    const dialog = screen.getByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "Delete all data" });
    expect(confirm).toBeDisabled();

    const input = within(dialog).getByLabelText("Type DELETE to confirm");
    fireEvent.change(input, { target: { value: "WRONG" } });
    expect(confirm).toBeDisabled();

    fireEvent.change(input, { target: { value: "DELETE" } });
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    await waitFor(async () => {
      const db = await openDatabase();
      expect(await stallDb.count(db)).toBe(0);
      expect(await productsDb.count(db)).toBe(0);
      expect(await salesDb.count(db)).toBe(0);
      expect(await saleItemsDb.count(db)).toBe(0);
      expect(await stockMovementsDb.count(db)).toBe(0);
      expect(await expensesDb.count(db)).toBe(0);
    }, { timeout: 3000 });
  });
});

describe("SettingsPage — about", () => {
  it("shows version, the local-data warning, and the brand line", async () => {
    await seedStall();
    renderSettings();

    expect(await screen.findByText(/SimplePOS v/)).toBeInTheDocument();
    expect(
      screen.getByText("Your data is stored on this device. Export a backup regularly.")
    ).toBeInTheDocument();
    expect(screen.getByText("SimplePOS by Captura")).toBeInTheDocument();
  });
});

describe("SettingsPage — appearance theme", () => {
  it("applies a preset and persists the colors", async () => {
    await seedStall();
    renderSettings();
    const user = userEvent.setup();
    await screen.findByText("Appearance");

    await user.click(screen.getByRole("button", { name: "Mint" }));
    expect(await screen.findByText("Theme saved", {}, { timeout: 3000 })).toBeInTheDocument();

    const root = document.documentElement;
    expect(root.style.getPropertyValue("--bg")).toBe("#edf3ea");
    await waitFor(async () => {
      const stall = await readStall();
      expect(stall?.theme).toEqual({ bg: "#edf3ea", text: "#2e3a2c", accent: "#4e7b5c" });
    }, { timeout: 3000 });
  });

  it("custom colors apply live and restore Cream clears the theme", async () => {
    await seedStall();
    renderSettings();
    const user = userEvent.setup();
    await screen.findByText("Appearance");

    const bgInput = screen.getByLabelText("Background");
    fireEvent.change(bgInput, { target: { value: "#111111" } });
    expect(document.documentElement.style.getPropertyValue("--bg")).toBe("#111111");
    // persist after debounce
    await waitFor(
      async () => {
        const stall = await readStall();
        expect(stall?.theme?.bg.toLowerCase()).toBe("#111111");
      },
      { timeout: 3000 },
    );

    await user.click(screen.getByRole("button", { name: "Cream" }));
    expect(await screen.findByText("Theme saved", {}, { timeout: 3000 })).toBeInTheDocument();
    await waitFor(async () => {
      const stall = await readStall();
      expect(stall?.theme).toBeUndefined();
    }, { timeout: 3000 });
  });
});
