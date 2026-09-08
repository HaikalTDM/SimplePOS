import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { PaymentMethod, Sale, SaleItem } from "../types";
import { openDatabase, salesDb, getAllByIndex } from "../lib/db";
import { formatMoney, asCurrency } from "../utils/currency";
import { formatDateTime } from "../utils/dates";
import { useStall } from "../contexts/StallContext";
import {
  Badge,
  Card,
  EmptyState,
  IconBack,
  IconSales,
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

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { stall } = useStall();
  const { toast } = useToast();

  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await openDatabase();
        const found = id ? await salesDb.get(db, id) : undefined;
        if (cancelled) return;
        if (!found) {
          setMissing(true);
          return;
        }
        setSale(found);
        const allItems = await getAllByIndex<SaleItem>(db, "saleItems", "saleId", found.id);
        if (cancelled) return;
        setItems([...allItems].sort((a, b) => a.id.localeCompare(b.id)));
        setError(false);
      } catch {
        if (!cancelled) {
          setError(true);
          toast({ message: "We couldn't load your data.", variant: "error" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, toast]);

  const currency = asCurrency(sale?.currency ?? stall?.currency ?? "MYR");

  return (
    <div className="page sale-detail">
      <Link to="/sales" className="keycap-btn keycap-btn--ghost keycap-btn--sm sale-detail__back">
        <IconBack size={16} /> Back to sales
      </Link>

      {missing ? (
        <EmptyState
          icon={<IconSales size={28} />}
          title="Sale not found."
          action={
            <Link to="/sales" className="keycap-btn keycap-btn--primary">
              Back to sales
            </Link>
          }
        />
      ) : error || !sale ? (
        <p className="sales-loading">…</p>
      ) : (
        <>
          <div className="sale-detail__head">
            <h1 className="page__title">{formatDateTime(sale.timestamp)}</h1>
            <PaymentBadge method={sale.paymentMethod} />
          </div>

          <Card>
            <ul className="sale-detail__items">
              {items.map((item) => (
                <li key={item.id} className="sale-detail__item">
                  <span className="sale-detail__name">{item.productName}</span>
                  <span className="sale-detail__qty">
                    {formatMoney(item.unitPrice, currency)} × {item.quantity}
                  </span>
                  <span className="sale-detail__subtotal">
                    {formatMoney(item.subtotal, currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="sale-detail__totals">
              <span className="sale-detail__total-label">Total</span>
              <span className="sale-detail__total">
                {formatMoney(sale.total, currency)}
              </span>
              <span className="sale-detail__paid">
                Paid by {PAYMENT_LABEL[sale.paymentMethod]}
              </span>
            </div>
            {sale.notes && (
              <p className="sale-detail__notes">Notes: {sale.notes}</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
