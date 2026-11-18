/**
 * Works out where an invoice came from (client, manual order, ecommerce, old, direct) and who
 * created it.
 *
 * Drives the "All / Client / Manual Orders / Ecommerce / Old / Direct" tabs and the small tag under
 * the invoice number.
 *
 * Used by: components/invoice/InvoiceRow.jsx, components/invoice/InvoiceTableRow.jsx,
 * pages/InvoiceListPage.jsx
 */

export const SOURCES = [
  { key: "all", label: "All" },
  { key: "client", label: "Client" },
  { key: "manual", label: "Manual Orders" },
  { key: "ecommerce", label: "Ecommerce" },
  { key: "direct", label: "Old / Direct" },
];

export const SOURCE_LABEL = {
  client: "Client",
  manual: "Manual Order",
  ecommerce: "Ecommerce",
  direct: "Old / Direct",
};

export const SOURCE_TEXT_CLASS = {
  client: "text-emerald-600",
  manual: "text-sky-600",
  ecommerce: "text-violet-500",
  direct: "text-gray-400",
};

const ECOM_RE =
  /e-?com|ecommerce|shop|online|website|web[\s_-]?order|storefront|woo|shopify|cart|razorpay/;
const MANUAL_RE = /manual/;
const CLIENT_RE = /client/;
const DIRECT_RE = /direct|old|legacy|standalone/;

// Keys that usually describe where a record came from.
const SOURCE_KEY_RE = /source|type|channel|platform|origin|createdfrom|createdvia/i;

// Collect every string value under "source-like" keys — on the invoice
// itself and on any nested source/order object the backend populated.
const collectSourceHints = (invoice) => {
  const hints = [];
  const visit = (object, depth) => {
    if (!object || typeof object !== "object" || depth > 2) return;
    for (const [key, val] of Object.entries(object)) {
      if (typeof val === "string" && SOURCE_KEY_RE.test(key) && !/id$/i.test(key))
        hints.push(val.toLowerCase());
      else if (typeof val === "boolean" && val && /ecom/i.test(key)) hints.push("ecommerce");
      else if (val && typeof val === "object" && !Array.isArray(val) && /source|order/i.test(key)) {
        visit(val, depth + 1);
      }
    }
  };
  visit(invoice, 0);
  return hints.join(" ");
};

/**
 * Where an invoice came from: "client" (a CRM lead), "manual" (manual order), "ecommerce" or
 * "direct" (old system / created directly). Drives the tabs on the Invoices page.
 *
 * @param {object} [invoice={}]
 * @returns {"client"|"manual"|"ecommerce"|"direct"}
 */
export const getInvoiceSource = (invoice = {}) => {
  // Exact backend fields first (same rule as ClientsInvoicePage):
  //   leadId → Client, sourceOrderType "manual" / "ecommerce"
  if (invoice.leadId) return "client";
  const sot = String(invoice.sourceOrderType ?? "").toLowerCase();
  if (sot === "manual") return "manual";
  if (sot === "ecommerce") return "ecommerce";
  if (sot) return ECOM_RE.test(sot) ? "ecommerce" : "manual";

  // Old records without these fields: guess from the other fields
  const hints = collectSourceHints(invoice);

  // Ecommerce first: an ecommerce invoice is ALSO linked to an order, so it
  // must be checked before the generic "has an order → manual" rule.
  if (ECOM_RE.test(hints)) return "ecommerce";
  if (MANUAL_RE.test(hints)) return "manual";
  if (CLIENT_RE.test(hints)) return "client";
  if (DIRECT_RE.test(hints)) return "direct";

  // No explicit field — look at the order number / rep for website orders.
  const loose = `${invoice.orderNumber ?? ""} ${invoice.customerServiceRep ?? ""}`.toLowerCase();
  if (invoice.sourceOrderId && ECOM_RE.test(loose)) return "ecommerce";

  if (invoice.sourceOrderId) return "manual";
  if (invoice.clientId) return "client";
  return "direct";
};

/**
 * Name or id of the staff member linked to the invoice.
 *
 * @param {object} [invoice={}]
 * @returns {string}
 */
export const getInvoiceAgent = (invoice = {}) =>
  String(invoice.customerServiceRep || invoice.agentName || invoice.createdBy || "").trim();

/**
 * Development helper: after calling it, run window.__invoiceSources() in the browser console to see
 * how each invoice was classified.
 *
 * Dev helper: open the browser console and run window.__invoiceSources() to see which source each
 * invoice got and the fields it was decided from.
 *
 * @param {object[]} invoices
 * @returns {void}
 */
export const exposeSourceDebug = (invoices) => {
  if (typeof window === "undefined") return;
  window.__invoiceSources = () =>
    console.table(
      (invoices || []).map((invoice) => ({
        invoice: invoice.invoiceNumber,
        detected: getInvoiceSource(invoice),
        hints: collectSourceHints(invoice) || "(none)",
        sourceOrderId: invoice.sourceOrderId ?? "",
        orderNumber: invoice.orderNumber ?? "",
      }))
    );
};
