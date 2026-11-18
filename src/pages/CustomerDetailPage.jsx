/**
 * One customer's page: summary numbers, orders, invoices, credit notes, statement and PDF
 * downloads.
 *
 * Route: /customers/:phone
 * Used by: routes/AppRoutes.jsx
 * API: CreditNoteService.getAll, InvoiceService.getInvoiceById,
 * ManualOrderService.getCustomerLedger
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  Loader2,
  FileDown,
  FileText,
  Download,
  Inbox,
  Package,
  Receipt,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { ManualOrderService, InvoiceService, CreditNoteService } from "../backend/ApiService";
import { PaymentStatusBadge, BalanceStatusBadge } from "../components/order/StatusBadge";
import { formatCurrency, formatDateTime, initials } from "../utils/Format";
import { generateInvoicePdf } from "../utils/InvoicePdf";
import { generateCreditNotePdf } from "../utils/CreditNotePdf";
import { generateStatementPdf } from "../utils/StatementPdf";
import CreditNoteDetailModal from "../components/creditnote/CreditNoteDetailModal";
import InvoiceDetailModal from "../components/invoice/InvoiceDetailModal";
import { InvoicePdfButton } from "../components/customer/InvoicePdfButton";
import { MiniStat } from "../components/customer/MiniStat";
import { SummaryCard } from "../components/customer/SummaryCard";
import { Section } from "../components/customer/Section";
import { EmptyRow } from "../components/customer/EmptyRow";

// Phones come in as "+918669469184", "918669469184" or "8669469184"
// depending on the source — compare on the last 10 digits.
const phoneKey = (phone) =>
  String(phone || "")
    .replace(/\D/g, "")
    .slice(-10);

const CREDIT_STATUS = {
  open: {
    label: "Not yet used",
    cls: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  },
  partially_used: {
    label: "Partly used",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  used: { label: "Used", cls: "bg-mint-100 text-mint-500 dark:bg-mint-500/15 dark:text-mint-400" },
  cancelled: {
    label: "Cancelled",
    cls: "bg-mist-100 text-mist-500 dark:bg-white/10 dark:text-mist-300",
  },
};

/**
 * Customer profile — everything about one customer on one page:
 * ledger balance, products bought, every invoice, every credit note.
 * Opened from Invoices, Orders, Customer ledger and Credit notes.
 * Route: /customers/:phone?name=<contact name>
 */
