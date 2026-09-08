import { useState } from "react";
import type { Currency } from "../../types";
import { CURRENCIES } from "../../utils/currency";
import { Input, KeycapButton, Select } from "../../components";

export interface StallDraft {
  name: string;
  currency: Currency;
  businessType: string;
}

interface StallStepProps {
  draft: StallDraft;
  onDraft: (patch: Partial<StallDraft>) => void;
  onNext: () => void;
}

const BUSINESS_TYPES = ["Food & Beverage", "Retail", "Services", "Other"];

export default function StallStep({ draft, onDraft, onNext }: StallStepProps) {
  const [errors, setErrors] = useState<{ name?: string; businessType?: string }>({});

  const submit = () => {
    const next: typeof errors = {};
    const name = draft.name.trim();
    if (!name) next.name = "Stall name is required";
    else if (name.length > 50) next.name = "Maximum 50 characters";
    if (!draft.businessType) next.businessType = "Business type is required";
    setErrors(next);
    if (Object.keys(next).length === 0) onNext();
  };

  return (
    <section>
      <h2 className="onboarding__title">Let&apos;s set up your stall</h2>
      <form
        className="onboarding__form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
      >
        <Input
          label="Stall Name"
          placeholder="e.g., YayaCake, Local Coffee, Rein's Boutique"
          maxLength={50}
          autoComplete="organization"
          value={draft.name}
          onChange={(e) => onDraft({ name: e.target.value })}
          error={errors.name}
        />
        <Select
          label="Currency"
          options={(Object.keys(CURRENCIES) as Currency[]).map((code) => ({
            value: code,
            label: code,
          }))}
          value={draft.currency}
          onChange={(v) => onDraft({ currency: v as Currency })}
        />
        <Select
          label="Business Type"
          options={BUSINESS_TYPES.map((t) => ({ value: t, label: t }))}
          value={draft.businessType}
          onChange={(v) => onDraft({ businessType: v })}
          error={errors.businessType}
          placeholder="Select business type"
        />
        <div className="onboarding__actions">
          <KeycapButton variant="gold" type="submit">
            Next
          </KeycapButton>
        </div>
      </form>
    </section>
  );
}
