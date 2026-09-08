import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { PaymentMethod, Sale, SaleItem } from "../types";
import { openDatabase, saleItemsDb, salesDb } from "../lib/db";
import { formatMoney, asCurrency } from "../utils/currency";
import { formatDateTime, localDateOf } from "../utils/dates";
import { useStall } from "../contexts/StallContext";
import {
  Badge,
  EmptyState,
  IconChevronDown,
  IconClear,
  IconSales,
  Input,
  KeycapButton,
  useToast,
} from "../components";

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "CASH",
  qr: "QR",
  card: "CARD",
};

function PaymentBadge({ method }: { method: PaymentMethod }) {
  const variant = method === "qr" ? "accent" : method === "card" ? "slate" : "neutral";
  return (
    <Badge variant={variant} srOnly="Payment:">
      {PAYMENT_LABEL[method]}
    </Badge>
  );
}

interface SaleRowInfo {
  count: number;
  qtySum: number;
}

function groupItems(items: SaleItem[]): Map<string, SaleRowInfo> {
  const map = new Map<string, SaleRowInfo>();
  for (const item of items) {
    const cur = map.get(item.saleId) ?? { count: 0, qtySum: 0 };
    cur.count += 1;
    cur.qtySum += item.quantity;
    map.set(item.saleId, cur);
  }
  return map;
}

function saleLabel(n: number): string {
  return `${n} ${n === 1 ? "sale" : "sales"}`;
}

export default function SalesPage() {
  const { stall } = useStall();
  const { toast } = useToast();

  const [sales, setSales] = useState<Sale[] | null>(null);
  const [itemInfo, setItemInfo] = useState<Map<string, SaleRowInfo>>(new Map());
  const [dateFilter, setDateFilter] = useState("");
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const db = await openDatabase();
      const [allSales, allItems] = await Promise.all([
        salesDb.getAll(db),
        saleItemsDb.getAll(db),
      ]);
      const sorted = [...allSales].sort((a, b) =>
        b.timestamp.localeCompare(a.timestamp)
      );
      setSales(sorted);
      setItemInfo(groupItems(allItems));
      setError(false);
    } catch {
      setError(true);
      toast({ message: "We couldn't load your data.", variant: "error" });
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (!sales) return [];
    if (dateFilter === "") return sales;
    return sales.filter((s) => localDateOf(s.timestamp) === dateFilter);
  }, [sales, dateFilter]);

  return (
    <div className="page">
      <h1 className="page__title">Sales</h1>
      {sales && !error && (
        <p className="page__subtitle">{saleLabel(visible.length)}</p>
      )}

      <div className="sales-filter">
        <Input
          type="date"
          label="Filter by date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="sales-filter__date"
        />
        {dateFilter !== "" && (
          <KeycapButton variant="ghost" size="sm" onClick={() => setDateFilter("")}>
            <IconClear size={16} /> All time
          </KeycapButton>
        )}
      </div>

      {error ? (
        <div className="sales-error">
          <p className="sales-error__text">We couldn't load your data.</p>
          <KeycapButton onClick={() => void load()}>Retry</KeycapButton>
        </div>
      ) : !sales ? (
        <p className="sales-loading">…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<IconSales size={28} />}
          title={sales.length === 0 ? "No sales yet." : "No sales on this date."}
          message={
            sales.length === 0
              ? "Your completed sales will appear here."
              : "Try another date or clear the filter."
          }
        />
      ) : (
        <ul className="sales-list">
          {visible.map((sale) => {
            const info = itemInfo.get(sale.id) ?? { count: 0, qtySum: 0 };
            const currency = asCurrency(sale.currency || stall?.currency || "MYR");
            return (
              <li key={sale.id}>
                <Link to={`/sales/${sale.id}`} className="sales-row">
                  <div className="sales-row__left">
                    <span className="sales-row__time">
                      {formatDateTime(sale.timestamp)}
                    </span>
                    <span className="sales-row__meta">
                      {info.qtySum} {info.qtySum === 1 ? "item" : "items"} |{" "}
                      {formatMoney(sale.total, currency)}
                    </span>
                    <PaymentBadge method={sale.paymentMethod} />
                  </div>
                  <div className="sales-row__right">
                    <span className="sales-row__total">
                      {formatMoney(sale.total, currency)}
                    </span>
                    <IconChevronDown size={18} className="sales-row__chevron" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
