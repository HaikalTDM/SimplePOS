import { useCallback, useEffect, useMemo, useState } from "react";
import type { Currency, Expense } from "../types";
import { openDatabase, expensesDb } from "../lib/db";
import {
  asCurrency,
  formatMoney,
  minorUnitsToInput,
  parseMoneyInput,
} from "../utils/currency";
import { todayLocalISO } from "../utils/dates";
import { newId } from "../utils/id";
import { useStall } from "../contexts/StallContext";
import {
  Badge,
  EmptyState,
  IconEdit,
  IconExpenses,
  IconPlus,
  IconTrash,
  Input,
  KeycapButton,
  Modal,
  Select,
  useToast,
} from "../components";

const SAVE_ERROR = "We couldn't save your changes. Your data has not been cleared.";
const CATEGORIES = ["Stock", "Delivery", "Packaging", "Other"] as const;
const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }));

interface ExpenseFormState {
  description: string;
  amount: string;
  date: string;
  category: string;
}

export default function ExpensesPage() {
  const { stall } = useStall();
  const { toast } = useToast();
  const currency = stall?.currency ?? "MYR";

  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [error, setError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const db = await openDatabase();
      setExpenses(await expensesDb.getAll(db));
      setError(false);
    } catch {
      setError(true);
      toast({ message: "We couldn't load your data.", variant: "error" });
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Newest first by date; equal dates keep their loaded order (stable sort).
  const sorted = useMemo(() => {
    if (!expenses) return [];
    return [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses]);

  const summary = useMemo(() => {
    if (!expenses || expenses.length === 0) return null;
    const month = todayLocalISO().slice(0, 7);
    const thisMonth = expenses
      .filter((e) => e.date.startsWith(month))
      .reduce((sum, e) => sum + e.amount, 0);
    const allTime = expenses.reduce((sum, e) => sum + e.amount, 0);
    return { thisMonth, allTime };
  }, [expenses]);

  const save = async (form: ExpenseFormState) => {
    setSaving(true);
    try {
      const db = await openDatabase();
      await expensesDb.put(db, {
        id: editing?.id ?? newId(),
        description: form.description.trim(),
        amount: parseMoneyInput(form.amount, currency)!,
        category: form.category,
        date: form.date,
        currency: stall?.currency ?? "MYR",
      });
      setFormOpen(false);
      setEditing(null);
      toast({ message: editing ? "Expense updated" : "Expense added", variant: "success" });
      await load();
    } catch {
      toast({ message: SAVE_ERROR, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      const db = await openDatabase();
      await expensesDb.del(db, deleting.id);
      setDeleting(null);
      toast({ message: "Expense deleted", variant: "success" });
      await load();
    } catch {
      toast({ message: SAVE_ERROR, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="expenses-header">
        <h1 className="page__title">Expenses</h1>
        <KeycapButton
          variant="gold"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <IconPlus size={18} />
          Add Expense
        </KeycapButton>
      </div>

      {summary && (
        <p className="expenses-summary">
          <span>This month: {formatMoney(summary.thisMonth, currency)}</span>
          <span aria-hidden="true">·</span>
          <span>All time: {formatMoney(summary.allTime, currency)}</span>
        </p>
      )}

      {error ? (
        <div className="sales-error">
          <p className="sales-error__text">We couldn't load your data.</p>
          <KeycapButton onClick={() => void load()}>Retry</KeycapButton>
        </div>
      ) : !expenses ? (
        <p className="sales-loading">…</p>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<IconExpenses size={28} />}
          title="No expenses recorded."
          message="Track what you spend to see your real profit."
          action={
            <KeycapButton
              variant="gold"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <IconPlus size={18} />
              Add Expense
            </KeycapButton>
          }
        />
      ) : (
        <ul className="expenses-list">
          {sorted.map((expense) => (
            <li key={expense.id} className="expenses-row">
              <div className="expenses-row__left">
                <span className="expenses-row__name">{expense.description}</span>
                <div className="expenses-row__meta">
                  {expense.category && (
                    <Badge variant="neutral">{expense.category}</Badge>
                  )}
                  <span className="expenses-row__date">{expense.date}</span>
                </div>
              </div>
              <div className="expenses-row__right">
                <span className="expenses-row__amount">
                  {formatMoney(expense.amount, asCurrency(expense.currency))}
                </span>
                <button
                  type="button"
                  className="expenses-row__action"
                  aria-label={`Edit ${expense.description}`}
                  onClick={() => {
                    setEditing(expense);
                    setFormOpen(true);
                  }}
                >
                  <IconEdit size={18} />
                </button>
                <button
                  type="button"
                  className="expenses-row__action expenses-row__action--danger"
                  aria-label={`Delete ${expense.description}`}
                  onClick={() => setDeleting(expense)}
                >
                  <IconTrash size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ExpenseFormModal
        open={formOpen}
        expense={editing}
        currency={currency}
        saving={saving}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSave={save}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete expense?"
        footer={
          <>
            <KeycapButton variant="neutral" disabled={saving} onClick={() => setDeleting(null)}>
              Cancel
            </KeycapButton>
            <KeycapButton variant="danger" loading={saving} onClick={() => void handleDelete()}>
              Delete
            </KeycapButton>
          </>
        }
      >
        <p className="expenses-confirm">
          This will permanently remove this expense.
        </p>
      </Modal>
    </div>
  );
}

function ExpenseFormModal({
  open,
  expense,
  currency,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  expense: Expense | null;
  currency: Currency;
  saving: boolean;
  onClose: () => void;
  onSave: (form: ExpenseFormState) => Promise<void>;
}) {
  const isEdit = expense != null;
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayLocalISO());
  const [category, setCategory] = useState("Other");
  const [errors, setErrors] = useState<{ description?: string; amount?: string }>({});

  useEffect(() => {
    if (!open) return;
    setDescription(expense?.description ?? "");
    setAmount(expense ? minorUnitsToInput(expense.amount, currency) : "");
    setDate(expense?.date ?? todayLocalISO());
    setCategory(expense?.category ?? "Other");
    setErrors({});
  }, [open, expense, currency]);

  const validate = () => {
    const next: typeof errors = {};
    if (!description.trim()) next.description = "Description is required";
    const parsed = parseMoneyInput(amount, currency);
    if (parsed === null || parsed <= 0) next.amount = "Enter a valid amount";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    await onSave({ description, amount, date, category });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Expense" : "Add Expense"}
      footer={
        <>
          <KeycapButton variant="neutral" disabled={saving} onClick={onClose}>
            Cancel
          </KeycapButton>
          <KeycapButton variant="primary" loading={saving} onClick={() => void submit()}>
            Save
          </KeycapButton>
        </>
      }
    >
      <form
        className="expenses-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
        />
        <Input
          label="Amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
        />
        <Input
          type="date"
          label="Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Select
          label="Category"
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={setCategory}
        />
      </form>
    </Modal>
  );
}
