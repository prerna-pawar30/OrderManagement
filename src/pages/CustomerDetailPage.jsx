import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  Loader2,
  FileDown,
  Download,
  Inbox,
  Package,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { ManualOrderService, InvoiceService } from "../api/services";
import { OrderStatusBadge, PaymentStatusBadge, BalanceStatusBadge } from "../components/StatusBadge";
import { formatCurrency, formatDateTime, initials } from "../lib/format";
import { generateInvoicePdf } from "../lib/generateInvoicePdf";
import { generateCreditNotePdf } from "../lib/generateCreditNotePdf";
import { generateStatementPdf } from "../lib/generateStatementPdf";
import OrderDetailDrawer from "../components/OrderDetailDrawer";

export default function CustomerDetailPage() {
  const { phone } = useParams();
  const [searchParams] = useSearchParams();
  const nameHint = searchParams.get("name") || "";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [ledgerCustomer, setLedgerCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [invoicesByOrderId, setInvoicesByOrderId] = useState({});
  const [creditNotes, setCreditNotes] = useState([]);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [downloadingStatement, setDownloadingStatement] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [downloadingCreditId, setDownloadingCreditId] = useState(null);

  const load = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      // 1) Resolve this exact customer from the ledger (grouped by
      // phone + normalized name on the backend), using phone as the search key.
      const ledgerRes = await ManualOrderService.getCustomerLedger({ search: phone });
      const candidates = ledgerRes?.data?.customers || [];
      const match =
        candidates.find(
          (c) =>
            c.customerPhone === phone &&
            (!nameHint || c.customerName?.trim().toLowerCase() === nameHint.trim().toLowerCase())
        ) || candidates.find((c) => c.customerPhone === phone) || null;

      if (!match) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLedgerCustomer(match);

      const orderSummaries = match.orders || [];

      // 2) Pull full details (items, invoiceId, return/refund history) for
      // every order so we can show real products and per-invoice detail.
      const orderResults = await Promise.allSettled(
        orderSummaries.map((o) => ManualOrderService.getOne(o.orderId))
      );
      const fullOrders = orderResults
        .map((r) => (r.status === "fulfilled" ? r.value?.data?.order : null))
        .filter(Boolean)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(fullOrders);

      // 3) Fetch the real linked invoice for every order that has one.
      const invoiceIdPairs = fullOrders.filter((o) => o.invoiceId).map((o) => [o.orderId, o.invoiceId]);
      const invoiceResults = await Promise.allSettled(
        invoiceIdPairs.map(([, invoiceId]) => InvoiceService.getInvoiceById(invoiceId))
      );
      const invMap = {};
      invoiceResults.forEach((r, idx) => {
        if (r.status === "fulfilled" && r.value) {
          invMap[invoiceIdPairs[idx][0]] = r.value;
        }
      });
      setInvoicesByOrderId(invMap);

      // 4) Every credit note (store-credit settlement) issued for this
      // customer, across all their orders.
      try {
        const creditRes = await ManualOrderService.getCreditNotes({ search: phone });
        const notes = (creditRes?.data?.creditNotes || []).filter((n) => n.customerPhone === phone);
        setCreditNotes(notes);
      } catch {
        setCreditNotes([]);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load this customer's details");
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, nameHint]);

  // Aggregate every line item across every order into one "what have they
  // ever bought from us" list.
  const productsPurchased = useMemo(() => {
    const map = new Map();
    for (const order of orders) {
      for (const item of order.items || []) {
        const key = `${item.productName}|${item.variantName || ""}`;
        const existing = map.get(key) || {
          productName: item.productName,
          variantName: item.variantName || "",
          totalQuantity: 0,
          totalReturned: 0,
          totalRevenue: 0,
          orderIds: new Set(),
        };
        existing.totalQuantity += Number(item.quantity) || 0;
        existing.totalReturned += Number(item.returnedQuantity) || 0;
        existing.totalRevenue += (Number(item.price) || 0) * (Number(item.quantity) || 0);
        existing.orderIds.add(order.orderId);
        map.set(key, existing);
      }
    }
    return Array.from(map.values())
      .map((p) => ({ ...p, orderCount: p.orderIds.size }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [orders]);

  const invoiceList = useMemo(() => Object.values(invoicesByOrderId), [invoicesByOrderId]);

  const downloadStatement = async () => {
    if (invoiceList.length === 0) {
      toast.error("No invoices to include in a statement yet");
      return;
    }
    setDownloadingStatement(true);
    try {
      await generateStatementPdf({
        customerName: ledgerCustomer.customerName,
        contactPerson: ledgerCustomer.customerName,
        contactNumber: ledgerCustomer.customerPhone,
        invoices: invoiceList,
      });
    } catch (err) {
      toast.error("Could not generate the statement");
    } finally {
      setDownloadingStatement(false);
    }
  };

  const downloadOrderInvoice = async (order) => {
    const invoice = invoicesByOrderId[order.orderId];
    if (!invoice) {
      toast.error("No invoice found for this order yet");
      return;
    }
    setDownloadingInvoiceId(order.orderId);
    try {
      await generateInvoicePdf(invoice, order.orderId);
    } catch (err) {
      toast.error("Could not download the invoice");
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const downloadCreditNote = async (note) => {
    setDownloadingCreditId(note.refundId);
    try {
      await generateCreditNotePdf(note);
    } catch (err) {
      toast.error("Could not generate the PDF");
    } finally {
      setDownloadingCreditId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-mist-500 dark:text-mist-300">
        <Loader2 size={16} className="animate-spin" /> Loading customer…
      </div>
    );
  }

  if (notFound || !ledgerCustomer) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <Inbox size={28} className="text-mist-300 dark:text-mist-500" />
        <p className="text-sm font-medium text-ink-950 dark:text-white">Couldn't find this customer</p>
        <button
          onClick={() => navigate("/customer-ledger")}
          className="rounded-lg border border-mist-200 px-3.5 py-2 text-xs font-semibold text-mist-700 hover:bg-mist-50 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
        >
          Back to customer ledger
        </button>
      </div>
    );
  }

  const c = ledgerCustomer;
  const latestOrder = orders[0];
  const totalCreditIssued = creditNotes.reduce((s, n) => s + Number(n.amount || 0), 0);
  const totalCreditUnused = creditNotes
    .filter((n) => !n.appliedToOrderId)
    .reduce((s, n) => s + Number(n.amount || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-mist-200 text-mist-500 hover:bg-mist-50 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
          >
            <ArrowLeft size={15} />
          </button>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink-950 text-sm font-bold text-white">
            {initials(c.customerName)}
          </span>
          <div>
            <h1 className="font-display text-lg font-bold text-ink-950 dark:text-white">{c.customerName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mist-500 dark:text-mist-300">
              <span className="flex items-center gap-1">
                <Phone size={11} /> {c.customerPhone}
              </span>
              {c.customerEmail && (
                <span className="flex items-center gap-1">
                  <Mail size={11} /> {c.customerEmail}
                </span>
              )}
              {latestOrder?.organizationName && (
                <span className="flex items-center gap-1">
                  <Building2 size={11} /> {latestOrder.organizationName}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={load}
            title="Refresh"
            className="grid h-9 w-9 place-items-center rounded-lg border border-mist-200 text-mist-500 hover:bg-mist-50 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={downloadStatement}
            disabled={downloadingStatement}
            className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {downloadingStatement ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Statement
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard label="Orders" value={c.totalOrders} />
        <SummaryCard label="Total order value" value={formatCurrency(c.totalOrderValue)} />
        <SummaryCard label="Total returned" value={formatCurrency(c.totalReturnedValue)} />
        <SummaryCard
          label={c.balanceStatus === "company_owes" ? "We owe customer" : c.balanceStatus === "customer_owes" ? "Customer owes us" : "Net balance"}
          value={formatCurrency(Math.abs(c.netBalance))}
          tone={c.balanceStatus === "customer_owes" ? "coral" : c.balanceStatus === "company_owes" ? "amber" : "mint"}
          extra={<BalanceStatusBadge status={c.balanceStatus} />}
        />
        <SummaryCard
          label="Credit notes"
          value={formatCurrency(totalCreditIssued)}
          extra={
            totalCreditUnused > 0 ? (
              <span className="text-[11px] font-semibold text-amber-500">{formatCurrency(totalCreditUnused)} unused</span>
            ) : (
              <span className="text-[11px] text-mist-400 dark:text-mist-500">all applied</span>
            )
          }
        />
      </div>

      {/* Products purchased */}
      <Section title={`Products purchased · ${productsPurchased.length}`} icon={Package}>
        {productsPurchased.length === 0 ? (
          <EmptyRow text="No products on file yet." />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-mist-100 text-xs uppercase tracking-wide text-mist-500 dark:border-white/10 dark:text-mist-300">
                    <th className="px-5 py-3 font-semibold">Product</th>
                    <th className="px-5 py-3 font-semibold">Purchased</th>
                    <th className="px-5 py-3 font-semibold">Returned</th>
                    <th className="px-5 py-3 font-semibold">Orders</th>
                    <th className="px-5 py-3 font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {productsPurchased.map((p, i) => (
                    <tr key={i} className="border-b border-mist-100 last:border-0 dark:border-white/10">
                      <td className="px-5 py-3">
                        <p className="font-medium text-ink-950 dark:text-white">{p.productName}</p>
                        {p.variantName && <p className="text-xs text-mist-500 dark:text-mist-300">{p.variantName}</p>}
                      </td>
                      <td className="px-5 py-3 text-mist-700 dark:text-mist-300">{p.totalQuantity}</td>
                      <td className="px-5 py-3 text-mist-700 dark:text-mist-300">
                        {p.totalReturned > 0 ? (
                          <span className="text-amber-500 dark:text-amber-400">{p.totalReturned}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3 text-mist-700 dark:text-mist-300">{p.orderCount}</td>
                      <td className="px-5 py-3 font-semibold text-ink-950 dark:text-white">
                        {formatCurrency(p.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-mist-100 dark:divide-white/10 lg:hidden">
              {productsPurchased.map((p, i) => (
                <div key={i} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink-950 dark:text-white">{p.productName}</p>
                      {p.variantName && <p className="text-xs text-mist-500 dark:text-mist-300">{p.variantName}</p>}
                    </div>
                    <p className="font-semibold text-ink-950 dark:text-white">{formatCurrency(p.totalRevenue)}</p>
                  </div>
                  <p className="mt-1.5 text-xs text-mist-500 dark:text-mist-300">
                    {p.totalQuantity} purchased
                    {p.totalReturned > 0 && (
                      <span className="text-amber-500 dark:text-amber-400"> · {p.totalReturned} returned</span>
                    )}{" "}
                    · {p.orderCount} order{p.orderCount === 1 ? "" : "s"}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* Orders & invoices */}
      <Section title={`Orders & invoices · ${orders.length}`} className="mt-4">
        {orders.length === 0 ? (
          <EmptyRow text="No orders on file yet." />
        ) : (
          <div className="divide-y divide-mist-100 dark:divide-white/10">
            {orders.map((o) => {
              const invoice = invoicesByOrderId[o.orderId];
              return (
                <div
                  key={o.orderId}
                  className="flex flex-col gap-2.5 p-4 hover:bg-mist-50 dark:hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <button onClick={() => setActiveOrderId(o.orderId)} className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-xs text-mist-700 dark:text-mist-300">{o.orderId}</p>
                      {invoice?.invoiceNumber && (
                        <span className="rounded-full bg-mist-100 px-2 py-0.5 text-[10px] font-semibold text-mist-600 dark:bg-white/10 dark:text-mist-300">
                          Inv {invoice.invoiceNumber}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-mist-500 dark:text-mist-300">{formatDateTime(o.createdAt)}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <OrderStatusBadge status={o.orderStatus} />
                      <PaymentStatusBadge status={o.paymentStatus} />
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                    <p className="font-semibold text-ink-950 dark:text-white">{formatCurrency(o.grandTotal)}</p>
                    <button
                      onClick={() => downloadOrderInvoice(o)}
                      disabled={!invoice || downloadingInvoiceId === o.orderId}
                      title={invoice ? "Download invoice" : "No invoice yet"}
                      className="flex items-center gap-1.5 rounded-lg border border-mist-200 px-2.5 py-1 text-[11px] font-semibold text-mist-700 hover:bg-mist-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
                    >
                      {downloadingInvoiceId === o.orderId ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <FileDown size={12} />
                      )}
                      Invoice
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Credit notes */}
      <Section title={`Credit notes · ${creditNotes.length}`} className="mt-4">
        {creditNotes.length === 0 ? (
          <EmptyRow text="No credit notes issued for this customer." />
        ) : (
          <div className="divide-y divide-mist-100 dark:divide-white/10">
            {creditNotes.map((note) => (
              <div key={note.refundId} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-mist-700 dark:text-mist-300">{note.refundId}</p>
                  {note.returnedItems?.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-mist-500 dark:text-mist-300">
                      {note.returnedItems.map((it) => `${it.quantity}× ${it.productName}`).join(", ")}
                    </p>
                  )}
                  <p className="mt-1">
                    {note.appliedToOrderId ? (
                      <span className="rounded-full bg-mint-100 px-2 py-0.5 text-[10px] font-semibold text-mint-600 dark:bg-mint-500/15 dark:text-mint-400">
                        Applied → {note.appliedInvoiceNumber || note.appliedToOrderId}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                        Not yet used
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="font-semibold text-ink-950 dark:text-white">{formatCurrency(note.amount)}</p>
                  <button
                    onClick={() => downloadCreditNote(note)}
                    disabled={downloadingCreditId === note.refundId}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-mist-200 text-mist-500 hover:bg-mist-50 disabled:opacity-50 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
                  >
                    {downloadingCreditId === note.refundId ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <FileDown size={13} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {activeOrderId && (
        <OrderDetailDrawer
          orderSummary={{ orderId: activeOrderId }}
          allOrders={orders}
          onClose={() => setActiveOrderId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone, extra }) {
  const toneClass =
    tone === "coral"
      ? "text-coral-500"
      : tone === "amber"
      ? "text-amber-500"
      : tone === "mint"
      ? "text-mint-500"
      : "text-ink-950 dark:text-white";
  return (
    <div className="rounded-xl2 border border-mist-200 bg-white p-4 dark:border-white/10 dark:bg-ink-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-300">{label}</p>
      <p className={`mt-1.5 font-display text-lg font-bold ${toneClass}`}>{value}</p>
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
}

function Section({ title, icon: Icon, children, className = "" }) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-1.5">
        {Icon && <Icon size={14} className="text-mist-400 dark:text-mist-500" />}
        <p className="text-xs font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-300">{title}</p>
      </div>
      <div className="overflow-hidden rounded-xl2 border border-mist-200 bg-white shadow-panel dark:border-white/10 dark:bg-ink-900">
        {children}
      </div>
    </div>
  );
}

function EmptyRow({ text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Inbox size={24} className="text-mist-300 dark:text-mist-500" />
      <p className="text-sm text-mist-500 dark:text-mist-300">{text}</p>
    </div>
  );
}
