import { useState } from "react";
import type { Currency, Product } from "../../types";
import { openDatabase, productsDb } from "../../lib/db";
import { newId } from "../../utils/id";
import { parseMoneyInput } from "../../utils/currency";
import { Input, KeycapButton, useToast } from "../../components";

interface ProductsStepProps {
  currency: Currency;
  onDone: () => void;
}

const SAVE_ERROR = "We couldn't save your changes. Your data has not been cleared.";

export default function ProductsStep({ currency, onDone }: ProductsStepProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("10");
  const [addedCount, setAddedCount] = useState(0);
  const [errors, setErrors] = useState<{
    name?: string;
    price?: string;
    cost?: string;
    stock?: string;
  }>({});
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const hasInput = name.trim() !== "" || price.trim() !== "" || cost.trim() !== "";

  const validate = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Product name is required";
    if (parseMoneyInput(price, currency) === null) next.price = "Enter a valid price";
    if (cost.trim() !== "" && parseMoneyInput(cost, currency) === null) {
      next.cost = "Enter a valid price";
    }
    if (!/^\d+$/.test(stock.trim())) next.stock = "Enter a whole number";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveCurrent = async () => {
    const db = await openDatabase();
    const now = new Date().toISOString();
    const product: Product = {
      id: newId(),
      name: name.trim(),
      sellingPrice: parseMoneyInput(price, currency)!,
      costPrice: cost.trim() === "" ? null : parseMoneyInput(cost, currency),
      stock: Number.parseInt(stock.trim(), 10),
      category: null,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    await productsDb.put(db, product);
  };

  const handleYes = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      await saveCurrent();
      setAddedCount((n) => n + 1);
      toast({ message: `${name.trim()} added`, variant: "success" });
      setName("");
      setPrice("");
      setCost("");
      setStock("10");
      setErrors({});
    } catch {
      toast({ message: SAVE_ERROR, variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  const handleDone = async () => {
    if (hasInput) {
      if (!validate()) return;
      setBusy(true);
      try {
        await saveCurrent();
        setAddedCount((n) => n + 1);
      } catch {
        toast({ message: SAVE_ERROR, variant: "error" });
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    onDone();
  };

  return (
    <section>
      <h2 className="onboarding__title">Add your products (optional)</h2>
      <p className="onboarding__subtitle">
        Add your top 3–5 items now, or add them later from the POS
      </p>
      <form
        className="onboarding__form"
        onSubmit={(e) => {
          e.preventDefault();
          void handleDone();
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
          label="Initial Stock"
          inputMode="numeric"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          error={errors.stock}
        />
        <div className="onboarding__actions">
          {addedCount > 0 && <span className="onboarding__added">Add another?</span>}
          <KeycapButton variant="primary" disabled={busy} onClick={() => void handleYes()}>
            Yes
          </KeycapButton>
          <KeycapButton variant="gold" disabled={busy} onClick={() => void handleDone()}>
            Done
          </KeycapButton>
          <KeycapButton variant="ghost" className="onboarding__skip" onClick={onDone}>
            Skip for now
          </KeycapButton>
        </div>
      </form>
      {addedCount > 0 && <p className="onboarding__added">{addedCount} added</p>}
    </section>
  );
}
