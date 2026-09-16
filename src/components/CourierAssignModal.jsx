import React, { useState } from "react";
import { X, Loader2, Truck } from "lucide-react";
import toast from "react-hot-toast";
import { ManualOrderService } from "../api/services";
import { Field, TextInput } from "./FormField";

// Confirming an order (placed/packed -> confirmed) means a courier has been
// picked, so this captures that in the same step: courier details are saved
// first, then the status moves to "confirmed" — mirroring how staff actually
// work the counter (no courier, no confirmation).
export default function CourierAssignModal({ order, onClose, onDone }) {
  const [corourseServiceName, setCorourseServiceName] = useState("");
  const [DOCNumber, setDOCNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!corourseServiceName.trim()) {
      toast.error("Courier service name is required");
      return;
    }
    setLoading(true);
    try {
      await ManualOrderService.updateCourier(order.orderId, {
        corourseServiceName: corourseServiceName.trim(),
        DOCNumber: DOCNumber.trim() || undefined,
      });
      await ManualOrderService.updateStatus(order.orderId, "confirmed");
      toast.success("Order confirmed with courier details");
      onDone();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not confirm this order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/50 px-4">
      <div className="w-full max-w-md rounded-xl2 bg-white p-6 shadow-panel dark:bg-ink-900">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
              <Truck size={17} />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-ink-950 dark:text-white">
                Confirm order
              </h3>
              <p className="text-xs text-mist-500 dark:text-mist-300">{order.orderId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-mist-400 hover:text-ink-950 dark:text-mist-500 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-4 text-sm text-mist-700 dark:text-mist-300">
          Add courier details before confirming — saved to the order, then status moves to
          "Confirmed".
        </p>

        <div className="mt-4 space-y-3">
          <Field label="Courier service" required>
            <TextInput
              value={corourseServiceName}
              onChange={(e) => setCorourseServiceName(e.target.value)}
              placeholder="e.g. Blue Dart"
              autoFocus
            />
          </Field>
          <Field label="Docket / DOC number" hint="Optional — add once available">
            <TextInput
              value={DOCNumber}
              onChange={(e) => setDOCNumber(e.target.value)}
              placeholder="e.g. 1234DFN"
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
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Confirm order
          </button>
        </div>
      </div>
    </div>
  );
}
