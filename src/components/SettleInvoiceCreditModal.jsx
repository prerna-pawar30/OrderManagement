import React, { useState } from "react";
import { X, Loader2, Undo2 } from "lucide-react";
import toast from "react-hot-toast";
import { InvoiceService } from "../api/services";
import { Field, Select, TextInput } from "./FormField";
import { formatCurrency } from "../lib/format";
import { generateCreditNotePdf } from "../lib/generateCreditNotePdf";

/**
 * Settles a pending refund straight from the Invoice pages — works for any
 * invoice regardless of where it came from (manual order, ecommerce order,
 * or a standalone "Create Invoice" one), since refundableAmount now lives
 * on the invoice itself. This is the general-purpose sibling of
 * SettleRefundModal (which is specific to the manual-order detail drawer
 * and builds a more accurate returnedItems list from the order's own
 * returnRequests) — use this one anywhere only the invoice is on hand.
 */
export default function SettleInvoiceCreditModal({ invoice, onClose, onDone }) {
  const outstanding = Number(invoice.refundableAmount || 0);

  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(String(outstanding));
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (value > outstanding + 0.01) {
      toast.error(`Can't settle more than what's owed (${formatCurrency(outstanding)})`);
      return;
    }
    setLoading(true);
    try {
      const res = await InvoiceService.settleCredit(invoice.invoiceId, {
        amount: value,
        method,
        reference: reference.trim() || undefined,
      });

      if (method === "credit_note" && res?.data) {
        toast.success("Marked as settled via store credit");
        try {
          await generateCreditNotePdf(res.data);
        } catch {
          // Non-fatal — still saved and downloadable later from the Credit Notes page.
        }
      } else {
        toast.success("Refund marked as paid");
      }
      onDone?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not settle the refund");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-amber-500">
              <Undo2 size={17} />
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900">Settle refund</h3>
              <p className="text-xs text-gray-500">
                {invoice.invoiceNumber} · {formatCurrency(outstanding)} owed
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Field label="How was this settled?" required>
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">Cash — paid back in person</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
              <option value="credit_note">Store credit — they'll take it next time</option>
            </Select>
          </Field>
          <Field label="Amount" required hint={`Up to ${formatCurrency(outstanding)}`}>
            <TextInput
              type="number"
              min="0"
              max={outstanding}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          {method !== "credit_note" && (
            <Field label="Reference" hint="Optional — transaction ID, cheque no., etc.">
              <TextInput
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. UPI ref 302819..."
              />
            </Field>
          )}
          {method === "credit_note" && (
            <p className="text-xs text-gray-500">
              This just records that the credit is spoken for — apply it on their next order or invoice.
            </p>
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
          <button
            onClick={submit}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500/90 disabled:opacity-60"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
