export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export default function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <label className="toggle-row">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className="toggle"
        onClick={() => onChange(!checked)}
      >
        <span className="toggle__knob" aria-hidden="true" />
      </button>
      {label && <span className="toggle__label">{label}</span>}
    </label>
  );
}
