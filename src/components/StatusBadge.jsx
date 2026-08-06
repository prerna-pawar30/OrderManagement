import React from "react";

const ORDER_STATUS_STYLES = {
  placed: "bg-mist-100 text-mist-700",
  packed: "bg-teal-50 text-teal-700",
  confirmed: "bg-teal-50 text-teal-700",
  shipped: "bg-teal-100 text-teal-700",
  delivered: "bg-mint-100 text-mint-500",
  cancelled: "bg-coral-100 text-coral-500",
  partial_returned: "bg-amber-100 text-amber-500",
  returned: "bg-amber-100 text-amber-500",
};

const PAYMENT_STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-500",
  paid: "bg-mint-100 text-mint-500",
  refunded: "bg-coral-100 text-coral-500",
  refund_pending: "bg-amber-100 text-amber-500",
  partial_refunded: "bg-amber-100 text-amber-500",
};

const LABELS = {
  partial_returned: "Partially returned",
  refund_pending: "Refund pending",
  partial_refunded: "Partially refunded",
};

function label(value) {
  return LABELS[value] || (value ? value.replace(/_/g, " ") : "—");
}

export function OrderStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
        ORDER_STATUS_STYLES[status] || "bg-mist-100 text-mist-700"
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
        PAYMENT_STATUS_STYLES[status] || "bg-mist-100 text-mist-700"
      }`}
    >
      {label(status)}
    </span>
  );
}
