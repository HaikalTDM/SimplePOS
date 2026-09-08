import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  Badge,
  Card,
  IconCard,
  IconCash,
  IconClose,
  IconQr,
  IconUpload,
  KeycapButton,
  Toggle,
  useToast,
} from "../../components";

export interface PaymentDraft {
  cash: boolean;
  qrOn: boolean;
  cardOn: boolean;
  qrImage: Blob | null;
}

interface PaymentStepProps {
  draft: PaymentDraft;
  onDraft: (patch: Partial<PaymentDraft>) => void;
  onFinish: () => void;
  saving: boolean;
}

const MAX_QR_BYTES = 2 * 1024 * 1024;
const QR_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function PaymentStep({ draft, onDraft, onFinish, saving }: PaymentStepProps) {
  const [guardError, setGuardError] = useState("");
  const { toast } = useToast();

  const previewUrl = useMemo(() => {
    if (!draft.qrImage || typeof URL.createObjectURL !== "function") return null;
    return URL.createObjectURL(draft.qrImage);
  }, [draft.qrImage]);

  useEffect(() => {
    if (previewUrl && typeof URL.revokeObjectURL === "function") {
      return () => URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

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
    onDraft({ qrImage: file });
  };

  const submit = () => {
    // §10: at least one payment method must remain enabled. Cash is always
    // enabled (not toggleable), so this can't be violated — but keep the guard.
    if (!draft.cash && !draft.qrOn && !draft.cardOn) {
      setGuardError("At least one payment method must stay enabled");
      return;
    }
    setGuardError("");
    onFinish();
  };

  return (
    <section>
      <h2 className="onboarding__title">Payment methods</h2>
      <p className="onboarding__subtitle">You can change these anytime in settings</p>
      <Card className="pay-card">
        <div className="pay-card__row">
          <span className="pay-card__icon" aria-hidden="true">
            <IconCash size={20} />
          </span>
          <div className="pay-card__main">
            <p className="pay-card__name">Cash</p>
            <p className="pay-card__note">Always available</p>
          </div>
          <Badge variant="success">Enabled</Badge>
        </div>
        <div className="pay-card__row">
          <span className="pay-card__icon" aria-hidden="true">
            <IconQr size={20} />
          </span>
          <div className="pay-card__main">
            <p className="pay-card__name">QR</p>
          </div>
          <Toggle
            checked={draft.qrOn}
            onChange={(on) => onDraft({ qrOn: on })}
            label="QR payments"
          />
        </div>
        {draft.qrOn && (
          <div className="qr-upload">
            {draft.qrImage && (
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
              {draft.qrImage ? "Replace QR image" : "Upload QR image"}
            </label>
            {draft.qrImage && (
              <button
                type="button"
                className="qr-upload__remove"
                aria-label="Remove QR image"
                onClick={() => onDraft({ qrImage: null })}
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
            checked={draft.cardOn}
            onChange={(on) => onDraft({ cardOn: on })}
            label="Card payments"
          />
        </div>
      </Card>
      {guardError && (
        <p className="input-error" role="alert">
          {guardError}
        </p>
      )}
      <div className="onboarding__actions">
        <KeycapButton variant="gold" size="lg" loading={saving} onClick={submit}>
          Let&apos;s go!
        </KeycapButton>
      </div>
    </section>
  );
}
