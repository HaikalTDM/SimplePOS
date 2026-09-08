import { useEffect, useState } from "react";
import type { Product } from "../types";
import { Input, KeycapButton, Modal, Select } from "./index";

const REASONS = ["Damaged", "Restock", "Inventory check", "Other"];

export interface StockAdjustModalProps {
  open: boolean;
  product: Product | null;
  saving: boolean;
  onClose: () => void;
  onSave: (newStock: number, reason: string) => Promise<void>;
}

export default function StockAdjustModal({
  open,
  product,
  saving,
  onClose,
  onSave,
}: StockAdjustModalProps) {
  const [stock, setStock] = useState("");
  const [reason, setReason] = useState("");
  const [other, setOther] = useState("");
  const [stockError, setStockError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setStock(String(product?.stock ?? 0));
    setReason("");
    setOther("");
    setStockError(undefined);
  }, [open, product]);

  const stockValid = /^\d+$/.test(stock.trim());
  const newStock = stockValid ? Number.parseInt(stock.trim(), 10) : null;
  const diff = newStock !== null && product ? newStock - product.stock : 0;
  const reasonOk = reason !== "" && (reason !== "Other" || other.trim() !== "");
  const canSave =
    newStock !== null && product !== null && newStock !== product.stock && reasonOk;

  const submit = async () => {
    if (!canSave || newStock === null) return;
    await onSave(newStock, reason === "Other" ? other.trim() : reason);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adjust Stock"
      footer={
        <>
          <KeycapButton variant="neutral" disabled={saving} onClick={onClose}>
            Cancel
          </KeycapButton>
          <KeycapButton
            variant="primary"
            loading={saving}
            disabled={!canSave}
            onClick={() => void submit()}
          >
            Save
          </KeycapButton>
        </>
      }
    >
      <form
        className="products-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        <p className="stock-current">
          Current stock: <strong>{product?.stock ?? 0}</strong>
        </p>
        <Input
          label="New Stock"
          inputMode="numeric"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          error={stockError}
        />
        {newStock !== null && product && newStock !== product.stock && (
          <p className={diff > 0 ? "stock-hint" : "stock-hint stock-hint--out"}>
            {diff > 0 ? `+${diff} units in` : `${diff} units out`}
          </p>
        )}
        <Select
          label="Reason"
          options={REASONS.map((r) => ({ value: r, label: r }))}
          value={reason}
          onChange={(v) => {
            setReason(v);
            if (v !== "Other") setOther("");
          }}
          placeholder="Select reason..."
        />
        {reason === "Other" && (
          <Input
            label="Other reason"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="e.g. free sample given away"
          />
        )}
      </form>
    </Modal>
  );
}
