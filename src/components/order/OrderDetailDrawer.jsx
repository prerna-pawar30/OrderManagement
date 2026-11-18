/**
 * Side drawer with everything about one manual order: progress, status and payment actions, client,
 * items, returns and its invoice.
 *
 * Used by: pages/OrdersListPage.jsx
 * API: InvoiceService.getInvoiceById, ManualOrderService.getOne,
 * ManualOrderService.updatePaymentStatus, ManualOrderService.updateStatus
 */

import { useEffect, useRef, useState } from "react";
import {
  X as CloseIcon,
  Phone,
  Mail,
  MapPin,
  Building2,
  Truck,
  Ban,
  Undo2,
  Split,
  Loader2,
  FileDown,
  Undo,
} from "lucide-react";
import toast from "react-hot-toast";
import { ManualOrderService, InvoiceService } from "../../backend/ApiService";
import { OrderStatusBadge, PaymentStatusBadge, statusLabel } from "./StatusBadge";
import { formatCurrency, formatDateTime, initials } from "../../utils/Format";
import { generateInvoicePdf } from "../../utils/InvoicePdf";
import {
  extractAppliedCredits,
  withInvoicePayment,
  orderReturnedValue,
  orderNetTotal,
} from "../../utils/InvoiceHelpers";
import OrderProgressTracker from "./OrderProgressTracker";
import StatusActionMenu from "./StatusActionMenu";
import PaymentActionMenu from "../invoice/PaymentActionMenu";
import CourierAssignModal from "./CourierAssignModal";
import MarkPaidModal from "../invoice/MarkPaidModal";
import SettleRefundModal from "../creditnote/SettleRefundModal";
import CancelOrderModal from "./CancelOrderModal";
import ReturnOrderModal from "./ReturnOrderModal";
import { getOrderNarrative, NARRATIVE_STYLES } from "../../utils/OrderNarrative";

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

