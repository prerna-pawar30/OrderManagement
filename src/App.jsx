import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./layout/DashboardLayout";
import OrdersListPage from "./pages/OrdersListPage";
import CreateOrderPage from "./pages/CreateOrderPage";
import InvoiceListPage from "./pages/invoices/InvoiceListPage";
import CreateInvoicePage from "./pages/CreateInvoicePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CustomerLedgerPage from "./pages/CustomerLedgerPage";
import CreditNotesPage from "./pages/CreditNotesPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
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
