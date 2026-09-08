import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { IconCheck, IconClose, IconWarning } from "./icons";

export type ToastVariant = "success" | "error" | "info";

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
}

export interface ToastItem extends ToastOptions {
  id: number;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION_MS: Record<ToastVariant, number> = {
  success: 2000,
  error: 2500,
  info: 2500,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 200);
  }, []);

  const toast = useCallback(
    ({ message, variant = "info" }: ToastOptions) => {
      const id = ++idRef.current;
      // Keep max 3 visible; oldest is dropped.
      setToasts((ts) => [...ts.slice(-2), { id, message, variant }]);
      setTimeout(() => dismiss(id), DURATION_MS[variant]);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

export function ToastHost({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={[
            "toast",
            `toast--${t.variant}`,
            t.exiting ? "toast--exiting" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="toast__icon" aria-hidden="true">
            {t.variant === "success" && <IconCheck size={18} />}
            {t.variant === "error" && <IconWarning size={18} />}
            {t.variant === "info" && <span className="toast__dot" />}
          </span>
          <span className="toast__message">{t.message}</span>
          <button
            type="button"
            className="toast__close"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(t.id)}
          >
            <IconClose size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
