import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Stall } from "../types";
import { openDatabase, stallDb } from "../lib/db";

interface StallContextValue {
  stall: Stall | null;
  loading: boolean;
  reload: () => Promise<void>;
}

const StallContext = createContext<StallContextValue | null>(null);

export function StallProvider({ children }: { children: ReactNode }) {
  const [stall, setStall] = useState<Stall | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const db = await openDatabase();
    const stalls = await stallDb.getAll(db);
    setStall(stalls[0] ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } catch {
        // AppGate already surfaces db-open failures.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const value = useMemo(() => ({ stall, loading, reload }), [stall, loading, reload]);

  return <StallContext.Provider value={value}>{children}</StallContext.Provider>;
}

export function useStall(): StallContextValue {
  const ctx = useContext(StallContext);
  if (!ctx) throw new Error("useStall must be used within a StallProvider");
  return ctx;
}
