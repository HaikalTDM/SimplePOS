import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "../types";
import {
  expensesDb,
  openDatabase,
  saleItemsDb,
  salesDb,
  sessionsDb,
} from "../lib/db";
import {
  cashExpensesOnDate,
  expectedCash,
  newSession,
  summarizeSales,
} from "../lib/session";
import { localDateOf } from "../utils/dates";
import { newId } from "../utils/id";

interface SessionContextValue {
  sessions: Session[];
  /** The one session that hasn't been closed yet, if any. */
  openSession: Session | null;
  loading: boolean;
  refresh: () => Promise<void>;
  startSession: (openingFloat: number | null, currency: string) => Promise<Session>;
  closeSession: (input: {
    countedCash: number | null;
    notes?: string;
  }) => Promise<Session>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const db = await openDatabase();
    const all = await sessionsDb.getAll(db);
    all.sort((a, b) => b.openedAt.localeCompare(a.openedAt));
    setSessions(all);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch {
        // Surfaces on mutations; keep the last known list here.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const openSession = useMemo(
    () => sessions.find((s) => s.closedAt === null) ?? null,
    [sessions],
  );

  const startSession = useCallback(
    async (openingFloat: number | null, currency: string): Promise<Session> => {
      if (openingFloat !== null && (!Number.isSafeInteger(openingFloat) || openingFloat < 0)) {
        throw new Error("Opening cash must be a non-negative amount");
      }
      const db = await openDatabase();
      const all = await sessionsDb.getAll(db);
      if (all.some((s) => s.closedAt === null)) {
        throw new Error("A session is already open");
      }
      const now = new Date().toISOString();
      const session = newSession(newId(), currency, openingFloat, now);
      await sessionsDb.put(db, session);
      await refresh();
      return session;
    },
    [refresh],
  );

  const closeSession = useCallback(
    async (input: { countedCash: number | null; notes?: string }): Promise<Session> => {
      if (
        input.countedCash !== null &&
        (!Number.isSafeInteger(input.countedCash) || input.countedCash < 0)
      ) {
        throw new Error("Counted cash must be a non-negative amount");
      }
      const db = await openDatabase();
      const all = await sessionsDb.getAll(db);
      const current = all.find((s) => s.closedAt === null);
      if (!current) throw new Error("No open session to close");

      const [sales, saleItems, expenses] = await Promise.all([
        salesDb.getAll(db),
        saleItemsDb.getAll(db),
        expensesDb.getAll(db),
      ]);

      const sessionSales = sales.filter((s) => s.sessionId === current.id);
      const { totals, payments } = summarizeSales(sessionSales, saleItems);
      const closedAt = new Date().toISOString();
      const expenseTotal = cashExpensesOnDate(expenses, localDateOf(closedAt)).reduce(
        (sum, e) => sum + e.amount,
        0,
      );
      const expected = expectedCash(current.openingFloat, payments.cash, expenseTotal);

      const closed: Session = {
        ...current,
        closedAt,
        totals,
        payments,
        expenseTotal,
        expectedCash: expected,
        countedCash: input.countedCash,
        ...(input.notes && input.notes.trim() ? { notes: input.notes.trim() } : {}),
      };
      await sessionsDb.put(db, closed);
      await refresh();
      return closed;
    },
    [refresh],
  );

  const value = useMemo<SessionContextValue>(
    () => ({ sessions, openSession, loading, refresh, startSession, closeSession }),
    [sessions, openSession, loading, refresh, startSession, closeSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
