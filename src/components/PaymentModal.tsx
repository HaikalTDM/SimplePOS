import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { CartItem } from "../contexts/CartContext";
import { useProducts } from "../contexts/ProductsContext";
import { useStall } from "../contexts/StallContext";
import type { PaymentMethod } from "../types";
import { formatMoney, parseMoneyInput } from "../utils/currency";
import { CheckoutError, completeCheckout } from "../lib/checkout/checkout";
import type { StockChange } from "../lib/checkout/checkout";
import Modal from "./Modal";
import KeycapButton from "./KeycapButton";
import Input from "./Input";
import EmptyState from "./EmptyState";
import { useToast } from "./Toast";
import { IconCard, IconCash, IconCheck, IconQr } from "./icons";

export interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  totalMinor: number;
  onSuccess: (stockChanges: StockChange[]) => void;
}

type Step = "methods" | "cash" | "qr" | "card" | "success";

const SUCCESS_DELAY_MS = 1500;

interface MethodOption {
  id: PaymentMethod;
  label: string;
  icon: ReactNode;
}

/**
 * §35–§41 payment flow. Cash/QR/CARD panes are cashier-confirmed only —
 * SimplePOS never verifies a payment (§37/§38). The confirm action calls
 * completeCheckout, which re-validates against fresh DB state inside its
 * transaction; failures keep the modal open and the cart intact.
 */
export default function PaymentModal({
  open,
  onClose,
  items,
  totalMinor,
  onSuccess,
}: PaymentModalProps) {
  const { stall } = useStall();
  const { refresh } = useProducts();
  const { toast } = useToast();
  const currency = stall?.currency ?? "MYR";

  const [step, setStep] = useState<Step>("methods");
  const [received, setReceived] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [warning, setWarning] = useState(false);
  const [stockChanges, setStockChanges] = useState<StockChange[]>([]);
  const successRef = useRef<StockChange[]>([]);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (open) {
      setStep("methods");
      setReceived("");
      setSubmitting(false);
      setWarning(false);
      setStockChanges([]);
    }
  }, [open]);

  // §41: auto-advance after ~1.5s (a timer, not an animation — it must still
  // fire under prefers-reduced-motion). Cleared if the modal closes early.
  useEffect(() => {
    if (!open || step !== "success") return;
    const t = setTimeout(() => {
      onSuccessRef.current(successRef.current);
    }, SUCCESS_DELAY_MS);
    return () => clearTimeout(t);
  }, [open, step]);

  // §56: QR blob lives in IndexedDB — object URL only while the pane is shown.
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!open || step !== "qr") return;
    const image = stall?.paymentMethods.qr.image ?? null;
    if (!image || typeof URL.createObjectURL !== "function") return;
    const url = URL.createObjectURL(image);
    setQrUrl(url);
    return () => {
      if (typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
    };
  }, [open, step, stall?.paymentMethods.qr.image]);

  const methods = useMemo<MethodOption[]>(() => {
    const pm = stall?.paymentMethods;
    const list: MethodOption[] = [];
    if (!pm || pm.cash) {
      list.push({ id: "cash", label: "CASH", icon: <IconCash size={24} /> });
    }
    if (pm?.qr.enabled) list.push({ id: "qr", label: "QR", icon: <IconQr size={24} /> });
    if (pm?.card) list.push({ id: "card", label: "CARD", icon: <IconCard size={24} /> });
    // §35: at least one method must exist.
    if (list.length === 0) list.push({ id: "cash", label: "CASH", icon: <IconCash size={24} /> });
    return list;
  }, [stall?.paymentMethods]);

  const receivedMinor = parseMoneyInput(received, currency);
  const changeMinor =
    receivedMinor === null ? null : receivedMinor - totalMinor;
  const cashError =
    received.trim() !== "" && receivedMinor === null
      ? "Enter a valid amount"
      : receivedMinor !== null && receivedMinor < totalMinor
        ? "Amount received is less than the total"
        : "";

  // §41: the success pane auto-advances; block manual close during it so the
  // cart clear can never be skipped after a recorded sale.
  const handleClose = () => {
    if (step === "success") return;
    onClose();
  };

  const submit = async (paymentMethod: PaymentMethod) => {
    if (submitting) return;
    setSubmitting(true);
    setWarning(false);
    try {
      const result = await completeCheckout({ items, paymentMethod, currency });
      successRef.current = result.stockChanges;
      setStockChanges(result.stockChanges);
      setStep("success");
    } catch (err) {
      // §70/§33: the cart is untouched; keep the modal open for a retry.
      toast({
        message: "Sale could not be completed. Your cart is still here.",
        variant: "error",
      });
      if (err instanceof CheckoutError) setWarning(true);
      void refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const warningLine = warning ? (
    <p className="pay-warning" role="alert">
      Some products changed — review your cart
    </p>
  ) : null;

  return (
    <Modal open={open} onClose={handleClose} title="Payment">
      {step === "methods" && (
        <div className="pay-methods">
          {methods.map((method) => (
            <button
              key={method.id}
              type="button"
              className="pay-method"
              aria-label={`Pay with ${method.id}`}
              onClick={() => setStep(method.id)}
            >
              <span className="pay-method__icon" aria-hidden="true">
                {method.icon}
              </span>
              <span className="pay-method__label">{method.label}</span>
            </button>
          ))}
        </div>
      )}

      {step === "cash" && (
        <div className="pay-pane">
          <p className="pay-total">{formatMoney(totalMinor, currency)}</p>
          <Input
            label="Amount Received"
            inputMode="decimal"
            placeholder={formatMoney(totalMinor, currency)}
            value={received}
            error={cashError}
            onChange={(e) => setReceived(e.target.value)}
          />
          {changeMinor !== null && changeMinor >= 0 && (
            <p className="pay-change">Change: {formatMoney(changeMinor, currency)}</p>
          )}
          {warningLine}
          <KeycapButton
            variant="gold"
            size="lg"
            className="pay-confirm"
            disabled={cashError !== ""}
            loading={submitting}
            onClick={() => submit("cash")}
          >
            CONFIRM PAID
          </KeycapButton>
        </div>
      )}

      {step === "qr" && (
        <div className="pay-pane">
          {qrUrl ? (
            <img className="pay-qr__img" src={qrUrl} alt="Merchant QR code" />
          ) : (
            <EmptyState
              icon={<IconQr size={28} />}
              title="No QR image set"
              message="Add one in Settings"
            />
          )}
          <p className="pay-note">Please confirm payment has been received</p>
          {warningLine}
          <KeycapButton
            variant="gold"
            size="lg"
            className="pay-confirm"
            loading={submitting}
            onClick={() => submit("qr")}
          >
            PAID
          </KeycapButton>
        </div>
      )}

      {step === "card" && (
        <div className="pay-pane">
          <p className="pay-total">{formatMoney(totalMinor, currency)}</p>
          <p className="pay-note">
            Please process the card payment on your card reader/terminal
          </p>
          {warningLine}
          <KeycapButton
            variant="gold"
            size="lg"
            className="pay-confirm"
            loading={submitting}
            onClick={() => submit("card")}
          >
            PAID
          </KeycapButton>
        </div>
      )}

      {step === "success" && (
        <div className="pay-success">
          <span className="pay-success__icon" aria-hidden="true">
            <IconCheck size={32} />
          </span>
          <p className="pay-success__title">Stock updated ✓</p>
          <ul className="pay-success__list">
            {stockChanges.map((change) => (
              <li key={change.productId} className="pay-success__item">
                {change.name}: {change.before} → {change.after}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
