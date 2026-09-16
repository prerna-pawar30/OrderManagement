import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Inbox, Wallet, HandCoins, ScrollText } from "lucide-react";
import toast from "react-hot-toast";
import { ManualOrderService } from "../api/services";
import { BalanceStatusBadge } from "../components/StatusBadge";
import { formatCurrency, formatDateTime, initials } from "../lib/format";

const STATUS_FILTERS = [
  { value: "", label: "Pending only (default)" },
  { value: "customer_owes", label: "Customer owes us" },
  { value: "company_owes", label: "We owe customer" },
  { value: "settled", label: "Settled" },
  { value: "__all__", label: "All customers (incl. settled)" },
];

export default function CustomerLedgerPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Full customer profile (products bought, invoices, credit notes, balance)
  // lives on its own page now — clicking a row takes you there.
  const openCustomer = (c) =>
    navigate(`/customers/${encodeURIComponent(c.customerPhone)}?name=${encodeURIComponent(c.customerName || "")}`);

  const load = async () => {
    setLoading(true);
    try {
      // "" (default) and "__all__" both fetch everything from the backend —
      // the difference between them is applied client-side below, so a
      // customer who just got settled doesn't need a fresh network request
      // to disappear from the default view.
      const res = await ManualOrderService.getCustomerLedger({
        balanceStatus: statusFilter === "__all__" ? undefined : statusFilter || undefined,
      });
      setCustomers(res?.data?.customers || []);
      setSummary(res?.data?.summary || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load the customer ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filtered = useMemo(() => {
    // Default view: hide settled (₹0 balance) customers — only show
    // customers where either side still owes money. Explicit filter
    // selections (including "All customers") bypass this.
    let list =
      statusFilter === "" ? customers.filter((c) => c.balanceStatus !== "settled") : customers;

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.customerName?.toLowerCase().includes(q) ||
          c.customerPhone?.includes(q) ||
          c.customerEmail?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [customers, query, statusFilter]);

  return (
    <div>
      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl2 border border-mist-200 bg-white p-4 dark:border-white/10 dark:bg-ink-900">
          <div className="flex items-center gap-2 text-coral-500">
            <HandCoins size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">Customers owe us</p>
          </div>
          <p className="mt-1.5 font-display text-xl font-bold text-ink-950 dark:text-white">
            {formatCurrency(summary?.totalCustomerOwesCompany || 0)}
          </p>
          <p className="text-xs text-mist-500 dark:text-mist-300">
            {summary?.customersWhoOwe || 0} customer{summary?.customersWhoOwe === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-xl2 border border-mist-200 bg-white p-4 dark:border-white/10 dark:bg-ink-900">
          <div className="flex items-center gap-2 text-amber-500">
            <Wallet size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">We owe customers</p>
          </div>
          <p className="mt-1.5 font-display text-xl font-bold text-ink-950 dark:text-white">
            {formatCurrency(summary?.totalCompanyOwesCustomers || 0)}
          </p>
          <p className="text-xs text-mist-500 dark:text-mist-300">
            {summary?.customersOwed || 0} customer{summary?.customersOwed === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-xl2 border border-mist-200 bg-white p-4 dark:border-white/10 dark:bg-ink-900">
          <div className="flex items-center gap-2 text-mint-500">
            <ScrollText size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">Settled</p>
          </div>
          <p className="mt-1.5 font-display text-xl font-bold text-ink-950 dark:text-white">
            {summary?.settledCustomers || 0}
          </p>
          <p className="text-xs text-mist-500 dark:text-mist-300">
            of {summary?.totalCustomers || 0} customers
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-400 dark:text-mist-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customer, phone, email…"
            className="w-full rounded-lg border border-mist-200 bg-white py-2.5 pl-9 pr-3 text-sm text-ink-950 outline-none focus:border-orange-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-mist-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full rounded-lg border border-mist-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none focus:border-orange-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white sm:w-56"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl2 border border-mist-200 bg-white shadow-panel dark:border-white/10 dark:bg-ink-900">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-mist-500 dark:text-mist-300">
            <Loader2 size={16} className="animate-spin" /> Loading ledger…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Inbox size={28} className="text-mist-300 dark:text-mist-500" />
            <p className="text-sm font-medium text-ink-950 dark:text-white">No customers match here yet</p>
            <p className="text-xs text-mist-500 dark:text-mist-300">Try a different search or filter.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-mist-100 text-xs uppercase tracking-wide text-mist-500 dark:border-white/10 dark:text-mist-300">
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Orders</th>
                    <th className="px-5 py-3 font-semibold">Order value</th>
                    <th className="px-5 py-3 font-semibold">Returned value</th>
                    <th className="px-5 py-3 font-semibold">Net balance</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Last order</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={`${c.customerPhone}-${c.customerName}`}
                      onClick={() => openCustomer(c)}
                      className="cursor-pointer border-b border-mist-100 align-top last:border-0 hover:bg-mist-50 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-950 text-xs font-bold text-white">
                            {initials(c.customerName)}
                          </span>
                          <div>
                            <p className="font-medium text-ink-950 hover:underline dark:text-white">
                              {c.customerName}
                            </p>
                            <p className="text-xs text-mist-500 dark:text-mist-300">{c.customerPhone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-mist-700 dark:text-mist-300">{c.totalOrders}</td>
                      <td className="px-5 py-3.5 font-medium text-ink-950 dark:text-white">
                        {formatCurrency(c.totalOrderValue)}
                      </td>
                      <td className="px-5 py-3.5 text-mist-700 dark:text-mist-300">
                        {formatCurrency(c.totalReturnedValue)}
                      </td>
                      <td
                        className={`px-5 py-3.5 font-semibold ${
                          c.balanceStatus === "customer_owes"
                            ? "text-coral-500"
                            : c.balanceStatus === "company_owes"
                            ? "text-amber-500"
                            : "text-mint-500"
                        }`}
                      >
                        {formatCurrency(Math.abs(c.netBalance))}
                      </td>
                      <td className="px-5 py-3.5">
                        <BalanceStatusBadge status={c.balanceStatus} />
                      </td>
                      <td className="px-5 py-3.5 text-xs text-mist-500 dark:text-mist-300">
                        {formatDateTime(c.lastOrderAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards for phones/tablets */}
            <div className="divide-y divide-mist-100 dark:divide-white/10 lg:hidden">
              {filtered.map((c) => (
                <div
                  key={`${c.customerPhone}-${c.customerName}`}
                  onClick={() => openCustomer(c)}
                  className="cursor-pointer p-4 hover:bg-mist-50 dark:hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-950 text-xs font-bold text-white">
                        {initials(c.customerName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-950 dark:text-white">{c.customerName}</p>
                        <p className="text-xs text-mist-500 dark:text-mist-300">{c.customerPhone}</p>
                      </div>
                    </div>
                    <BalanceStatusBadge status={c.balanceStatus} />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-mist-500 dark:text-mist-300">Orders</p>
                      <p className="font-medium text-ink-950 dark:text-white">{c.totalOrders}</p>
                    </div>
                    <div>
                      <p className="text-mist-500 dark:text-mist-300">Order value</p>
                      <p className="font-medium text-ink-950 dark:text-white">{formatCurrency(c.totalOrderValue)}</p>
                    </div>
                    <div>
                      <p className="text-mist-500 dark:text-mist-300">Returned</p>
                      <p className="font-medium text-ink-950 dark:text-white">
                        {formatCurrency(c.totalReturnedValue)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-mist-100 pt-3 dark:border-white/10">
                    <p className="text-xs text-mist-500 dark:text-mist-300">
                      Last order {formatDateTime(c.lastOrderAt)}
                    </p>
                    <p
                      className={`font-semibold ${
                        c.balanceStatus === "customer_owes"
                          ? "text-coral-500"
                          : c.balanceStatus === "company_owes"
                          ? "text-amber-500"
                          : "text-mint-500"
                      }`}
                    >
                      {formatCurrency(Math.abs(c.netBalance))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
