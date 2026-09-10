import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { DashboardStats } from "../lib/calculations/dashboard";
import { todayStats } from "../lib/calculations/dashboard";
import { expensesDb, openDatabase, productsDb, saleItemsDb, salesDb } from "../lib/db";
import { formatMoney } from "../utils/currency";
import { formatTime } from "../utils/dates";
import { useStall } from "../contexts/StallContext";
import { useProducts } from "../contexts/ProductsContext";
import { useSession } from "../contexts/SessionContext";
import StartSessionModal from "../components/StartSessionModal";
import CloseSessionModal from "../components/CloseSessionModal";
import {
  Badge,
  Card,
  EmptyState,
  IconCard,
  IconCart,
  IconClose,
  IconSales,
  IconSell,
  KeycapButton,
  useToast,
} from "../components";

const WALKTHROUGH_STEPS = [
  { icon: IconSales, title: "Sales", hint: "Review every sale later under Sales — totals, items, and payment method." },
  { icon: IconSell, title: "POS", hint: "POS is the selling screen: tap products and they land in the cart." },
  { icon: IconCart, title: "Cart", hint: "Adjust quantities in the cart before you hit PAY." },
  { icon: IconCard, title: "Payment", hint: "Take cash, QR, or card — confirm, and stock updates automatically." },
];

function txnLabel(n: number): string {
  return `${n} ${n === 1 ? "transaction" : "transactions"}`;
}

function itemLabel(n: number): string {
  return `${n} ${n === 1 ? "item" : "items"}`;
}

function LowStockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <Badge variant="error">OUT OF STOCK</Badge>;
  if (stock < 5) return <Badge variant="error">Very low</Badge>;
  return <Badge variant="gold">Low</Badge>;
}

