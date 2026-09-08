import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Stall } from "../types";
import { openDatabase, stallDb } from "../lib/db";
import { EmptyState, KeycapButton } from "./index";
import { IconWarning } from "./icons";

/**
 * §7 launch gate: read the stall record once on mount (and re-check on
 * navigation so completing onboarding or importing a backup is reflected).
 * No completed stall -> /onboarding. Renders children otherwise.
 */
export default function AppGate({ children }: { children: ReactNode }) {
  const [stall, setStall] = useState<Stall | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    openDatabase()
      .then(async (db) => {
        const stalls = await stallDb.getAll(db);
        if (!cancelled) {
          setStall(stalls[0]);
          setError(false);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, location.pathname]);

  if (error && !loaded) {
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

  if (!loaded) {
    return (
      <div className="gate-splash" role="status">
        <span className="gate-splash__brand">SimplePOS</span>
        <span className="gate-splash__ellipsis" aria-hidden="true">
          …
        </span>
      </div>
    );
  }

  if (!stall?.onboardingCompletedAt && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
