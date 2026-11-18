/**
 * URL -> page table. Every logged-in page sits inside ProtectedRoute and DashboardLayout.
 *
 * Every <Route> in the app is defined here — nowhere else.
 *
 * Used by: App.jsx
 */

import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import DashboardLayout from "../components/layout/DashboardLayout";
import OrdersListPage from "../pages/OrdersListPage";
import CreateOrderPage from "../pages/CreateOrderPage";
import InvoiceListPage from "../pages/InvoiceListPage";
import CreateInvoicePage from "../pages/CreateInvoicePage";
import AnalyticsPage from "../pages/AnalyticsPage";
import CustomerLedgerPage from "../pages/CustomerLedgerPage";
import CreditNotesPage from "../pages/CreditNotesPage";
import CustomerDetailPage from "../pages/CustomerDetailPage";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/orders" element={<OrdersListPage />} />
        <Route path="/orders/new" element={<CreateOrderPage />} />
        <Route path="/invoices" element={<InvoiceListPage />} />
        <Route path="/invoices/create" element={<CreateInvoicePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/customer-ledger" element={<CustomerLedgerPage />} />
        <Route path="/customers/:phone" element={<CustomerDetailPage />} />
        <Route path="/credit-notes" element={<CreditNotesPage />} />
        <Route path="/" element={<Navigate to="/orders" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/orders" replace />} />
    </Routes>
  );
}
