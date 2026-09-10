import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Stall } from "../types";
import { openDatabase, stallDb } from "../lib/db";
import { EmptyState, KeycapButton } from "./index";
import { IconWarning } from "./icons";

/**
 * §7 launch gate. Reads the stall record and re-reads it on every route
 * change. A splash is shown only while a re-read could actually change the
 * decision (first load, or when we don't yet know of a completed stall and
 * the user is heading into the app) — otherwise a completed/known state keeps
 * rendering, so content never flashes away mid-navigation.
 *
 *  - No completed stall, not on /onboarding  -> /onboarding
 *  - Completed stall on /onboarding          -> /pos (already set up)
 *  - Otherwise                              -> children
 */
export default function AppGate({ children }: { children: ReactNode }) {
  const [stall, setStall] = useState<Stall | undefined>(undefined);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(true);
  const location = useLocation();
  const stallRef = useRef<Stall | undefined>(undefined);

  const applyStall = (next: Stall | undefined) => {
    stallRef.current = next;
    setStall(next);
  };

  useEffect(() => {
    let cancelled = false;
    // Only blank the screen when the outcome is genuinely unknown: on the
    // very first read, or when we have no completed stall and the user is
    // entering the app (e.g. just finished onboarding -> about to read the
    // freshly-saved stall).
    const current = stallRef.current;
    const needsSplash =
      current === undefined ||
      (!current.onboardingCompletedAt && location.pathname !== "/onboarding");
    if (needsSplash) setPending(true);

    openDatabase()
      .then(async (db) => {
        const stalls = await stallDb.getAll(db);
        if (!cancelled) {
          applyStall(stalls[0]);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, location.pathname]);

  if (error && !stall) {
    return (
      <div className="gate-error">
        <EmptyState
          icon={<IconWarning size={28} />}
          title="We couldn't open your data"
          action={
            <KeycapButton
              variant="primary"
              onClick={() => {
                setError(false);
                setAttempt((a) => a + 1);
              }}
            >
              Retry
            </KeycapButton>
          }
        />
      </div>
    );
  }

  if (pending) {
    return (
      <div className="gate-splash" role="status">
        <span className="gate-splash__brand">SimplePOS</span>
        <span className="gate-splash__ellipsis" aria-hidden="true">
          …
        </span>
      </div>
    );
  }

  if (!stall?.onboardingCompletedAt) {
    if (location.pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
    return <>{children}</>;
  }

  // Fully onboarded: never show onboarding again.
  if (location.pathname === "/onboarding") return <Navigate to="/pos" replace />;

  return <>{children}</>;
}
