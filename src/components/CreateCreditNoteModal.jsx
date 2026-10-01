import React, { useEffect, useState } from "react";
import { X, Loader2, FilePlus2, Plus, Trash2, Search } from "lucide-react";
import toast from "react-hot-toast";
import { InvoiceService, CreditNoteService } from "../api/services";
import { Field, Select, TextInput } from "./FormField";
import { formatCurrency } from "../lib/format";
import { generateCreditNotePdf } from "../lib/generateCreditNotePdf";

/**
 * "Create Credit Note" — the credit-note twin of "Create Invoice".
 * Makes a credit note BY HAND (rate difference, discount after billing,
 * short supply, goodwill…) with nothing returned. Returns still go through
 * the return flows; those create their credit note automatically.
 *
 * - `invoice` passed (from InvoiceDetailModal) → against that invoice.
 * - no `invoice` (from CreditNotesPage) → search an invoice, or choose
 *   "No invoice" and type the customer in.
 *
 * Any PAID / PARTIALLY PAID invoice works — standalone, manual order or
 * ecommerce — because a manual credit note lives in its own collection and
 * never touches the invoice's refund fields.
 */

const REASONS = [
  "Rate / price difference",
  "Discount given after billing",
  "Short supply",
  "Goodwill / customer complaint",
  "Billing error",
];

export const isCreditNoteEligible = (inv) => inv && ["paid", "partially_paid"].includes(inv.status);

// Rough client-side cap — the backend has the final say.
const invoiceCap = (inv, manualCredited = 0) => {
  const totalPayable = Number(inv?.summary?.totalPayAmount || 0);
  const recordedPaid = Number(inv?.summary?.paidAmount || 0);
  const received = inv?.status === "paid" ? Math.max(recordedPaid, totalPayable) : recordedPaid;
  const committed = Number(inv?.partialRefundAmount || 0) + Number(inv?.refundableAmount || 0);
  return Math.max(received - committed - manualCredited, 0);
};

function InvoicePicker({ onPick, onNoInvoice }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await InvoiceService.searchInvoices(q));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Invoice number or customer / company name…"
          className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-orange-500"
        />
      </div>

      <div className="max-h-64 space-y-1.5 overflow-y-auto">
        {loading && (
          <p className="flex items-center gap-2 py-4 text-xs text-gray-500">
            <Loader2 size={14} className="animate-spin" /> Searching…
          </p>
        )}
        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <p className="py-4 text-xs text-gray-500">No invoices found.</p>
        )}
        {results.map((inv) => {
          const eligible = isCreditNoteEligible(inv);
          return (
            <button
              key={inv.invoiceId}
              disabled={!eligible}
              onClick={() => onPick(inv)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 text-left hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold text-gray-900">{inv.invoiceNumber}</p>
                <p className="truncate text-xs text-gray-500">
                  {inv.billTo?.contactPerson || inv.billTo?.companyName} · {inv.billTo?.contactNumber}
                </p>
                {!eligible && <p className="text-[11px] text-gray-400">Not paid yet — edit the invoice instead</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(inv.summary?.totalPayAmount || 0)}
                </p>
                <p className="text-[11px] capitalize text-gray-500">{String(inv.status).replace("_", " ")}</p>
              </div>
            </button>
          );
        })}
      </div>

      <button onClick={onNoInvoice} className="text-xs font-semibold text-gray-500 hover:text-gray-900 hover:underline">
        No invoice — enter customer manually
      </button>
    </div>
  );
}

