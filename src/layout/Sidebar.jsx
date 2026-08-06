import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutGrid, PackagePlus, ClipboardList, FileText, X } from "lucide-react";

const NAV_ITEMS = [
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/orders/new", label: "New order", icon: PackagePlus },
  { to: "/invoices", label: "Invoices", icon: FileText },
];

export default function Sidebar({ open, onClose }) {
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
        transition-transform duration-200 lg:static lg:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-500 font-display font-extrabold text-ink-950">
              D
            </span>
            <div className="leading-tight">
              <p className="font-display text-sm font-bold text-white">Digident</p>
              <p className="text-[11px] text-mist-300 tracking-wide">Order Console</p>
            </div>
          </div>
          <button
            className="lg:hidden text-mist-300 hover:text-white"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-mist-300/70">
            Sales
          </p>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/orders"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-teal-500/15 text-teal-400"
                    : "text-mist-300 hover:bg-white/5 hover:text-white"
                }`
              }
              onClick={onClose}
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
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
