import React, { useState } from "react";
import { X, Loader2, Undo2 } from "lucide-react";
import toast from "react-hot-toast";
import { InvoiceService } from "../api/services";
import { formatCurrency } from "../lib/format";

/**
 * Records a return directly on a STANDALONE invoice (sourceOrderId ===
 * null) — created via "Create Invoice", with no manual order or ecommerce
 * order behind it. Only ever shown for that kind of invoice: a manual-order
 * invoice's returns go through ReturnOrderModal on the order itself, and
 * an ecommerce invoice's returns go through the ecommerce return-request
 * flow — recording a return here too would double count the refund.
 */
export default function RecordInvoiceReturnModal({ invoice, onClose, onDone }) {
  const returnableItems = (invoice.items || [])
    .map((item) => ({
      ...item,
      available: Number(item.qty) - Number(item.returnedQty || 0),
    }))
    .filter((item) => item.available > 0);

  const [selected, setSelected] = useState(() =>
    Object.fromEntries(
      returnableItems.map((item) => [item.itemId, { checked: false, quantity: item.available }])
    )
  );
  const [refundNow, setRefundNow] = useState(false);
  const [refundMethod, setRefundMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const toggle = (itemId, patch) =>
    setSelected((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));

  const chosenItems = returnableItems
    .filter((item) => selected[item.itemId]?.checked)
    .map((item) => ({
      itemId: item.itemId,
      description: item.description,
      quantity: Number(selected[item.itemId]?.quantity) || 0,
      // Per-unit rate the customer actually paid (GST-inclusive, after
      // discount) — mirrors what createInvoiceReturnService itself uses,
      // so the preview total here matches what actually gets recorded.
      unitAmount: Number(item.qty) > 0 ? Number(item.totalAmount) / Number(item.qty) : 0,
    }))
    .filter((item) => item.quantity > 0);

  const refundTotal = chosenItems.reduce((sum, i) => sum + i.unitAmount * i.quantity, 0);

  const submit = async () => {
    if (chosenItems.length === 0) {
      toast.error("Select at least one item to return");
      return;
    }
    if (refundNow && !refundMethod) {
      toast.error("Select how the refund was paid");
      return;
    }
    setLoading(true);
    try {
      await InvoiceService.createReturn(invoice.invoiceId, {
        returnItems: chosenItems.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
          reason: notes || "Return",
        })),
        refundNow,
        refundMethod: refundNow ? refundMethod : undefined,
        reference: refundNow ? reference.trim() || undefined : undefined,
        notes,
      });
      toast.success(refundNow ? "Return recorded and refund settled" : "Return recorded");
      onDone?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not record this return");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-amber-500">
              <Undo2 size={17} />
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900">Record return</h3>
              <p className="text-xs text-gray-500">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
          {returnableItems.length === 0 && (
            <p className="rounded-lg bg-gray-50 px-3 py-3 text-sm text-gray-500">
              Every item on this invoice has already been returned.
            </p>
          )}
          {returnableItems.map((item) => {
            const row = selected[item.itemId];
            return (
              <div
                key={item.itemId}
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
              >
                <input
                  type="checkbox"
                  checked={row?.checked || false}
                  onChange={(e) => toggle(item.itemId, { checked: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.description}</p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(item.totalAmount / item.qty)} · {item.available} available to return
                  </p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={item.available}
                  disabled={!row?.checked}
                  value={row?.quantity ?? item.available}
                  onChange={(e) => toggle(item.itemId, { quantity: e.target.value })}
                  className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-orange-500 disabled:bg-gray-50"
                />
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs text-gray-500">
            Recording the return doesn't pay anything back by itself — this invoice will show as{" "}
            <strong>refund pending</strong> until you actually hand the money back and tick this.
          </p>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={refundNow}
              onChange={(e) => setRefundNow(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            I've already refunded this to the customer
          </label>
          {refundNow && (
            <>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Reference (optional) — transaction ID, cheque no., etc."
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
              />
            </>
          )}
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Return reason / notes"
            className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
          />
        </div>

        <div className="mt-5 rounded-lg bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Refund amount</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(refundTotal)}</span>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={submit}
            disabled={loading || chosenItems.length === 0}
            className="flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-500 disabled:opacity-60"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Confirm return
          </button>
        </div>
      </div>
    </div>
  );
}
