import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { Field, TextInput, Select, TextArea } from "../components/FormField";
import { ManualOrderService } from "../api/services";
import { formatCurrency } from "../lib/format";
import { tagNotesWithAppliedCredit } from "../lib/invoiceHelpers";

const emptyItem = () => ({ productName: "", variantName: "", sku: "", price: "", quantity: 1, notes: "" });

const emptyAddress = () => ({
  fullName: "",
  phone: "",
  street: "",
  area: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
});

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [sameAsShipping, setSameAsShipping] = useState(true);

  const [customer, setCustomer] = useState({ customerName: "", customerPhone: "", customerEmail: "" });
  const [org, setOrg] = useState({ organizationName: "", gstNumber: "", gstPercentage: 5 });
  const [shipping, setShipping] = useState(emptyAddress());
  const [billing, setBilling] = useState(emptyAddress());
  const [items, setItems] = useState([emptyItem()]);
  const [charges, setCharges] = useState({ shippingCharge: 0, discount: 0 });
  const [payment, setPayment] = useState({ paymentStatus: "pending", paymentMethod: "upi", paymentReference: "" });
  const [notes, setNotes] = useState("");

  // "Customer said they'll take it next time" — credit lookup. Checks
  // whether this phone number has money owed to them from a past
  // return/cancellation (Customer Ledger), and lets staff apply it as a
  // discount on this order instead of a cash refund.
  const [creditLookup, setCreditLookup] = useState(null); // { checking, available, sourceOrders }
  const [creditToApply, setCreditToApply] = useState("");

  const checkExistingCredit = async () => {
    if (!customer.customerPhone.trim()) {
      toast.error("Enter the customer's phone number first");
      return;
    }
    setCreditLookup({ checking: true, available: 0, sourceOrders: [] });
    try {
      const res = await ManualOrderService.getCustomerLedger({ search: customer.customerPhone.trim() });
      const match = (res?.data?.customers || []).find(
        (c) => c.customerPhone === customer.customerPhone.trim()
      );
      const available = match?.totalOwedToCustomer || 0;
      const sourceOrders = (match?.orders || []).filter((o) => o.owedToCustomer > 0);
      setCreditLookup({ checking: false, available, sourceOrders });
      if (available > 0) {
        toast.success(`This customer has ₹${available.toLocaleString("en-IN")} credit available`);
      } else {
        toast("No pending credit for this customer", { icon: "ℹ️" });
      }
    } catch (err) {
      setCreditLookup(null);
      toast.error("Could not check existing credit");
    }
  };

  const applyCredit = () => {
    const amount = Number(creditToApply);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid credit amount to apply");
      return;
    }
    if (amount > (creditLookup?.available || 0)) {
      toast.error("Can't apply more than the available credit");
      return;
    }
    setCharges((c) => ({ ...c, creditApplied: amount }));
    toast.success(`₹${amount.toLocaleString("en-IN")} credit will be applied as a discount`);
  };

  const subtotal = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);

  // Product prices are entered GST-inclusive (5% is already baked into the
  // price, same as the storefront) — so GST here is only extracted out for
  // display and for the invoice's tax breakdown. It is NOT added on top of
  // the subtotal again, or the customer would be charged GST twice.
  const gstPercentage = Number(org.gstPercentage) || 0;
  const gstAmount = subtotal - subtotal / (1 + gstPercentage / 100);

  const grandTotal = Math.max(
    subtotal +
      (Number(charges.shippingCharge) || 0) -
      (Number(charges.discount) || 0) -
      (Number(charges.creditApplied) || 0),
    0
  );

  const updateItem = (idx, patch) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const validate = () => {
    if (!customer.customerName.trim() || !customer.customerPhone.trim()) {
      toast.error("Customer name and phone are required");
      return false;
    }
    if (!shipping.fullName.trim() || !shipping.phone.trim()) {
      toast.error("Shipping full name and phone are required");
      return false;
    }
    if (items.length === 0 || items.some((i) => !i.productName.trim() || !i.price || !i.quantity)) {
      toast.error("Every item needs a product name, price and quantity");
      return false;
    }
    if (payment.paymentStatus === "paid" && !payment.paymentMethod) {
      toast.error("Select a payment method for a paid order");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      // NOTE: the invoice is created entirely by the backend now (see
      // createManualOrderService -> generateInvoiceForOrder), not here.
      // This used to ALSO create an invoice from the frontend and tag its
      // id into the order's notes — which meant every order silently got
      // TWO separate invoices (one from here, one from the backend), and
      // whichever one got tagged into notes was the one shown when
      // downloading from the order page, while every other part of the
      // app (discount fixes, payment sync, credit settle) worked off the
      // backend's own order.invoiceId. That mismatch is exactly why
      // numbers looked different depending on which screen you checked.

      // Work out (once) exactly which source order(s) to draw the applied
      // credit from and how much from each — used both to tag this order's
      // own notes below (so its detail page can show where the credit came
      // from) and, after creation, to actually settle those source orders.
      const creditAmount = Number(charges.creditApplied) || 0;
      const creditPlan = [];
      if (creditAmount > 0 && creditLookup?.sourceOrders?.length) {
        let remainingToPlan = creditAmount;
        for (const src of creditLookup.sourceOrders) {
          if (remainingToPlan <= 0) break;
          const take = Math.min(remainingToPlan, src.owedToCustomer);
          if (take > 0) creditPlan.push({ orderId: src.orderId, amount: take });
          remainingToPlan -= take;
        }
      }

      let notesWithTags = notes || "";
      creditPlan.forEach((c) => {
        notesWithTags = tagNotesWithAppliedCredit(notesWithTags, c.orderId, c.amount);
      });

      const payload = {
        ...customer,
        customerEmail: customer.customerEmail || undefined,
        items: items.map((i) => ({
          productName: i.productName.trim(),
          variantName: i.variantName?.trim() || undefined,
          sku: i.sku?.trim() || undefined,
          price: Number(i.price),
          quantity: Number(i.quantity),
          notes: i.notes?.trim() || undefined,
        })),
        shippingAddress: shipping,
        billingAddress: sameAsShipping ? shipping : billing,
        organizationName: org.organizationName || undefined,
        gstNumber: org.gstNumber || undefined,
        // Sent as 0 on purpose: item prices already include GST, so the
        // backend's grandTotal = subtotal + shipping + gstAmount - discount
        // must not add tax again on top. gstPercentage is still recorded so
        // the order/invoice can show what rate was baked into the prices.
        gstAmount: 0,
        gstPercentage: Number(org.gstPercentage) || 0,
        // Backend only knows a single "discount" field — store credit
        // applied here is folded into it so the order total actually comes
        // out lower by that amount, same as a normal discount would.
        discount: (Number(charges.discount) || 0) + creditAmount,
        shippingCharge: Number(charges.shippingCharge) || 0,
        paymentStatus: payment.paymentStatus,
        paymentMethod: payment.paymentStatus === "paid" ? payment.paymentMethod : undefined,
        paymentReference: payment.paymentReference || undefined,
        notes: notesWithTags || undefined,
      };

      const orderRes = await ManualOrderService.create(payload);
      const order = orderRes?.data?.order;
      toast.success(
        order?.invoiceId ? `Order ${order?.orderId} created — invoice generated` : `Order ${order?.orderId} created`
      );

      // Consume the applied credit from whichever old order(s) it came from,
      // oldest first, so those orders stop showing as "we owe customer" now
      // that the credit has actually been used. (creditPlan was computed
      // above, before the order existed, so its notes could be tagged too.)
      for (const step of creditPlan) {
        try {
          await ManualOrderService.settleCredit(step.orderId, {
            amount: step.amount,
            appliedToOrderId: order?.orderId,
            notes: `Applied to new order ${order?.orderId}`,
          });
        } catch (creditErr) {
          toast.error(
            `Order created, but couldn't settle credit on ${step.orderId} — please adjust it manually`
          );
        }
      }

      navigate("/orders");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not create the order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-mist-500 hover:text-ink-950 dark:text-mist-300 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Customer */}
          <section className="rounded-xl2 border border-mist-200 bg-white p-6 shadow-panel dark:border-white/10 dark:bg-ink-900">
            <h2 className="font-display text-base font-bold text-ink-950 dark:text-white">Customer</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name" required>
                <TextInput
                  value={customer.customerName}
                  onChange={(e) => setCustomer((c) => ({ ...c, customerName: e.target.value }))}
                  placeholder="Ritu Sharma"
                  required
                />
              </Field>
              <Field label="Phone" required>
                <div className="flex gap-2">
                  <TextInput
                    value={customer.customerPhone}
                    onChange={(e) => setCustomer((c) => ({ ...c, customerPhone: e.target.value }))}
                    placeholder="9876543210"
                    required
                  />
                  <button
                    type="button"
                    onClick={checkExistingCredit}
                    disabled={creditLookup?.checking}
                    className="shrink-0 rounded-lg border border-mist-200 px-3 text-xs font-semibold text-mist-700 hover:bg-mist-50 disabled:opacity-50 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
                  >
                    {creditLookup?.checking ? "Checking…" : "Check credit"}
                  </button>
                </div>
              </Field>
              <Field label="Email">
                <TextInput
                  type="email"
                  value={customer.customerEmail}
                  onChange={(e) => setCustomer((c) => ({ ...c, customerEmail: e.target.value }))}
                  placeholder="customer@email.com"
                />
              </Field>
              <Field label="Organization (optional)">
                <TextInput
                  value={org.organizationName}
                  onChange={(e) => setOrg((o) => ({ ...o, organizationName: e.target.value }))}
                  placeholder="Company name"
                />
              </Field>
            </div>

            {creditLookup && !creditLookup.checking && creditLookup.available > 0 && (
              <div className="mt-4 rounded-lg border border-mint-200 bg-mint-50 p-4 dark:border-mint-500/30 dark:bg-mint-500/10">
                <p className="text-sm font-semibold text-mint-600 dark:text-mint-400">
                  This customer has {formatCurrency(creditLookup.available)} credit available
                </p>
                <p className="mt-0.5 text-xs text-mist-500 dark:text-mist-300">
                  From {creditLookup.sourceOrders.length} earlier order
                  {creditLookup.sourceOrders.length === 1 ? "" : "s"} with a refund still owed. Apply some
                  or all of it as a discount on this order instead of paying it back in cash.
                </p>
                {charges.creditApplied > 0 ? (
                  <p className="mt-2 text-sm font-semibold text-mint-600 dark:text-mint-400">
                    ✓ {formatCurrency(charges.creditApplied)} will be applied as a discount
                  </p>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <TextInput
                      type="number"
                      min="0"
                      max={creditLookup.available}
                      value={creditToApply}
                      onChange={(e) => setCreditToApply(e.target.value)}
                      placeholder={`Up to ${creditLookup.available}`}
                    />
                    <button
                      type="button"
                      onClick={applyCredit}
                      className="shrink-0 rounded-lg bg-mint-500 px-4 text-xs font-semibold text-white hover:bg-mint-600"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            )}
            {creditLookup && !creditLookup.checking && creditLookup.available === 0 && (
              <p className="mt-3 text-xs text-mist-500 dark:text-mist-300">
                No pending credit found for this phone number.
              </p>
            )}
          </section>

          {/* Items */}
          <section className="rounded-xl2 border border-mist-200 bg-white p-6 shadow-panel dark:border-white/10 dark:bg-ink-900">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-ink-950 dark:text-white">Items</h2>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 rounded-lg border border-orange-500 px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50"
              >
                <Plus size={14} /> Add item
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-mist-200 p-4 dark:border-white/10">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-4">
                      <Field label="Product" required>
                        <TextInput
                          value={item.productName}
                          onChange={(e) => updateItem(idx, { productName: e.target.value })}
                          placeholder="Product name"
                          required
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Variant">
                        <TextInput
                          value={item.variantName}
                          onChange={(e) => updateItem(idx, { variantName: e.target.value })}
                          placeholder="e.g. Blue / L"
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Price" required>
                        <TextInput
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={(e) => updateItem(idx, { price: e.target.value })}
                          placeholder="0"
                          required
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Qty" required>
                        <TextInput
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                          required
                        />
                      </Field>
                    </div>
                    <div className="flex items-end justify-end sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length === 1}
                        className="grid h-10 w-10 place-items-center rounded-lg text-coral-500 hover:bg-coral-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-coral-400 dark:hover:bg-coral-500/10"
                        aria-label="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="sm:col-span-12">
                      <TextInput
                        value={item.notes}
                        onChange={(e) => updateItem(idx, { notes: e.target.value })}
                        placeholder="Notes for this item (color, size, custom request…)"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-right text-xs text-mist-500 dark:text-mist-300">
                    Line total:{" "}
                    <span className="font-semibold text-ink-950 dark:text-white">
                      {formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0))}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Shipping address */}
          <section className="rounded-xl2 border border-mist-200 bg-white p-6 shadow-panel dark:border-white/10 dark:bg-ink-900">
            <h2 className="font-display text-base font-bold text-ink-950 dark:text-white">Shipping address</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name" required>
                <TextInput
                  value={shipping.fullName}
                  onChange={(e) => setShipping((a) => ({ ...a, fullName: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Phone" required>
                <TextInput
                  value={shipping.phone}
                  onChange={(e) => setShipping((a) => ({ ...a, phone: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Street">
                <TextInput
                  value={shipping.street}
                  onChange={(e) => setShipping((a) => ({ ...a, street: e.target.value }))}
                />
              </Field>
              <Field label="Area / landmark">
                <TextInput
                  value={shipping.area}
                  onChange={(e) => setShipping((a) => ({ ...a, area: e.target.value }))}
                />
              </Field>
              <Field label="City">
                <TextInput
                  value={shipping.city}
                  onChange={(e) => setShipping((a) => ({ ...a, city: e.target.value }))}
                />
              </Field>
              <Field label="State">
                <TextInput
                  value={shipping.state}
                  onChange={(e) => setShipping((a) => ({ ...a, state: e.target.value }))}
                />
              </Field>
              <Field label="Pincode">
                <TextInput
                  value={shipping.pincode}
                  onChange={(e) => setShipping((a) => ({ ...a, pincode: e.target.value }))}
                />
              </Field>
              <Field label="Country">
                <TextInput
                  value={shipping.country}
                  onChange={(e) => setShipping((a) => ({ ...a, country: e.target.value }))}
                />
              </Field>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-mist-700 dark:text-mist-300">
              <input
                type="checkbox"
                checked={sameAsShipping}
                onChange={(e) => setSameAsShipping(e.target.checked)}
                className="h-4 w-4 rounded border-mist-300 text-orange-500 focus:ring-orange-500 dark:border-ink-700 dark:bg-ink-900"
              />
              Billing address is the same as shipping
            </label>

            {!sameAsShipping && (
              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-mist-100 pt-4 dark:border-white/10 sm:grid-cols-2">
                <Field label="Full name" required>
                  <TextInput
                    value={billing.fullName}
                    onChange={(e) => setBilling((a) => ({ ...a, fullName: e.target.value }))}
                  />
                </Field>
                <Field label="Phone" required>
                  <TextInput
                    value={billing.phone}
                    onChange={(e) => setBilling((a) => ({ ...a, phone: e.target.value }))}
                  />
                </Field>
                <Field label="Street">
                  <TextInput
                    value={billing.street}
                    onChange={(e) => setBilling((a) => ({ ...a, street: e.target.value }))}
                  />
                </Field>
                <Field label="City">
                  <TextInput
                    value={billing.city}
                    onChange={(e) => setBilling((a) => ({ ...a, city: e.target.value }))}
                  />
                </Field>
                <Field label="State">
                  <TextInput
                    value={billing.state}
                    onChange={(e) => setBilling((a) => ({ ...a, state: e.target.value }))}
                  />
                </Field>
                <Field label="Pincode">
                  <TextInput
                    value={billing.pincode}
                    onChange={(e) => setBilling((a) => ({ ...a, pincode: e.target.value }))}
                  />
                </Field>
              </div>
            )}
          </section>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-6">
          <section className="rounded-xl2 border border-mist-200 bg-white p-6 shadow-panel dark:border-white/10 dark:bg-ink-900">
            <h2 className="font-display text-base font-bold text-ink-950 dark:text-white">Payment</h2>
            <div className="mt-4 space-y-4">
              <Field label="Payment status" required>
                <Select
                  value={payment.paymentStatus}
                  onChange={(e) => setPayment((p) => ({ ...p, paymentStatus: e.target.value }))}
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </Select>
              </Field>
              {payment.paymentStatus === "paid" && (
                <>
                  <Field label="Payment method" required>
                    <Select
                      value={payment.paymentMethod}
                      onChange={(e) => setPayment((p) => ({ ...p, paymentMethod: e.target.value }))}
                    >
                      <option value="upi">UPI</option>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank transfer</option>
                      <option value="card">Card</option>
                      <option value="cheque">Cheque</option>
                      <option value="other">Other</option>
                    </Select>
                  </Field>
                  <Field label="Payment reference">
                    <TextInput
                      value={payment.paymentReference}
                      onChange={(e) => setPayment((p) => ({ ...p, paymentReference: e.target.value }))}
                      placeholder="Transaction / UTR ID"
                    />
                  </Field>
                </>
              )}
            </div>
          </section>

          <section className="rounded-xl2 border border-mist-200 bg-white p-6 shadow-panel dark:border-white/10 dark:bg-ink-900">
            <h2 className="font-display text-base font-bold text-ink-950 dark:text-white">Charges</h2>
            <div className="mt-4 space-y-4">
              <Field label="Shipping charge">
                <TextInput
                  type="number"
                  min="0"
                  value={charges.shippingCharge}
                  onChange={(e) => setCharges((c) => ({ ...c, shippingCharge: e.target.value }))}
                />
              </Field>
              <Field label="Discount">
                <TextInput
                  type="number"
                  min="0"
                  value={charges.discount}
                  onChange={(e) => setCharges((c) => ({ ...c, discount: e.target.value }))}
                />
              </Field>
              <Field label="GST %" hint="Prices are entered GST-inclusive — this just splits out the tax portion for the invoice, it isn't added again.">
                <TextInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={org.gstPercentage}
                  onChange={(e) => setOrg((o) => ({ ...o, gstPercentage: e.target.value }))}
                />
              </Field>
              <Field label="GST number">
                <TextInput
                  value={org.gstNumber}
                  onChange={(e) => setOrg((o) => ({ ...o, gstNumber: e.target.value }))}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Notes">
                <TextArea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal note for this order"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-xl2 border border-ink-950 bg-ink-950 p-6 text-white shadow-panel">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-mist-300">
                <span>Subtotal (GST-inclusive)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-mist-400">
                <span>— of which GST ({gstPercentage}%)</span>
                <span>{formatCurrency(gstAmount)}</span>
              </div>
              <div className="flex justify-between text-mist-300">
                <span>Shipping</span>
                <span>{formatCurrency(charges.shippingCharge)}</span>
              </div>
              <div className="flex justify-between text-mist-300">
                <span>Discount</span>
                <span>-{formatCurrency(charges.discount)}</span>
              </div>
              {charges.creditApplied > 0 && (
                <div className="flex justify-between text-mint-400">
                  <span>Credit applied</span>
                  <span>-{formatCurrency(charges.creditApplied)}</span>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-white/15 pt-3">
              <span className="text-sm font-medium text-mist-300">Grand total</span>
              <span className="font-display text-2xl font-extrabold text-white">
                {formatCurrency(grandTotal)}
              </span>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 text-sm font-semibold text-ink-950 transition hover:bg-orange-400 disabled:opacity-60"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              Create order &amp; invoice
            </button>
            <p className="mt-2 text-center text-[11px] text-mist-400">
              An invoice is generated automatically once the order is created.
            </p>
          </section>
        </div>
      </form>
    </div>
  );
}
