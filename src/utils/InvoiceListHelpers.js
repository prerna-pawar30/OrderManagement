/**
 * Small helpers for the Invoices page: HSN code, INR text, sorting, agent id/name, and an invoice's
 * paid / due figures.
 *
 * Used by: components/invoice/CustomerGroup.jsx, components/invoice/InvoiceRow.jsx,
 * pages/InvoiceListPage.jsx
 */

/**
 * HSN code of an invoice item, whatever field name the backend used; "-" when missing.
 *
 * HSN code, whatever field name the backend sends it under
 *
 * @param {object} item
 * @returns {string}
 */
export const hsnOf = (item) =>
  String(
    item?.hsnCode ??
      item?.hsn ??
      item?.hsnNo ??
      item?.hsnNumber ??
      item?.hsnSac ??
      item?.product?.hsnCode ??
      ""
  ).trim() || "-";

/* ── helpers ─────────────────────────────────────────────────────── */
/**
 * Rupee text with Indian grouping, e.g. 1234.5 -> "₹1,234.5".
 *
 * @param {number} amount
 * @returns {string}
 */
export const fmtINR = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

/**
 * Sort comparator: newest invoice first (invoice date, else created date).
 *
 * @param {object} invoiceA
 * @param {object} invoiceB
 * @returns {number}
 */
export const byDateDesc = (invoiceA, invoiceB) =>
  new Date(invoiceB.invoiceDate || invoiceB.createdAt || 0) -
  new Date(invoiceA.invoiceDate || invoiceA.createdAt || 0);

/**
 * Trims and lower-cases text for comparisons.
 *
 * @param {string} text
 * @returns {string}
 */
export const norm = (text) =>
  String(text || "")
    .trim()
    .toLowerCase();

/**
 * Id of the staff member who created the invoice.
 *
 * @param {object} invoice
 * @returns {string}
 */
export const agentIdOf = (invoice) =>
  String(invoice.createdBy?._id ?? invoice.createdBy ?? invoice.customerServiceRep ?? "").trim();

/**
 * Name (or email) of the staff member who created the invoice; "Unknown" when missing.
 *
 * @param {object} invoice
 * @returns {string}
 */
export const agentNameOf = (invoice) =>
  invoice.createdByName ||
  invoice.createdBy?.name ||
  invoice.createdByEmail ||
  invoice.customerServiceRep ||
  "Unknown";

/**
 * Money figures for one invoice row: value of returned goods, refunds already given back, refund
 * still owed, and credit used on it.
 *
 * Returned goods value + refunds already given back
 *
 * @param {object} invoice
 * @returns {{ returnedValue: number, settledBack: number, owed: number, creditUsed: number }}
 * Rupees.
 */
export const figuresOf = (invoice) => {
  const returnedValue = (invoice.items || []).reduce(
    (total, item) => total + (Number(item.returnedQty) || 0) * (Number(item.price) || 0),
    0
  );
  const settledBack = (invoice.refundHistory || []).reduce(
    (total, refund) => total + (Number(refund.amount) || 0),
    0
  );
  const owed = Number(invoice.refundableAmount) || 0;
  const creditUsed = (invoice.appliedCredits || []).reduce(
    (total, appliedCredit) => total + Number(appliedCredit.amount || 0),
    0
  );
  return { returnedValue, settledBack, owed, creditUsed };
};
