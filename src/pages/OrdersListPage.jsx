import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, ChevronLeft, ChevronRight, Loader2, Inbox, FileDown } from "lucide-react";
import toast from "react-hot-toast";
import { ManualOrderService, InvoiceService } from "../api/services";
import { OrderStatusBadge, PaymentStatusBadge, statusLabel } from "./../components/StatusBadge";
import { formatCurrency, formatDateTime, initials } from "../lib/format";
import { generateInvoicePdf } from "../lib/generateInvoicePdf";
import OrderDetailDrawer from "../components/OrderDetailDrawer";
import CourierAssignModal from "../components/CourierAssignModal";
import CancelOrderModal from "../components/CancelOrderModal";
import MarkPaidModal from "../components/MarkPaidModal";
import SettleRefundModal from "../components/SettleRefundModal";
import StatusActionMenu from "../components/StatusActionMenu";
import PaymentActionMenu from "../components/PaymentActionMenu";

// Mirrors the backend's statusFlow in manualOrder.service.js — only these
// forward transitions succeed against PATCH /manual-order/status/:orderId.
// partial_returned/returned go through the Return flow in the drawer, so
// they're never offered here.
// "shipped" is deliberately NOT offered directly from "placed" or "packed"
// — courier details are only collected when an order moves through
// "confirmed" (see CourierAssignModal), so every order must pass through
// that step before it can be marked shipped. Without this, staff could
// jump straight to "Shipped" with no courier/tracking info on file.
const STATUS_FLOW = {
  placed: ["packed", "confirmed"],
  packed: ["confirmed"],
  confirmed: ["shipped"],
  shipped: ["delivered"],
};

// Mirrors cancelManualOrderService's nonCancellable list on the backend.
const NON_CANCELLABLE = ["delivered", "cancelled", "shipped"];

