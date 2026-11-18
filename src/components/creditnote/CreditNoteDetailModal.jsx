/**
 * Shows one credit note: amounts, customer, history, and the actions to apply it to an invoice,
 * refund it, cancel it or download the PDF.
 *
 * Used by: pages/CreditNotesPage.jsx, pages/CustomerDetailPage.jsx
 * API: CreditNoteService.applyToInvoice, CreditNoteService.cancel,
 * CreditNoteService.getApplyTargets, CreditNoteService.refund
 */

import { useEffect, useState } from "react";
import {
  X as CloseIcon,
  Loader2,
  FileText,
  FileDown,
  Receipt,
  IndianRupee,
  Ban,
  CheckCircle2,
  Inbox,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Package,
  History,
} from "lucide-react";
import toast from "react-hot-toast";
import { CreditNoteService } from "../../backend/ApiService";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/Format";
import { generateCreditNotePdf } from "../../utils/CreditNotePdf";

/**
 * ONE screen for a credit note — everything staff need, in order:
 *   1. What is it   → number, customer, amount, how much is left
 *   2. What for     → reason + lines, which invoice it was raised against
 *   3. Use it       → pick one of THIS customer's unpaid invoices and apply,
 *                     or pay the money back
 *   4. History      → where it has already been used
 *
 * Opened from the Credit Notes page and from the Customer page.
 * Props: creditNote (list-shape row), onClose, onChanged (reload parent)
 */

const STATUS = {
  open: { label: "Not used yet", cls: "bg-amber-100 text-amber-700" },
  partially_used: { label: "Partly used", cls: "bg-amber-100 text-amber-700" },
  used: { label: "Fully used", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-500" },
};
const TYPE_LABEL = {
  manual: "Created manually",
  return: "From a return",
  cancellation: "From a cancelled order",
};
const METHOD_LABEL = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  card: "Card",
  other: "Other",
};

const round2 = (amount) => Math.round((Number(amount) + Number.EPSILON) * 100) / 100;

// Exact rupees + paise for the items table / GST split
const formatMoney = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

function SectionLabel({ icon: Icon, children }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
      {Icon && <Icon size={13} className="text-orange-500" />}
      {children}
    </p>
  );
}

function Field({ label, mono, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd
        className={`mt-0.5 break-words text-xs font-medium text-gray-900 ${mono ? "font-mono" : ""}`}
      >
        {children}
      </dd>
    </div>
  );
}

function StepTitle({ n: stepNumber, children }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-orange-500 text-[11px] font-bold text-white">
        {stepNumber}
      </span>
      {children}
    </p>
  );
}

