/**
 * Plain-English sentence describing where an order stands (for example "Paid, waiting to ship") and
 * its colour style.
 *
 * Used by: components/order/OrderDetailDrawer.jsx
 */

import { statusLabel } from "../components/order/StatusBadge";
import { formatCurrency } from "./Format";
import { orderNetTotal } from "./InvoiceHelpers";

/**
 * One plain-English sentence about where an order stands (shown under the progress tracker), with
 * its tone.
 *
 * Plain-language "what's going on with this order" line, shown right under the progress tracker.
 * This is the single biggest thing that makes the drawer legible to someone who didn't build it —
 * one sentence instead of having to cross-reference three separate status fields.
 *
 * @param {object} order
 * @returns {{ tone: string, text: string }}
 */
export function getOrderNarrative(order) {
  const { orderStatus, paymentStatus } = order;

  if (orderStatus === "cancelled") {
    if (paymentStatus === "refund_pending") {
      return {
        tone: "warning",
        text: `Cancelled after the customer had already paid. The company still owes them a refund of ${formatCurrency(
          order.refundAmount
        )}.`,
      };
    }
    if (paymentStatus === "refunded") {
      return { tone: "good", text: "Cancelled and the refund has been paid back in full." };
    }
    return {
      tone: "neutral",
      text: "Cancelled before any payment was collected — nothing owed either way.",
    };
  }

  if (orderStatus === "returned") {
    if (paymentStatus === "refund_pending")
      return {
        tone: "warning",
        text: "Every item was returned. Refund hasn't been paid out to the customer yet.",
      };
    if (paymentStatus === "partial_refunded" || paymentStatus === "refunded")
      return { tone: "good", text: "Every item was returned and the refund has been settled." };
  }

  if (orderStatus === "partial_returned") {
    if (paymentStatus === "refund_pending")
      return {
        tone: "warning",
        text: "Some items were returned. Refund for those items hasn't been paid out yet.",
      };
    if (paymentStatus === "partial_refunded")
      return { tone: "good", text: "Some items were returned and that portion has been refunded." };
  }

  if (paymentStatus === "partially_paid") {
    return {
      tone: "warning",
      text: `${formatCurrency(order.invoicePaid)} paid on the invoice — ${formatCurrency(
        order.invoiceDue
      )} is still due.`,
    };
  }

  if (paymentStatus === "pending") {
    return {
      tone: "warning",
      text: `Order placed, but the customer hasn't paid yet — ${formatCurrency(
        order.invoiceDue ?? orderNetTotal(order)
      )} is still due.`,
    };
  }

  if (orderStatus === "delivered") {
    return { tone: "good", text: "Delivered and paid in full. Nothing pending on this order." };
  }

  return {
    tone: "neutral",
    text: `Payment received. Currently ${statusLabel(orderStatus).toLowerCase()} — move it forward using Status below.`,
  };
}

export const NARRATIVE_STYLES = {
  good: "border-mint-200 bg-mint-100 text-mint-600 dark:border-mint-500/30 dark:bg-mint-500/10 dark:text-mint-400",
  warning:
    "border-amber-200 bg-amber-100 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
  neutral:
    "border-mist-200 bg-mist-100 text-mist-600 dark:border-white/10 dark:bg-white/5 dark:text-mist-300",
};
