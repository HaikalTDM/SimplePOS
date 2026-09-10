import { useEffect, useState } from "react";
import type { Currency, Session } from "../types";
import { useSession } from "../contexts/SessionContext";
import { useStall } from "../contexts/StallContext";
import { formatMoney, parseMoneyInput } from "../utils/currency";
import { formatDateTime, localDateOf } from "../utils/dates";
import { expensesDb, openDatabase, saleItemsDb, salesDb } from "../lib/db";
import {
  cashDifference,
  cashExpensesOnDate,
  expectedCash,
  summarizeSales,
} from "../lib/session";
import { Input, KeycapButton, Modal, useToast } from "./index";

export interface CloseSessionModalProps {
  open: boolean;
  onClose: () => void;
}

interface Preview {
  sales: number;
  transactions: number;
  items: number;
  cash: number;
  qr: number;
  card: number;
  expenseTotal: number;
  expected: number;
}

/** Read-only breakdown of a session (used live at close and in history). */
export function SessionSummary({
  session,
  currency,
}: {
  session: Session;
  currency: Currency;
}) {
  const diff = cashDifference(session.countedCash, session.expectedCash);
  return (
    <div className="session-summary">
      <div className="session-summary__row">
        <span>Opened</span>
        <span className="session-summary__value">{formatDateTime(session.openedAt)}</span>
      </div>
      {session.closedAt && (
        <div className="session-summary__row">
          <span>Closed</span>
          <span className="session-summary__value">{formatDateTime(session.closedAt)}</span>
        </div>
      )}
      <div className="session-summary__row session-summary__row--strong">
        <span>Total sales</span>
        <span className="session-summary__value">{formatMoney(session.totals.sales, currency)}</span>
      </div>
      <div className="session-summary__row">
        <span>Transactions · Items</span>
        <span className="session-summary__value">
          {session.totals.transactions} · {session.totals.items}
        </span>
      </div>
      <div className="session-summary__row">
        <span>Cash · QR · Card</span>
        <span className="session-summary__value">
          {formatMoney(session.payments.cash, currency)} ·{" "}
          {formatMoney(session.payments.qr, currency)} ·{" "}
          {formatMoney(session.payments.card, currency)}
        </span>
      </div>
      <div className="session-summary__row">
        <span>Expenses from drawer</span>
        <span className="session-summary__value">
          {formatMoney(session.expenseTotal, currency)}
        </span>
      </div>
      <div className="session-summary__row session-summary__row--strong">
        <span>Expected cash</span>
        <span className="session-summary__value">
          {session.expectedCash === null ? "—" : formatMoney(session.expectedCash, currency)}
        </span>
      </div>
      {session.countedCash !== null && (
        <div className="session-summary__row">
          <span>Counted cash</span>
          <span className="session-summary__value">
            {formatMoney(session.countedCash, currency)}
          </span>
        </div>
      )}
      {diff !== null && (
        <div
          className={
            "session-summary__row session-summary__diff " +
            (diff === 0 ? "" : diff > 0 ? "session-summary__diff--over" : "session-summary__diff--short")
          }
        >
          <span>{diff === 0 ? "Balanced" : diff > 0 ? "Over" : "Short"}</span>
          <span className="session-summary__value">
            {diff === 0 ? "—" : formatMoney(Math.abs(diff), currency)}
          </span>
        </div>
      )}
      {session.notes && <p className="session-summary__notes">“{session.notes}”</p>}
    </div>
  );
}

