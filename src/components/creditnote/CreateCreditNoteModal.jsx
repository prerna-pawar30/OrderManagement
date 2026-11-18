/**
 * Modal to create a credit note, either against an invoice (picked with InvoicePicker) or for a
 * customer typed in by hand; saves it and offers the PDF.
 *
 * Used by: components/invoice/InvoiceDetailModal.jsx, pages/CreditNotesPage.jsx
 * API: CreditNoteService.create, CreditNoteService.getAll
 */

import { useEffect, useState } from "react";
import { X as CloseIcon, Loader2, FilePlus2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { CreditNoteService } from "../../backend/ApiService";
import { Field, Select, TextInput } from "../ui/FormField";
import { formatCurrency } from "../../utils/Format";
import { generateCreditNotePdf } from "../../utils/CreditNotePdf";
import { InvoicePicker } from "./InvoicePicker";
export { isCreditNoteEligible } from "../../utils/CreditNoteRules";

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

// Rough client-side cap — the backend has the final say.
const invoiceCap = (invoice, manualCredited = 0) => {
  const totalPayable = Number(invoice?.summary?.totalPayAmount || 0);
  const recordedPaid = Number(invoice?.summary?.paidAmount || 0);
  const received = invoice?.status === "paid" ? Math.max(recordedPaid, totalPayable) : recordedPaid;
  const committed =
    Number(invoice?.partialRefundAmount || 0) + Number(invoice?.refundableAmount || 0);
  return Math.max(received - committed - manualCredited, 0);
};

export default function CreateCreditNoteModal({ invoice: initialInvoice, onClose, onDone }) {
  // mode: "pick" → choosing; "invoice" → against an invoice; "free" → no invoice
  const [mode, setMode] = useState(initialInvoice ? "invoice" : "pick");
  const [invoice, setInvoice] = useState(initialInvoice || null);
  const [manualCredited, setManualCredited] = useState(0);

  const [customer, setCustomer] = useState({
    contactPerson: "",
    companyName: "",
    contactNumber: "",
    gstin: "",
  });
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
    CreditNoteService.getAll({
      invoiceId: invoice.invoiceId,
      type: "manual",
      status: "open,partially_used,used",
    })
      .then((res) => setManualCredited(Number(res?.data?.summary?.totalIssued || 0)))
      .catch(() => setManualCredited(0));
  }, [invoice?.invoiceId]);

  const cap = mode === "invoice" ? invoiceCap(invoice, manualCredited) : Infinity;

  const cleanLines = lines
    .map((line) => ({
      description: line.description.trim(),
      qty: Number(line.qty) || 1,
      price: Number(line.price) || 0,
    }))
    .filter((line) => line.description && line.price > 0);
  const total = useLines
    ? cleanLines.reduce((total, cleanLine) => total + cleanLine.qty * cleanLine.price, 0)
    : Number(amount) || 0;

  const updateLine = (lineIndex, patch) =>
    setLines((prev) => prev.map((line, idx) => (idx === lineIndex ? { ...line, ...patch } : line)));

  const submit = async () => {
    if (!reason.trim()) return toast.error("Reason is required");
    if (total <= 0)
      return toast.error(useLines ? "Add at least one line with a rate" : "Enter a valid amount");
    if (total > cap + 0.01)
      return toast.error(`Max credit on this invoice is ${formatCurrency(cap)}`);
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
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="mt-4">
          {mode === "pick" && (
            <InvoicePicker
              onPick={(invoice) => {
                setInvoice(invoice);
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
                    {invoice.billTo?.contactPerson || invoice.billTo?.companyName} ·{" "}
                    {invoice.billTo?.contactNumber}
                  </span>
                  {!initialInvoice && (
                    <button
                      onClick={() => setMode("pick")}
                      className="font-semibold text-orange-600 hover:underline"
                    >
                      Change
                    </button>
                  )}
                </div>
              )}

              {mode === "free" && (
                <>
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                    For GST, a credit note should normally refer to the original invoice. Use this
                    only when there isn't one in the system.{" "}
                    <button onClick={() => setMode("pick")} className="font-semibold underline">
                      Pick an invoice instead
                    </button>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Customer name" required>
                      <TextInput
                        value={customer.contactPerson}
                        onChange={(event) =>
                          setCustomer({ ...customer, contactPerson: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Phone" required>
                      <TextInput
                        value={customer.contactNumber}
                        onChange={(event) =>
                          setCustomer({ ...customer, contactNumber: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Company">
                      <TextInput
                        value={customer.companyName}
                        onChange={(event) =>
                          setCustomer({ ...customer, companyName: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="GSTIN">
                      <TextInput
                        value={customer.gstin}
                        onChange={(event) =>
                          setCustomer({ ...customer, gstin: event.target.value })
                        }
                      />
                    </Field>
                  </div>
                </>
              )}

              {mode === "invoice" && cap <= 0.01 && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Nothing left to credit — everything paid on this invoice is already refunded or
                  credited.
                </p>
              )}

              <Field label="Reason" required>
                <TextInput
                  list="credit-note-reasons"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Why is this credit being given?"
                />
                <datalist id="credit-note-reasons">
                  {REASONS.map((reason) => (
                    <option key={reason} value={reason} />
                  ))}
                </datalist>
              </Field>

              <div className="flex gap-4 text-xs font-medium text-gray-700">
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={!useLines} onChange={() => setUseLines(false)} />{" "}
                  Single amount
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={useLines} onChange={() => setUseLines(true)} /> Line
                  items
                </label>
              </div>

              {!useLines ? (
                <Field
                  label="Amount (incl. GST)"
                  required
                  hint={Number.isFinite(cap) ? `Up to ${formatCurrency(cap)}` : undefined}
                >
                  <TextInput
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </Field>
              ) : (
                <div className="space-y-2">
                  {lines.map((line, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={line.description}
                        onChange={(event) => updateLine(index, { description: event.target.value })}
                        placeholder="Description"
                        className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-orange-500"
                      />
                      <input
                        type="number"
                        min="1"
                        value={line.qty}
                        onChange={(event) => updateLine(index, { qty: event.target.value })}
                        className="w-14 rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-orange-500"
                        title="Qty"
                      />
                      <input
                        type="number"
                        min="0"
                        value={line.price}
                        onChange={(event) => updateLine(index, { price: event.target.value })}
                        placeholder="Rate"
                        className="w-24 rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-orange-500"
                        title="Rate incl. GST"
                      />
                      <button
                        onClick={() =>
                          setLines((prevLines) =>
                            prevLines.length > 1
                              ? prevLines.filter((_, idx) => idx !== index)
                              : prevLines
                          )
                        }
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setLines((prevLines) => [
                        ...prevLines,
                        { description: "", qty: 1, price: "" },
                      ])
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline"
                  >
                    <Plus size={13} /> Add line
                  </button>
                </div>
              )}

              <Field
                label="GST %"
                hint={
                  mode === "invoice"
                    ? "Leave empty to use the invoice's GST rate"
                    : "Leave empty for 0%"
                }
              >
                <TextInput
                  type="number"
                  min="0"
                  value={gstPercent}
                  onChange={(event) => setGstPercent(event.target.value)}
                />
              </Field>

              <Field label="What happens to this credit?" required>
                <Select value={payBack} onChange={(event) => setPayBack(event.target.value)}>
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
                  <TextInput
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                  />
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
