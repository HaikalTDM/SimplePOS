import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Stall } from "../types";
import { openDatabase, stallDb } from "../lib/db";
import { EmptyState, KeycapButton } from "./index";
import { IconWarning } from "./icons";

/**
 * §7 launch gate. Reads the stall record and re-reads it on every route
 * change. While a re-read is in flight it shows the splash instead of
 * redirecting — otherwise completing onboarding (which saves the stall and
 * immediately navigates to /pos) would race the gate's stale "no stall" state
 * and bounce the user back to onboarding.
 *
 *  - No completed stall, not on /onboarding  -> /onboarding
 *  - Completed stall on /onboarding          -> /pos (already set up)
 *  - Otherwise                              -> children
 */
export default function AppGate({ children }: { children: ReactNode }) {
  const [stall, setStall] = useState<Stall | undefined>(undefined);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // True while the very first read is happening AND while re-checking after a
  // route change, so we never decide with stale state mid-navigation.
  const [pending, setPending] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    setPending(true);
    openDatabase()
      .then(async (db) => {
        const stalls = await stallDb.getAll(db);
        if (!cancelled) {
          setStall(stalls[0]);
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
