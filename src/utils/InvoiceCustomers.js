/**
 * Groups invoices by customer and works out each customer's ledger (who owes how much). Also
 * fetches all invoice pages.
 *
 * Customer grouping + ledger, both worked out from invoices. Shared by the
 * invoice list and the customer ledger so the two always agree on who a
 * customer is and which invoices are theirs.
 *
 * Used by: pages/AnalyticsPage.jsx, pages/CustomerLedgerPage.jsx, pages/OrdersListPage.jsx
 */

// "Prerna  Pawar " → "prerna pawar";  "+91 98765 43210" → "9876543210"
const norm = (text) => (text || "").trim().toLowerCase().replace(/\s+/g, " ");
const phone10 = (phone) =>
  String(phone || "")
    .replace(/\D/g, "")
    .slice(-10);
const round2 = (amount) => Math.round((Number(amount) + Number.EPSILON) * 100) / 100;

/**
 * Every invoice, page by page, so a server-side cap on `limit` can't
 * silently drop any. `getPage(page, limit)` → { invoices, pagination }.
 */
export async function fetchAllInvoices(getPage, limit = 100) {
  const first = await getPage(1, limit);
  const all = [...(first?.invoices || [])];
  const totalPages = Number(first?.pagination?.totalPages) || 1;
  for (let page = 2; page <= totalPages; page++) {
    const res = await getPage(page, limit);
    all.push(...(res?.invoices || []));
  }
  return all;
}

/**
 * Groups invoices under the customers API list, so the groups match that
 * list. An invoice goes under the customer with the same customerNo (even if
 * its billTo name/phone differ), else the customer with the same phone.
 * Invoices matching nobody get their own group at the end so they never
 * disappear or merge into someone else's.
 *
 * @returns [{ groupKey, customerNo, customerName, contactPerson,
 *             contactNumber, invoiceCount, totalAmount, allInvoices }]
 *          — customers in the customers-list order, unmatched after.
 */
export function groupInvoicesByCustomer(invoices = [], customers = []) {
  const customerList = Array.isArray(customers) ? customers : [];
  const groups = new Map();
  const ensure = (key, base) => {
    if (!groups.has(key)) {
      groups.set(key, { groupKey: key, ...base, invoiceCount: 0, totalAmount: 0, allInvoices: [] });
    }
    return groups.get(key);
  };
  const customerGroup = (customer) =>
    ensure(`c-${customer.customerNo}`, {
      customerNo: customer.customerNo,
      customerName: customer.companyName || "Unknown Customer",
      contactPerson: customer.contactPerson,
      contactNumber: customer.contactNumber,
    });

  const matchedIds = new Set();
  const assignments = invoices.map((invoice) => {
    const phone = phone10(invoice.billTo?.contactNumber);
    const customer =
      customerList.find(
        (customerEntry) => String(customerEntry.customerNo) === String(invoice.customerNo)
      ) ||
      (phone &&
        customerList.find((customerEntry) => phone10(customerEntry.contactNumber) === phone));
    if (customer) matchedIds.add(customer.customerNo);
    return [invoice, customer];
  });
  // Create customer groups first so they keep the customers-list order.
  customerList
    .filter((customerEntry) => matchedIds.has(customerEntry.customerNo))
    .forEach(customerGroup);

  for (const [invoice, customer] of assignments) {
    const group = customer
      ? customerGroup(customer)
      : ensure(
          `u-${invoice.customerNo ?? ""}|${norm(invoice.billTo?.contactPerson)}|${norm(invoice.billTo?.companyName)}`,
          {
            customerNo: invoice.customerNo,
            customerName: invoice.billTo?.companyName || "Unknown Customer",
            contactPerson: invoice.billTo?.contactPerson,
            contactNumber: invoice.billTo?.contactNumber,
          }
        );
    group.allInvoices.push(invoice);
    group.invoiceCount += 1;
    group.totalAmount += invoice.summary?.totalPayAmount || 0;
  }

  return [...groups.values()];
}

