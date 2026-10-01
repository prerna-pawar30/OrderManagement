import React, { useEffect } from "react";
import { X, Phone, Mail, FileText } from "lucide-react";
import { PaymentStatusBadge, BalanceStatusBadge } from "./StatusBadge";
import { formatCurrency, formatDateTime, initials } from "../lib/format";

/**
 * Card shown when a customer row is clicked on the Customer Ledger page.
 * Renders straight from the ledger API row (customer totals + per-invoice
 * breakdown) — no extra fetch.
 * Props: customer (ledger row), onClose
 */
export default function CustomerLedgerDrawer({ customer, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sortedOrders = [...(customer.orders || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const balanceColor =
    customer.balanceStatus === "customer_owes"
      ? "text-coral-500"
      : customer.balanceStatus === "company_owes"
      ? "text-amber-500"
      : "text-mint-500";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/40" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl2 bg-mist-50 shadow-panel dark:bg-ink-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mist-200 bg-white px-6 py-5 dark:border-white/10 dark:bg-ink-900">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-ink-950 text-sm font-bold text-white">
              {initials(customer.customerName)}
            </span>
            <div>
              <p className="font-display text-base font-bold text-ink-950 dark:text-white">
                {customer.customerName}
              </p>
              <p className="flex items-center gap-1 text-xs text-mist-500 dark:text-mist-300">
                <Phone size={11} /> {customer.customerPhone}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-mist-400 hover:text-ink-950 dark:text-mist-500 dark:hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
          {customer.customerEmail && (
            <p className="mb-4 flex items-center gap-1.5 text-xs text-mist-500 dark:text-mist-300">
              <Mail size={12} /> {customer.customerEmail}
            </p>
          )}

          {/* Balance summary */}
          <div className="rounded-xl2 border border-mist-200 bg-white p-5 dark:border-white/10 dark:bg-ink-900">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-mist-700 dark:text-mist-300">Net balance</p>
              <BalanceStatusBadge status={customer.balanceStatus} />
            </div>
            <p className={`mt-1 font-display text-2xl font-bold ${balanceColor}`}>
              {formatCurrency(Math.abs(customer.netBalance || 0))}
            </p>
            <p className="mt-0.5 text-xs text-mist-500 dark:text-mist-300">
              {customer.balanceStatus === "customer_owes" && "Customer still owes this much on unpaid invoices."}
              {customer.balanceStatus === "company_owes" &&
                "Company owes this much back to the customer (unrefunded returns / cancellations)."}
              {customer.balanceStatus === "settled" && "Nothing pending either way."}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-mist-100 pt-4 sm:grid-cols-3 dark:border-white/10">
              <Stat label="Total orders" value={customer.totalOrders} />
              <Stat label="Total order value" value={formatCurrency(customer.totalOrderValue)} />
              <Stat label="Total returned" value={formatCurrency(customer.totalReturnedValue)} />
              <Stat
                label="Customer owes us"
                value={formatCurrency(customer.totalOwedByCustomer)}
                className={customer.totalOwedByCustomer > 0 ? "text-coral-500" : undefined}
              />
              <Stat
                label="We owe customer"
                value={formatCurrency(customer.totalOwedToCustomer)}
                className={customer.totalOwedToCustomer > 0 ? "text-amber-500" : undefined}
              />
              <Stat label="Last order" value={formatDateTime(customer.lastOrderAt)} />
            </div>
          </div>

          {/* Invoice-by-invoice breakdown */}
          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-300">
            Invoices ({sortedOrders.length})
          </p>
          <div className="space-y-2">
            {sortedOrders.map((o) => {
              const owed = o.owedToCustomer > 0 ? o.owedToCustomer : o.owedByCustomer;
              return (
                <div
                  key={o.invoiceId || o.orderId}
                  className="rounded-lg border border-mist-200 bg-white p-3.5 dark:border-white/10 dark:bg-ink-900"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 font-mono text-sm font-semibold text-orange-600 dark:text-orange-400">
                      <FileText size={13} /> {o.invoiceNumber || o.orderId}
                    </p>
                    <p className="text-xs text-mist-500 dark:text-mist-300">{formatDateTime(o.createdAt)}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <PaymentStatusBadge status={o.invoiceStatus} />
                    {o.refundStatus && o.refundStatus !== "none" && <PaymentStatusBadge status={o.refundStatus} />}
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-mist-100 pt-2.5 text-xs sm:grid-cols-4 dark:border-white/10">
                    <Stat small label="Invoice total" value={formatCurrency(o.grandTotal)} />
                    <Stat small label="Paid" value={formatCurrency(o.paidAmount)} />
                    <Stat small label="Returned" value={formatCurrency(o.totalReturnedValue)} />
                    <Stat
                      small
                      label={o.owedToCustomer > 0 ? "We owe" : o.owedByCustomer > 0 ? "They owe" : "Balance"}
                      value={formatCurrency(owed)}
                      className={
                        o.owedToCustomer > 0 ? "text-amber-500" : o.owedByCustomer > 0 ? "text-coral-500" : "text-mint-500"
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, className, small }) {
  return (
    <div>
      <p className={`${small ? "" : "text-xs "}text-mist-500 dark:text-mist-300`}>{label}</p>
      <p className={`font-semibold ${className || "text-ink-950 dark:text-white"}`}>{value}</p>
    </div>
  );
}
