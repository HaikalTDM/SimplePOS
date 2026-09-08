import { useEffect, useState } from "react";
import type { Currency, Product } from "../types";
import type { ProductInput } from "../lib/validation/product";
import { minorUnitsToInput, parseMoneyInput } from "../utils/currency";
import { Input, KeycapButton, Modal, Toggle } from "./index";

export interface ProductFormModalProps {
  open: boolean;
  /** null = add mode, a product = edit mode. */
  product?: Product | null;
  currency: Currency;
  saving: boolean;
  onClose: () => void;
  onSave: (input: ProductInput) => Promise<void>;
}

export default function ProductFormModal({
  open,
  product,
  currency,
  saving,
  onClose,
  onSave,
}: ProductFormModalProps) {
  const isEdit = product != null;
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("10");
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<{
    name?: string;
    price?: string;
    cost?: string;
    stock?: string;
  }>({});

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? "");
    setPrice(product ? minorUnitsToInput(product.sellingPrice, currency) : "");
    setCost(
      product && product.costPrice !== null
        ? minorUnitsToInput(product.costPrice, currency)
        : ""
    );
    setCategory(product?.category ?? "");
    setStock("10");
    setActive(product?.active ?? true);
    setErrors({});
  }, [open, product, currency]);

  const validate = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Product name is required";
    if (parseMoneyInput(price, currency) === null) next.price = "Enter a valid price";
    if (cost.trim() !== "" && parseMoneyInput(cost, currency) === null) {
      next.cost = "Enter a valid price";
    }
    if (!isEdit && !/^\d+$/.test(stock.trim())) next.stock = "Enter a whole number";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    await onSave({
      name: name.trim(),
      sellingPrice: parseMoneyInput(price, currency)!,
      costPrice: cost.trim() === "" ? null : parseMoneyInput(cost, currency),
      stock: isEdit ? product!.stock : Number.parseInt(stock.trim(), 10),
      category: category.trim() === "" ? null : category.trim(),
      active,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Product" : "Add Product"}
      footer={
        <>
          <KeycapButton variant="neutral" disabled={saving} onClick={onClose}>
            Cancel
          </KeycapButton>
          <KeycapButton variant="primary" loading={saving} onClick={() => void submit()}>
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
        <Input
          label="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <Input
          label="Selling Price"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          error={errors.price}
        />
        <Input
          label="Cost Price (optional)"
          inputMode="decimal"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          error={errors.cost}
        />
        <Input
          label="Category (optional)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        {!isEdit && (
          <Input
            label="Initial Stock"
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            error={errors.stock}
          />
        )}
        {isEdit && <Toggle checked={active} onChange={setActive} label="Active" />}
      </form>
    </Modal>
  );
}