const balanceStatusOf = (net) =>
  net > 0.01 ? "customer_owes" : net < -0.01 ? "company_owes" : "settled";

// One invoice → the row shape CustomerLedgerDrawer renders.
function ledgerRow(invoice) {
  const cancelled = invoice.status === "cancelled";
  const grandTotal = Number(invoice.summary?.totalPayAmount) || 0;
  const paidAmount = Number(invoice.summary?.paidAmount) || 0;
  const totalReturnedValue = round2(
    (invoice.returns || []).reduce(
      (sum, currentReturn) =>
        sum +
        (currentReturn.items || []).reduce(
          (total, item) => total + (Number(item.quantity) || 0) * (Number(item.price) || 0),
          0
        ),
      0
    )
  );
  // A cancelled invoice isn't owed by anyone. Overpayment that's already been
  // refunded / turned into a credit note isn't owed either — refundableAmount
  // is what's still pending back to the customer.
  const owedByCustomer = cancelled ? 0 : round2(Math.max(grandTotal - paidAmount, 0));
  const owedToCustomer = cancelled ? 0 : round2(Number(invoice.refundableAmount) || 0);
  return {
    invoiceId: invoice.invoiceId || invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    createdAt: invoice.invoiceDate || invoice.createdAt,
    invoiceStatus: invoice.status,
    refundStatus: invoice.refundStatus,
    grandTotal,
    paidAmount,
    totalReturnedValue,
    owedByCustomer,
    owedToCustomer,
    cancelled,
  };
}

/**
 * Customer ledger built from invoices, in the { customers, summary } shape
 * CustomerLedgerPage / CustomerLedgerDrawer expect (same as the old
 * /manual-order/ledger API). Every manual order also creates an invoice, so
 * invoices cover manual, ecommerce and standalone billing alike without
 * double counting.
 */
export function buildInvoiceLedger(invoices = [], customers = []) {
  const ledger = groupInvoicesByCustomer(invoices, customers).map((group) => {
    const orders = group.allInvoices.map(ledgerRow);
    const live = orders.filter((order) => !order.cancelled);
    const sum = (list, key) => round2(list.reduce((total, row) => total + row[key], 0));
    const totalOwedByCustomer = sum(live, "owedByCustomer");
    const totalOwedToCustomer = sum(live, "owedToCustomer");
    const netBalance = round2(totalOwedByCustomer - totalOwedToCustomer);
    const lastOrderAt = orders.reduce(
      (latest, order) =>
        !latest || new Date(order.createdAt) > new Date(latest) ? order.createdAt : latest,
      null
    );
    return {
      groupKey: group.groupKey,
      customerNo: group.customerNo,
      customerName: group.customerName,
      contactPerson: group.contactPerson,
      customerPhone: group.contactNumber,
      totalOrders: live.length,
      totalOrderValue: sum(live, "grandTotal"),
      totalReturnedValue: sum(live, "totalReturnedValue"),
      totalOwedByCustomer,
      totalOwedToCustomer,
      netBalance,
      balanceStatus: balanceStatusOf(netBalance),
      lastOrderAt,
      orders,
    };
  });

  const owe = ledger.filter((ledgerEntry) => ledgerEntry.balanceStatus === "customer_owes");
  const owed = ledger.filter((ledgerEntry) => ledgerEntry.balanceStatus === "company_owes");
  const summary = {
    totalCustomerOwesCompany: round2(
      owe.reduce((total, customer) => total + customer.netBalance, 0)
    ),
    customersWhoOwe: owe.length,
    totalCompanyOwesCustomers: round2(
      owed.reduce((total, customer) => total + Math.abs(customer.netBalance), 0)
    ),
    customersOwed: owed.length,
    settledCustomers: ledger.filter((ledgerEntry) => ledgerEntry.balanceStatus === "settled")
      .length,
    totalCustomers: ledger.length,
  };

  // Biggest balances first — that's what the ledger is looked at for.
  ledger.sort((first, second) => Math.abs(second.netBalance) - Math.abs(first.netBalance));
  return { customers: ledger, summary };
}
