import React, { useEffect, useState } from "react";
import { X, Phone, Mail, MapPin, Building2, Truck, Ban, Undo2, Split, Loader2, FileDown, Undo } from "lucide-react";
import toast from "react-hot-toast";
import { ManualOrderService, InvoiceService } from "../api/services";
import { OrderStatusBadge, PaymentStatusBadge, statusLabel } from "./StatusBadge";
import { formatCurrency, formatDateTime, initials } from "../lib/format";
import { generateInvoicePdf } from "../lib/generateInvoicePdf";
import { extractAppliedCredits } from "../lib/invoiceHelpers";
import OrderProgressTracker from "./OrderProgressTracker";
import StatusActionMenu from "./StatusActionMenu";
import PaymentActionMenu from "./PaymentActionMenu";
import CourierAssignModal from "./CourierAssignModal";
import MarkPaidModal from "./MarkPaidModal";
import SettleRefundModal from "./SettleRefundModal";
import CancelOrderModal from "./CancelOrderModal";
import ReturnOrderModal from "./ReturnOrderModal";

// Mirrors OrdersListPage's STATUS_FLOW / NON_CANCELLABLE — kept in sync so
// the drawer offers the exact same next-step options as the table row does.
// "shipped" only appears after "confirmed" (which collects courier details
// via CourierAssignModal) — never as a direct jump from placed/packed.
const STATUS_FLOW = {
  placed: ["packed", "confirmed"],
  packed: ["confirmed"],
  confirmed: ["shipped"],
  shipped: ["delivered"],
};
const NON_CANCELLABLE = ["delivered", "cancelled", "shipped"];

// Plain-language "what's going on with this order" line, shown right under
// the progress tracker. This is the single biggest thing that makes the
// drawer legible to someone who didn't build it — one sentence instead of
// having to cross-reference three separate status fields.
function getOrderNarrative(order) {
  const { orderStatus, paymentStatus } = order;

  if (orderStatus === "cancelled") {
    if (paymentStatus === "refund_pending") {
      return {
        tone: "warning",
        text: `Cancelled after the customer had already paid. The company still owes them a refund of ${formatCurrency(
          order.refundAmount
        )}.`,
      };
    }
    if (paymentStatus === "refunded") {
      return { tone: "good", text: "Cancelled and the refund has been paid back in full." };
    }
    return { tone: "neutral", text: "Cancelled before any payment was collected — nothing owed either way." };
  }

  if (orderStatus === "returned") {
    if (paymentStatus === "refund_pending")
      return { tone: "warning", text: "Every item was returned. Refund hasn't been paid out to the customer yet." };
    if (paymentStatus === "partial_refunded" || paymentStatus === "refunded")
      return { tone: "good", text: "Every item was returned and the refund has been settled." };
  }

  if (orderStatus === "partial_returned") {
    if (paymentStatus === "refund_pending")
      return { tone: "warning", text: "Some items were returned. Refund for those items hasn't been paid out yet." };
    if (paymentStatus === "partial_refunded")
      return { tone: "good", text: "Some items were returned and that portion has been refunded." };
  }

  if (paymentStatus === "pending") {
    return {
      tone: "warning",
      text: `Order placed, but the customer hasn't paid yet — ${formatCurrency(
        order.grandTotal
      )} is still due.`,
    };
  }

  if (orderStatus === "delivered") {
    return { tone: "good", text: "Delivered and paid in full. Nothing pending on this order." };
  }

  return { tone: "neutral", text: `Payment received. Currently ${statusLabel(orderStatus).toLowerCase()} — move it forward using Status below.` };
}

const NARRATIVE_STYLES = {
  good: "border-mint-200 bg-mint-100 text-mint-600 dark:border-mint-500/30 dark:bg-mint-500/10 dark:text-mint-400",
  warning: "border-amber-200 bg-amber-100 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
  neutral: "border-mist-200 bg-mist-100 text-mist-600 dark:border-white/10 dark:bg-white/5 dark:text-mist-300",
};

