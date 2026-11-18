/**
 * Adds invoices created directly on the Invoices page to the manual-order analytics so the
 * dashboard counts them too.
 *
 * Used by: constants/AnalyticsConfig.js, pages/AnalyticsPage.jsx
 */

const round2 = (amount) => Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
const phone10 = (phone) =>
  String(phone || "")
    .replace(/\D/g, "")
    .slice(-10);

// Shown as its own slice in "Orders by Status"; the fulfillment funnel only
// looks at real order stages, so these never enter it.
export const DIRECT_INVOICE_STATUS = "direct_invoice";

const paymentStatusOf = (invoice) => {
  const total = Number(invoice.summary?.totalPayAmount) || 0;
  const paid = Number(invoice.summary?.paidAmount) || 0;
  if (paid <= 0) return "pending";
  return paid + 0.01 >= total ? "paid" : "partially_paid";
};

// "product1 - var1" → "product1", matching the backend's productName grouping.
const productNameOf = (item) =>
  String(item.description || "")
    .split(" - ")[0]
    .trim() || "Unnamed item";

/**
 * Direct invoices in [startDate, endDate] (inclusive, "YYYY-MM-DD"), with
 * cancelled ones dropped unless includeCancelled.
 */
export function directInvoicesInRange(invoices = [], { startDate, endDate, includeCancelled }) {
  return invoices.filter((invoice) => {
    if (invoice.sourceOrderId || invoice.isDeleted) return false;
    if (!includeCancelled && invoice.status === "cancelled") return false;
    const day = String(invoice.invoiceDate || invoice.createdAt || "").slice(0, 10);
    return day && (!startDate || day >= startDate) && (!endDate || day <= endDate);
  });
}

/** Backend analytics `data` + direct invoices → the same shape, combined. */
export function mergeInvoiceAnalytics(data, invoices, groupBy = "day") {
  if (!data || invoices.length === 0) return data;

  const live = invoices.filter((invoice) => invoice.status !== "cancelled");
  const revenueOf = (invoice) => Number(invoice.summary?.totalPayAmount) || 0;

  // Summary
  const addedRevenue = round2(live.reduce((total, invoice) => total + revenueOf(invoice), 0));
  const addedItems = live.reduce(
    (total, invoice) =>
      total + (invoice.items || []).reduce((total, item) => total + (Number(item.qty) || 0), 0),
    0
  );
  const totalRevenue = round2((data.summary?.totalRevenue || 0) + addedRevenue);
  const totalOrders = (data.summary?.totalOrders || 0) + live.length;
  const summary = {
    ...data.summary,
    totalRevenue,
    totalOrders,
    avgOrderValue: totalOrders ? round2(totalRevenue / totalOrders) : 0,
    totalItemsSold: (data.summary?.totalItemsSold || 0) + addedItems,
    directInvoiceCustomers: new Set(
      live.map((invoice) => phone10(invoice.billTo?.contactNumber)).filter(Boolean)
    ).size,
  };

  // Sales trend — same date keys the backend uses ("YYYY-MM-DD" / "YYYY-MM").
  const trend = new Map(
    (data.salesTrend || []).map((salesTrendEntry) => [salesTrendEntry.date, { ...salesTrendEntry }])
  );
  for (const invoice of live) {
    const day = String(invoice.invoiceDate || invoice.createdAt).slice(0, 10);
    const key = groupBy === "month" ? day.slice(0, 7) : day;
    const row = trend.get(key) || { date: key, totalOrders: 0, totalRevenue: 0 };
    row.totalOrders += 1;
    row.totalRevenue = round2(row.totalRevenue + revenueOf(invoice));
    trend.set(key, row);
  }
  const salesTrend = [...trend.values()].sort((first, second) =>
    first.date.localeCompare(second.date)
  );

  // Orders by status — live invoices as their own slice, cancelled into "cancelled".
  const byStatus = new Map(
    (data.ordersByStatus || []).map((ordersByStatusEntry) => [
      ordersByStatusEntry.status,
      { ...ordersByStatusEntry },
    ])
  );
  const bump = (map, key, field, extra = {}) => {
    const row = map.get(key) || { [field]: key, count: 0, ...extra };
    row.count += 1;
    map.set(key, row);
  };
  for (const invoice of invoices)
    bump(byStatus, invoice.status === "cancelled" ? "cancelled" : DIRECT_INVOICE_STATUS, "status");

  const byPayment = new Map(
    (data.paymentStatusBreakdown || []).map((paymentStatusBreakdownEntry) => [
      paymentStatusBreakdownEntry.paymentStatus,
      { ...paymentStatusBreakdownEntry },
    ])
  );
  for (const invoice of invoices) bump(byPayment, paymentStatusOf(invoice), "paymentStatus");

  // Top products, merged by name (case-insensitive) with the order ones.
  const products = new Map(
    (data.topProducts || []).map((topProduct) => [
      topProduct.productName.toLowerCase(),
      { ...topProduct },
    ])
  );
  for (const invoice of live) {
    const seen = new Set();
    for (const item of invoice.items || []) {
      const name = productNameOf(item);
      const key = name.toLowerCase();
      const row = products.get(key) || {
        productName: name,
        totalQuantitySold: 0,
        totalRevenue: 0,
        totalOrders: 0,
      };
      row.totalQuantitySold += Number(item.qty) || 0;
      row.totalRevenue = round2(row.totalRevenue + (Number(item.totalAmount) || 0));
      if (!seen.has(key)) row.totalOrders += 1;
      seen.add(key);
      products.set(key, row);
    }
  }

  return {
    ...data,
    summary,
    salesTrend,
    ordersByStatus: [...byStatus.values()],
    paymentStatusBreakdown: [...byPayment.values()],
    topProducts: [...products.values()],
  };
}
