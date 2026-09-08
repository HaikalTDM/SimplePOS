import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { ToastProvider } from "../../components";
import { closeDatabase, openDatabase, productsDb, stallDb } from "../../lib/db";
import OnboardingPage from "../OnboardingPage";

// fake-indexeddb clones values with Node's structuredClone, which serializes
// jsdom's pure-JS Blob/File to {}. Node-native Blob/File round-trip as real
// Blobs, like browser IndexedDB does. No @types/node, so fetch the builtin
// module through process.
const nodeBuffer = (
  globalThis as unknown as {
    process: { getBuiltinModule: (spec: string) => { File: typeof File; Blob: typeof Blob } };
  }
).process.getBuiltinModule("node:buffer");
const NodeFile = nodeBuffer.File;
const NodeBlob = nodeBuffer.Blob;

function renderOnboarding() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/pos" element={<div>POS SCREEN</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

async function completeStep1(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Stall Name"), "YayaCake");
  await user.click(screen.getByRole("combobox", { name: "Business Type" }));
  await user.click(screen.getByRole("option", { name: "Retail" }));
  await user.click(screen.getByRole("button", { name: "Next" }));
}

beforeEach(() => {
  closeDatabase();
  globalThis.indexedDB = new IDBFactory();
});

describe("OnboardingPage", () => {
  it("renders step 1 on first load", () => {
    renderOnboarding();
    expect(screen.getByText("Let's set up your stall")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("SimplePOS")).toBeInTheDocument();
  });

  it("shows required error on empty name and does not advance", async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Stall name is required")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
  });

  it("shows max-length error for a 51-char stall name", async () => {
    const user = userEvent.setup();
    renderOnboarding();
    fireEvent.change(screen.getByLabelText("Stall Name"), {
      target: { value: "x".repeat(51) },
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Maximum 50 characters")).toBeInTheDocument();
  });

  it("advances to step 2 with a valid stall", async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await completeStep1(user);
    expect(screen.getByText("Add your products (optional)")).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
  });

  it("Skip for now goes straight to payment methods", async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await completeStep1(user);
    await user.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(screen.getByText("Payment methods")).toBeInTheDocument();
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
  });

  it("adds products with minor-unit prices and default stock 10", async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await completeStep1(user);

    await user.type(screen.getByLabelText("Product Name"), "Milo");
    await user.type(screen.getByLabelText("Selling Price"), "3.50");
    await user.click(screen.getByRole("button", { name: "Yes" }));
    expect(await screen.findByText("1 added")).toBeInTheDocument();
    expect(screen.getByText("Milo added")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Product Name"), "Teh Tarik");
    await user.type(screen.getByLabelText("Selling Price"), "2.80");
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(await screen.findByText("Payment methods")).toBeInTheDocument();

    const db = await openDatabase();
    const products = await productsDb.getAll(db);
    expect(products).toHaveLength(2);
    const milo = products.find((p) => p.name === "Milo");
    const teh = products.find((p) => p.name === "Teh Tarik");
    expect(milo?.sellingPrice).toBe(350);
    expect(teh?.sellingPrice).toBe(280);
    expect(milo?.stock).toBe(10);
    expect(teh?.stock).toBe(10);
    expect(milo?.costPrice).toBeNull();
    expect(milo?.active).toBe(true);
    expect(milo?.category).toBeNull();
  });

  it("rejects invalid price and stays on step 2", async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await completeStep1(user);
    await user.type(screen.getByLabelText("Product Name"), "Milo");
    await user.type(screen.getByLabelText("Selling Price"), "abc");
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid price");
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
  });

  it("accepts a PNG QR image and shows a preview; rejects bad types", async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await completeStep1(user);
    await user.click(screen.getByRole("button", { name: "Skip for now" }));

    await user.click(screen.getByRole("switch", { name: "QR payments" }));
    const input = screen.getByLabelText("Upload QR image");
    const good = new File([new Blob(["x"], { type: "image/png" })], "qr.png", {
      type: "image/png",
    });
    await user.upload(input, good);
    expect(await screen.findByAltText("QR image preview")).toBeInTheDocument();

    const bad = new File([new Blob(["y"], { type: "text/plain" })], "qr.txt", {
      type: "text/plain",
    });
    // fireEvent.change bypasses user-event's `accept` filtering so the handler
    // (and its validation toast) actually runs for a non-matching type.
    fireEvent.change(screen.getByLabelText("Replace QR image"), {
      target: { files: [bad] },
    });
    expect(
      screen.getByText("Only PNG, JPG, or WebP images are supported")
    ).toBeInTheDocument();
    expect(screen.getByAltText("QR image preview")).toBeInTheDocument();
  });

  it("Let's go! creates the stall, stores the QR blob, and navigates to POS", async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await completeStep1(user);
    await user.click(screen.getByRole("button", { name: "Skip for now" }));

    await user.click(screen.getByRole("switch", { name: "QR payments" }));
    const file = new NodeFile([new Uint8Array([113, 114, 100, 97, 116, 97])], "qr.png", {
      type: "image/png",
    });
    await user.upload(screen.getByLabelText("Upload QR image"), file);
    expect(await screen.findByAltText("QR image preview")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Let's go!" }));
    expect(await screen.findByText("POS SCREEN")).toBeInTheDocument();
    expect(screen.getByText("Welcome to YayaCake POS!")).toBeInTheDocument();

    const db = await openDatabase();
    const stalls = await stallDb.getAll(db);
    expect(stalls).toHaveLength(1);
    const stall = stalls[0];
    expect(stall.name).toBe("YayaCake");
    expect(stall.currency).toBe("MYR");
    expect(stall.businessType).toBe("Retail");
    expect(stall.onboardingCompletedAt).toBeTruthy();
    expect(stall.lowStockThreshold).toBe(10);
    expect(stall.paymentMethods.cash).toBe(true);
    expect(stall.paymentMethods.qr.enabled).toBe(true);
    const image = stall.paymentMethods.qr.image;
    expect(image).toBeInstanceOf(NodeBlob);
    expect((image as Blob).size).toBe(file.size);
    expect((image as Blob).type).toBe("image/png");
    expect(stall.paymentMethods.card).toBe(false);
  });
});