export default function DashboardPage() {
  const { stall } = useStall();
  const currency = stall?.currency ?? "MYR";
  const threshold = stall?.lowStockThreshold ?? 10;
  const stallName = stall?.name;
  const { refresh } = useProducts();
  const { openSession, loading: sessionLoading, refresh: refreshSession } = useSession();
  const { toast } = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  // §11 — walkthrough is non-blocking and session-only; never persisted.
  const [showWalkthrough, setShowWalkthrough] = useState(true);
  const [showHints, setShowHints] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const db = await openDatabase();
      const [sales, saleItems, products, expenses] = await Promise.all([
        salesDb.getAll(db),
        saleItemsDb.getAll(db),
        productsDb.getAll(db),
        expensesDb.getAll(db),
      ]);
      setStats(todayStats(sales, saleItems, products, expenses, threshold, currency));
      setError(false);
    } catch {
      setError(true);
      toast({ message: "We couldn't load your data.", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [threshold, currency, toast]);

  useEffect(() => {
    void refresh();
    void load();
  }, [refresh, load]);

  const now = new Date();
  const month = Intl.DateTimeFormat("en", { month: "short" }).format(now);
  const metaLine = stats
    ? `${txnLabel(stats.transactionCount)} · ${itemLabel(stats.itemsSold)}`
    : "…";

  return (
    <div className="dash-page">
      <h1 className="sr-only">Dashboard</h1>
      <p className="dash-date">
        Today, {month} {now.getDate()}
      </p>

      <Card variant="gold" className="dash-hero">
        <p className="dash-hero__label">Today's Sales</p>
        <p className="dash-hero__amount">
          {!stats ? "…" : formatMoney(stats.totalSalesMinor, currency)}
        </p>
        <p className="dash-hero__meta">{metaLine}</p>
      </Card>

      {!sessionLoading && (
        <Card className="dash-session">
          <div className="session-status">
            <div className="session-status__body">
              <p className="session-status__label">
                {openSession ? "Day is open" : "Day not started"}
              </p>
              <p className="session-status__meta">
                {openSession
                  ? `Opened ${formatTime(openSession.openedAt)} · close it to check the cash drawer.`
                  : "Start a sale to open the register and begin selling."}
              </p>
            </div>
            <div className="session-status__actions">
              {openSession ? (
                <KeycapButton variant="primary" onClick={() => setCloseOpen(true)}>
                  Close Sale
                </KeycapButton>
              ) : (
                <KeycapButton variant="gold" onClick={() => setStartOpen(true)}>
                  Start Sale
                </KeycapButton>
              )}
            </div>
          </div>
        </Card>
      )}

      <Link to="/pos" className="keycap-btn keycap-btn--gold keycap-btn--lg dash-start">
        START SELLING
      </Link>

      <section className="dash-stats" aria-label="Quick stats">
        <Card className="dash-stat">
          <p className="dash-stat__value">{!stats ? "…" : stats.transactionCount}</p>
          <p className="dash-stat__label">Transactions</p>
        </Card>
        <Card className="dash-stat">
          <p className="dash-stat__value">{!stats ? "…" : stats.itemsSold}</p>
          <p className="dash-stat__label">Items Sold</p>
        </Card>
        <Card className="dash-stat">
          <p className="dash-stat__value">
            {!stats ? (
              "…"
            ) : stats.profitMinor === null ? (
              <span className="dash-stat__hint">Add product costs to estimate</span>
            ) : (
              formatMoney(stats.profitMinor, currency)
            )}
          </p>
          <p className="dash-stat__label">Estimated Profit</p>
        </Card>
      </section>

      <Card title="Top Sellers">
        {stats && stats.topSellers.length === 0 ? (
          <EmptyState icon={<IconSales size={24} />} title="No sales yet today." />
        ) : (
          <ul className="dash-list">
            {(stats?.topSellers ?? []).map((t) => (
              <li key={t.name} className="dash-list__row">
                <span className="dash-list__name">{t.name}</span>
                <span className="dash-list__right">{t.qty} sold</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {stats && stats.lowStock.length > 0 && (
        <Card title="Low Stock">
          <ul className="dash-list">
            {stats.lowStock.map(({ product }) => (
              <li key={product.id} className="dash-list__row">
                <span className="dash-list__name">{product.name}</span>
                <span className="dash-list__right">
                  Stock: {product.stock} <LowStockBadge stock={product.stock} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {error && (
        <Card className="dash-error">
          <p className="dash-error__text">We couldn't load your data.</p>
          <KeycapButton onClick={() => void load()}>Retry</KeycapButton>
        </Card>
      )}

      {!loading && showWalkthrough && (
        <Card className="dash-walkthrough">
          <div className="dash-walkthrough__head">
            <h3 className="card__title">Welcome to {stallName ?? "your stall"} POS</h3>
            <button
              type="button"
              className="dash-walkthrough__close"
              aria-label="Dismiss walkthrough"
              onClick={() => setShowWalkthrough(false)}
            >
              <IconClose size={18} />
            </button>
          </div>
          <ul className="dash-walkthrough__steps">
            {WALKTHROUGH_STEPS.map((step) => (
              <li key={step.title} className="dash-walkthrough__step">
                <step.icon size={18} />
                <span>{step.title}</span>
              </li>
            ))}
          </ul>
          {showHints && (
            <ul className="dash-walkthrough__hints">
              {WALKTHROUGH_STEPS.map((step) => (
                <li key={step.title}>{step.hint}</li>
              ))}
            </ul>
          )}
          <div className="dash-walkthrough__actions">
            <KeycapButton variant="ghost" onClick={() => setShowHints((v) => !v)}>
              {showHints ? "Hide tour" : "Show me around"}
            </KeycapButton>
            <Link to="/pos" className="keycap-btn keycap-btn--gold">
              Start selling
            </Link>
          </div>
        </Card>
      )}

      <StartSessionModal
        open={startOpen}
        onClose={() => {
          setStartOpen(false);
          void refreshSession();
        }}
      />
      <CloseSessionModal
        open={closeOpen}
        onClose={() => {
          setCloseOpen(false);
          void refreshSession();
          void load();
        }}
      />
    </div>
  );
}
