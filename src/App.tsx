import { Navigate, Route, Routes } from "react-router-dom";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import PosPage from "./pages/PosPage";
import ProductsPage from "./pages/ProductsPage";
import SalesPage from "./pages/SalesPage";
import SaleDetailPage from "./pages/SaleDetailPage";
import ExpensesPage from "./pages/ExpensesPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/pos" replace />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/pos" element={<PosPage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/sales" element={<SalesPage />} />
      <Route path="/sales/:id" element={<SaleDetailPage />} />
      <Route path="/expenses" element={<ExpensesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}
