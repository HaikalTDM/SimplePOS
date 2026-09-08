import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { IconCheck, IconChevronDown } from "./icons";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function Select({
  label,
  options,
  value,
  onChange,
  error,
  placeholder = "Select...",
  disabled = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const listId = useId();
  const labelId = useId();
  const errorId = useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const openList = () => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const selectOption = (index: number) => {
    onChange(options[index].value);
    close();
  };

  useEffect(() => {
    if (!open) return;
    const el = optionRefs.current[activeIndex];
    el?.focus();
    el?.scrollIntoView?.({ block: "nearest" });
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const onTriggerKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open) close();
      else openList();
    }
  };

  const onListKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      selectOption(activeIndex);
      return;
    }
    let next: number | null = null;
    if (e.key === "ArrowDown") next = (activeIndex + 1) % options.length;
    else if (e.key === "ArrowUp") next = (activeIndex - 1 + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    if (next !== null) {
      e.preventDefault();
      setActiveIndex(next);
    }
  };

  return (
    <div className="select" ref={rootRef}>
      {label && (
        <span className="input-label" id={labelId}>
          {label}
        </span>
      )}
      <button
        ref={triggerRef}
        type="button"
        className="select__trigger"
        role="combobox"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={label ? labelId : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={selected ? "select__value" : "select__value select__value--placeholder"}>
          {selected ? selected.label : placeholder}
        </span>
        <IconChevronDown size={18} className="select__chevron" />
      </button>
      {error && (
        <p className="input-error" id={errorId} role="alert">
          {error}
        </p>
      )}
      {open && (
        <div id={listId} role="listbox" className="select__popup" onKeyDown={onListKeyDown}>
          {options.map((option, i) => (
            <div
              key={option.value}
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
              role="option"
              aria-selected={option.value === value}
              tabIndex={-1}
              className={[
                "select__option",
                i === activeIndex ? "select__option--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => selectOption(i)}
            >
              <span>{option.label}</span>
              {option.value === value && <IconCheck size={16} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
