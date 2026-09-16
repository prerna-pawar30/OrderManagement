import React from "react";
import { NavLink } from "react-router-dom";
import {
  PackagePlus,
  ClipboardList,
  FileText,
  BarChart3,
  Wallet,
  Receipt,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import digidentLogo from "../assets/digident-png 2.png";

const NAV_ITEMS = [
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/orders/new", label: "New order", icon: PackagePlus },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/customer-ledger", label: "Customer ledger", icon: Wallet },
  { to: "/credit-notes", label: "Credit notes", icon: Receipt },
];

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink-950/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed z-40 inset-y-0 left-0 w-64 shrink-0 bg-ink-950 text-mist-100 flex flex-col
        transition-all duration-200 lg:static lg:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}
        ${collapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        <div className={`flex items-center h-16 border-b border-white/10 ${collapsed ? "lg:justify-center lg:px-2" : "justify-between px-6"}`}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white p-1">
              <img src={digidentLogo} alt="Digident" className="h-full w-full object-contain" />
            </span>
            <div className={`leading-tight min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
              <p className="font-display text-sm font-bold text-white truncate">Digident</p>
              <p className="text-[11px] text-mist-300 tracking-wide truncate">Order Console</p>
            </div>
          </div>
          <button
            className={`lg:hidden text-mist-300 hover:text-white ${collapsed ? "hidden" : ""}`}
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          <p className={`px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-mist-300/70 ${collapsed ? "lg:hidden" : ""}`}>
            Sales
          </p>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/orders"}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  collapsed ? "lg:justify-center" : ""
                } ${
                  isActive
                    ? "bg-orange-500/15 text-orange-400"
                    : "text-mist-300 hover:bg-white/5 hover:text-white"
                }`
              }
              onClick={onClose}
            >
              <Icon size={17} strokeWidth={2} className="shrink-0" />
              <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center gap-2 mx-3 mb-2 rounded-lg px-3 py-2 text-xs font-medium text-mist-300 hover:bg-white/5 hover:text-white"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          <span className={collapsed ? "lg:hidden" : ""}>Collapse</span>
        </button>

        <div className={`px-4 py-4 border-t border-white/10 ${collapsed ? "lg:hidden" : ""}`}>
          <div className="rounded-xl2 bg-white/5 px-4 py-3">
            <p className="text-xs text-mist-300 leading-relaxed">
              Manual orders skip catalog checks — double-check price &amp; quantity before
              confirming payment.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