export default function CreditNoteDetailModal({ creditNote, onClose, onChanged }) {
  const [note, setNote] = useState(creditNote);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [mode, setMode] = useState("invoice"); // "invoice" | "payback"
  const [selectedId, setSelectedId] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const balance = Number(note.balance ?? 0);
  const total = Number(note.amount ?? note.summary?.totalAmount ?? 0);
  const used = round2(total - balance);
  const canUse = ["open", "partially_used"].includes(note.status) && balance > 0.01;
  const canCancel = note.type === "manual" && note.status === "open" && !(note.usage || []).length;
  const statusConfig = STATUS[note.status] || STATUS.open;
  const selected = invoices.find((invoice) => invoice.invoiceId === selectedId);

  const loadInvoices = async () => {
    if (!note.creditNoteId) return;
    setLoadingInvoices(true);
    try {
      const res = await CreditNoteService.getApplyTargets(note.creditNoteId);
      const list = res?.data?.invoices || [];
      setInvoices(list);
      if (res?.data?.creditNote) setNote(res.data.creditNote);
      if (list.length === 1) pickInvoice(list[0], res?.data?.creditNote?.balance);
    } catch {
      setInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    if (canUse) loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const pickInvoice = (invoice, bal = balance) => {
    setSelectedId(invoice.invoiceId);
    setAmount(String(round2(Math.min(Number(bal), invoice.due))));
  };

  const switchMode = (mode) => {
    setMode(mode);
    if (mode === "payback") setAmount(String(balance));
    else if (selected) setAmount(String(round2(Math.min(balance, selected.due))));
    else setAmount("");
  };

  const applyToInvoice = async () => {
    const value = Number(amount);
    if (!selected) return toast.error("First choose an invoice");
    if (!value || value <= 0) return toast.error("Enter the amount to apply");
    if (value > balance + 0.01)
      return toast.error(`Only ${formatCurrency(balance)} is left on this credit note`);
    if (value > selected.due + 0.01)
      return toast.error(
        `${selected.invoiceNumber} only has ${formatCurrency(selected.due)} left to pay`
      );
    setSaving(true);
    try {
      const res = await CreditNoteService.applyToInvoice(note.creditNoteId, {
        invoiceId: selected.invoiceId,
        amount: value,
      });
      const result = res?.data;
      toast.success(
        `${formatCurrency(value)} applied to ${selected.invoiceNumber}` +
          (result?.invoice?.due > 0
            ? ` — ${formatCurrency(result.invoice.due)} still to pay`
            : " — invoice is now fully paid")
      );
      if (result?.creditNote) setNote(result.creditNote);
      setSelectedId(null);
      setAmount("");
      onChanged?.();
      if ((result?.creditNote?.balance ?? 0) > 0.01) loadInvoices();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not apply the credit");
    } finally {
      setSaving(false);
    }
  };

  const payBack = async () => {
    const value = Number(amount);
    if (!value || value <= 0 || value > balance + 0.01)
      return toast.error(`Enter an amount up to ${formatCurrency(balance)}`);
    setSaving(true);
    try {
      const res = await CreditNoteService.refund(note.creditNoteId, {
        amount: value,
        method,
        reference: reference.trim() || undefined,
      });
      toast.success(`${formatCurrency(value)} marked as paid back (${METHOD_LABEL[method]})`);
      if (res?.data) setNote(res.data);
      setReference("");
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not record the payout");
    } finally {
      setSaving(false);
    }
  };

  const cancelNote = async () => {
    const reason = window.prompt(
      `Cancel ${note.creditNoteNumber}? It will not be usable anymore.\nReason (optional):`,
      ""
    );
    if (reason === null) return;
    setSaving(true);
    try {
      const res = await CreditNoteService.cancel(note.creditNoteId, reason);
      toast.success("Credit note cancelled");
      if (res?.data) setNote(res.data);
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not cancel");
    } finally {
      setSaving(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      await generateCreditNotePdf(note);
    } catch {
      toast.error("Could not generate the PDF");
    } finally {
      setDownloading(false);
    }
  };

  const lines = (note.items || note.returnedItems || []).map((item) => {
    const qty = item.qty ?? item.quantity ?? 1;
    const price = Number(item.price || 0);
    return {
      label:
        item.description ||
        `${item.productName || ""}${item.variantName ? ` (${item.variantName})` : ""}`,
      hsn: item.hsnCode,
      qty,
      price,
      gst: item.gstPercent ?? note.sourceOrderGstPercentage ?? null,
      total: Number(item.totalAmount ?? qty * price),
    };
  });
  const billTo = note.billTo || {};
  const seller = note.seller || {};

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* ---------- HEADER ---------- */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 bg-gray-50 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Receipt size={18} className="text-orange-500" />
              <h2 className="font-mono text-base font-bold text-gray-900">
                {note.creditNoteNumber || note.refundId}
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusConfig.cls}`}
              >
                {statusConfig.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {TYPE_LABEL[note.type] || "Credit note"} ·{" "}
              {formatDateTime(note.creditNoteDate || note.refundedAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* ---------- 1. AMOUNTS ---------- */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-gray-100 p-3">
              <p className="text-[11px] font-semibold uppercase text-gray-500">Credit amount</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(total)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-3">
              <p className="text-[11px] font-semibold uppercase text-gray-500">Already used</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(used)}</p>
            </div>
            <div
              className={`rounded-xl p-3 ${canUse ? "bg-emerald-50 ring-1 ring-emerald-200" : "border border-gray-100"}`}
            >
              <p
                className={`text-[11px] font-semibold uppercase ${canUse ? "text-emerald-700" : "text-gray-500"}`}
              >
                Left to use
              </p>
              <p
                className={`mt-1 text-lg font-bold ${canUse ? "text-emerald-700" : "text-gray-900"}`}
              >
                {formatCurrency(balance)}
              </p>
            </div>
          </div>

          {/* ---------- 2. PARTIES ---------- */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 p-4 text-sm">
              <SectionLabel icon={User}>Bill to (customer)</SectionLabel>
              <p className="font-semibold text-gray-900">
                {note.customerName || billTo.contactPerson || "—"}
              </p>
              {(billTo.companyName || note.customerCompany) && (
                <p className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Building2 size={12} className="text-gray-400" />{" "}
                  {billTo.companyName || note.customerCompany}
                </p>
              )}
              <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                <Phone size={12} className="text-gray-400" />{" "}
                {note.customerPhone || billTo.contactNumber || "—"}
              </p>
              {note.customerEmail && (
                <p className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Mail size={12} className="text-gray-400" /> {note.customerEmail}
                </p>
              )}
              {billTo.address && (
                <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-gray-600">
                  <MapPin size={12} className="mt-0.5 shrink-0 text-gray-400" /> {billTo.address}
                </p>
              )}
              <p className="mt-1.5 text-[11px] text-gray-500">
                GSTIN:{" "}
                <span className="font-mono text-gray-800">{billTo.gstin || "Not registered"}</span>
                {note.customerNo != null && <> · Customer #{note.customerNo}</>}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 p-4 text-sm">
              <SectionLabel icon={Building2}>Issued by (seller)</SectionLabel>
              <p className="font-semibold text-gray-900">{seller.companyName || "—"}</p>
              {seller.contactNumber && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                  <Phone size={12} className="text-gray-400" /> {seller.contactNumber}
                </p>
              )}
              {seller.email && (
                <p className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Mail size={12} className="text-gray-400" /> {seller.email}
                </p>
              )}
              {seller.address && (
                <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-gray-600">
                  <MapPin size={12} className="mt-0.5 shrink-0 text-gray-400" /> {seller.address}
                </p>
              )}
              {seller.gstin && (
                <p className="mt-1.5 text-[11px] text-gray-500">
                  GSTIN: <span className="font-mono text-gray-800">{seller.gstin}</span>
                </p>
              )}
            </div>
          </div>

          {/* ---------- 3. DETAILS ---------- */}
          <div className="rounded-xl border border-gray-100 p-4">
            <SectionLabel icon={FileText}>Credit note details</SectionLabel>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Field label="Credit note no." mono>
                {note.creditNoteNumber || note.refundId}
              </Field>
              <Field label="Credit note date">
                {formatDateTime(note.creditNoteDate || note.refundedAt)}
              </Field>
              <Field label="Type">{TYPE_LABEL[note.type] || note.type || "—"}</Field>
              <Field label="Against invoice" mono>
                {note.invoiceNumber || note.sourceInvoiceNumber || "— (no invoice)"}
              </Field>
              <Field label="Invoice date">
                {formatDate(note.invoiceDate || note.sourceOrderDate)}
              </Field>
              <Field label="Reason">{note.reason || "—"}</Field>
              <Field label="Created by">{note.createdBy || note.refundedBy || "—"}</Field>
              <Field label="Created on">{formatDateTime(note.createdAt)}</Field>
              <Field label="Last updated">{formatDateTime(note.updatedAt)}</Field>
            </dl>
            {note.notes && (
              <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                <span className="font-semibold text-gray-900">Notes: </span>
                {note.notes}
              </div>
            )}
          </div>

          {/* ---------- 4. ITEMS ---------- */}
          {lines.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <div className="px-4 pt-4">
                <SectionLabel icon={Package}>Items ({lines.length})</SectionLabel>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-y border-gray-100 bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-2 font-semibold">#</th>
                      <th className="px-2 py-2 font-semibold">Item</th>
                      <th className="px-2 py-2 font-semibold">HSN</th>
                      <th className="px-2 py-2 text-right font-semibold">Qty</th>
                      <th className="px-2 py-2 text-right font-semibold">Rate</th>
                      <th className="px-2 py-2 text-right font-semibold">GST</th>
                      <th className="px-4 py-2 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={index} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-2.5 text-gray-400">{index + 1}</td>
                        <td className="px-2 py-2.5 font-medium text-gray-900">
                          {line.label || "—"}
                        </td>
                        <td className="px-2 py-2.5 font-mono text-gray-600">{line.hsn || "—"}</td>
                        <td className="px-2 py-2.5 text-right text-gray-900">{line.qty}</td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right text-gray-700">
                          {formatMoney(line.price)}
                        </td>
                        <td className="px-2 py-2.5 text-right text-gray-700">
                          {line.gst != null ? `${line.gst}%` : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold text-gray-900">
                          {formatMoney(line.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ml-auto w-full max-w-xs space-y-1 border-t border-gray-100 px-4 py-3 text-xs sm:w-72">
                {note.summary?.totalNet != null && (
                  <div className="flex justify-between text-gray-600">
                    <span>Taxable value</span>
                    <span>{formatMoney(note.summary.totalNet)}</span>
                  </div>
                )}
                {note.summary?.totalTax != null && (
                  <div className="flex justify-between text-gray-600">
                    <span>GST</span>
                    <span>{formatMoney(note.summary.totalTax)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-100 pt-1.5 text-sm font-bold text-gray-900">
                  <span>Total credit</span>
                  <span>{formatMoney(total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ---------- 5. USE IT ---------- */}
          {canUse ? (
            <div className="rounded-xl border-2 border-orange-100 p-4">
              <p className="mb-3 text-sm font-bold text-gray-900">
                What do you want to do with the {formatCurrency(balance)} left?
              </p>

              <div className="mb-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => switchMode("invoice")}
                  className={`rounded-xl border-2 p-3 text-left transition ${
                    mode === "invoice"
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <FileText
                    size={18}
                    className={mode === "invoice" ? "text-orange-500" : "text-gray-400"}
                  />
                  <p className="mt-1 text-sm font-bold text-gray-900">Use on an invoice</p>
                  <p className="text-[11px] text-gray-500">
                    Reduce what the customer has to pay on a bill
                  </p>
                </button>
                <button
                  onClick={() => switchMode("payback")}
                  className={`rounded-xl border-2 p-3 text-left transition ${
                    mode === "payback"
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <IndianRupee
                    size={18}
                    className={mode === "payback" ? "text-orange-500" : "text-gray-400"}
                  />
                  <p className="mt-1 text-sm font-bold text-gray-900">Give money back</p>
                  <p className="text-[11px] text-gray-500">Customer gets cash / UPI instead</p>
                </button>
              </div>

              {mode === "invoice" ? (
                <>
                  <StepTitle n={1}>Choose the invoice</StepTitle>
                  {loadingInvoices ? (
                    <p className="flex items-center gap-2 py-3 text-xs text-gray-500">
                      <Loader2 size={14} className="animate-spin" /> Loading this customer's
                      invoices…
                    </p>
                  ) : invoices.length === 0 ? (
                    <div className="flex flex-col items-center gap-1 rounded-lg bg-gray-50 px-3 py-5 text-center">
                      <Inbox size={22} className="text-gray-300" />
                      <p className="text-sm font-medium text-gray-700">
                        No unpaid invoice for this customer
                      </p>
                      <p className="text-xs text-gray-500">
                        Create their next invoice/order first (then open this again), or use “Check
                        credit” while creating it.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-56 space-y-1.5 overflow-y-auto">
                      {invoices.map((invoice) => {
                        const active = invoice.invoiceId === selectedId;
                        return (
                          <label
                            key={invoice.invoiceId}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 ${
                              active
                                ? "border-orange-500 bg-orange-50"
                                : "border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="cn-target"
                              checked={active}
                              onChange={() => pickInvoice(invoice)}
                              className="accent-orange-500"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-mono text-xs font-semibold text-gray-900">
                                {invoice.invoiceNumber}
                              </p>
                              <p className="text-[11px] text-gray-500">
                                {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")} · Total{" "}
                                {formatCurrency(invoice.total)}
                                {invoice.paid > 0 ? ` · Paid ${formatCurrency(invoice.paid)}` : ""}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase text-gray-500">To pay</p>
                              <p className="text-sm font-bold text-red-600">
                                {formatCurrency(invoice.due)}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {selected && (
                    <>
                      <div className="mt-4">
                        <StepTitle n={2}>How much credit to use?</StepTitle>
                        <input
                          type="number"
                          min="0"
                          value={amount}
                          onChange={(event) => setAmount(event.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-semibold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                        />
                        <p className="mt-1 text-[11px] text-gray-500">
                          Up to {formatCurrency(Math.min(balance, selected.due))} (credit left{" "}
                          {formatCurrency(balance)}, invoice to pay {formatCurrency(selected.due)})
                        </p>
                      </div>

                      {Number(amount) > 0 && (
                        <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                          After applying: <b>{selected.invoiceNumber}</b> to pay{" "}
                          <b>
                            {formatCurrency(Math.max(round2(selected.due - Number(amount)), 0))}
                          </b>{" "}
                          · credit left{" "}
                          <b>{formatCurrency(Math.max(round2(balance - Number(amount)), 0))}</b>
                        </div>
                      )}

                      <div className="mt-4">
                        <StepTitle n={3}>Confirm</StepTitle>
                        <button
                          onClick={applyToInvoice}
                          disabled={saving}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60"
                        >
                          {saving ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={16} />
                          )}
                          Apply {formatCurrency(Number(amount) || 0)} to {selected.invoiceNumber}
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <StepTitle n={1}>How was the money given back?</StepTitle>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {Object.entries(METHOD_LABEL).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => setMethod(key)}
                        className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                          method === key
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <StepTitle n={2}>Amount</StepTitle>
                      <input
                        type="number"
                        min="0"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-semibold outline-none focus:border-orange-500"
                      />
                      <p className="mt-1 text-[11px] text-gray-500">
                        Up to {formatCurrency(balance)}
                      </p>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-bold text-gray-900">Reference (optional)</p>
                      <input
                        value={reference}
                        onChange={(event) => setReference(event.target.value)}
                        placeholder="UPI ref / cheque no."
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={payBack}
                    disabled={saving}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    Mark {formatCurrency(Number(amount) || 0)} as paid back ({METHOD_LABEL[method]})
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
              {note.status === "cancelled"
                ? `This credit note was cancelled${note.cancelReason ? ` — ${note.cancelReason}` : ""}.`
                : "This credit note is fully used. Nothing left to apply."}
            </div>
          )}

          {/* ---------- 6. HISTORY ---------- */}
          {(note.usage || []).length > 0 && (
            <div>
              <SectionLabel icon={History}>Where it was used ({note.usage.length})</SectionLabel>
              <ul className="space-y-2">
                {note.usage.map((usageEntry, index) => (
                  <li
                    key={usageEntry.usageId || index}
                    className="rounded-lg border border-gray-100 px-3 py-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-gray-800">
                          {usageEntry.kind === "applied" ? (
                            <>
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Applied
                              </span>{" "}
                              to{" "}
                              <b className="font-mono">
                                {usageEntry.appliedToNumber || usageEntry.appliedToId}
                              </b>
                              <span className="text-gray-500">
                                {usageEntry.paidExistingInvoice
                                  ? " · as payment"
                                  : " · as discount"}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                                Paid back
                              </span>{" "}
                              via{" "}
                              <b>{METHOD_LABEL[usageEntry.method] || usageEntry.method || "—"}</b>
                              {usageEntry.reference && (
                                <span className="text-gray-500"> · Ref {usageEntry.reference}</span>
                              )}
                            </>
                          )}
                        </p>
                        {usageEntry.notes && (
                          <p className="mt-1 text-gray-600">{usageEntry.notes}</p>
                        )}
                        <p className="mt-1 text-[11px] text-gray-400">
                          {formatDateTime(usageEntry.at)}
                          {usageEntry.by ? ` · by ${usageEntry.by}` : ""}
                        </p>
                      </div>
                      <b className="whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(usageEntry.amount)}
                      </b>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ---------- FOOTER ---------- */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-3">
          <div>
            {canCancel && (
              <button
                onClick={cancelNote}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Ban size={14} /> Cancel this credit note
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={download}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileDown size={14} />
              )}{" "}
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
