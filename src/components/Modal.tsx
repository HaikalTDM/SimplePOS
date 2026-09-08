import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { IconClose } from "./icons";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  footer?: ReactNode;
}

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function getFocusable(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (node) => !(node instanceof HTMLButtonElement) || !node.disabled
  );
}

export default function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      setRender(true);
      setClosing(false);
    } else {
      setClosing(true);
      const t = setTimeout(() => setRender(false), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (open && render) {
      previousFocus.current = document.activeElement as HTMLElement | null;
      const panel = panelRef.current;
      if (panel) {
        const first = getFocusable(panel)[0];
        (first ?? panel).focus();
      }
    } else if (!open && previousFocus.current) {
      previousFocus.current.focus();
      previousFocus.current = null;
    }
  }, [open, render]);

  useEffect(() => {
    if (!render) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [render]);

  useEffect(() => {
    if (!open) return;
    const onDocKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onDocKeyDown);
    return () => document.removeEventListener("keydown", onDocKeyDown);
  }, [open, onClose]);

  if (!render) return null;

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const panel = panelRef.current;
    const focusable = getFocusable(panel);
    if (focusable.length === 0) {
      e.preventDefault();
      panel.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className={closing ? "modal-overlay modal-overlay--closing" : "modal-overlay"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-panel__header">
          <h2 id={titleId} className="modal-panel__title">
            {title}
          </h2>
          <button
            type="button"
            className="modal-panel__close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <IconClose size={18} />
          </button>
        </div>
        {children && <div className="modal-panel__body">{children}</div>}
        {footer && <div className="modal-panel__footer">{footer}</div>}
      </div>
    </div>
  );
}
