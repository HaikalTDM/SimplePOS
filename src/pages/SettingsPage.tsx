import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Link } from "react-router-dom";
import pkg from "../../package.json";
import type { Currency, Stall } from "../types";
import {
  openDatabase,
  resetAllData,
  saleItemsDb,
  salesDb,
  stallDb,
} from "../lib/db";
import { downloadBackup, exportBackup } from "../lib/backup/exportBackup";
import { ImportError, importBackup } from "../lib/backup/importBackup";
import { triggerDownload } from "../lib/backup/download";
import { exportSalesCsv } from "../lib/csv/salesCsv";
import { CURRENCIES } from "../utils/currency";
import { useStall } from "../contexts/StallContext";
import {
  Badge,
  Card,
  IconCard,
  IconCash,
  IconClose,
  IconDownload,
  IconExpenses,
  IconQr,
  IconTrash,
  IconUpload,
  Input,
  KeycapButton,
  Modal,
  Select,
  Toggle,
  useToast,
} from "../components";

const SAVE_ERROR = "We couldn't save your changes. Your data has not been cleared.";
const IMPORT_FAILED = "This backup could not be imported. Your existing data is unchanged.";
const MAX_QR_BYTES = 2 * 1024 * 1024;
const QR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const BUSINESS_TYPES = ["Food & Beverage", "Retail", "Services", "Other"];

/** §62/§85 — full page reload to re-run AppGate after a destructive change.
 *  Skipped under vitest: jsdom has no navigation and just logs a warning. */
function reloadAppAfterMs(ms = 1200): void {
  if (import.meta.env.MODE === "test") return;
  setTimeout(() => window.location.reload(), ms);
}

const CURRENCY_OPTIONS = (Object.keys(CURRENCIES) as Currency[]).map((code) => ({
  value: code,
  label: code,
}));

const BUSINESS_OPTIONS = BUSINESS_TYPES.map((t) => ({ value: t, label: t }));

export default function SettingsPage() {
  const { stall } = useStall();

  if (!stall) {
    return (
      <div className="page">
        <h1 className="page__title">Settings</h1>
        <p className="sales-loading">…</p>
      </div>
    );
  }

  return (
    <div className="page settings-page">
      <h1 className="page__title">Settings</h1>
      <div className="settings-stack">
        <StallSettingsSection stall={stall} />
        <PaymentMethodsSection stall={stall} />
        <StockSettingsSection stall={stall} />
        <DataBackupSection stall={stall} />
        <AboutSection />
      </div>
    </div>
  );
}

/* ---------- §52: Stall Settings ---------- */

