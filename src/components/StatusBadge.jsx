import React from "react";

const ORDER_STATUS_STYLES = {
  placed: "bg-mist-100 text-mist-700 dark:bg-white/10 dark:text-mist-300",
  packed: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  confirmed: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  shipped: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  delivered: "bg-mint-100 text-mint-500 dark:bg-mint-500/15 dark:text-mint-400",
  cancelled: "bg-coral-100 text-coral-500 dark:bg-coral-500/15 dark:text-coral-400",
  partial_returned: "bg-amber-100 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400",
  returned: "bg-amber-100 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400",
};

const PAYMENT_STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400",
  paid: "bg-mint-100 text-mint-500 dark:bg-mint-500/15 dark:text-mint-400",
  refunded: "bg-coral-100 text-coral-500 dark:bg-coral-500/15 dark:text-coral-400",
  refund_pending: "bg-amber-100 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400",
  partial_refunded: "bg-amber-100 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400",
};

const BALANCE_STATUS_STYLES = {
  customer_owes: "bg-coral-100 text-coral-500 dark:bg-coral-500/15 dark:text-coral-400",
  company_owes: "bg-amber-100 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400",
  settled: "bg-mint-100 text-mint-500 dark:bg-mint-500/15 dark:text-mint-400",
};

const LABELS = {
  partial_returned: "Partially returned",
  refund_pending: "Refund pending",
  partial_refunded: "Partially refunded",
  customer_owes: "Customer owes us",
  company_owes: "We owe customer",
  settled: "Settled",
};

function label(value) {
  return LABELS[value] || (value ? value.replace(/_/g, " ") : "—");
}

export { label as statusLabel };

export function OrderStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
        ORDER_STATUS_STYLES[status] || "bg-mist-100 text-mist-700 dark:bg-white/10 dark:text-mist-300"
      }`}
    >
      {label(status)}
    </span>
  );
}

export function PaymentStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
        PAYMENT_STATUS_STYLES[status] || "bg-mist-100 text-mist-700 dark:bg-white/10 dark:text-mist-300"
      }`}
    >
      {label(status)}
    </span>
  );
}

export function BalanceStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        BALANCE_STATUS_STYLES[status] || "bg-mist-100 text-mist-700 dark:bg-white/10 dark:text-mist-300"
      }`}
    >
      {label(status)}
    </span>
  );
}
