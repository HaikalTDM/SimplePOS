import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/** Label + input + error text as one group (no floating labels). */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id: idProp, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const errorId = `${id}-error`;
  return (
    <div className="input-group">
      {label && (
        <label className="input-label" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={["input", error ? "input--error" : "", className].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
      {error && (
        <p className="input-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