export default function OrdersListPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeOrder, setActiveOrder] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState(null);
  const [courierModalOrder, setCourierModalOrder] = useState(null);
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [paidModalOrder, setPaidModalOrder] = useState(null);
  const [settleRefundOrder, setSettleRefundOrder] = useState(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);

  const downloadInvoice = async (order) => {
    // order.invoiceId is the backend's own single source of truth (see
    // OrderDetailDrawer for why the old notes-tag fallback was removed).
    const invoiceId = order.invoiceId;
    if (!invoiceId) {
      toast.error("No invoice found for this order yet");
      return;
    }
    setDownloadingInvoiceId(order._id);
    try {
      const invoice = await InvoiceService.getInvoiceById(invoiceId);
      if (!invoice) {
        toast.error("No invoice found for this order yet");
        return;
      }
      await generateInvoicePdf(invoice, order.orderId);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not download the invoice");
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

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

  // Confirming needs courier details first (see CourierAssignModal), so that
  // transition opens the modal instead of calling the status API directly.
  const handleStatusChange = async (order, newStatus) => {
    if (!newStatus || newStatus === order.orderStatus) return;
    if (newStatus === "confirmed") {
      setCourierModalOrder(order);
      return;
    }
    setUpdatingOrderId(order._id);
    try {
      await ManualOrderService.updateStatus(order.orderId, newStatus);
      toast.success(`Order marked as ${statusLabel(newStatus)}`);
      await load(pagination.page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update status");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // "paid" needs a payment method (see MarkPaidModal), so only that
  // direction opens a modal — "pending" just clears it, same as the backend.
  const handlePaymentChange = async (order, newStatus) => {
    if (newStatus === "paid") {
      setPaidModalOrder(order);
      return;
    }
    setUpdatingPaymentId(order._id);
    try {
      await ManualOrderService.updatePaymentStatus(order.orderId, { paymentStatus: newStatus });
      toast.success(`Payment marked as ${statusLabel(newStatus)}`);
      await load(pagination.page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update payment status");
    } finally {
      setUpdatingPaymentId(null);
    }
  };

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
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-400 dark:text-mist-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search client, phone, order ID…"
            className="w-full rounded-lg border border-mist-200 bg-white py-2.5 pl-9 pr-3 text-sm text-ink-950 outline-none focus:border-orange-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-mist-500"
          />
        </div>
        <button
          onClick={() => navigate("/orders/new")}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          <Plus size={16} /> New manual order
        </button>
      </div>

      <div className="overflow-hidden rounded-xl2 border border-mist-200 bg-white shadow-panel dark:border-white/10 dark:bg-ink-900">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-mist-500 dark:text-mist-300">
            <Loader2 size={16} className="animate-spin" /> Loading orders…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Inbox size={28} className="text-mist-300 dark:text-mist-500" />
            <p className="text-sm font-medium text-ink-950 dark:text-white">No orders match here yet</p>
            <p className="text-xs text-mist-500 dark:text-mist-300">Try a different search, or create a new order.</p>
          </div>
        ) : (
          <>
            {/* Table — comfortable screens only, no side-scrolling needed */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-mist-100 text-xs uppercase tracking-wide text-mist-500 dark:border-white/10 dark:text-mist-300">
                    <th className="px-5 py-3 font-semibold">Client</th>
                    <th className="px-5 py-3 font-semibold">Order</th>
                    <th className="px-5 py-3 font-semibold">Items</th>
                    <th className="px-5 py-3 font-semibold">Total</th>
                    <th className="px-5 py-3 font-semibold">Payment</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Actions</th>
                    <th className="px-5 py-3 font-semibold">Invoice</th>
                    <th className="px-5 py-3 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order) => (
                    <tr
                      key={order._id}
                      onClick={() => setActiveOrder(order)}
                      className="cursor-pointer border-b border-mist-100 align-top last:border-0 hover:bg-mist-50 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-950 text-xs font-bold text-white">
                            {initials(order.customerName)}
                          </span>
                          <div>
                            <p className="font-medium text-ink-950 hover:underline dark:text-white">
                              {order.customerName}
                            </p>
                            <p className="text-xs text-mist-500 dark:text-mist-300">{order.customerPhone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-mist-700 dark:text-mist-300">{order.orderId}</td>
                      <td className="px-5 py-3.5 text-mist-700 dark:text-mist-300">
                        {order.items?.length || 0} item{order.items?.length === 1 ? "" : "s"}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-ink-950 dark:text-white">
                        {formatCurrency(order.grandTotal)}
                      </td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <PaymentStatusBadge status={order.paymentStatus} />
                          {["refund_pending", "partial_refunded"].includes(order.paymentStatus) ? (
                            <button
                              onClick={() => setSettleRefundOrder(order)}
                              className="rounded-full border border-amber-400 px-2.5 py-1 text-[11px] font-semibold text-amber-500 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-500/10"
                            >
                              Settle
                            </button>
                          ) : (
                            <div className="grid h-8 w-8 shrink-0 place-items-center">
                              {updatingPaymentId === order._id ? (
                                <Loader2 size={14} className="animate-spin text-mist-400 dark:text-mist-500" />
                              ) : (
                                <PaymentActionMenu
                                  currentStatus={order.paymentStatus}
                                  onSelect={(s) => handlePaymentChange(order, s)}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <OrderStatusBadge status={order.orderStatus} />
                      </td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="grid h-8 w-8 shrink-0 place-items-center">
                          {updatingOrderId === order._id ? (
                            <Loader2 size={14} className="animate-spin text-mist-400 dark:text-mist-500" />
                          ) : (
                            <StatusActionMenu
                              nextStatuses={STATUS_FLOW[order.orderStatus] || []}
                              canCancel={!NON_CANCELLABLE.includes(order.orderStatus)}
                              onSelectStatus={(s) => handleStatusChange(order, s)}
                              onCancel={() => setCancelModalOrder(order)}
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => downloadInvoice(order)}
                          disabled={downloadingInvoiceId === order._id}
                          title="Download invoice"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-mist-200 text-mist-500 hover:bg-mist-50 disabled:opacity-50 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
                        >
                          {downloadingInvoiceId === order._id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <FileDown size={14} />
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-mist-500 dark:text-mist-300">
                        {formatDateTime(order.statusUpdatedAt || order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards — phones/tablets, no horizontal scrolling at all */}
            <div className="divide-y divide-mist-100 dark:divide-white/10 lg:hidden">
              {filtered.map((order) => (
                <div
                  key={order._id}
                  onClick={() => setActiveOrder(order)}
                  className="cursor-pointer p-4 hover:bg-mist-50 dark:hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-950 text-xs font-bold text-white">
                        {initials(order.customerName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-950 dark:text-white">{order.customerName}</p>
                        <p className="text-xs text-mist-500 dark:text-mist-300">{order.customerPhone}</p>
                      </div>
                    </div>
                    <p className="shrink-0 font-semibold text-ink-950 dark:text-white">
                      {formatCurrency(order.grandTotal)}
                    </p>
                  </div>

                  <p className="mt-2 truncate font-mono text-[11px] text-mist-500 dark:text-mist-300">
                    {order.orderId}
                  </p>
                  <p className="text-xs text-mist-500 dark:text-mist-300">
                    {order.items?.length || 0} item{order.items?.length === 1 ? "" : "s"} ·{" "}
                    {formatDateTime(order.statusUpdatedAt || order.createdAt)}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <OrderStatusBadge status={order.orderStatus} />
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </div>

                  <div
                    className="mt-3 flex flex-wrap items-center gap-2 border-t border-mist-100 pt-3 dark:border-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {["refund_pending", "partial_refunded"].includes(order.paymentStatus) && (
                      <button
                        onClick={() => setSettleRefundOrder(order)}
                        className="rounded-full border border-amber-400 px-2.5 py-1 text-[11px] font-semibold text-amber-500 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-500/10"
                      >
                        Settle refund
                      </button>
                    )}
                    {updatingOrderId === order._id || updatingPaymentId === order._id ? (
                      <Loader2 size={14} className="animate-spin text-mist-400 dark:text-mist-500" />
                    ) : (
                      <>
                        <StatusActionMenu
                          nextStatuses={STATUS_FLOW[order.orderStatus] || []}
                          canCancel={!NON_CANCELLABLE.includes(order.orderStatus)}
                          onSelectStatus={(s) => handleStatusChange(order, s)}
                          onCancel={() => setCancelModalOrder(order)}
                        />
                        {!["refund_pending", "partial_refunded"].includes(order.paymentStatus) && (
                          <PaymentActionMenu
                            currentStatus={order.paymentStatus}
                            onSelect={(s) => handlePaymentChange(order, s)}
                          />
                        )}
                      </>
                    )}
                    <button
                      onClick={() => downloadInvoice(order)}
                      disabled={downloadingInvoiceId === order._id}
                      title="Download invoice"
                      className="ml-auto grid h-8 w-8 place-items-center rounded-lg border border-mist-200 text-mist-500 hover:bg-mist-50 disabled:opacity-50 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
                    >
                      {downloadingInvoiceId === order._id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <FileDown size={14} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && filtered.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-mist-100 px-5 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-mist-500 dark:text-mist-300">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} orders
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => load(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="grid h-8 w-8 place-items-center rounded-lg border border-mist-200 text-mist-500 hover:bg-mist-50 disabled:opacity-30 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => load(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="grid h-8 w-8 place-items-center rounded-lg border border-mist-200 text-mist-500 hover:bg-mist-50 disabled:opacity-30 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
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
            // Refresh the background list only — the drawer stays open so
            // staff can keep walking an order through its next steps
            // (Placed → Packed → Confirmed → ...) without it closing on them
            // after every single click.
            load(pagination.page);
          }}
        />
      )}

      {courierModalOrder && (
        <CourierAssignModal
          order={courierModalOrder}
          onClose={() => setCourierModalOrder(null)}
          onDone={() => {
            setCourierModalOrder(null);
            load(pagination.page);
          }}
        />
      )}

      {cancelModalOrder && (
        <CancelOrderModal
          order={cancelModalOrder}
          onClose={() => setCancelModalOrder(null)}
          onDone={() => {
            setCancelModalOrder(null);
            load(pagination.page);
          }}
        />
      )}

      {paidModalOrder && (
        <MarkPaidModal
          order={paidModalOrder}
          onClose={() => setPaidModalOrder(null)}
          onDone={() => {
            setPaidModalOrder(null);
            load(pagination.page);
          }}
        />
      )}

      {settleRefundOrder && (
        <SettleRefundModal
          order={settleRefundOrder}
          onClose={() => setSettleRefundOrder(null)}
          onDone={() => {
            setSettleRefundOrder(null);
            load(pagination.page);
          }}
        />
      )}
    </div>
  );
}