export default function OrderDetailDrawer({ orderSummary, allOrders, onClose, onChanged }) {
  const [order, setOrder] = useState(orderSummary);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null); // "cancel" | "return" | "partial" | "courier" | "markPaid"
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);

  const refresh = () => {
    setLoading(true);
    return ManualOrderService.getOne(orderSummary.orderId)
      .then((res) => setOrder(res?.data?.order || orderSummary))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ManualOrderService.getOne(orderSummary.orderId)
      .then((res) => {
        if (!cancelled) setOrder(res?.data?.order || orderSummary);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [orderSummary]);

  const downloadInvoice = async () => {
    // order.invoiceId is the backend's own single source of truth — this
    // used to fall back to a separate id tagged into order.notes from an
    // older (now-removed) frontend-side invoice-creation path, which
    // pointed at a completely different, never-synced invoice document.
    const invoiceId = order.invoiceId;
    if (!invoiceId) {
      toast.error("No invoice found for this order yet");
      return;
    }
    setDownloadingInvoice(true);
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
      setDownloadingInvoice(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!newStatus || newStatus === order.orderStatus) return;
    if (newStatus === "confirmed") {
      setActiveModal("courier");
      return;
    }
    setUpdatingStatus(true);
    try {
      await ManualOrderService.updateStatus(order.orderId, newStatus);
      toast.success(`Order marked as ${statusLabel(newStatus)}`);
      await refresh();
      onChanged();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePaymentChange = async (newStatus) => {
    if (newStatus === "paid") {
      setActiveModal("markPaid");
      return;
    }
    setUpdatingPayment(true);
    try {
      await ManualOrderService.updatePaymentStatus(order.orderId, { paymentStatus: newStatus });
      toast.success(`Payment marked as ${statusLabel(newStatus)}`);
      await refresh();
      onChanged();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update payment status");
    } finally {
      setUpdatingPayment(false);
    }
  };

  const clientOrders = (allOrders || []).filter(
    (o) => o.customerPhone === order.customerPhone && o.orderId !== order.orderId
  );

  const canCancel = !NON_CANCELLABLE.includes(order.orderStatus);
  const canReturn = ["placed", "packed", "confirmed", "shipped", "delivered", "partial_returned"].includes(
    order.orderStatus
  );
  const hasReturnableItems = order.items?.some(
    (i) => Number(i.quantity) - Number(i.returnedQuantity || 0) > 0
  );
  const nextStatuses = STATUS_FLOW[order.orderStatus] || [];

  const handleDone = async () => {
    setActiveModal(null);
    await refresh();
    onChanged();
  };

  const narrative = getOrderNarrative(order);
  const hasReturnHistory = order.returnRequests?.length > 0;
  const hasRefundHistory = order.refundHistory?.length > 0;
  // Primary source: a fresh reverse-lookup the backend does on every fetch
  // (works for every order, old or new). Notes-tag parsing is kept only as
  // a fallback for the rare case the backend lookup comes back empty but an
  // older client-side tag still exists.
  const appliedCredits =
    order.creditsReceived?.length > 0 ? order.creditsReceived : extractAppliedCredits(order.notes);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-ink-950/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col bg-mist-50 shadow-panel dark:bg-ink-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mist-200 bg-white px-6 py-5 dark:border-white/10 dark:bg-ink-900">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-ink-950 text-sm font-bold text-white">
              {initials(order.customerName)}
            </span>
            <div>
              <p className="font-display text-base font-bold text-ink-950 dark:text-white">{order.customerName}</p>
              <p className="text-xs text-mist-500 dark:text-mist-300">{order.orderId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadInvoice}
              disabled={downloadingInvoice}
              title="Download invoice"
              className="flex items-center gap-1.5 rounded-lg border border-mist-200 px-3 py-1.5 text-xs font-semibold text-mist-700 hover:bg-mist-50 disabled:opacity-50 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
            >
              {downloadingInvoice ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
              Invoice
            </button>
            <button onClick={onClose} className="text-mist-400 hover:text-ink-950 dark:text-mist-500 dark:hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
          {loading && (
            <div className="flex items-center gap-2 pb-4 text-sm text-mist-500 dark:text-mist-300">
              <Loader2 size={14} className="animate-spin" /> Refreshing order…
            </div>
          )}

          {/* Progress tracker + narrative — the "what's happening" summary */}
          <section className="rounded-xl2 border border-mist-200 bg-white p-5 shadow-panel dark:border-white/10 dark:bg-ink-900">
            <OrderProgressTracker orderStatus={order.orderStatus} />
            <div className={`mt-4 rounded-lg border px-3.5 py-2.5 text-sm font-medium ${NARRATIVE_STYLES[narrative.tone]}`}>
              {narrative.text}
            </div>

            {/* Inline status + payment controls, so staff never has to leave
                the drawer to move an order forward. */}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-mist-100 pt-4 dark:border-white/10">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase text-mist-500 dark:text-mist-300">
                  Order status
                </p>
                <div className="flex items-center gap-2">
                  <OrderStatusBadge status={order.orderStatus} />
                  {updatingStatus ? (
                    <Loader2 size={14} className="animate-spin text-mist-400" />
                  ) : (
                    <StatusActionMenu
                      nextStatuses={nextStatuses}
                      canCancel={false}
                      disabled={updatingStatus}
                      onSelectStatus={handleStatusChange}
                      onCancel={() => {}}
                    />
                  )}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase text-mist-500 dark:text-mist-300">
                  Payment status
                </p>
                <div className="flex items-center gap-2">
                  <PaymentStatusBadge status={order.paymentStatus} />
                  {["refund_pending", "partial_refunded"].includes(order.paymentStatus) ? (
                    <button
                      onClick={() => setActiveModal("settleRefund")}
                      className="rounded-full border border-amber-400 px-2.5 py-1 text-[11px] font-semibold text-amber-500 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-500/10"
                    >
                      Settle
                    </button>
                  ) : updatingPayment ? (
                    <Loader2 size={14} className="animate-spin text-mist-400" />
                  ) : (
                    <PaymentActionMenu
                      currentStatus={order.paymentStatus}
                      disabled={updatingPayment}
                      onSelect={handlePaymentChange}
                    />
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Client card */}
          <section className="mt-4 rounded-xl2 border border-mist-200 bg-white p-5 shadow-panel dark:border-white/10 dark:bg-ink-900">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-mist-500 dark:text-mist-300">
              Client
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2 text-mist-700 dark:text-mist-300">
                <Phone size={14} className="text-mist-400 dark:text-mist-500" /> {order.customerPhone}
              </p>
              {order.customerEmail && (
                <p className="flex items-center gap-2 text-mist-700 dark:text-mist-300">
                  <Mail size={14} className="text-mist-400 dark:text-mist-500" /> {order.customerEmail}
                </p>
              )}
              {order.organizationName && (
                <p className="flex items-center gap-2 text-mist-700 dark:text-mist-300">
                  <Building2 size={14} className="text-mist-400 dark:text-mist-500" /> {order.organizationName}
                </p>
              )}
              {order.gstNumber && (
                <p className="text-mist-700 dark:text-mist-300">
                  <span className="text-mist-400 dark:text-mist-500">GSTIN:</span> {order.gstNumber}
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-mist-100 pt-4 dark:border-white/10 sm:grid-cols-2">
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-mist-500 dark:text-mist-300">
                  <MapPin size={12} /> Shipping
                </p>
                <p className="text-sm text-mist-700 dark:text-mist-300">{formatAddress(order.shippingAddress)}</p>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-mist-500 dark:text-mist-300">
                  <MapPin size={12} /> Billing
                </p>
                <p className="text-sm text-mist-700 dark:text-mist-300">{formatAddress(order.billingAddress)}</p>
              </div>
            </div>
          </section>

          {/* Order items */}
          <section className="mt-4 rounded-xl2 border border-mist-200 bg-white p-5 shadow-panel dark:border-white/10 dark:bg-ink-900">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-mist-500 dark:text-mist-300">
              Items purchased
            </h3>
            <div className="mt-3 divide-y divide-mist-100 dark:divide-white/10">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-ink-950 dark:text-white">
                      {item.productName}
                      {item.variantName && <span className="text-mist-500 dark:text-mist-300"> · {item.variantName}</span>}
                    </p>
                    <p className="text-xs text-mist-500 dark:text-mist-300">
                      {formatCurrency(item.price)} × {item.quantity}
                      {item.returnedQuantity > 0 && (
                        <span className="ml-1.5 text-amber-500 dark:text-amber-400">
                          ({item.returnedQuantity} returned)
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="font-semibold text-ink-950 dark:text-white">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-mist-100 pt-3 text-sm dark:border-white/10">
              <div className="flex justify-between text-mist-500 dark:text-mist-300">
                <span>Shipping</span>
                <span>{formatCurrency(order.shippingCharge)}</span>
              </div>
              <div className="flex justify-between text-mist-500 dark:text-mist-300">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
              {order.gstPercentage > 0 && (
                <div className="flex justify-between text-mist-400 dark:text-mist-400">
                  <span>— incl. GST ({order.gstPercentage}%)</span>
                  <span>
                    {formatCurrency(
                      (() => {
                        const itemsSubtotal =
                          order.items?.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0) || 0;
                        return itemsSubtotal - itemsSubtotal / (1 + Number(order.gstPercentage) / 100);
                      })()
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-display text-base font-bold text-ink-950 dark:text-white">
                <span>Grand total</span>
                <span>{formatCurrency(order.grandTotal)}</span>
              </div>
            </div>
          </section>

          {/* Payment & courier */}
          <section className="mt-4 rounded-xl2 border border-mist-200 bg-white p-5 shadow-panel dark:border-white/10 dark:bg-ink-900">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-mist-500 dark:text-mist-300">
              Payment &amp; courier
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <Info label="Method" value={order.paymentMethod || "—"} />
              <Info label="Reference" value={order.paymentReference || "—"} />
              <Info label="Paid at" value={formatDateTime(order.paidAt)} />
              <Info label="Refund amount" value={formatCurrency(order.refundAmount || order.partialRefundAmount || 0)} />
              <Info
                label="Courier"
                value={
                  order.corourseServiceName ? (
                    <span className="flex items-center gap-1.5">
                      <Truck size={13} /> {order.corourseServiceName}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <Info label="Tracking / DOC no." value={order.DOCNumber || "—"} />
            </div>
            {order.cancellationReason && (
              <p className="mt-3 rounded-lg bg-coral-100 px-3 py-2 text-xs text-coral-500 dark:bg-coral-500/15 dark:text-coral-400">
                Cancelled: {order.cancellationReason}
              </p>
            )}
          </section>

          {/* Return history — mirrors the storefront's ReturnStatusCard, but
              staff-facing: every return request recorded on this order, what
              was in it, and whether it's been refunded yet. */}
          {hasReturnHistory && (
            <section className="mt-4 rounded-xl2 border border-amber-200 bg-amber-50/60 p-5 shadow-panel dark:border-amber-500/20 dark:bg-amber-500/5">
              <h3 className="font-display text-sm font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Return history
              </h3>
              <div className="mt-3 space-y-3">
                {order.returnRequests.map((rr) => (
                  <div
                    key={rr.requestId}
                    className="rounded-lg border border-amber-200 bg-white p-3.5 dark:border-amber-500/20 dark:bg-ink-900"
                  >
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <Undo size={12} /> Returned {formatDateTime(rr.processedAt || rr.requestedAt)}
                      </p>
                    </div>
                    <div className="mt-2 space-y-1">
                      {rr.items.map((it, i) => (
                        <p key={i} className="text-sm text-ink-950 dark:text-white">
                          {it.quantity} × {it.productName}
                          {it.variantName && ` (${it.variantName})`}
                          <span className="text-mist-500 dark:text-mist-300">
                            {" "}
                            — {formatCurrency(it.price * it.quantity)}
                            {it.reason && ` · ${it.reason}`}
                          </span>
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Refund history — every payout actually made against this order. */}
          {hasRefundHistory && (
            <section className="mt-4 rounded-xl2 border border-mint-200 bg-mint-50/60 p-5 shadow-panel dark:border-mint-500/20 dark:bg-mint-500/5">
              <h3 className="font-display text-sm font-bold uppercase tracking-wide text-mint-600 dark:text-mint-400">
                Refund history
              </h3>
              <div className="mt-3 space-y-2">
                {order.refundHistory.map((r, i) => (
                  <div
                    key={r.refundId || i}
                    className="rounded-lg border border-mint-200 bg-white p-3 text-sm dark:border-mint-500/20 dark:bg-ink-900"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-ink-950 dark:text-white">{formatCurrency(r.amount)}</p>
                        <p className="text-xs text-mist-500 dark:text-mist-300">
                          via {r.method} · {formatDateTime(r.refundedAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-mint-100 px-2.5 py-1 text-[11px] font-semibold text-mint-600 dark:bg-mint-500/15 dark:text-mint-400">
                        {r.refundStatus}
                      </span>
                    </div>
                    {/* Where this store credit actually went, if it was one —
                        so it's never just an anonymous number. */}
                    {r.method === "credit_note" && (
                      <p className="mt-2 border-t border-mint-100 pt-2 text-xs dark:border-mint-500/20">
                        {r.appliedToOrderId ? (
                          <span className="text-mist-600 dark:text-mist-300">
                            → Used on order{" "}
                            <span className="font-mono font-semibold text-ink-950 dark:text-white">
                              {r.appliedInvoiceNumber || r.appliedToOrderId}
                            </span>
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-500 dark:text-amber-400">
                            → Not used yet — still available as credit
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Credit received — if this order's total was reduced by credit
              carried over from an earlier return, show exactly which
              order(s) it came from, right here instead of it just looking
              like an unexplained discount. */}
          {appliedCredits.length > 0 && (
            <section className="mt-4 rounded-xl2 border border-mint-200 bg-mint-50/60 p-5 shadow-panel dark:border-mint-500/20 dark:bg-mint-500/5">
              <h3 className="font-display text-sm font-bold uppercase tracking-wide text-mint-600 dark:text-mint-400">
                Credit applied on this order
              </h3>
              <div className="mt-3 space-y-2">
                {appliedCredits.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-mint-200 bg-white p-3 text-sm dark:border-mint-500/20 dark:bg-ink-900"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-mist-600 dark:text-mist-300">
                        From order{" "}
                        <span className="font-mono font-semibold text-ink-950 dark:text-white">
                          {c.sourceInvoiceNumber || c.sourceOrderId}
                        </span>
                      </p>
                      <p className="font-semibold text-mint-600 dark:text-mint-400">{formatCurrency(c.amount)}</p>
                    </div>
                    {c.returnedItems?.length > 0 && (
                      <div className="mt-1.5 border-t border-mint-100 pt-1.5 text-xs text-mist-500 dark:border-mint-500/20 dark:text-mist-300">
                        {c.returnedItems.map((it, j) => (
                          <p key={j}>
                            {it.quantity} × {it.productName}
                            {it.variantName && ` (${it.variantName})`}
                          </p>
                        ))}
                      </div>
                    )}
                    {c.refundedAt && (
                      <p className="mt-1 text-xs text-mist-400 dark:text-mist-500">{formatDateTime(c.refundedAt)}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Purchase history */}
          <section className="mt-4 rounded-xl2 border border-mist-200 bg-white p-5 shadow-panel dark:border-white/10 dark:bg-ink-900">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-mist-500 dark:text-mist-300">
              Purchase history · {clientOrders.length} other order{clientOrders.length === 1 ? "" : "s"}
            </h3>
            {clientOrders.length === 0 ? (
              <p className="mt-2 text-sm text-mist-500 dark:text-mist-300">No other orders from this client yet.</p>
            ) : (
              <div className="mt-3 divide-y divide-mist-100 dark:divide-white/10">
                {clientOrders.map((o) => (
                  <div key={o.orderId} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-ink-950 dark:text-white">{o.orderId}</p>
                      <p className="text-xs text-mist-500 dark:text-mist-300">{formatDateTime(o.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-mist-500 dark:text-mist-300">{formatCurrency(o.grandTotal)}</span>
                      <OrderStatusBadge status={o.orderStatus} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Action bar */}
        <div className="border-t border-mist-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-ink-900">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              onClick={() => setActiveModal("return")}
              disabled={!canReturn || !hasReturnableItems}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-400 py-2.5 text-xs font-semibold text-amber-500 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-amber-400 dark:hover:bg-amber-500/10"
            >
              <Undo2 size={14} /> Return
            </button>
            <button
              onClick={() => setActiveModal("partial")}
              disabled={!canReturn || !hasReturnableItems}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-orange-500 py-2.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-orange-400 dark:hover:bg-orange-500/10"
            >
              <Split size={14} /> Partial return
            </button>
            <button
              onClick={() => setActiveModal("cancel")}
              disabled={!canCancel}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-coral-500 py-2.5 text-xs font-semibold text-coral-500 hover:bg-coral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-coral-400 dark:hover:bg-coral-500/10 sm:col-span-1"
            >
              <Ban size={14} /> Cancel
            </button>
          </div>
        </div>
      </div>

      {activeModal === "cancel" && (
        <CancelOrderModal order={order} onClose={() => setActiveModal(null)} onDone={handleDone} />
      )}
      {(activeModal === "return" || activeModal === "partial") && (
        <ReturnOrderModal
          order={order}
          mode={activeModal === "partial" ? "partial" : "full"}
          onClose={() => setActiveModal(null)}
          onDone={handleDone}
        />
      )}
      {activeModal === "courier" && (
        <CourierAssignModal order={order} onClose={() => setActiveModal(null)} onDone={handleDone} />
      )}
      {activeModal === "markPaid" && (
        <MarkPaidModal order={order} onClose={() => setActiveModal(null)} onDone={handleDone} />
      )}
      {activeModal === "settleRefund" && (
        <SettleRefundModal order={order} onClose={() => setActiveModal(null)} onDone={handleDone} />
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-mist-500 dark:text-mist-300">{label}</p>
      <p className="font-medium text-ink-950 dark:text-white">{value}</p>
    </div>
  );
}

function formatAddress(addr) {
  if (!addr) return "—";
  const parts = [addr.street, addr.area, addr.city, addr.state, addr.pincode, addr.country].filter(
    Boolean
  );
  return parts.length ? parts.join(", ") : "—";
}
