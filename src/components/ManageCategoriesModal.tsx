import { useMemo, useState } from "react";
import { useProducts } from "../contexts/ProductsContext";
import { Badge, IconPlus, IconTrash, Input, KeycapButton, Modal, useToast } from "./index";

export interface ManageCategoriesModalProps {
  open: boolean;
  onClose: () => void;
}

/** §42 — pre-add and delete product categories. A category can only be
 *  deleted while no product uses it (products reference categories by name). */
export default function ManageCategoriesModal({
  open,
  onClose,
}: ManageCategoriesModalProps) {
  const { categories, products, addCategory, deleteCategory } = useProducts();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const usageByName = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  );

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Category name is required");
      return;
    }
    setBusy(true);
    try {
      await addCategory(trimmed);
      setName("");
      setError(undefined);
      toast({ message: `Category "${trimmed}" added`, variant: "success" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add category");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    setBusy(true);
    try {
      await deleteCategory(id);
      toast({ message: `Category "${label}" deleted`, variant: "success" });
    } catch (err) {
      toast({
        message: err instanceof Error ? err.message : "Couldn't delete category",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Categories">
      <p className="categories-manage__intro">
        Pre-add categories so they appear in the product form dropdown. You can
        also add a new one from the product form itself.
      </p>

      <div className="categories-manage__add">
        <Input
          label="New category"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(undefined);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleAdd();
            }
          }}
          error={error}
        />
        <KeycapButton
          variant="primary"
          loading={busy}
          onClick={() => void handleAdd()}
        >
          <IconPlus size={16} />
          Add
        </KeycapButton>
      </div>

      {sorted.length === 0 ? (
        <p className="categories-manage__empty">No categories yet.</p>
      ) : (
        <ul className="categories-manage__list">
          {sorted.map((category) => {
            const usage = usageByName.get(category.name) ?? 0;
            const inUse = usage > 0;
            return (
              <li key={category.id} className="categories-manage__row">
                <span className="categories-manage__name">{category.name}</span>
                {inUse ? (
                  <Badge variant="neutral">{usage} in use</Badge>
                ) : (
                  <span className="categories-manage__usage">not in use</span>
                )}
                <button
                  type="button"
                  className="categories-manage__delete"
                  aria-label={`Delete ${category.name}`}
                  disabled={inUse || busy}
                  title={
                    inUse
                      ? "Remove this category from its products first"
                      : "Delete category"
                  }
                  onClick={() => void handleDelete(category.id, category.name)}
                >
                  <IconTrash size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
