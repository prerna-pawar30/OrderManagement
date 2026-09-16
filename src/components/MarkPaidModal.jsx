import React, { useState } from "react";
import { X, Loader2, IndianRupee } from "lucide-react";
import toast from "react-hot-toast";
import { ManualOrderService } from "../api/services";
import { Field, Select, TextInput } from "./FormField";
import { formatCurrency } from "../lib/format";

// Marking a pending order as paid needs a payment method (the backend
// requires it for paymentStatus: "paid"), so this is a quick modal rather
// than a one-click action.
export default function MarkPaidModal({ order, onClose, onDone }) {
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [paymentReference, setPaymentReference] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await ManualOrderService.updatePaymentStatus(order.orderId, {
        paymentStatus: "paid",
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
      });
      toast.success("Payment marked as paid");
      onDone();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update payment status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/50 px-4">
      <div className="w-full max-w-md rounded-xl2 bg-white p-6 shadow-panel dark:bg-ink-900">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-mint-100 text-mint-500 dark:bg-mint-500/15 dark:text-mint-400">
              <IndianRupee size={17} />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-ink-950 dark:text-white">
                Mark as paid
              </h3>
              <p className="text-xs text-mist-500 dark:text-mist-300">
                {order.orderId} · {formatCurrency(order.grandTotal)}
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
          <Field label="Payment method" required>
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Reference" hint="Optional — transaction ID, cheque no., etc.">
            <TextInput
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g. UPI ref 302819..."
            />
          </Field>
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
            className="flex items-center gap-2 rounded-lg bg-mint-500 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-500/90 disabled:opacity-60"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Mark as paid
          </button>
        </div>
      </div>
    </div>
  );
}
