import { useEffect, useState } from "react";
import { useSession } from "../contexts/SessionContext";
import { useStall } from "../contexts/StallContext";
import { parseMoneyInput } from "../utils/currency";
import { Input, KeycapButton, Modal, useToast } from "./index";

export interface StartSessionModalProps {
  open: boolean;
  onClose: () => void;
}

/** "Start Sale" — opens the register for the day with an optional cash float. */
export default function StartSessionModal({ open, onClose }: StartSessionModalProps) {
  const { stall } = useStall();
  const currency = stall?.currency ?? "MYR";
  const { startSession } = useSession();
  const { toast } = useToast();
  const [cash, setCash] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCash("");
      setError(undefined);
      setSaving(false);
    }
  }, [open]);

  const submit = async () => {
    const raw = cash.trim();
    const value = raw === "" ? null : parseMoneyInput(raw, currency);
    if (raw !== "" && value === null) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await startSession(value, currency);
      toast({ message: "Day started — happy selling!", variant: "success" });
      onClose();
    } catch (err) {
      toast({
        message: err instanceof Error ? err.message : "Couldn't start the day",
        variant: "error",
      });
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Start sale"
      footer={
        <>
          <KeycapButton variant="neutral" disabled={saving} onClick={onClose}>
            Cancel
          </KeycapButton>
          <KeycapButton variant="gold" loading={saving} onClick={() => void submit()}>
            Start Sale
          </KeycapButton>
        </>
      }
    >
      <p className="session-modal__intro">
        Open the register for today. You can note the cash already in the drawer
        so the close-out can check it later.
      </p>
      <Input
        label="Opening cash (optional)"
        inputMode="decimal"
        placeholder="e.g., 50.00"
        value={cash}
        onChange={(e) => {
          setCash(e.target.value);
          setError(undefined);
        }}
        error={error}
      />
    </Modal>
  );
}
