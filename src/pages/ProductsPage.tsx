import { useEffect, useMemo, useState } from "react";
import type { Product } from "../types";
import type { ProductInput } from "../lib/validation/product";
import { formatMoney } from "../utils/currency";
import {
  Badge,
  EmptyState,
  IconAdjust,
  IconClear,
  IconEdit,
  IconPlus,
  IconPower,
  IconProducts,
  IconSearch,
  IconTag,
  IconTrash,
  Input,
  KeycapButton,
  ManageCategoriesModal,
  Modal,
  useToast,
} from "../components";
import { useStall } from "../contexts/StallContext";
import { soldProductIdSet, useProducts } from "../contexts/ProductsContext";
import { iconForKey } from "../components/categoryIcons";
import ProductFormModal from "../components/ProductFormModal";
import StockAdjustModal from "../components/StockAdjustModal";

const SAVE_ERROR = "We couldn't save your changes. Your data has not been cleared.";

export default function ProductsPage() {
  const { stall } = useStall();
  const currency = stall?.currency ?? "MYR";
  const threshold = stall?.lowStockThreshold ?? 10;
  const {
    products,
    categories,
    loading,
    addProduct,
    updateProduct,
    adjustStock,
    deactivateProduct,
    reactivateProduct,
    deleteProduct,
    addCategory,
  } = useProducts();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [soldIds, setSoldIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    soldProductIdSet()
      .then((set) => {
        if (!cancelled) setSoldIds(set);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [products.length]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...products]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((p) => q === "" || p.name.toLowerCase().includes(q));
  }, [products, search]);

  const stockBadge = (p: Product) => {
    if (p.stock === 0) return <Badge variant="error">OUT OF STOCK</Badge>;
    if (p.stock < 5) return <Badge variant="accent">Very low</Badge>;
    if (p.stock <= threshold) return <Badge variant="neutral">Low</Badge>;
    return null;
  };

  const iconByCategory = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const c of categories) map.set(c.name, c.icon ?? null);
    return map;
  }, [categories]);

  const handleAdd = async (input: ProductInput) => {
    setSaving(true);
    try {
      await addProduct(input);
      setFormOpen(false);
      setEditing(null);
      toast({ message: "Product added", variant: "success" });
    } catch {
      toast({ message: SAVE_ERROR, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id: string, input: ProductInput) => {
    setSaving(true);
    try {
      await updateProduct(id, {
        name: input.name,
        sellingPrice: input.sellingPrice,
        costPrice: input.costPrice,
        category: input.category,
        active: input.active,
      });
      setFormOpen(false);
      setEditing(null);
      toast({ message: "Product updated", variant: "success" });
    } catch {
      toast({ message: SAVE_ERROR, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p: Product) => {
    setSaving(true);
    try {
      if (p.active) await deactivateProduct(p.id);
      else await reactivateProduct(p.id);
      toast({
        message: p.active ? `${p.name} deactivated` : `${p.name} activated`,
        variant: "success",
      });
    } catch {
      toast({ message: SAVE_ERROR, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleAdjust = async (newStock: number, reason: string) => {
    if (!adjusting) return;
    const oldStock = adjusting.stock;
    setSaving(true);
    try {
      await adjustStock(adjusting.id, newStock, reason);
      toast({ message: `Stock updated: ${oldStock} → ${newStock}`, variant: "success" });
      setAdjusting(null);
    } catch {
      toast({ message: SAVE_ERROR, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await deleteProduct(deleting.id);
      setDeleting(null);
    } catch {
      toast({ message: SAVE_ERROR, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="products-page">
      <div className="products-header">
        <h1 className="products-title">Products</h1>
        <div className="products-header__actions">
          <KeycapButton
            variant="neutral"
            onClick={() => setCategoriesOpen(true)}
          >
            <IconTag size={18} />
            Categories
          </KeycapButton>
          <KeycapButton
            variant="gold"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <IconPlus size={18} />
            Add Product
          </KeycapButton>
        </div>
      </div>

      <div className="products-search">
        <IconSearch size={18} className="products-search__icon" />
        <Input
          className="products-search__input"
          aria-label="Search products"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search !== "" && (
          <button
            type="button"
            className="products-search__clear"
            aria-label="Clear search"
            onClick={() => setSearch("")}
          >
            <IconClear size={16} />
          </button>
        )}
      </div>

      {!loading && products.length === 0 && (
        <EmptyState
          icon={<IconProducts size={28} />}
          title="No products yet."
          message="Add your first product to start selling."
          action={
            <KeycapButton
              variant="gold"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <IconPlus size={18} />
              Add Product
            </KeycapButton>
          }
        />
      )}

      {!loading && products.length > 0 && visible.length === 0 && (
        <EmptyState
          icon={<IconSearch size={28} />}
          title="No products match your search."
        />
      )}

      {visible.length > 0 && (
        <div className="products-grid">
          {visible.map((p) => {
            const iconKey = p.category ? iconByCategory.get(p.category) ?? null : null;
            const Glyph = iconForKey(iconKey);
            return (
            <article
              key={p.id}
              className={p.active ? "products-card" : "products-card products-card--inactive"}
            >
              <div className="products-card__top">
                {Glyph && (
                  <span className="products-card__glyph" aria-hidden="true">
                    <Glyph size={18} />
                  </span>
                )}
                <h2 className="products-card__name">{p.name}</h2>
                {p.category && <Badge variant="neutral">{p.category}</Badge>}
                {!p.active && <Badge variant="neutral">Inactive</Badge>}
              </div>
              <p className="products-card__price">{formatMoney(p.sellingPrice, currency)}</p>
              <p className="products-card__stock">
                Stock: {p.stock}
                {stockBadge(p)}
              </p>
              <div className="products-card__actions">
                <button
                  type="button"
                  className="products-card__action"
                  aria-label={`Edit ${p.name}`}
                  onClick={() => {
                    setEditing(p);
                    setFormOpen(true);
                  }}
                >
                  <IconEdit size={18} />
                </button>
                <button
                  type="button"
                  className="products-card__action"
                  aria-label={`Adjust stock for ${p.name}`}
                  onClick={() => setAdjusting(p)}
                >
                  <IconAdjust size={18} />
                </button>
                <button
                  type="button"
                  className="products-card__action"
                  aria-label={p.active ? `Deactivate ${p.name}` : `Reactivate ${p.name}`}
                  onClick={() => void handleToggle(p)}
                >
                  <IconPower size={18} />
                </button>
                {!soldIds.has(p.id) && (
                  <button
                    type="button"
                    className="products-card__action products-card__action--danger"
                    aria-label={`Delete ${p.name}`}
                    onClick={() => setDeleting(p)}
                  >
                    <IconTrash size={18} />
                  </button>
                )}
              </div>
            </article>
            );
          })}
        </div>
      )}

      <ProductFormModal
        open={formOpen}
        product={editing}
        currency={currency}
        categories={categories.map((c) => c.name)}
        saving={saving}
        onClose={() => setFormOpen(false)}
        onSave={(input) =>
          editing ? handleEdit(editing.id, input) : handleAdd(input)
        }
        onAddCategory={async (name) => {
          await addCategory(name);
        }}
      />

      <ManageCategoriesModal
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
      />

      <StockAdjustModal
        open={adjusting !== null}
        product={adjusting}
        saving={saving}
        onClose={() => setAdjusting(null)}
        onSave={handleAdjust}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete product?"
        footer={
          <>
            <KeycapButton variant="neutral" disabled={saving} onClick={() => setDeleting(null)}>
              Cancel
            </KeycapButton>
            <KeycapButton variant="danger" loading={saving} onClick={() => void handleDelete()}>
              Delete
            </KeycapButton>
          </>
        }
      >
        <p className="products-confirm">
          This will permanently remove {deleting?.name}. This can't be undone.
        </p>
      </Modal>
    </div>
  );
}
