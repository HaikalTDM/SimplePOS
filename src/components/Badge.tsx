import type { ReactNode } from "react";

export type BadgeVariant = "neutral" | "accent" | "slate" | "gold" | "success" | "error";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  /** Extra screen-reader context, e.g. "3 in cart" next to a "3". */
  srOnly?: string;
  className?: string;
}

export default function Badge({ variant = "neutral", children, srOnly, className }: BadgeProps) {
  return (
    <span className={["badge", `badge--${variant}`, className].filter(Boolean).join(" ")}>
      {srOnly && <span className="sr-only">{srOnly}</span>}
      {children}
    </span>
  );
}
