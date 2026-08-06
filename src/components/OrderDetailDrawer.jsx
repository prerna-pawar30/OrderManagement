import React, { useEffect, useState } from "react";
import { X, Phone, Mail, MapPin, Building2, Truck, Ban, Undo2, Split, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { ManualOrderService } from "../api/services";
import { OrderStatusBadge, PaymentStatusBadge } from "./StatusBadge";
import { formatCurrency, formatDateTime, initials } from "../lib/format";
import CancelOrderModal from "./CancelOrderModal";
import ReturnOrderModal from "./ReturnOrderModal";

export default function OrderDetailDrawer({ orderSummary, allOrders, onClose, onChanged }) {
  const [order, setOrder] = useState(orderSummary);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null); // "cancel" | "return" | "partial"

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ManualOrderService.getOne(orderSummary.orderId)
      .then((res) => {
        if (!cancelled) setOrder(res?.data?.order || orderSummary);
      })
      .catch(() => {
        // fall back to the summary row already in hand
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [orderSummary]);

  const clientOrders = allOrders.filter(
    (o) => o.customerPhone === order.customerPhone && o.orderId !== order.orderId
  );

  const canCancel = !["delivered", "cancelled", "shipped"].includes(order.orderStatus);
  const canReturn = ["placed", "packed", "confirmed", "shipped", "delivered", "partial_returned"].includes(
    order.orderStatus
  );
  const hasReturnableItems = order.items?.some(
    (i) => Number(i.quantity) - Number(i.returnedQuantity || 0) > 0
  );

  const handleDone = () => {
    setActiveModal(null);
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-ink-950/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col bg-mist-50 shadow-panel">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mist-200 bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-ink-950 text-sm font-bold text-white">
              {initials(order.customerName)}
            </span>
            <div>
              <p className="font-display text-base font-bold text-ink-950">{order.customerName}</p>
              <p className="text-xs text-mist-500">{order.orderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-mist-400 hover:text-ink-950">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
          {loading && (
            <div className="flex items-center gap-2 pb-4 text-sm text-mist-500">
              <Loader2 size={14} className="animate-spin" /> Refreshing order…
            </div>
          )}

          {/* Client card */}
          <section className="rounded-xl2 border border-mist-200 bg-white p-5 shadow-panel">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold uppercase tracking-wide text-mist-500">
                Client
              </h3>
              <div className="flex gap-2">
                <OrderStatusBadge status={order.orderStatus} />
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2 text-mist-700">
                <Phone size={14} className="text-mist-400" /> {order.customerPhone}
              </p>
              {order.customerEmail && (
                <p className="flex items-center gap-2 text-mist-700">
                  <Mail size={14} className="text-mist-400" /> {order.customerEmail}
                </p>
              )}
              {order.organizationName && (
                <p className="flex items-center gap-2 text-mist-700">
                  <Building2 size={14} className="text-mist-400" /> {order.organizationName}
                </p>
              )}
              {order.gstNumber && (
                <p className="text-mist-700">
                  <span className="text-mist-400">GSTIN:</span> {order.gstNumber}
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-mist-100 pt-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-mist-500">
                  <MapPin size={12} /> Shipping
                </p>
                <p className="text-sm text-mist-700">{formatAddress(order.shippingAddress)}</p>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-mist-500">
                  <MapPin size={12} /> Billing
                </p>
                <p className="text-sm text-mist-700">{formatAddress(order.billingAddress)}</p>
              </div>
            </div>
          </section>

          {/* Order items */}
          <section className="mt-4 rounded-xl2 border border-mist-200 bg-white p-5 shadow-panel">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-mist-500">
              Items purchased
            </h3>
            <div className="mt-3 divide-y divide-mist-100">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-ink-950">
                      {item.productName}
                      {item.variantName && <span className="text-mist-500"> · {item.variantName}</span>}
                    </p>
                    <p className="text-xs text-mist-500">
                      {formatCurrency(item.price)} × {item.quantity}
                      {item.returnedQuantity > 0 && (
                        <span className="ml-1.5 text-amber-500">
                          ({item.returnedQuantity} returned)
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="font-semibold text-ink-950">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-mist-100 pt-3 text-sm">
              <div className="flex justify-between text-mist-500">
                <span>Shipping</span>
                <span>{formatCurrency(order.shippingCharge)}</span>
              </div>
              <div className="flex justify-between text-mist-500">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
              <div className="flex justify-between font-display text-base font-bold text-ink-950">
                <span>Grand total</span>
                <span>{formatCurrency(order.grandTotal)}</span>
              </div>
            </div>
          </section>

          {/* Payment & courier */}
          <section className="mt-4 rounded-xl2 border border-mist-200 bg-white p-5 shadow-panel">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-mist-500">
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
              <p className="mt-3 rounded-lg bg-coral-100 px-3 py-2 text-xs text-coral-500">
                Cancelled: {order.cancellationReason}
              </p>
            )}
          </section>

          {/* Purchase history */}
          <section className="mt-4 rounded-xl2 border border-mist-200 bg-white p-5 shadow-panel">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-mist-500">
              Purchase history · {clientOrders.length} other order{clientOrders.length === 1 ? "" : "s"}
            </h3>
            {clientOrders.length === 0 ? (
              <p className="mt-2 text-sm text-mist-500">No other orders from this client yet.</p>
            ) : (
              <div className="mt-3 divide-y divide-mist-100">
                {clientOrders.map((o) => (
                  <div key={o.orderId} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-ink-950">{o.orderId}</p>
                      <p className="text-xs text-mist-500">{formatDateTime(o.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-mist-500">{formatCurrency(o.grandTotal)}</span>
                      <OrderStatusBadge status={o.orderStatus} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Action bar */}
        <div className="border-t border-mist-200 bg-white px-6 py-4">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setActiveModal("return")}
              disabled={!canReturn || !hasReturnableItems}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-400 py-2.5 text-xs font-semibold text-amber-500 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Undo2 size={14} /> Return
            </button>
            <button
              onClick={() => setActiveModal("partial")}
              disabled={!canReturn || !hasReturnableItems}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-teal-500 py-2.5 text-xs font-semibold text-teal-600 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Split size={14} /> Partial return
            </button>
            <button
              onClick={() => setActiveModal("cancel")}
              disabled={!canCancel}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-coral-500 py-2.5 text-xs font-semibold text-coral-500 hover:bg-coral-100 disabled:cursor-not-allowed disabled:opacity-40"
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
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-mist-500">{label}</p>
      <p className="font-medium text-ink-950">{value}</p>
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
