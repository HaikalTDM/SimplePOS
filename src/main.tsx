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
import { ToastProvider } from "./components";
import AppGate from "./components/AppGate";
import { StallProvider } from "./contexts/StallContext";
import { ProductsProvider } from "./contexts/ProductsContext";
import { CartProvider } from "./contexts/CartContext";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AppGate>
          <StallProvider>
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