export default function CustomerDetailPage() {
  const { phone } = useParams();
  const [searchParams] = useSearchParams();
  const nameHint = searchParams.get("name") || "";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [ledgerCustomer, setLedgerCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [downloadingStatement, setDownloadingStatement] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [downloadingCreditId, setDownloadingCreditId] = useState(null);
  const [openCreditNote, setOpenCreditNote] = useState(null);
  const [openInvoice, setOpenInvoice] = useState(null);

  const load = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const key = phoneKey(phone);

      // 1) Ledger row for this customer (totals + per-invoice balances).
      const ledgerRes = await ManualOrderService.getCustomerLedger({ search: key || phone });
      const candidates = (ledgerRes?.data?.customers || []).filter(
        (customer) => phoneKey(customer.customerPhone) === key
      );
      const match =
        candidates.find(
          (candidate) =>
            !nameHint ||
            candidate.customerName?.trim().toLowerCase() === nameHint.trim().toLowerCase()
        ) ||
        candidates[0] ||
        null;

      if (!match) {
        setNotFound(true);
        return;
      }
      setLedgerCustomer(match);

      // 2) Full invoice (items, billTo, totals) for every invoice in the ledger.
      const summaries = match.orders || [];
      const invoiceResults = await Promise.allSettled(
        summaries
          .filter((summary) => summary.invoiceId)
          .map((summary) => InvoiceService.getInvoiceById(summary.invoiceId))
      );
      const summaryById = Object.fromEntries(
        summaries.map((summary) => [summary.invoiceId, summary])
      );
      const fullInvoices = invoiceResults
        .map((invoiceResult) => (invoiceResult.status === "fulfilled" ? invoiceResult.value : null))
        .filter(Boolean)
        .map((invoiceResult) => ({
          ...invoiceResult,
          ledger: summaryById[invoiceResult.invoiceId] || null,
        }))
        .sort(
          (invoiceResultA, invoiceResultB) =>
            new Date(invoiceResultB.invoiceDate || invoiceResultB.createdAt) -
            new Date(invoiceResultA.invoiceDate || invoiceResultA.createdAt)
        );
      setInvoices(fullInvoices);

      // 3) Every credit note raised for this customer.
      try {
        const creditRes = await CreditNoteService.getAll({ search: key || phone, limit: 200 });
        const notes = (creditRes?.data?.creditNotes || []).filter(
          (creditNote) => !creditNote.customerPhone || phoneKey(creditNote.customerPhone) === key
        );
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

  // Every invoice line rolled up into "what have they bought from us".
  const productsPurchased = useMemo(() => {
    const map = new Map();
    for (const invoice of invoices) {
      for (const item of invoice.items || []) {
        const name = item.description || item.productName || "—";
        const key = `${item.articleNo || ""}|${name}`;
        const existing = map.get(key) || {
          productName: name,
          articleNo: item.articleNo || "",
          totalQuantity: 0,
          totalReturned: 0,
          totalRevenue: 0,
          invoiceIds: new Set(),
        };
        const qty = Number(item.qty ?? item.quantity) || 0;
        existing.totalQuantity += qty;
        existing.totalReturned += Number(item.returnedQty ?? item.returnedQuantity) || 0;
        existing.totalRevenue += Number(item.totalAmount) || (Number(item.price) || 0) * qty;
        existing.invoiceIds.add(invoice.invoiceId);
        map.set(key, existing);
      }
    }
    return Array.from(map.values())
      .map((product) => ({ ...product, invoiceCount: product.invoiceIds.size }))
      .sort((first, second) => second.totalRevenue - first.totalRevenue);
  }, [invoices]);

  const downloadStatement = async () => {
    if (invoices.length === 0) {
      toast.error("No invoices to include in a statement yet");
      return;
    }
    setDownloadingStatement(true);
    try {
      const billTo = invoices[0]?.billTo || {};
      await generateStatementPdf({
        customerName: billTo.companyName || ledgerCustomer.customerName,
        contactPerson: billTo.contactPerson || ledgerCustomer.customerName,
        contactNumber: billTo.contactNumber || ledgerCustomer.customerPhone,
        invoices,
      });
    } catch {
      toast.error("Could not generate the statement");
    } finally {
      setDownloadingStatement(false);
    }
  };

  const downloadInvoice = async (invoice) => {
    setDownloadingInvoiceId(invoice.invoiceId);
    try {
      await generateInvoicePdf(invoice, invoice.orderId || invoice.invoiceNumber);
    } catch {
      toast.error("Could not download the invoice");
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const downloadCreditNote = async (note) => {
    setDownloadingCreditId(note.creditNoteId);
    try {
      await generateCreditNotePdf(note);
    } catch {
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
        <p className="text-sm font-medium text-ink-950 dark:text-white">
          Couldn't find this customer
        </p>
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg border border-mist-200 px-3.5 py-2 text-xs font-semibold text-mist-700 hover:bg-mist-50 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
        >
          Go back
        </button>
      </div>
    );
  }

  const customer = ledgerCustomer;
  const billTo = invoices[0]?.billTo || {};
  const totalCreditIssued = creditNotes
    .filter((creditNote) => creditNote.status !== "cancelled")
    .reduce(
      (total, creditNote) =>
        total + Number(creditNote.amount ?? creditNote.summary?.totalAmount ?? 0),
      0
    );
  const totalCreditUnused = creditNotes
    .filter((creditNote) => creditNote.status !== "cancelled")
    .reduce((total, creditNote) => total + Number(creditNote.balance ?? 0), 0);

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
            {initials(customer.customerName)}
          </span>
          <div>
            <h1 className="font-display text-lg font-bold text-ink-950 dark:text-white">
              {customer.customerName}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mist-500 dark:text-mist-300">
              <span className="flex items-center gap-1">
                <Phone size={11} /> {customer.customerPhone}
              </span>
              {(customer.customerEmail || billTo.email) && (
                <span className="flex items-center gap-1">
                  <Mail size={11} /> {customer.customerEmail || billTo.email}
                </span>
              )}
              {billTo.companyName && (
                <span className="flex items-center gap-1">
                  <Building2 size={11} /> {billTo.companyName}
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
            {downloadingStatement ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Download size={13} />
            )}
            Statement
          </button>
        </div>
      </div>

      {/* Ledger summary */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Invoices" value={customer.totalOrders} />
        <SummaryCard label="Total billed" value={formatCurrency(customer.totalOrderValue)} />
        <SummaryCard label="Total returned" value={formatCurrency(customer.totalReturnedValue)} />
        <SummaryCard
          label="Customer owes us"
          value={formatCurrency(customer.totalOwedByCustomer)}
          tone={customer.totalOwedByCustomer > 0 ? "coral" : undefined}
        />
        <SummaryCard
          label="We owe customer"
          value={formatCurrency(customer.totalOwedToCustomer)}
          tone={customer.totalOwedToCustomer > 0 ? "amber" : undefined}
        />
        <SummaryCard
          label="Net balance"
          value={formatCurrency(Math.abs(customer.netBalance || 0))}
          tone={
            customer.balanceStatus === "customer_owes"
              ? "coral"
              : customer.balanceStatus === "company_owes"
                ? "amber"
                : "mint"
          }
          extra={<BalanceStatusBadge status={customer.balanceStatus} />}
        />
      </div>

      {/* Invoices (ledger view) */}
      <Section title={`Invoices · ${invoices.length}`} icon={FileText}>
        {invoices.length === 0 ? (
          <EmptyRow text="No invoices on file yet." />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-mist-100 text-xs uppercase tracking-wide text-mist-500 dark:border-white/10 dark:text-mist-300">
                    <th className="px-5 py-3 font-semibold">Invoice</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Total</th>
                    <th className="px-5 py-3 font-semibold">Paid</th>
                    <th className="px-5 py-3 font-semibold">Returned</th>
                    <th className="px-5 py-3 font-semibold">Balance</th>
                    <th className="px-5 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const ledger = invoice.ledger || {};
                    const owed =
                      ledger.owedToCustomer > 0
                        ? ledger.owedToCustomer
                        : ledger.owedByCustomer || 0;
                    return (
                      <tr
                        key={invoice.invoiceId}
                        onClick={() => setOpenInvoice(invoice)}
                        className="cursor-pointer border-b border-mist-100 last:border-0 hover:bg-mist-50 dark:border-white/10 dark:hover:bg-white/5"
                      >
                        <td className="px-5 py-3">
                          <p className="font-mono text-sm font-semibold text-orange-600 dark:text-orange-400">
                            {invoice.invoiceNumber}
                          </p>
                          <p className="text-xs text-mist-500 dark:text-mist-300">
                            {formatDateTime(invoice.invoiceDate || invoice.createdAt)}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <PaymentStatusBadge status={ledger.invoiceStatus || invoice.status} />
                            {ledger.refundStatus && ledger.refundStatus !== "none" && (
                              <PaymentStatusBadge status={ledger.refundStatus} />
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 font-medium text-ink-950 dark:text-white">
                          {formatCurrency(ledger.grandTotal ?? invoice.grandTotal)}
                        </td>
                        <td className="px-5 py-3 text-mist-700 dark:text-mist-300">
                          {formatCurrency(ledger.paidAmount)}
                        </td>
                        <td className="px-5 py-3 text-mist-700 dark:text-mist-300">
                          {formatCurrency(ledger.totalReturnedValue)}
                        </td>
                        <td
                          className={`px-5 py-3 font-semibold ${
                            ledger.owedToCustomer > 0
                              ? "text-amber-500"
                              : ledger.owedByCustomer > 0
                                ? "text-coral-500"
                                : "text-mint-500"
                          }`}
                        >
                          {formatCurrency(owed)}
                          <p className="text-[10px] font-medium text-mist-500 dark:text-mist-300">
                            {ledger.owedToCustomer > 0
                              ? "we owe"
                              : ledger.owedByCustomer > 0
                                ? "they owe"
                                : "settled"}
                          </p>
                        </td>
                        <td
                          className="px-5 py-3 text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <InvoicePdfButton
                            busy={downloadingInvoiceId === invoice.invoiceId}
                            onClick={() => downloadInvoice(invoice)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-mist-100 dark:divide-white/10 lg:hidden">
              {invoices.map((invoice) => {
                const ledger = invoice.ledger || {};
                const owed =
                  ledger.owedToCustomer > 0 ? ledger.owedToCustomer : ledger.owedByCustomer || 0;
                return (
                  <div
                    key={invoice.invoiceId}
                    onClick={() => setOpenInvoice(invoice)}
                    className="cursor-pointer p-4 hover:bg-mist-50 dark:hover:bg-white/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-semibold text-orange-600 dark:text-orange-400">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-xs text-mist-500 dark:text-mist-300">
                          {formatDateTime(invoice.invoiceDate || invoice.createdAt)}
                        </p>
                      </div>
                      <div onClick={(event) => event.stopPropagation()}>
                        <InvoicePdfButton
                          busy={downloadingInvoiceId === invoice.invoiceId}
                          onClick={() => downloadInvoice(invoice)}
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <PaymentStatusBadge status={ledger.invoiceStatus || invoice.status} />
                      {ledger.refundStatus && ledger.refundStatus !== "none" && (
                        <PaymentStatusBadge status={ledger.refundStatus} />
                      )}
                    </div>
                    <div className="mt-2.5 grid grid-cols-4 gap-2 text-xs">
                      <MiniStat
                        label="Total"
                        value={formatCurrency(ledger.grandTotal ?? invoice.grandTotal)}
                      />
                      <MiniStat label="Paid" value={formatCurrency(ledger.paidAmount)} />
                      <MiniStat
                        label="Returned"
                        value={formatCurrency(ledger.totalReturnedValue)}
                      />
                      <MiniStat
                        label={
                          ledger.owedToCustomer > 0
                            ? "We owe"
                            : ledger.owedByCustomer > 0
                              ? "They owe"
                              : "Balance"
                        }
                        value={formatCurrency(owed)}
                        className={
                          ledger.owedToCustomer > 0
                            ? "text-amber-500"
                            : ledger.owedByCustomer > 0
                              ? "text-coral-500"
                              : "text-mint-500"
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Section>

      {/* Credit notes */}
      <Section
        title={`Credit notes · ${creditNotes.length}`}
        icon={Receipt}
        className="mt-4"
        right={
          creditNotes.length > 0 && (
            <span className="text-[11px] text-mist-500 dark:text-mist-300">
              {formatCurrency(totalCreditIssued)} issued
              {totalCreditUnused > 0.01 && (
                <span className="font-semibold text-amber-500">
                  {" "}
                  · {formatCurrency(totalCreditUnused)} unused
                </span>
              )}
            </span>
          )
        }
      >
        {creditNotes.length === 0 ? (
          <EmptyRow text="No credit notes issued for this customer." />
        ) : (
          <div className="divide-y divide-mist-100 dark:divide-white/10">
            {creditNotes.map((note) => {
              const status = CREDIT_STATUS[note.status] || CREDIT_STATUS.open;
              const balance = Number(note.balance ?? 0);
              return (
                <div
                  key={note.creditNoteId}
                  onClick={() => setOpenCreditNote(note)}
                  className="flex cursor-pointer items-center justify-between gap-3 p-4 hover:bg-orange-50/40 dark:hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-mono text-xs font-semibold text-ink-950 dark:text-white">
                      <FileText size={13} className="text-orange-500" /> {note.creditNoteNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-mist-500 dark:text-mist-300">
                      {formatDateTime(note.creditNoteDate || note.createdAt)}
                      {note.invoiceNumber && <> · against {note.invoiceNumber}</>}
                    </p>
                    {note.reason && (
                      <p className="mt-0.5 truncate text-xs text-mist-500 dark:text-mist-300">
                        {note.reason}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}
                      >
                        {status.label}
                      </span>
                      {balance > 0.01 && note.status !== "cancelled" && (
                        <span className="text-[11px] font-semibold text-amber-500">
                          {formatCurrency(balance)} left to use
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex shrink-0 items-center gap-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <p className="font-semibold text-ink-950 dark:text-white">
                      {formatCurrency(note.amount ?? note.summary?.totalAmount)}
                    </p>
                    {balance > 0.01 && note.status !== "cancelled" && (
                      <button
                        onClick={() => setOpenCreditNote(note)}
                        className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600"
                      >
                        Use credit
                      </button>
                    )}
                    <button
                      title="Download PDF"
                      onClick={() => downloadCreditNote(note)}
                      disabled={downloadingCreditId === note.creditNoteId}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-mist-200 text-mist-500 hover:bg-mist-50 disabled:opacity-50 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
                    >
                      {downloadingCreditId === note.creditNoteId ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <FileDown size={13} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Products purchased */}
      <Section
        title={`Products purchased · ${productsPurchased.length}`}
        icon={Package}
        className="mt-4"
      >
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
                    <th className="px-5 py-3 font-semibold">Invoices</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {productsPurchased.map((productsPurchasedEntry, index) => (
                    <tr
                      key={index}
                      className="border-b border-mist-100 last:border-0 dark:border-white/10"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-ink-950 dark:text-white">
                          {productsPurchasedEntry.productName}
                        </p>
                        {productsPurchasedEntry.articleNo && (
                          <p className="text-xs text-mist-500 dark:text-mist-300">
                            {productsPurchasedEntry.articleNo}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-mist-700 dark:text-mist-300">
                        {productsPurchasedEntry.totalQuantity}
                      </td>
                      <td className="px-5 py-3 text-mist-700 dark:text-mist-300">
                        {productsPurchasedEntry.totalReturned > 0 ? (
                          <span className="text-amber-500 dark:text-amber-400">
                            {productsPurchasedEntry.totalReturned}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3 text-mist-700 dark:text-mist-300">
                        {productsPurchasedEntry.invoiceCount}
                      </td>
                      <td className="px-5 py-3 font-semibold text-ink-950 dark:text-white">
                        {formatCurrency(productsPurchasedEntry.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-mist-100 dark:divide-white/10 lg:hidden">
              {productsPurchased.map((productsPurchasedEntry, index) => (
                <div key={index} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink-950 dark:text-white">
                        {productsPurchasedEntry.productName}
                      </p>
                      {productsPurchasedEntry.articleNo && (
                        <p className="text-xs text-mist-500 dark:text-mist-300">
                          {productsPurchasedEntry.articleNo}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold text-ink-950 dark:text-white">
                      {formatCurrency(productsPurchasedEntry.totalRevenue)}
                    </p>
                  </div>
                  <p className="mt-1.5 text-xs text-mist-500 dark:text-mist-300">
                    {productsPurchasedEntry.totalQuantity} purchased
                    {productsPurchasedEntry.totalReturned > 0 && (
                      <span className="text-amber-500 dark:text-amber-400">
                        {" "}
                        · {productsPurchasedEntry.totalReturned} returned
                      </span>
                    )}{" "}
                    · {productsPurchasedEntry.invoiceCount} invoice
                    {productsPurchasedEntry.invoiceCount === 1 ? "" : "s"}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {openCreditNote && (
        <CreditNoteDetailModal
          creditNote={openCreditNote}
          onClose={() => setOpenCreditNote(null)}
          onChanged={load}
        />
      )}

      {openInvoice && (
        <InvoiceDetailModal
          invoice={openInvoice}
          isOpen
          onClose={() => setOpenInvoice(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
