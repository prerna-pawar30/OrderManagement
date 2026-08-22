import React, { useMemo, useState } from "react";
import { X, Loader2, Undo2 } from "lucide-react";
import toast from "react-hot-toast";
import { ManualOrderService } from "../api/services";
import { Field, Select, TextInput } from "./FormField";
import { formatCurrency } from "../lib/format";
import { generateCreditNotePdf } from "../lib/generateCreditNotePdf";

// Works out how much is still owed on this order — mirrors the same
// calculation the backend does, just for display before the staff commits.
const outstandingOn = (order) => {
  if (order.orderStatus === "cancelled") {
    return Math.max(Number(order.refundAmount || 0) - Number(order.partialRefundAmount || 0), 0);
  }
  const totalReturnedValue = (order.returnRequests || []).reduce(
    (sum, rr) => sum + (rr.items || []).reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0),
    0
  );
  return Math.max(totalReturnedValue - Number(order.partialRefundAmount || 0), 0);
};

/**
 * This is the ONLY way an order sitting at "refund_pending" or
 * "partial_refunded" moves toward "refunded" once the return itself has
 * already been recorded — createManualReturnService only auto-settles it
 * if "I've already refunded this" was ticked at return time.
 */
export default function SettleRefundModal({ order, onClose, onDone }) {
  const outstanding = useMemo(() => outstandingOn(order), [order]);

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
      const res = await ManualOrderService.settleCredit(order.orderId, {
        amount: value,
        method,
        reference: reference.trim() || undefined,
      });

      if (method === "credit_note" && res?.data) {
        toast.success("Marked as settled via store credit");
        try {
          await generateCreditNotePdf({
            refundId: res.data.refundId,
            amount: res.data.amountSettled,
            refundedAt: new Date().toISOString(),
            refundedBy: res.data.refundedBy,
            sourceOrderId: res.data.orderId,
            sourceInvoiceNumber: res.data.sourceInvoiceNumber,
            orderDate: res.data.orderDate,
            customerName: res.data.customerName,
            customerPhone: res.data.customerPhone,
            customerEmail: res.data.customerEmail,
            returnedItems: res.data.returnedItems,
            appliedToOrderId: res.data.appliedToOrderId,
            appliedInvoiceNumber: res.data.appliedInvoiceNumber,
            appliedOrderDate: res.data.appliedOrderDate,
            appliedOrderGrandTotal: res.data.appliedOrderGrandTotal,
            appliedOrderItems: res.data.appliedOrderItems,
            sourceOrderGstPercentage: res.data.sourceOrderGstPercentage,
          });
        } catch (pdfErr) {
          // Non-fatal — the credit note is still saved and downloadable
          // later from the Credit Notes page even if this PDF failed.
        }
      } else {
        toast.success("Refund marked as paid");
      }
      onDone();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not settle the refund");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/50 px-4">
      <div className="w-full max-w-md rounded-xl2 bg-white p-6 shadow-panel dark:bg-ink-900">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400">
              <Undo2 size={17} />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-ink-950 dark:text-white">Settle refund</h3>
              <p className="text-xs text-mist-500 dark:text-mist-300">
                {order.orderId} · {formatCurrency(outstanding)} owed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-mist-400 hover:text-ink-950 dark:text-mist-500 dark:hover:text-white"
          >
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
            <p className="text-xs text-mist-500 dark:text-mist-300">
              This just records that the credit is spoken for — apply it as a discount when you create
              their next order (use "Check credit" there).
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-mist-200 px-4 py-2 text-sm font-medium text-mist-700 hover:bg-mist-50 disabled:opacity-60 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
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
