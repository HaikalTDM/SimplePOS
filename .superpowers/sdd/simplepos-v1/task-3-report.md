# Task 3 Report — Core UI System

Status: DONE
Commit: 47720fb

## Files created

- src/components/icons.tsx — 24 custom SVG icons (stroke currentColor, 2px, round caps, 24x24), each `(props: IconProps) => JSX.Element`; `IconProps = { size?: number; label?: string; className?: string }` (label present → role="img" + aria-label, else aria-hidden)
- src/components/KeycapButton.tsx
- src/components/Input.tsx
- src/components/Select.tsx
- src/components/Toggle.tsx
- src/components/Modal.tsx
- src/components/Card.tsx
- src/components/Badge.tsx
- src/components/EmptyState.tsx
- src/components/Toast.tsx
- src/components/Navigation.tsx (HeaderNav + MobileNav)
- src/components/index.ts — barrel (components + all prop types + `export * from "./icons"`)
- src/components/__tests__/components.test.tsx — 14 tests, 21 assertions
- src/styles/components.css — all component classes + component-derived tokens (keycap sides, tints, deep contrast text, ring/shadow), plus .sr-only (was missing from base.css)
- src/test/setup.ts — MODIFIED: added `afterEach(cleanup)` (vitest runs without globals, RTL auto-cleanup was not registered; without it renders leaked across tests)

## Exact exported prop APIs (contract for later tasks)

```ts
// KeycapButton.tsx
KeycapVariant = "primary" | "gold" | "danger" | "ghost" | "neutral"  // default "primary"
KeycapSize = "sm" | "md" | "lg"                                       // default "md"
KeycapButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: KeycapVariant; size?: KeycapSize; loading?: boolean;
}

// Input.tsx (label + input + error in one group; forwardRef)
InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string }

// Select.tsx
SelectOption = { value: string; label: string }
SelectProps { label?: string; options: SelectOption[]; value: string;
  onChange: (value: string) => void; error?: string; placeholder?: string; disabled?: boolean }

// Toggle.tsx
ToggleProps { checked: boolean; onChange: (checked: boolean) => void; label?: string; disabled?: boolean }

// Modal.tsx
ModalProps { open: boolean; onClose: () => void; title: string; children?: ReactNode; footer?: ReactNode }

// Card.tsx
CardProps { title?: string; subtitle?: string; variant?: "default" | "gold"; className?: string; children?: ReactNode }

// Badge.tsx
BadgeVariant = "neutral" | "accent" | "gold" | "success" | "error"    // default "neutral"
BadgeProps { variant?: BadgeVariant; children: ReactNode; srOnly?: string; className?: string }

// EmptyState.tsx
EmptyStateProps { icon: ReactNode; title: string; message?: string; action?: ReactNode }

// Toast.tsx
ToastVariant = "success" | "error" | "info"                           // default "info"
ToastOptions { message: string; variant?: ToastVariant }
useToast(): { toast: (options: ToastOptions) => void }                // throws outside ToastProvider
ToastProvider ({ children })
ToastHost ({ toasts: ToastItem[]; onDismiss: (id: number) => void }) // rendered inside ToastProvider
ToastItem { id: number; message: string; variant: ToastVariant; exiting?: boolean }
// success auto-dismiss 2000ms, error/info 2500ms; max 3 visible, oldest dropped

// Navigation.tsx
NavProps { stallName?: string }
HeaderNav({ stallName })   // brand "{stallName} POS by Captura" (fallback "SimplePOS"), links hidden <769px
MobileNav({ stallName })   // Home/Sell/Sales + More button → Modal bottom-sheet: Products, Expenses, Settings
```

## Tests (14 in components.test.tsx, 21 assertions)

KeycapButton (2): renders label + fires onClick; disabled blocks click + aria-disabled="true".
Select (4): opens on Enter + aria-expanded; ArrowDown+Enter selects ("sgd") + onChange; Escape closes + focus returns to trigger; click-outside closes.
Toggle (2): role=switch + aria-checked toggles via onChange; disabled blocks toggle.
Modal (2): title + aria-modal="true" + focus moves inside + restores to opener on Escape; backdrop mousedown closes.
Toast (1): message shows with .toast--success, auto-dismisses after timers (fake timers + fireEvent.click).
Input (1): error renders role="alert", aria-invalid="true", aria-describedby wired to error id.
Navigation (2): HeaderNav brand "YayaCake POS by Captura" + 6 links; MobileNav More opens sheet containing Settings.

## Commands + results

- `npm run typecheck` — PASS
- `npm run test` — PASS, 42/42 tests (7 files)
- `npm run build` — PASS (tsc -b + vite build, 42 modules, gzip 74 kB JS / 25 kB CSS, SW precache 8 entries)

## Concerns

1. RTL auto-cleanup was silently not running (vitest has no globals) — fixed in setup.ts, but earlier-test DOM pollution had masked this; any future test file gets cleanup for free now.
2. Modal focus-capture effect depends on [open, render] (panel mounts one commit after open flips) — subtle; covered by focus test.
3. Keycap press uses border-bottom-color→transparent + translateY instead of border-width 0, to avoid layout shift; visually identical to spec §14.
4. Select options are real focused elements (not aria-activedescendant) — deliberate, simpler and SR-friendly.
5. Derived shades (keycap sides, badge tints/deep text) live as local tokens in components.css — the only hex values outside variables.css; justified for AA contrast (e.g., --success-deep for badge text on tint).
6. Info toasts use a CSS dot (no info icon in the spec'd icon set).