export default function CreateCreditNoteModal({ invoice: initialInvoice, onClose, onDone }) {
  // mode: "pick" → choosing; "invoice" → against an invoice; "free" → no invoice
  const [mode, setMode] = useState(initialInvoice ? "invoice" : "pick");
  const [invoice, setInvoice] = useState(initialInvoice || null);
  const [manualCredited, setManualCredited] = useState(0);

  const [customer, setCustomer] = useState({ contactPerson: "", companyName: "", contactNumber: "", gstin: "" });
  const [reason, setReason] = useState(REASONS[0]);
  const [useLines, setUseLines] = useState(false);
  const [amount, setAmount] = useState("");
  const [gstPercent, setGstPercent] = useState("");
  const [lines, setLines] = useState([{ description: "", qty: 1, price: "" }]);
  const [payBack, setPayBack] = useState(""); // "" = keep as open credit
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);

  // Existing manual credit notes on this invoice reduce what's left to credit.
  useEffect(() => {
    if (!invoice?.invoiceId) return;
    CreditNoteService.getAll({ invoiceId: invoice.invoiceId, type: "manual", status: "open,partially_used,used" })
      .then((res) => setManualCredited(Number(res?.data?.summary?.totalIssued || 0)))
      .catch(() => setManualCredited(0));
  }, [invoice?.invoiceId]);

  const cap = mode === "invoice" ? invoiceCap(invoice, manualCredited) : Infinity;

  const cleanLines = lines
    .map((l) => ({ description: l.description.trim(), qty: Number(l.qty) || 1, price: Number(l.price) || 0 }))
    .filter((l) => l.description && l.price > 0);
  const total = useLines ? cleanLines.reduce((s, l) => s + l.qty * l.price, 0) : Number(amount) || 0;

  const updateLine = (i, patch) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const submit = async () => {
    if (!reason.trim()) return toast.error("Reason is required");
    if (total <= 0) return toast.error(useLines ? "Add at least one line with a rate" : "Enter a valid amount");
    if (total > cap + 0.01) return toast.error(`Max credit on this invoice is ${formatCurrency(cap)}`);
    if (mode === "free" && (!customer.contactPerson.trim() || !customer.contactNumber.trim())) {
      return toast.error("Customer name and phone are required");
    }

    setLoading(true);
    try {
      const res = await CreditNoteService.create({
        invoiceId: mode === "invoice" ? invoice.invoiceId : undefined,
        billTo:
          mode === "free"
            ? {
                contactPerson: customer.contactPerson.trim(),
                companyName: customer.companyName.trim() || customer.contactPerson.trim(),
                contactNumber: customer.contactNumber.trim(),
                gstin: customer.gstin.trim(),
              }
            : undefined,
        reason: reason.trim(),
        amount: useLines ? undefined : total,
        items: useLines ? cleanLines : undefined,
        gstPercent: gstPercent === "" ? undefined : Number(gstPercent),
        refundMethod: payBack || undefined,
        reference: payBack ? reference.trim() || undefined : undefined,
      });
      const note = res?.data;
      toast.success(
        payBack
          ? `${note?.creditNoteNumber} created and paid back`
          : `${note?.creditNoteNumber} created — it'll show up in “Check credit” for this customer`
      );
      if (note) {
        try {
          await generateCreditNotePdf(note); // backend returns the PDF-ready shape
        } catch {
          // Non-fatal — downloadable later from the Credit Notes page.
        }
      }
      onDone?.(note);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not create the credit note");
    } finally {
      setLoading(false);
    }
  };

  const showForm = mode === "invoice" || mode === "free";

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-orange-100 text-orange-500">
              <FilePlus2 size={17} />
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900">New credit note</h3>
              <p className="text-xs text-gray-500">
                {mode === "invoice"
                  ? `Against ${invoice.invoiceNumber} · up to ${formatCurrency(cap)}`
                  : mode === "free"
                  ? "No invoice — customer entered manually"
                  : "Pick the invoice this credit is against"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4">
          {mode === "pick" && (
            <InvoicePicker
              onPick={(inv) => {
                setInvoice(inv);
                setMode("invoice");
              }}
              onNoInvoice={() => setMode("free")}
            />
          )}

          {showForm && (
            <div className="space-y-3">
              {mode === "invoice" && (
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                  <span className="text-gray-600">
                    {invoice.billTo?.contactPerson || invoice.billTo?.companyName} · {invoice.billTo?.contactNumber}
                  </span>
                  {!initialInvoice && (
                    <button onClick={() => setMode("pick")} className="font-semibold text-orange-600 hover:underline">
                      Change
                    </button>
                  )}
                </div>
              )}

              {mode === "free" && (
                <>
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                    For GST, a credit note should normally refer to the original invoice. Use this only when there
                    isn't one in the system.{" "}
                    <button onClick={() => setMode("pick")} className="font-semibold underline">
                      Pick an invoice instead
                    </button>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Customer name" required>
                      <TextInput value={customer.contactPerson} onChange={(e) => setCustomer({ ...customer, contactPerson: e.target.value })} />
                    </Field>
                    <Field label="Phone" required>
                      <TextInput value={customer.contactNumber} onChange={(e) => setCustomer({ ...customer, contactNumber: e.target.value })} />
                    </Field>
                    <Field label="Company">
                      <TextInput value={customer.companyName} onChange={(e) => setCustomer({ ...customer, companyName: e.target.value })} />
                    </Field>
                    <Field label="GSTIN">
                      <TextInput value={customer.gstin} onChange={(e) => setCustomer({ ...customer, gstin: e.target.value })} />
                    </Field>
                  </div>
                </>
              )}

              {mode === "invoice" && cap <= 0.01 && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Nothing left to credit — everything paid on this invoice is already refunded or credited.
                </p>
              )}

              <Field label="Reason" required>
                <TextInput
                  list="credit-note-reasons"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this credit being given?"
                />
                <datalist id="credit-note-reasons">
                  {REASONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </Field>

              <div className="flex gap-4 text-xs font-medium text-gray-700">
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={!useLines} onChange={() => setUseLines(false)} /> Single amount
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={useLines} onChange={() => setUseLines(true)} /> Line items
                </label>
              </div>

              {!useLines ? (
                <Field label="Amount (incl. GST)" required hint={Number.isFinite(cap) ? `Up to ${formatCurrency(cap)}` : undefined}>
                  <TextInput type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
              ) : (
                <div className="space-y-2">
                  {lines.map((l, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={l.description}
                        onChange={(e) => updateLine(i, { description: e.target.value })}
                        placeholder="Description"
                        className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-orange-500"
                      />
                      <input
                        type="number"
                        min="1"
                        value={l.qty}
                        onChange={(e) => updateLine(i, { qty: e.target.value })}
                        className="w-14 rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-orange-500"
                        title="Qty"
                      />
                      <input
                        type="number"
                        min="0"
                        value={l.price}
                        onChange={(e) => updateLine(i, { price: e.target.value })}
                        placeholder="Rate"
                        className="w-24 rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-orange-500"
                        title="Rate incl. GST"
                      />
                      <button
                        onClick={() => setLines((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p))}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setLines((p) => [...p, { description: "", qty: 1, price: "" }])}
                    className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline"
                  >
                    <Plus size={13} /> Add line
                  </button>
                </div>
              )}

              <Field
                label="GST %"
                hint={mode === "invoice" ? "Leave empty to use the invoice's GST rate" : "Leave empty for 0%"}
              >
                <TextInput type="number" min="0" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} />
              </Field>

              <Field label="What happens to this credit?" required>
                <Select value={payBack} onChange={(e) => setPayBack(e.target.value)}>
                  <option value="">Keep as credit — use on next order/invoice</option>
                  <option value="cash">Paid back now — Cash</option>
                  <option value="upi">Paid back now — UPI</option>
                  <option value="bank_transfer">Paid back now — Bank transfer</option>
                  <option value="card">Paid back now — Card</option>
                  <option value="other">Paid back now — Other</option>
                </Select>
              </Field>

              {payBack && (
                <Field label="Reference" hint="Optional — transaction ID, cheque no., etc.">
                  <TextInput value={reference} onChange={(e) => setReference(e.target.value)} />
                </Field>
              )}

              <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                <span className="text-xs text-gray-500">Credit total</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(total)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          {showForm && (
            <button
              onClick={submit}
              disabled={loading || (mode === "invoice" && cap <= 0.01)}
              className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Create credit note
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
