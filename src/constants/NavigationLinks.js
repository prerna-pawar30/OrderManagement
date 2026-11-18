/**
 * Sidebar menu entries (label, icon, route).
 *
 * The sidebar is built from this array. To add, rename or remove a menu item,
 * edit this file only — no JSX changes needed.
 *
 * Used by: components/layout/Sidebar.jsx
 */

import { PackagePlus, ClipboardList, FileText, BarChart3, Wallet, Receipt } from "lucide-react";

export const NAVIGATION_LINKS = [
  { label: "Analytics", path: "/analytics", icon: BarChart3, exact: false },
  { label: "Orders", path: "/orders", icon: ClipboardList, exact: true },
  { label: "New order", path: "/orders/new", icon: PackagePlus, exact: false },
  { label: "Invoices", path: "/invoices", icon: FileText, exact: false },
  { label: "Customer ledger", path: "/customer-ledger", icon: Wallet, exact: false },
  { label: "Credit notes", path: "/credit-notes", icon: Receipt, exact: false },
];
