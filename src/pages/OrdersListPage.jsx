import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, ChevronLeft, ChevronRight, Loader2, Inbox } from "lucide-react";
import toast from "react-hot-toast";
import { ManualOrderService } from "../api/services";
import { OrderStatusBadge, PaymentStatusBadge } from "./../components/StatusBadge";
import { formatCurrency, formatDateTime, initials } from "../lib/format";
import OrderDetailDrawer from "../components/OrderDetailDrawer";

export default function OrdersListPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeOrder, setActiveOrder] = useState(null);

  const load = async (page = pagination.page) => {
    setLoading(true);
    try {
      const res = await ManualOrderService.getAll({ page, limit: pagination.limit });
      setOrders(res?.data?.orders || []);
      setPagination((p) => ({ ...p, ...(res?.data?.pagination || {}), page }));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return orders;
    const q = query.trim().toLowerCase();
    return orders.filter(
      (o) =>
        o.customerName?.toLowerCase().includes(q) ||
        o.customerPhone?.includes(q) ||
        o.orderId?.toLowerCase().includes(q) ||
        o.organizationName?.toLowerCase().includes(q)
    );
  }, [orders, query]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search client, phone, order ID…"
            className="w-full rounded-lg border border-mist-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500"
          />
        </div>
        <button
          onClick={() => navigate("/orders/new")}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-600"
        >
          <Plus size={16} /> New manual order
        </button>
      </div>

      <div className="overflow-hidden rounded-xl2 border border-mist-200 bg-white shadow-panel">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-mist-500">
            <Loader2 size={16} className="animate-spin" /> Loading orders…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Inbox size={28} className="text-mist-300" />
            <p className="text-sm font-medium text-ink-950">No orders match here yet</p>
            <p className="text-xs text-mist-500">Try a different search, or create a new order.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-mist-100 text-xs uppercase tracking-wide text-mist-500">
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 font-semibold">Items</th>
                  <th className="px-5 py-3 font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Payment</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Placed</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr
                    key={order._id}
                    onClick={() => setActiveOrder(order)}
                    className="cursor-pointer border-b border-mist-100 last:border-0 hover:bg-mist-50"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-950 text-xs font-bold text-white">
                          {initials(order.customerName)}
                        </span>
                        <div>
                          <p className="font-medium text-ink-950 hover:underline">
                            {order.customerName}
                          </p>
                          <p className="text-xs text-mist-500">{order.customerPhone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-mist-700">{order.orderId}</td>
                    <td className="px-5 py-3.5 text-mist-700">
                      {order.items?.length || 0} item{order.items?.length === 1 ? "" : "s"}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-ink-950">
                      {formatCurrency(order.grandTotal)}
                    </td>
                    <td className="px-5 py-3.5">
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </td>
                    <td className="px-5 py-3.5">
                      <OrderStatusBadge status={order.orderStatus} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-mist-500">
                      {formatDateTime(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-mist-100 px-5 py-3">
            <p className="text-xs text-mist-500">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} orders
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => load(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="grid h-8 w-8 place-items-center rounded-lg border border-mist-200 text-mist-500 hover:bg-mist-50 disabled:opacity-30"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => load(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="grid h-8 w-8 place-items-center rounded-lg border border-mist-200 text-mist-500 hover:bg-mist-50 disabled:opacity-30"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {activeOrder && (
        <OrderDetailDrawer
          orderSummary={activeOrder}
          allOrders={orders}
          onClose={() => setActiveOrder(null)}
          onChanged={() => {
            load(pagination.page);
            setActiveOrder(null);
          }}
        />
      )}
    </div>
  );
}
