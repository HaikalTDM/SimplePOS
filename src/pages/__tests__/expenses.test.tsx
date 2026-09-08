import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { ToastProvider } from "../../components";
import { closeDatabase, expensesDb, openDatabase, stallDb } from "../../lib/db";
import type { Expense, Stall } from "../../types";
import { todayLocalISO } from "../../utils/dates";
import { StallProvider } from "../../contexts/StallContext";
import ExpensesPage from "../ExpensesPage";

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <StallProvider>
          <ExpensesPage />
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

async function seedExpense(overrides: Partial<Expense> = {}): Promise<Expense> {
  const db = await openDatabase();
  const expense: Expense = {
    id: "e1",
    description: "Sugar",
    amount: 1250,
    category: "Stock",
    date: todayLocalISO(),
    currency: "MYR",
    ...overrides,
  };
  await expensesDb.put(db, expense);
  return expense;
}

async function openAddModal(user: ReturnType<typeof userEvent.setup>) {
  const buttons = await screen.findAllByRole("button", { name: "Add Expense" });
  await user.click(buttons[0]);
}

beforeEach(() => {
  closeDatabase();
  globalThis.indexedDB = new IDBFactory();
});

describe("ExpensesPage", () => {
  it("renders the empty state when there are no expenses", async () => {
    await seedStall();
    renderPage();
    expect(await screen.findByText("No expenses recorded.")).toBeInTheDocument();
  });

  it("adds an expense with minor-unit amount and local date", async () => {
    await seedStall();
    renderPage();
    const user = userEvent.setup();
    await openAddModal(user);

    await user.type(screen.getByLabelText("Description"), "Sugar");
    await user.type(screen.getByLabelText("Amount"), "12.50");
    await user.click(screen.getByRole("combobox", { name: "Category" }));
    await user.click(screen.getByRole("option", { name: "Stock" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Expense added")).toBeInTheDocument();
    expect(screen.getByText("Sugar")).toBeInTheDocument();
    expect(screen.getByText("RM 12.50")).toBeInTheDocument();
    const db = await openDatabase();
    const expenses = await expensesDb.getAll(db);
    expect(expenses).toHaveLength(1);
    expect(expenses[0].amount).toBe(1250);
    expect(expenses[0].category).toBe("Stock");
    expect(expenses[0].date).toBe(todayLocalISO());
    expect(expenses[0].currency).toBe("MYR");
  });

  it("blocks an empty description and non-positive amounts", async () => {
    await seedStall();
    renderPage();
    const user = userEvent.setup();
    await openAddModal(user);

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Description is required")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Description"), "Sugar");
    await user.type(screen.getByLabelText("Amount"), "0");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Enter a valid amount")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "-5");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Enter a valid amount")).toBeInTheDocument();

    const db = await openDatabase();
    expect(await expensesDb.getAll(db)).toHaveLength(0);
  });

  it("edits an expense and persists the changes", async () => {
    await seedStall();
    await seedExpense();
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Edit Sugar" }));
    const descriptionInput = screen.getByLabelText("Description");
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Sugar Refined");
    const amountInput = screen.getByLabelText("Amount");
    await user.clear(amountInput);
    await user.type(amountInput, "15.00");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Expense updated")).toBeInTheDocument();
    expect(screen.getByText("Sugar Refined")).toBeInTheDocument();
    expect(screen.getByText("RM 15.00")).toBeInTheDocument();
    const db = await openDatabase();
    const saved = (await expensesDb.getAll(db))[0];
    expect(saved.id).toBe("e1");
    expect(saved.amount).toBe(1500);
    expect(saved.category).toBe("Stock");
  });

  it("deletes an expense after confirmation", async () => {
    await seedStall();
    await seedExpense();
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Delete Sugar" }));
    expect(
      screen.getByText("This will permanently remove this expense.")
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("No expenses recorded.")).toBeInTheDocument();
    const db = await openDatabase();
    expect(await expensesDb.getAll(db)).toHaveLength(0);
  });

  it("keeps the expense when delete is cancelled", async () => {
    await seedStall();
    await seedExpense();
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Delete Sugar" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Sugar")).toBeInTheDocument();
    const db = await openDatabase();
    expect(await expensesDb.getAll(db)).toHaveLength(1);
  });

  it("sorts expenses newest-first by date", async () => {
    await seedStall();
    await seedExpense({ id: "older", description: "Older", date: "2026-09-01" });
    await seedExpense({ id: "newer", description: "Newer", date: "2026-09-05" });
    renderPage();

    const rows = await screen.findAllByText(/Newer|Older/);
    expect(rows.map((r) => r.textContent)).toEqual(["Newer", "Older"]);
  });
});
