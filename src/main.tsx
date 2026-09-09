import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "./styles/variables.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/onboarding.css";
import "./styles/products.css";
import "./styles/sales.css";
import "./styles/expenses.css";
import "./styles/settings.css";
import { ToastProvider } from "./components";
import AppGate from "./components/AppGate";
import ThemeApplier from "./components/ThemeApplier";
import { StallProvider } from "./contexts/StallContext";
import { ProductsProvider } from "./contexts/ProductsContext";
import { CartProvider } from "./contexts/CartContext";
import App from "./App";
import { playClick, playPop, soundEnabled } from "./lib/sound";

// Mechanical keycap feedback: every tactile control "clicks"; tapping a
// product card gives a softer satisfying "pop". Sound is opt-out via
// Settings → Appearance → Key sounds (stored in localStorage).
function initKeySounds() {
  if (typeof document === "undefined") return;
  const soundFor = (el: Element | null): "click" | "pop" | null => {
    if (!el || !soundEnabled()) return null;
    if (el.closest(".product-card")) return "pop";
    if (el.closest("button, a.keycap-btn, [role='button']")) return "click";
    return null;
  };
  document.addEventListener(
    "pointerdown",
    (e) => {
      const kind = soundFor(e.target as Element);
      if (kind === "click") playClick();
      else if (kind === "pop") playPop();
    },
    true,
  );
  // Keyboard activation fires a synthetic click (detail === 0) with no pointer.
  document.addEventListener(
    "click",
    (e) => {
      if (e.detail !== 0) return;
      const kind = soundFor(e.target as Element);
      if (kind === "click") playClick();
      else if (kind === "pop") playPop();
    },
    true,
  );
}
initKeySounds();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AppGate>
          <StallProvider>
            <ThemeApplier />
            <ProductsProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </ProductsProvider>
          </StallProvider>
        </AppGate>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);
