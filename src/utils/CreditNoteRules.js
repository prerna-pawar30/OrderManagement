/**
 * Business rule: which invoices a credit note may be raised against.
 *
 * Used by: components/creditnote/InvoicePicker.jsx
 */

/**
 * A credit note can only be raised against an invoice that is paid or partly paid.
 *
 * @param {object} invoice Invoice from the API.
 * @returns {boolean}
 */
export const isCreditNoteEligible = (invoice) =>
  invoice && ["paid", "partially_paid"].includes(invoice.status);
