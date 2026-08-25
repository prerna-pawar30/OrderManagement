import React, { useState } from "react";
import { X, Phone, Mail, ChevronRight } from "lucide-react";
import { OrderStatusBadge, PaymentStatusBadge, BalanceStatusBadge } from "./StatusBadge";
import { formatCurrency, formatDateTime, initials } from "../lib/format";
import OrderDetailDrawer from "./OrderDetailDrawer";

export default function CustomerLedgerDrawer({ customer, onClose }) {
  const [activeOrderId, setActiveOrderId] = useState(null);

  const sortedOrders = [...(customer.orders || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-ink-950/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col bg-mist-50 shadow-panel dark:bg-ink-950">
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
            <p
              className={`mt-1 font-display text-2xl font-bold ${
                customer.balanceStatus === "customer_owes"
                  ? "text-coral-500"
                  : customer.balanceStatus === "company_owes"
                  ? "text-amber-500"
                  : "text-mint-500"
              }`}
            >
              {formatCurrency(Math.abs(customer.netBalance))}
            </p>
            <p className="mt-0.5 text-xs text-mist-500 dark:text-mist-300">
              {customer.balanceStatus === "customer_owes" &&
                "Customer still owes this much for unpaid orders."}
              {customer.balanceStatus === "company_owes" &&
                "Company owes this much back to the customer (unrefunded returns / cancellations)."}
              {customer.balanceStatus === "settled" && "Nothing pending either way."}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-mist-100 pt-4 dark:border-white/10">
              <div>
                <p className="text-xs text-mist-500 dark:text-mist-300">Total orders</p>
                <p className="font-semibold text-ink-950 dark:text-white">{customer.totalOrders}</p>
              </div>
              <div>
                <p className="text-xs text-mist-500 dark:text-mist-300">Total order value</p>
                <p className="font-semibold text-ink-950 dark:text-white">
                  {formatCurrency(customer.totalOrderValue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-mist-500 dark:text-mist-300">Total returned value</p>
                <p className="font-semibold text-ink-950 dark:text-white">
                  {formatCurrency(customer.totalReturnedValue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-mist-500 dark:text-mist-300">Last order</p>
                <p className="font-semibold text-ink-950 dark:text-white">
                  {formatDateTime(customer.lastOrderAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Order-by-order breakdown */}
          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-300">
            Orders ({sortedOrders.length})
          </p>
          <div className="space-y-2">
            {sortedOrders.map((o) => (
              <button
                key={o.orderId}
                onClick={() => setActiveOrderId(o.orderId)}
                className="w-full rounded-lg border border-mist-200 bg-white p-3.5 text-left transition hover:border-orange-300 hover:shadow-sm dark:border-white/10 dark:bg-ink-900 dark:hover:border-orange-500/50"
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs text-mist-700 dark:text-mist-300">{o.orderId}</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-mist-500 dark:text-mist-300">{formatDateTime(o.createdAt)}</p>
                    <ChevronRight size={14} className="text-mist-400 dark:text-mist-500" />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <OrderStatusBadge status={o.orderStatus} />
                  <PaymentStatusBadge status={o.paymentStatus} />
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-mist-100 pt-2.5 text-xs dark:border-white/10">
                  <div>
                    <p className="text-mist-500 dark:text-mist-300">Order value</p>
                    <p className="font-semibold text-ink-950 dark:text-white">{formatCurrency(o.grandTotal)}</p>
                  </div>
                  <div>
                    <p className="text-mist-500 dark:text-mist-300">Returned</p>
                    <p className="font-semibold text-ink-950 dark:text-white">
                      {formatCurrency(o.totalReturnedValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-mist-500 dark:text-mist-300">
                      {o.owedToCustomer > 0 ? "We owe" : o.owedByCustomer > 0 ? "They owe" : "Balance"}
                    </p>
                    <p
                      className={`font-semibold ${
                        o.owedToCustomer > 0
                          ? "text-amber-500"
                          : o.owedByCustomer > 0
                          ? "text-coral-500"
                          : "text-mint-500"
                      }`}
                    >
                      {formatCurrency(o.owedToCustomer > 0 ? o.owedToCustomer : o.owedByCustomer)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Individual order detail — opens on top, shows only that one order,
          not the combined customer totals above. */}
      {activeOrderId && (
        <OrderDetailDrawer
          orderSummary={{ orderId: activeOrderId }}
          allOrders={sortedOrders.map((o) => ({ ...o, customerPhone: customer.customerPhone }))}
          onClose={() => setActiveOrderId(null)}
          onChanged={() => {}}
        />
      )}
    </div>
  );
}
