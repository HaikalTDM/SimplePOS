import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Stall } from "../types";
import { openDatabase, stallDb } from "../lib/db";
import { newId } from "../utils/id";
import { IconCheck, useToast } from "../components";
import StallStep from "./onboarding/StallStep";
import type { StallDraft } from "./onboarding/StallStep";
import ProductsStep from "./onboarding/ProductsStep";
import PaymentStep from "./onboarding/PaymentStep";
import type { PaymentDraft } from "./onboarding/PaymentStep";

const STEP_COUNT = 3;

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [stallDraft, setStallDraft] = useState<StallDraft>({
    name: "",
    currency: "MYR",
    businessType: "",
  });
  const [payment, setPayment] = useState<PaymentDraft>({
    cash: true,
    qrOn: false,
    cardOn: false,
    qrImage: null,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const finish = async (draft: PaymentDraft) => {
    setSaving(true);
    try {
      const db = await openDatabase();
      const now = new Date().toISOString();
      const stall: Stall = {
        id: newId(),
        name: stallDraft.name.trim(),
        currency: stallDraft.currency,
        businessType: stallDraft.businessType,
        paymentMethods: {
          cash: true,
          qr: { enabled: draft.qrOn, image: draft.qrImage },
          card: draft.cardOn,
        },
        lowStockThreshold: 10,
        onboardingCompletedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      await stallDb.put(db, stall);
      toast({ message: `Welcome to ${stall.name} POS!`, variant: "success" });
      navigate("/pos");
    } catch {
      toast({
        message: "We couldn't save your changes. Your data has not been cleared.",
        variant: "error",
      });
      setSaving(false);
    }
  };

  return (
    <main className="onboarding">
      <div className="onboarding__inner">
        <header className="onboarding__header">
          <h1 className="onboarding__brand">SimplePOS</h1>
          <div className="onboarding__steps">
            <span className="onboarding__steps-text" aria-live="polite">
              Step {step + 1} of {STEP_COUNT}
            </span>
            <div className="onboarding__dots" aria-hidden="true">
              {Array.from({ length: STEP_COUNT }, (_, i) => (
                <span
                  key={i}
                  className={[
                    "onboarding__dot",
                    i < step ? "onboarding__dot--done" : "",
                    i === step ? "onboarding__dot--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {i < step && <IconCheck size={10} />}
                </span>
              ))}
            </div>
          </div>
        </header>
        {step === 0 && (
          <StallStep
            draft={stallDraft}
            onDraft={(patch) => setStallDraft((d) => ({ ...d, ...patch }))}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <ProductsStep currency={stallDraft.currency} onDone={() => setStep(2)} />
        )}
        {step === 2 && (
          <PaymentStep
            draft={payment}
            onDraft={(patch) => setPayment((d) => ({ ...d, ...patch }))}
            onFinish={() => void finish(payment)}
            saving={saving}
          />
        )}
      </div>
    </main>
  );
}
