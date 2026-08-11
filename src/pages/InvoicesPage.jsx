import React, { useEffect, useState } from "react";
import { FileText, Loader2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { ManualOrderService, InvoiceService, buildInvoicePayloadFromOrder } from "../api/services";
import { formatCurrency, formatDateTime } from "../lib/format";
import { PaymentStatusBadge } from "../components/StatusBadge";

export default function InvoicesPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await ManualOrderService.getAll({ page: 1, limit: 50 });
      setOrders(res?.data?.orders || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const regenerate = async (order) => {
    setRegeneratingId(order.orderId);
    try {
      await InvoiceService.create(buildInvoicePayloadFromOrder(order));
      toast.success(`Invoice regenerated for ${order.orderId}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not generate this invoice");
    } finally {
      setRegeneratingId(null);
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-bold text-ink-950">Invoices</h2>
          <p className="text-sm text-mist-500">
            One invoice is generated automatically per manual order. Regenerate here if needed.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl2 border border-mist-200 bg-white shadow-panel">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-mist-500">
            <Loader2 size={16} className="animate-spin" /> Loading invoices…
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-mist-100 text-xs uppercase tracking-wide text-mist-500">
                <th className="px-5 py-3 font-semibold">Order</th>
                <th className="px-5 py-3 font-semibold">Client</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Payment</th>
                <th className="px-5 py-3 font-semibold">Placed</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="border-b border-mist-100 last:border-0">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 font-mono text-xs text-mist-700">
                      <FileText size={14} className="text-mist-400" /> {order.orderId}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-ink-950">{order.customerName}</td>
                  <td className="px-5 py-3.5 font-semibold text-ink-950">
                    {formatCurrency(order.grandTotal)}
                  </td>
                  <td className="px-5 py-3.5">
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </td>
                  <td className="px-5 py-3.5 text-xs text-mist-500">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => regenerate(order)}
                      disabled={regeneratingId === order.orderId}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-mist-200 px-3 py-1.5 text-xs font-semibold text-mist-700 hover:bg-mist-50 disabled:opacity-50"
                    >
                      {regeneratingId === order.orderId ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <RefreshCw size={13} />
                      )}
                      Regenerate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
