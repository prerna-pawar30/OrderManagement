/**
 * Order <-> invoice money helpers: applied-credit tags in order notes, payment state from the
 * linked invoice, discount ratio, returned value and net total.
 *
 * The backend creates the invoice of an order and keeps it in sync; every order carries the invoice
 * id on order.invoiceId. This file only reads and writes the "[Credit:<orderId>:<amount>]" tags in
 * order notes.
 *
 * Used by: 6 files (shared), e.g. components/order/OrderDetailDrawer.jsx,
 * components/order/OrderTotal.jsx, components/order/ReturnOrderModal.jsx
 */

// "This order used ₹X credit sourced from order Y" — so a NEW order's own
// detail page can show where its discount actually came from, not just a
// bare number in the discount field. Multiple tags possible if credit was
// drawn from more than one source order.
const CREDIT_TAG_REGEX = /\[Credit:([^:\]]+):([0-9.]+)\]/g;

/**
 * Reads the "[Credit:<orderId>:<amount>]" tags from an order's notes (credit used from earlier
 * orders).
 *
 * @param {string} notes
 * @returns {Array<{ sourceOrderId: string, amount: number }>}
 */
export const extractAppliedCredits = (notes) => {
  const text = notes || "";
  const matches = [];
  let match;
  CREDIT_TAG_REGEX.lastIndex = 0;
  while ((match = CREDIT_TAG_REGEX.exec(text)) !== null) {
    matches.push({ sourceOrderId: match[1], amount: Number(match[2]) });
  }
  return matches;
};

/**
 * Adds a "[Credit:<orderId>:<amount>]" tag to order notes so the order shows where its discount
 * came from.
 *
 * @param {string} notes
 * @param {string} sourceOrderId
 * @param {number} amount Rupees.
 * @returns {string} The new notes.
 */
export const tagNotesWithAppliedCredit = (notes, sourceOrderId, amount) => {
  const base = notes || "";
  const tag = `[Credit:${sourceOrderId}:${amount}]`;
  return base ? `${base}\n${tag}` : tag;
};

/**
 * A pending order takes its payment state from its invoice (payments are recorded on the invoice).
 * Example: invoice total 1,000, paid 400 -> "partially_paid", due 600. Cancelled orders and orders
 * already marked paid are returned unchanged.
 *
 * Payments recorded on an order's invoice (Invoices page edit, applied credit notes) don't flow
 * back to the order, which only knows "pending" / "paid". So a pending order takes its payment
 * state from the linked invoice: some paid → "partially_paid", nothing left → "paid". Refund /
 * cancel states and orders already marked paid are left alone.
 *
 * @param {object} order
 * @param {object} invoice
 * @returns {object} The order, possibly with paymentStatus, invoicePaid and invoiceDue.
 */
export const withInvoicePayment = (order, invoice) => {
  if (
    !order ||
    !invoice ||
    order.paymentStatus !== "pending" ||
    order.orderStatus === "cancelled"
  ) {
    return order;
  }
  const total = Number(invoice.summary?.totalPayAmount) || 0;
  const paid = Number(invoice.summary?.paidAmount) || 0;
  const due = Math.max(total - paid, 0);
  if (paid <= 0) return { ...order, invoicePaid: 0, invoiceDue: due };
  return {
    ...order,
    paymentStatus: due > 0.01 ? "partially_paid" : "paid",
    invoicePaid: paid,
    invoiceDue: due,
  };
};

/**
 * Share of the item total that was given as discount (same rule as the backend). Example: items
 * 1,000, discount 100 -> 0.1.
 *
 * Same discount rule as the backend (manualOrder.service.js → orderDiscountRatio): order.discount
 * is a fixed ratio of every rupee of goods, so a returned item is worth price × qty × (1 − ratio),
 * and invoice total = order.grandTotal − returned value.
 *
 * @param {object} order
 * @returns {number} 0..1
 */
export const orderDiscountRatio = (order) => {
  const original = (order?.items || []).reduce(
    (total, item) => total + Number(item.price) * Number(item.quantity),
    0
  );
  if (original <= 0) return 0;
  return Math.min(Math.max(Number(order?.discount) || 0, 0) / original, 1);
};

const round2 = (amount) => Math.round((Number(amount) + Number.EPSILON) * 100) / 100;

/**
 * Value of the returned items after the order discount. Example: discount ratio 0.1, returned ₹200
 * of items -> ₹180.
 *
 * @param {object} order
 * @returns {number} Rupees, rounded to paise.
 */
export const orderReturnedValue = (order) => {
  const keep = 1 - orderDiscountRatio(order);
  return round2(
    (order?.returnRequests || []).reduce(
      (sum, returnRequest) =>
        sum +
        (returnRequest.items || []).reduce(
          (total, item) => total + round2(Number(item.price) * Number(item.quantity) * keep),
          0
        ),
      0
    )
  );
};

/**
 * What the order is worth now (grand total minus returned value); equals the invoice total.
 * Cancelled orders keep their grand total.
 *
 * What the order is worth now (after returns) — equals the invoice's total.
 *
 * @param {object} order
 * @returns {number} Rupees.
 */
export const orderNetTotal = (order) =>
  order?.orderStatus === "cancelled"
    ? Number(order?.grandTotal) || 0
    : Math.max(round2((Number(order?.grandTotal) || 0) - orderReturnedValue(order)), 0);

/**
 * True when the order itself was paid; only then does a return owe the customer a refund.
 *
 * Order was actually paid (on the order itself) — only then does a return owe a refund.
 *
 * @param {object} order
 * @returns {boolean}
 */
export const orderWasPaid = (order) =>
  Boolean(order?.paidAt) &&
  ["paid", "refund_pending", "partial_refunded", "refunded"].includes(order?.paymentStatus);