export default function OrderDetailDrawer({
  orderSummary,
  initialInvoice,
  allOrders,
  onClose,
  onChanged,
}) {
  const [order, setOrder] = useState(orderSummary);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null); // "cancel" | "return" | "partial" | "courier" | "markPaid"
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  // The linked invoice — payments recorded there are shown on the order.
  // Starts from the one the list already loaded; refetched only when the
  // order itself changes (an action here can update its invoice too).
  const [invoice, setInvoice] = useState(initialInvoice || null);
  const invoiceKey = `${order.invoiceId}|${order.updatedAt}`;
  const loadedInvoiceKey = useRef(
    initialInvoice ? `${orderSummary.invoiceId}|${orderSummary.updatedAt}` : null
  );

  useEffect(() => {
    if (!order.invoiceId || loadedInvoiceKey.current === invoiceKey) return;
    loadedInvoiceKey.current = invoiceKey;
    InvoiceService.getInvoiceById(order.invoiceId)
      .then((response) => setInvoice(response || null))
      .catch(() => {});
  }, [invoiceKey, order.invoiceId]);
  const paymentView = withInvoicePayment(order, invoice);

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
      const latest =
        invoice?.invoiceId === invoiceId ? invoice : await InvoiceService.getInvoiceById(invoiceId);
      if (!latest) {
        toast.error("No invoice found for this order yet");
        return;
      }
      await generateInvoicePdf(latest, order.orderId);
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
    (allOrder) =>
      allOrder.customerPhone === order.customerPhone && allOrder.orderId !== order.orderId
  );

  const canCancel = !NON_CANCELLABLE.includes(order.orderStatus);
  const canReturn = [
    "placed",
    "packed",
    "confirmed",
    "shipped",
    "delivered",
    "partial_returned",
  ].includes(order.orderStatus);
  const hasReturnableItems = order.items?.some(
    (item) => Number(item.quantity) - Number(item.returnedQuantity || 0) > 0
  );
  const nextStatuses = STATUS_FLOW[order.orderStatus] || [];

  const handleDone = async () => {
    setActiveModal(null);
    await refresh();
    onChanged();
  };

  const narrative = getOrderNarrative(paymentView);
  const returnedValue = orderReturnedValue(order);
  const netTotal = orderNetTotal(order);
  const gstIncluded = (() => {
    const goods = Math.max(
      netTotal - (order.orderStatus === "cancelled" ? 0 : Number(order.shippingCharge || 0)),
      0
    );
    return goods - goods / (1 + Number(order.gstPercentage || 0) / 100);
  })();
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
              <p className="font-display text-base font-bold text-ink-950 dark:text-white">
                {order.customerName}
              </p>
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
              {downloadingInvoice ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FileDown size={13} />
              )}
              Invoice
            </button>
            <button
              onClick={onClose}
              className="text-mist-400 hover:text-ink-950 dark:text-mist-500 dark:hover:text-white"
            >
              <CloseIcon size={20} />
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
            <div
              className={`mt-4 rounded-lg border px-3.5 py-2.5 text-sm font-medium ${NARRATIVE_STYLES[narrative.tone]}`}
            >
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
                  <PaymentStatusBadge status={paymentView.paymentStatus} />
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
                      currentStatus={paymentView.paymentStatus}
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
                <Phone size={14} className="text-mist-400 dark:text-mist-500" />{" "}
                {order.customerPhone}
              </p>
              {order.customerEmail && (
                <p className="flex items-center gap-2 text-mist-700 dark:text-mist-300">
                  <Mail size={14} className="text-mist-400 dark:text-mist-500" />{" "}
                  {order.customerEmail}
                </p>
              )}
              {order.organizationName && (
                <p className="flex items-center gap-2 text-mist-700 dark:text-mist-300">
                  <Building2 size={14} className="text-mist-400 dark:text-mist-500" />{" "}
                  {order.organizationName}
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
                <p className="text-sm text-mist-700 dark:text-mist-300">
                  {formatAddress(order.shippingAddress)}
                </p>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-mist-500 dark:text-mist-300">
                  <MapPin size={12} /> Billing
                </p>
                <p className="text-sm text-mist-700 dark:text-mist-300">
                  {formatAddress(order.billingAddress)}
                </p>
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
                      {item.variantName && (
                        <span className="text-mist-500 dark:text-mist-300">
                          {" "}
                          · {item.variantName}
                        </span>
                      )}
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
              {returnedValue > 0 && (
                <>
                  <div className="flex justify-between text-mist-500 dark:text-mist-300">
                    <span>Order total</span>
                    <span>{formatCurrency(order.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-amber-500 dark:text-amber-400">
                    <span>Returned (after discount)</span>
                    <span>-{formatCurrency(returnedValue)}</span>
                  </div>
                </>
              )}
              {order.gstPercentage > 0 && (
                <div className="flex justify-between text-mist-400 dark:text-mist-400">
                  <span>— incl. GST ({order.gstPercentage}%)</span>
                  {/* Same basis as the invoice: GST inside the goods value after discount & returns (shipping excluded) */}
                  <span>{formatCurrency(gstIncluded)}</span>
                </div>
              )}
              <div className="flex justify-between font-display text-base font-bold text-ink-950 dark:text-white">
                <span>{returnedValue > 0 ? "Net total (= invoice)" : "Grand total"}</span>
                <span>{formatCurrency(netTotal)}</span>
              </div>
              {invoice?.summary &&
                Math.abs(Number(invoice.summary.totalPayAmount) - netTotal) > 0.5 && (
                  <p className="text-xs text-coral-500 dark:text-coral-400">
                    Invoice {invoice.invoiceNumber} still shows{" "}
                    {formatCurrency(invoice.summary.totalPayAmount)} — it was made before the sync
                    fix. Run the invoice resync script once to correct it.
                  </p>
                )}
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
              <Info
                label="Refund amount"
                value={formatCurrency(order.refundAmount || order.partialRefundAmount || 0)}
              />
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
                {order.returnRequests.map((returnRequest) => (
                  <div
                    key={returnRequest.requestId}
                    className="rounded-lg border border-amber-200 bg-white p-3.5 dark:border-amber-500/20 dark:bg-ink-900"
                  >
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <Undo size={12} /> Returned{" "}
                        {formatDateTime(returnRequest.processedAt || returnRequest.requestedAt)}
                      </p>
                    </div>
                    <div className="mt-2 space-y-1">
                      {returnRequest.items.map((item, index) => (
                        <p key={index} className="text-sm text-ink-950 dark:text-white">
                          {item.quantity} × {item.productName}
                          {item.variantName && ` (${item.variantName})`}
                          <span className="text-mist-500 dark:text-mist-300">
                            {" "}
                            — {formatCurrency(item.price * item.quantity)}
                            {item.reason && ` · ${item.reason}`}
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
                {order.refundHistory.map((refund, index) => (
                  <div
                    key={refund.refundId || index}
                    className="rounded-lg border border-mint-200 bg-white p-3 text-sm dark:border-mint-500/20 dark:bg-ink-900"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-ink-950 dark:text-white">
                          {formatCurrency(refund.amount)}
                        </p>
                        <p className="text-xs text-mist-500 dark:text-mist-300">
                          via {refund.method} · {formatDateTime(refund.refundedAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-mint-100 px-2.5 py-1 text-[11px] font-semibold text-mint-600 dark:bg-mint-500/15 dark:text-mint-400">
                        {refund.refundStatus}
                      </span>
                    </div>
                    {/* Where this store credit actually went, if it was one —
                        so it's never just an anonymous number. */}
                    {refund.method === "credit_note" && (
                      <p className="mt-2 border-t border-mint-100 pt-2 text-xs dark:border-mint-500/20">
                        {refund.appliedToOrderId ? (
                          <span className="text-mist-600 dark:text-mist-300">
                            → Used on order{" "}
                            <span className="font-mono font-semibold text-ink-950 dark:text-white">
                              {refund.appliedInvoiceNumber || refund.appliedToOrderId}
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
                {appliedCredits.map((appliedCredit, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-mint-200 bg-white p-3 text-sm dark:border-mint-500/20 dark:bg-ink-900"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-mist-600 dark:text-mist-300">
                        From order{" "}
                        <span className="font-mono font-semibold text-ink-950 dark:text-white">
                          {appliedCredit.sourceInvoiceNumber || appliedCredit.sourceOrderId}
                        </span>
                      </p>
                      <p className="font-semibold text-mint-600 dark:text-mint-400">
                        {formatCurrency(appliedCredit.amount)}
                      </p>
                    </div>
                    {appliedCredit.returnedItems?.length > 0 && (
                      <div className="mt-1.5 border-t border-mint-100 pt-1.5 text-xs text-mist-500 dark:border-mint-500/20 dark:text-mist-300">
                        {appliedCredit.returnedItems.map((returnedItem, index) => (
                          <p key={index}>
                            {returnedItem.quantity} × {returnedItem.productName}
                            {returnedItem.variantName && ` (${returnedItem.variantName})`}
                          </p>
                        ))}
                      </div>
                    )}
                    {appliedCredit.refundedAt && (
                      <p className="mt-1 text-xs text-mist-400 dark:text-mist-500">
                        {formatDateTime(appliedCredit.refundedAt)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Purchase history */}
          <section className="mt-4 rounded-xl2 border border-mist-200 bg-white p-5 shadow-panel dark:border-white/10 dark:bg-ink-900">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-mist-500 dark:text-mist-300">
              Purchase history · {clientOrders.length} other order
              {clientOrders.length === 1 ? "" : "s"}
            </h3>
            {clientOrders.length === 0 ? (
              <p className="mt-2 text-sm text-mist-500 dark:text-mist-300">
                No other orders from this client yet.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-mist-100 dark:divide-white/10">
                {clientOrders.map((clientOrder) => (
                  <div
                    key={clientOrder.orderId}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium text-ink-950 dark:text-white">
                        {clientOrder.orderId}
                      </p>
                      <p className="text-xs text-mist-500 dark:text-mist-300">
                        {formatDateTime(clientOrder.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-mist-500 dark:text-mist-300">
                        {formatCurrency(clientOrder.grandTotal)}
                      </span>
                      <OrderStatusBadge status={clientOrder.orderStatus} />
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
        <CourierAssignModal
          order={order}
          onClose={() => setActiveModal(null)}
          onDone={handleDone}
        />
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
