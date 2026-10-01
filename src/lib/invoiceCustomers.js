// Customer grouping + ledger, both worked out from invoices. Shared by the
// invoice list and the customer ledger so the two always agree on who a
// customer is and which invoices are theirs.

// "Prerna  Pawar " → "prerna pawar";  "+91 98765 43210" → "9876543210"
const norm = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
const phone10 = (p) => String(p || "").replace(/\D/g, "").slice(-10);
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

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
 * Groups invoices under the customers API list. An invoice goes under the
 * customer whose customerNo AND contact person both match it (the backend
 * has been seen giving one customerNo to invoices of different people, so
 * customerNo alone isn't trusted), else the customer with the same phone.
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
  const customerGroup = (c) =>
    ensure(`c-${c.customerNo}`, {
      customerNo: c.customerNo,
      customerName: c.companyName || "Unknown Customer",
      contactPerson: c.contactPerson,
      contactNumber: c.contactNumber,
    });

  const matchedIds = new Set();
  const assignments = invoices.map((inv) => {
    const person = norm(inv.billTo?.contactPerson);
    const phone = phone10(inv.billTo?.contactNumber);
    const customer =
      customerList.find((c) => c.customerNo === inv.customerNo && norm(c.contactPerson) === person) ||
      (phone && customerList.find((c) => phone10(c.contactNumber) === phone));
    if (customer) matchedIds.add(customer.customerNo);
    return [inv, customer];
  });
  // Create customer groups first so they keep the customers-list order.
  customerList.filter((c) => matchedIds.has(c.customerNo)).forEach(customerGroup);

  for (const [inv, customer] of assignments) {
    const group = customer
      ? customerGroup(customer)
      : ensure(`u-${inv.customerNo ?? ""}|${norm(inv.billTo?.contactPerson)}|${norm(inv.billTo?.companyName)}`, {
          customerNo: inv.customerNo,
          customerName: inv.billTo?.companyName || "Unknown Customer",
          contactPerson: inv.billTo?.contactPerson,
          contactNumber: inv.billTo?.contactNumber,
        });
    group.allInvoices.push(inv);
    group.invoiceCount += 1;
    group.totalAmount += inv.summary?.totalPayAmount || 0;
  }

  return [...groups.values()];
}

const balanceStatusOf = (net) => (net > 0.01 ? "customer_owes" : net < -0.01 ? "company_owes" : "settled");

// One invoice → the row shape CustomerLedgerDrawer renders.
function ledgerRow(inv) {
  const cancelled = inv.status === "cancelled";
  const grandTotal = Number(inv.summary?.totalPayAmount) || 0;
  const paidAmount = Number(inv.summary?.paidAmount) || 0;
  const totalReturnedValue = round2(
    (inv.returns || []).reduce(
      (sum, r) => sum + (r.items || []).reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0),
      0
    )
  );
  // A cancelled invoice isn't owed by anyone. Overpayment that's already been
  // refunded / turned into a credit note isn't owed either — refundableAmount
  // is what's still pending back to the customer.
  const owedByCustomer = cancelled ? 0 : round2(Math.max(grandTotal - paidAmount, 0));
  const owedToCustomer = cancelled ? 0 : round2(Number(inv.refundableAmount) || 0);
  return {
    invoiceId: inv.invoiceId || inv._id,
    invoiceNumber: inv.invoiceNumber,
    createdAt: inv.invoiceDate || inv.createdAt,
    invoiceStatus: inv.status,
    refundStatus: inv.refundStatus,
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
  const ledger = groupInvoicesByCustomer(invoices, customers).map((g) => {
    const orders = g.allInvoices.map(ledgerRow);
    const live = orders.filter((o) => !o.cancelled);
    const sum = (list, key) => round2(list.reduce((s, o) => s + o[key], 0));
    const totalOwedByCustomer = sum(live, "owedByCustomer");
    const totalOwedToCustomer = sum(live, "owedToCustomer");
    const netBalance = round2(totalOwedByCustomer - totalOwedToCustomer);
    const lastOrderAt = orders.reduce(
      (latest, o) => (!latest || new Date(o.createdAt) > new Date(latest) ? o.createdAt : latest),
      null
    );
    return {
      groupKey: g.groupKey,
      customerNo: g.customerNo,
      customerName: g.customerName,
      contactPerson: g.contactPerson,
      customerPhone: g.contactNumber,
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

  const owe = ledger.filter((c) => c.balanceStatus === "customer_owes");
  const owed = ledger.filter((c) => c.balanceStatus === "company_owes");
  const summary = {
    totalCustomerOwesCompany: round2(owe.reduce((s, c) => s + c.netBalance, 0)),
    customersWhoOwe: owe.length,
    totalCompanyOwesCustomers: round2(owed.reduce((s, c) => s + Math.abs(c.netBalance), 0)),
    customersOwed: owed.length,
    settledCustomers: ledger.filter((c) => c.balanceStatus === "settled").length,
    totalCustomers: ledger.length,
  };

  // Biggest balances first — that's what the ledger is looked at for.
  ledger.sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
  return { customers: ledger, summary };
}
