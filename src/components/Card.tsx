import type { ReactNode } from "react";

export interface CardProps {
  title?: string;
  subtitle?: string;
  /** gold = amber top strip, for hero cards like Today's Sales. */
  variant?: "default" | "gold";
  className?: string;
  children?: ReactNode;
}

export default function Card({ title, subtitle, variant = "default", className, children }: CardProps) {
  return (
    <section
      className={["card", variant === "gold" ? "card--gold" : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      {(title || subtitle) && (
        <header className="card__header">
          {title && <h3 className="card__title">{title}</h3>}
          {subtitle && <p className="card__subtitle">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
