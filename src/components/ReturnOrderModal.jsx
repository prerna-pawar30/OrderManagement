import React, { useState } from "react";
import { X, Loader2, Undo2 } from "lucide-react";
import toast from "react-hot-toast";
import { ManualOrderService } from "../api/services";
import { formatCurrency } from "../lib/format";

export default function ReturnOrderModal({ order, mode, onClose, onDone }) {
  const isPartial = mode === "partial";

  const returnableItems = order.items
    .map((item) => ({
      ...item,
      available: Number(item.quantity) - Number(item.returnedQuantity || 0),
    }))
    .filter((item) => item.available > 0);

  const [selected, setSelected] = useState(() =>
    Object.fromEntries(
      returnableItems.map((item) => [
        `${item.productName}::${item.variantName || ""}`,
        { checked: !isPartial, quantity: item.available },
      ])
    )
  );
  const [refundNow, setRefundNow] = useState(true);
  const [refundMethod, setRefundMethod] = useState(order.paymentMethod || "upi");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const toggle = (key, patch) =>
    setSelected((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const chosenItems = returnableItems
    .filter((item) => selected[`${item.productName}::${item.variantName || ""}`]?.checked)
    .map((item) => {
      const key = `${item.productName}::${item.variantName || ""}`;
      const qty = isPartial
        ? Number(selected[key]?.quantity) || 0
        : item.available;
      return { ...item, quantity: qty };
    })
    .filter((item) => item.quantity > 0);

  const refundTotal = chosenItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const submit = async () => {
    if (chosenItems.length === 0) {
      toast.error("Select at least one item to return");
      return;
    }
    setLoading(true);
    try {
      await ManualOrderService.createReturn({
        orderId: order.orderId,
        returnItems: chosenItems.map((i) => ({
          productName: i.productName,
          variantName: i.variantName,
          quantity: i.quantity,
          reason: notes || (isPartial ? "Partial return" : "Full return"),
        })),
        refundNow,
        refundMethod: refundNow ? refundMethod : undefined,
        notes,
      });
      toast.success(isPartial ? "Partial return recorded" : "Return recorded");
      onDone();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not record this return");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/50 px-4">
      <div className="w-full max-w-lg rounded-xl2 bg-white p-6 shadow-panel">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-amber-500">
              <Undo2 size={17} />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-ink-950">
                {isPartial ? "Partial return" : "Return order"}
              </h3>
              <p className="text-xs text-mist-500">{order.orderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-mist-400 hover:text-ink-950">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto scrollbar-thin pr-1">
          {returnableItems.length === 0 && (
            <p className="rounded-lg bg-mist-50 px-3 py-3 text-sm text-mist-500">
              Every item on this order has already been returned.
            </p>
          )}
          {returnableItems.map((item) => {
            const key = `${item.productName}::${item.variantName || ""}`;
            const row = selected[key];
            return (
              <div key={key} className="flex items-center gap-3 rounded-lg border border-mist-200 p-3">
                <input
                  type="checkbox"
                  checked={row?.checked || false}
                  onChange={(e) => toggle(key, { checked: e.target.checked })}
                  className="h-4 w-4 rounded border-mist-300 text-teal-500 focus:ring-teal-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink-950">
                    {item.productName}
                    {item.variantName && <span className="text-mist-500"> · {item.variantName}</span>}
                  </p>
                  <p className="text-xs text-mist-500">
                    {formatCurrency(item.price)} · {item.available} available to return
                  </p>
                </div>
                {isPartial ? (
                  <input
                    type="number"
                    min={0}
                    max={item.available}
                    disabled={!row?.checked}
                    value={row?.quantity ?? item.available}
                    onChange={(e) => toggle(key, { quantity: e.target.value })}
                    className="w-16 rounded-lg border border-mist-200 px-2 py-1.5 text-sm outline-none focus:border-teal-500 disabled:bg-mist-50"
                  />
                ) : (
                  <span className="text-sm font-semibold text-ink-950">×{item.available}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm text-mist-700">
            <input
              type="checkbox"
              checked={refundNow}
              onChange={(e) => setRefundNow(e.target.checked)}
              className="h-4 w-4 rounded border-mist-300 text-teal-500 focus:ring-teal-500"
            />
            Refund now
          </label>
          {refundNow && (
            <select
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value)}
              className="w-full rounded-lg border border-mist-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          )}
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Return reason / notes"
            className="w-full rounded-lg border border-mist-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-500"
          />
        </div>

        <div className="mt-5 flex items-center justify-between rounded-lg bg-mist-50 px-4 py-3">
          <span className="text-sm font-medium text-mist-700">Refund amount</span>
          <span className="font-display text-lg font-bold text-ink-950">
            {formatCurrency(refundTotal)}
          </span>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-mist-200 px-4 py-2 text-sm font-medium text-mist-700 hover:bg-mist-50"
          >
            Close
          </button>
          <button
            onClick={submit}
            disabled={loading || chosenItems.length === 0}
            className="flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-amber-500 disabled:opacity-60"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Confirm {isPartial ? "partial return" : "return"}
          </button>
        </div>
      </div>
    </div>
  );
}
