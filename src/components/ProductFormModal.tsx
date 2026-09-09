import { useEffect, useMemo, useState } from "react";
import type { Currency, Product } from "../types";
import type { ProductInput } from "../lib/validation/product";
import { minorUnitsToInput, parseMoneyInput } from "../utils/currency";
import { Input, KeycapButton, Modal, Select, Toggle } from "./index";
import type { SelectOption } from "./Select";

const ADD_NEW_CATEGORY = "__add_new_category__";

export interface ProductFormModalProps {
  open: boolean;
  /** null = add mode, a product = edit mode. */
  product?: Product | null;
  currency: Currency;
  /** Names of pre-added categories, for the category dropdown. */
  categories: string[];
  saving: boolean;
  onClose: () => void;
  onSave: (input: ProductInput) => Promise<void>;
  /** Persists a new category, then selects it. Throws when it already exists. */
  onAddCategory: (name: string) => Promise<void>;
}

export default function ProductFormModal({
  open,
  product,
  currency,
  categories,
  saving,
  onClose,
  onSave,
  onAddCategory,
}: ProductFormModalProps) {
  const isEdit = product != null;
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("10");
  const [active, setActive] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [newCatError, setNewCatError] = useState<string | undefined>();
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
    setAddingNew(false);
    setNewCategory("");
    setNewCatError(undefined);
  }, [open, product, currency]);

  /** Saved categories + the product's current one (defensive: it should
   *  already be registered by backfill, but keep it visible if not). */
  const categoryOptions = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    const push = (n: string) => {
      const key = n.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        names.push(n);
      }
    };
    for (const c of categories) push(c);
    if (isEdit && product?.category) push(product.category);
    names.sort((a, b) => a.localeCompare(b));
    return [
      { value: "", label: "No category" },
      ...names.map((n) => ({ value: n, label: n })),
      { value: ADD_NEW_CATEGORY, label: "＋ Add new category…" },
    ];
  }, [categories, isEdit, product?.category]);

  const selectCategory = (value: string) => {
    if (value === ADD_NEW_CATEGORY) {
      setNewCategory("");
      setNewCatError(undefined);
      setAddingNew(true);
      return;
    }
    setCategory(value);
  };

  const saveNewCategory = async () => {
    const name = newCategory.trim();
    if (!name) {
      setNewCatError("Category name is required");
      return;
    }
    setAddingCat(true);
    try {
      await onAddCategory(name);
      setCategory(name);
      setAddingNew(false);
      setNewCatError(undefined);
    } catch (err) {
      setNewCatError(err instanceof Error ? err.message : "Couldn't add category");
    } finally {
      setAddingCat(false);
    }
  };

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
    if (validate()) {
      await onSave({
        name: name.trim(),
        sellingPrice: parseMoneyInput(price, currency)!,
        costPrice: cost.trim() === "" ? null : parseMoneyInput(cost, currency),
        stock: isEdit ? product!.stock : Number.parseInt(stock.trim(), 10),
        category: category.trim() === "" ? null : category.trim(),
        active,
      });
    }
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
        <Select
          label="Category"
          options={categoryOptions}
          value={category}
          onChange={selectCategory}
        />
        {addingNew && (
          <div className="products-form__addcat">
            <Input
              label="New category name"
              autoFocus
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveNewCategory();
                }
              }}
              error={newCatError}
            />
            <div className="products-form__addcat-actions">
              <KeycapButton
                size="sm"
                variant="primary"
                loading={addingCat}
                disabled={saving}
                onClick={() => void saveNewCategory()}
              >
                Add
              </KeycapButton>
              <KeycapButton
                size="sm"
                variant="neutral"
                disabled={addingCat || saving}
                onClick={() => setAddingNew(false)}
              >
                Cancel
              </KeycapButton>
            </div>
          </div>
        )}
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
