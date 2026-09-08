import type { ButtonHTMLAttributes } from "react";

export type KeycapVariant = "primary" | "gold" | "danger" | "ghost" | "neutral";
export type KeycapSize = "sm" | "md" | "lg";

export interface KeycapButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = slate, gold = amber (the ONE primary action), danger, ghost, neutral. */
  variant?: KeycapVariant;
  size?: KeycapSize;
  loading?: boolean;
}

export default function KeycapButton({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: KeycapButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      className={["keycap-btn", `keycap-btn--${variant}`, `keycap-btn--${size}`, className]
        .filter(Boolean)
        .join(" ")}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      {...rest}
    >
      {loading && <span className="keycap-btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