/** "Close Sale" — live Z-report with cash count + over/short, then closes. */
export default function CloseSessionModal({ open, onClose }: CloseSessionModalProps) {
  const { stall } = useStall();
  const currency = stall?.currency ?? "MYR";
  const { openSession, closeSession } = useSession();
  const { toast } = useToast();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !openSession) return;
    setCounted("");
    setNotes("");
    setError(undefined);
    setSaving(false);
    setPreview(null);
    let cancelled = false;
    (async () => {
      const db = await openDatabase();
      const [sales, items, expenses] = await Promise.all([
        salesDb.getAll(db),
        saleItemsDb.getAll(db),
        expensesDb.getAll(db),
      ]);
      const sessionSales = sales.filter((s) => s.sessionId === openSession.id);
      const { totals, payments } = summarizeSales(sessionSales, items);
      const expenseTotal = cashExpensesOnDate(expenses, localDateOf(openSession.openedAt)).reduce(
        (sum, e) => sum + e.amount,
        0,
      );
      if (cancelled) return;
      setPreview({
        sales: totals.sales,
        transactions: totals.transactions,
        items: totals.items,
        cash: payments.cash,
        qr: payments.qr,
        card: payments.card,
        expenseTotal,
        expected: expectedCash(openSession.openingFloat, payments.cash, expenseTotal),
      });
    })().catch(() => {
      if (!cancelled) setPreview(null);
    });
    return () => {
      cancelled = true;
    };
  }, [open, openSession]);

  const countedMinor =
    counted.trim() === "" ? null : parseMoneyInput(counted, currency);
  const diff =
    countedMinor === null || !preview ? null : countedMinor - preview.expected;

  const submit = async () => {
    if (counted.trim() !== "" && countedMinor === null) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await closeSession({ countedCash: countedMinor, notes });
      toast({ message: "Day closed. Nice work!", variant: "success" });
      onClose();
    } catch (err) {
      toast({
        message: err instanceof Error ? err.message : "Couldn't close the day",
        variant: "error",
      });
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Close sale"
      footer={
        <>
          <KeycapButton variant="neutral" disabled={saving} onClick={onClose}>
            Cancel
          </KeycapButton>
          <KeycapButton variant="gold" loading={saving} onClick={() => void submit()}>
            Close Sale
          </KeycapButton>
        </>
      }
    >
      {preview ? (
        <div className="session-close">
          <div className="session-summary">
            <div className="session-summary__row session-summary__row--strong">
              <span>Total sales</span>
              <span className="session-summary__value">
                {formatMoney(preview.sales, currency)}
              </span>
            </div>
            <div className="session-summary__row">
              <span>Transactions · Items</span>
              <span className="session-summary__value">
                {preview.transactions} · {preview.items}
              </span>
            </div>
            <div className="session-summary__row">
              <span>Cash · QR · Card</span>
              <span className="session-summary__value">
                {formatMoney(preview.cash, currency)} · {formatMoney(preview.qr, currency)} ·{" "}
                {formatMoney(preview.card, currency)}
              </span>
            </div>
            <div className="session-summary__row">
              <span>Expenses from drawer</span>
              <span className="session-summary__value">
                {formatMoney(preview.expenseTotal, currency)}
              </span>
            </div>
            <div className="session-summary__row session-summary__row--strong">
              <span>Expected cash</span>
              <span className="session-summary__value">
                {formatMoney(preview.expected, currency)}
              </span>
            </div>
          </div>

          <Input
            label="Counted cash in drawer"
            inputMode="decimal"
            placeholder="e.g., 120.50"
            value={counted}
            onChange={(e) => {
              setCounted(e.target.value);
              setError(undefined);
            }}
            error={error}
          />
          {diff !== null && (
            <p
              className={
                "session-close__diff " +
                (diff === 0 ? "" : diff > 0 ? "session-close__diff--over" : "session-close__diff--short")
              }
            >
              {diff === 0
                ? "Balanced — the drawer matches."
                : diff > 0
                  ? `Over by ${formatMoney(diff, currency)}`
                  : `Short by ${formatMoney(Math.abs(diff), currency)}`}
            </p>
          )}
          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="session-modal__hint">
            Expected cash = opening cash + cash sales − expenses paid from the drawer.
          </p>
        </div>
      ) : (
        <p className="session-modal__intro">No open session to close.</p>
      )}
    </Modal>
  );
}
