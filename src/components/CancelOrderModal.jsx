import React, { useState } from "react";
import { X, Loader2, TriangleAlert } from "lucide-react";
import toast from "react-hot-toast";
import { ManualOrderService } from "../api/services";

export default function CancelOrderModal({ order, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await ManualOrderService.cancel(order.orderId, reason || "Cancelled by staff");
      toast.success("Order cancelled");
      onDone();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not cancel this order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/50 px-4">
      <div className="w-full max-w-md rounded-xl2 bg-white p-6 shadow-panel">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-coral-100 text-coral-500">
              <TriangleAlert size={17} />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-ink-950">Cancel order</h3>
              <p className="text-xs text-mist-500">{order.orderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-mist-400 hover:text-ink-950">
            <X size={18} />
          </button>
        </div>

        <p className="mt-4 text-sm text-mist-700">
          This marks the order as cancelled{order.paymentStatus === "paid" ? " and flags the payment as refund pending" : ""}. This can't be undone.
        </p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mist-500">
            Reason
          </span>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Cancelled by staff"
            className="w-full rounded-lg border border-mist-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500"
          />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-mist-200 px-4 py-2 text-sm font-medium text-mist-700 hover:bg-mist-50"
          >
            Keep order
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white hover:bg-coral-500/90 disabled:opacity-60"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Cancel order
          </button>
        </div>
      </div>
    </div>
  );
}