function StallSettingsSection({ stall }: { stall: Stall }) {
  const { reload } = useStall();
  const { toast } = useToast();
  const [name, setName] = useState(stall.name);
  const [currency, setCurrency] = useState<Currency>(stall.currency);
  const [businessType, setBusinessType] = useState(stall.businessType);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(stall.name);
    setCurrency(stall.currency);
    setBusinessType(stall.businessType);
  }, [stall]);

  const save = async () => {
    const trimmed = name.trim();
    const next: typeof errors = {};
    if (!trimmed) next.name = "Stall name is required";
    else if (trimmed.length > 50) next.name = "Maximum 50 characters";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const db = await openDatabase();
      await stallDb.put(db, {
        ...stall,
        name: trimmed,
        currency,
        businessType,
        updatedAt: new Date().toISOString(),
      });
      await reload();
      toast({ message: "Settings saved", variant: "success" });
    } catch {
      toast({ message: SAVE_ERROR, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="settings-card">
      <h2 className="settings-card__title">Stall Settings</h2>
      <form
        className="settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        noValidate
      >
        <Input
          label="Stall Name"
          placeholder="e.g., YayaCake, Local Coffee, Rein's Boutique"
          maxLength={50}
          autoComplete="organization"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <Select
          label="Currency"
          options={CURRENCY_OPTIONS}
          value={currency}
          onChange={(v) => setCurrency(v as Currency)}
        />
        <Select
          label="Business Type"
          options={BUSINESS_OPTIONS}
          value={businessType}
          onChange={setBusinessType}
        />
        <div>
          <KeycapButton type="submit" loading={saving}>
            Save
          </KeycapButton>
        </div>
      </form>
    </Card>
  );
}

/* ---------- §52: Payment Methods (immediate persistence) ---------- */

function PaymentMethodsSection({ stall }: { stall: Stall }) {
  const { reload } = useStall();
  const { toast } = useToast();
  const [guardError, setGuardError] = useState("");
  const qr = stall.paymentMethods.qr;

  const previewUrl = useMemo(() => {
    if (!qr.image || typeof URL.createObjectURL !== "function") return null;
    return URL.createObjectURL(qr.image);
  }, [qr.image]);

  useEffect(() => {
    if (previewUrl && typeof URL.revokeObjectURL === "function") {
      return () => URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  const persist = async (paymentMethods: typeof stall.paymentMethods) => {
    // §10: at least one method must stay enabled. Cash is always enabled,
    // so this can't be violated — but keep the guard.
    if (!paymentMethods.cash && !paymentMethods.qr.enabled && !paymentMethods.card) {
      setGuardError("At least one payment method must stay enabled");
      return;
    }
    setGuardError("");
    try {
      const db = await openDatabase();
      await stallDb.put(db, {
        ...stall,
        paymentMethods,
        updatedAt: new Date().toISOString(),
      });
      await reload();
      toast({ message: "Payment methods updated", variant: "success" });
    } catch {
      toast({ message: SAVE_ERROR, variant: "error" });
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!QR_TYPES.includes(file.type)) {
      toast({ message: "Only PNG, JPG, or WebP images are supported", variant: "error" });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_QR_BYTES) {
      toast({ message: "Image is too large", variant: "error" });
      e.target.value = "";
      return;
    }
    void persist({ ...stall.paymentMethods, qr: { ...qr, image: file } });
  };

  return (
    <Card className="settings-card">
      <h2 className="settings-card__title">Payment Methods</h2>
      <div className="pay-card settings-pay-card">
        <div className="pay-card__row">
          <span className="pay-card__icon" aria-hidden="true">
            <IconCash size={20} />
          </span>
          <div className="pay-card__main">
            <p className="pay-card__name">Cash</p>
          </div>
          <Badge variant="success">Always available</Badge>
        </div>
        <div className="pay-card__row">
          <span className="pay-card__icon" aria-hidden="true">
            <IconQr size={20} />
          </span>
          <div className="pay-card__main">
            <p className="pay-card__name">QR</p>
          </div>
          <Toggle
            checked={qr.enabled}
            onChange={(on) =>
              void persist({ ...stall.paymentMethods, qr: { ...qr, enabled: on } })
            }
            label="QR payments"
          />
        </div>
        {qr.enabled && (
          <div className="qr-upload">
            {qr.image && (
              <img
                className="qr-upload__preview"
                src={previewUrl ?? ""}
                alt="QR image preview"
              />
            )}
            <label className="keycap-btn keycap-btn--neutral qr-upload__label">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={onFileChange}
              />
              <IconUpload size={16} />
              {qr.image ? "Replace QR image" : "Upload QR image"}
            </label>
            {qr.image && (
              <button
                type="button"
                className="qr-upload__remove"
                aria-label="Remove QR image"
                onClick={() =>
                  void persist({ ...stall.paymentMethods, qr: { ...qr, image: null } })
                }
              >
                <IconClose size={16} />
              </button>
            )}
          </div>
        )}
        <div className="pay-card__row">
          <span className="pay-card__icon" aria-hidden="true">
            <IconCard size={20} />
          </span>
          <div className="pay-card__main">
            <p className="pay-card__name">Card</p>
          </div>
          <Toggle
            checked={stall.paymentMethods.card}
            onChange={(on) =>
              void persist({ ...stall.paymentMethods, card: on })
            }
            label="Card payments"
          />
        </div>
      </div>
      {guardError && (
        <p className="input-error" role="alert">
          {guardError}
        </p>
      )}
    </Card>
  );
}

/* ---------- §52: Stock Settings ---------- */

function StockSettingsSection({ stall }: { stall: Stall }) {
  const { reload } = useStall();
  const { toast } = useToast();
  const [threshold, setThreshold] = useState(String(stall.lowStockThreshold));
  const [alertsOn, setAlertsOn] = useState(stall.lowStockAlertsEnabled ?? true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setThreshold(String(stall.lowStockThreshold));
    setAlertsOn(stall.lowStockAlertsEnabled ?? true);
  }, [stall]);

  const save = async () => {
    const parsed = /^\d+$/.test(threshold.trim()) ? Number.parseInt(threshold.trim(), 10) : null;
    if (parsed === null || parsed < 1 || parsed > 999) {
      setError("Enter a whole number between 1 and 999");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const db = await openDatabase();
      await stallDb.put(db, {
        ...stall,
        lowStockThreshold: parsed,
        lowStockAlertsEnabled: alertsOn,
        updatedAt: new Date().toISOString(),
      });
      await reload();
      toast({ message: "Settings saved", variant: "success" });
    } catch {
      toast({ message: SAVE_ERROR, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="settings-card">
      <h2 className="settings-card__title">Stock Settings</h2>
      <form
        className="settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        noValidate
      >
        <Input
          label="Low stock threshold"
          inputMode="numeric"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          error={error}
        />
        <div className="settings-alerts">
          <Toggle checked={alertsOn} onChange={setAlertsOn} label="Low stock alerts" />
        </div>
        <div>
          <KeycapButton type="submit" loading={saving}>
            Save
          </KeycapButton>
        </div>
      </form>
    </Card>
  );
}

/* ---------- §52/§85: Data & Backup ---------- */

function DataBackupSection({ stall }: { stall: Stall }) {
  const { toast } = useToast();
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExportBackup = async () => {
    setExporting(true);
    try {
      downloadBackup(await exportBackup());
      toast({ message: "Backup exported", variant: "success" });
    } catch {
      toast({ message: "Backup could not be created.", variant: "error" });
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      toast({ message: IMPORT_FAILED, variant: "error" });
      return;
    }
    setImportErrors([]);
    setImportSummary(null);
    try {
      const summary = await importBackup(text);
      setImportSummary(
        `${summary.products} products · ${summary.sales} sales · ${summary.expenses} expenses`,
      );
      toast({ message: "Import successful.", variant: "success" });
      // §62: reload application state safely.
      reloadAppAfterMs();
    } catch (err) {
      toast({ message: IMPORT_FAILED, variant: "error" });
      if (err instanceof ImportError) {
        const details = err.message.split("\n").slice(1).filter((line) => line.trim() !== "");
        if (details.length > 0 && details.length <= 5) setImportErrors(details);
      }
    }
  };

  const handleExportCsv = async () => {
    try {
      const db = await openDatabase();
      const [sales, items] = await Promise.all([
        salesDb.getAll(db),
        saleItemsDb.getAll(db),
      ]);
      if (sales.length === 0) {
        toast({ message: "No sales to export.", variant: "info" });
        return;
      }
      triggerDownload(exportSalesCsv(sales, items, stall.name, stall.currency));
      toast({ message: "Sales CSV exported", variant: "success" });
    } catch {
      toast({ message: "We couldn't export your sales.", variant: "error" });
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      const db = await openDatabase();
      await resetAllData(db);
      setDeleteOpen(false);
      toast({ message: "All data deleted", variant: "success" });
      // §85: land back on onboarding — AppGate handles the redirect.
      reloadAppAfterMs();
    } catch {
      toast({ message: "We couldn't delete your data.", variant: "error" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="settings-card">
      <h2 className="settings-card__title">Data &amp; Backup</h2>
      <div className="settings-actions">
        <KeycapButton loading={exporting} onClick={() => void handleExportBackup()}>
          <IconDownload size={18} />
          Export Backup
        </KeycapButton>
        <label className="keycap-btn keycap-btn--neutral">
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            aria-label="Import Backup"
            onChange={(e) => void handleImportFile(e)}
          />
          <IconUpload size={18} />
          Import Backup
        </label>
        <KeycapButton variant="neutral" onClick={() => void handleExportCsv()}>
          Export Sales CSV
        </KeycapButton>
        <Link to="/expenses" className="keycap-btn keycap-btn--ghost">
          <IconExpenses size={18} />
          Add Expense
        </Link>
      </div>
      {importSummary && (
        <p className="settings-import-summary" role="status">
          {importSummary}
        </p>
      )}
      {importErrors.length > 0 && (
        <ul className="settings-import-errors">
          {importErrors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
      <div className="settings-danger">
        <p className="settings-danger__title">Danger zone</p>
        <p className="settings-danger__note">
          Removes everything stored in this browser, including your backup history.
        </p>
        <KeycapButton variant="danger" onClick={() => setDeleteOpen(true)}>
          <IconTrash size={18} />
          Delete all data
        </KeycapButton>
      </div>
      <DeleteAllModal
        open={deleteOpen}
        deleting={deleting}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void handleDeleteAll()}
      />
    </Card>
  );
}

/* ---------- §85: Delete-all confirmation ---------- */

function DeleteAllModal({
  open,
  deleting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  const confirmed = typed === "DELETE";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete all data?"
      footer={
        <>
          <KeycapButton variant="neutral" disabled={deleting} onClick={onClose}>
            Cancel
          </KeycapButton>
          <KeycapButton variant="danger" disabled={!confirmed} loading={deleting} onClick={onConfirm}>
            Delete all data
          </KeycapButton>
        </>
      }
    >
      <p className="settings-delete-warning">
        This permanently removes ALL local data — products, sales, expenses, and
        settings. This cannot be undone.
      </p>
      <p className="settings-delete-note">
        Everything is stored in this browser only. Once deleted, it cannot be
        recovered.
      </p>
      <Input
        label='Type DELETE to confirm'
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
      />
    </Modal>
  );
}

/* ---------- §52/§53: About ---------- */

function AboutSection() {
  return (
    <Card className="settings-card">
      <h2 className="settings-card__title">About</h2>
      <p className="settings-about__line">SimplePOS v{pkg.version}</p>
      <p className="settings-about__line">
        Your data is stored on this device. Export a backup regularly.
      </p>
      <p className="settings-about__line settings-about__muted">
        Data can be lost if browser data is cleared, the device is reset, or you
        change devices without restoring a backup.
      </p>
      <p className="settings-about__line settings-about__muted">SimplePOS by Captura</p>
    </Card>
  );
}
