import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { Field, TextInput, Select, TextArea } from "../components/FormField";
import { ManualOrderService, InvoiceService } from "../api/services";
import { formatCurrency } from "../lib/format";

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
  const [org, setOrg] = useState({ organizationName: "", gstNumber: "", gstAmount: 0, gstPercentage: 0 });
  const [shipping, setShipping] = useState(emptyAddress());
  const [billing, setBilling] = useState(emptyAddress());
  const [items, setItems] = useState([emptyItem()]);
  const [charges, setCharges] = useState({ shippingCharge: 0, discount: 0 });
  const [payment, setPayment] = useState({ paymentStatus: "paid", paymentMethod: "upi", paymentReference: "" });
  const [notes, setNotes] = useState("");

  const subtotal = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
  const grandTotal = Math.max(
    subtotal + (Number(charges.shippingCharge) || 0) + (Number(org.gstAmount) || 0) - (Number(charges.discount) || 0),
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
        gstAmount: Number(org.gstAmount) || 0,
        gstPercentage: Number(org.gstPercentage) || 0,
        discount: Number(charges.discount) || 0,
        shippingCharge: Number(charges.shippingCharge) || 0,
        paymentStatus: payment.paymentStatus,
        paymentMethod: payment.paymentStatus === "paid" ? payment.paymentMethod : undefined,
        paymentReference: payment.paymentReference || undefined,
        notes: notes || undefined,
      };

      const orderRes = await ManualOrderService.create(payload);
      const order = orderRes?.data?.order;
      toast.success(`Order ${order?.orderId} created`);

      // Auto-create the invoice right after the order is placed.
      try {
        await InvoiceService.create({
          orderId: order?.orderId,
          orderRef: order?._id,
          customerName: order?.customerName,
          customerEmail: order?.customerEmail,
          customerPhone: order?.customerPhone,
          organizationName: order?.organizationName,
          gstNumber: order?.gstNumber,
          items: order?.items,
          grandTotal: order?.grandTotal,
          billingAddress: order?.billingAddress,
          paymentStatus: order?.paymentStatus,
        });
        toast.success("Invoice generated");
      } catch (invErr) {
        toast.error(
          invErr?.response?.data?.message ||
            "Order was created, but the invoice could not be generated automatically"
        );
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
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-mist-500 hover:text-ink-950"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Customer */}
          <section className="rounded-xl2 border border-mist-200 bg-white p-6 shadow-panel">
            <h2 className="font-display text-base font-bold text-ink-950">Customer</h2>
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
                <TextInput
                  value={customer.customerPhone}
                  onChange={(e) => setCustomer((c) => ({ ...c, customerPhone: e.target.value }))}
                  placeholder="9876543210"
                  required
                />
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
          </section>

          {/* Items */}
          <section className="rounded-xl2 border border-mist-200 bg-white p-6 shadow-panel">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-ink-950">Items</h2>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 rounded-lg border border-teal-500 px-3 py-1.5 text-xs font-semibold text-teal-600 hover:bg-teal-50"
              >
                <Plus size={14} /> Add item
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-mist-200 p-4">
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
                        className="grid h-10 w-10 place-items-center rounded-lg text-coral-500 hover:bg-coral-100 disabled:cursor-not-allowed disabled:opacity-30"
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
                  <p className="mt-2 text-right text-xs text-mist-500">
                    Line total:{" "}
                    <span className="font-semibold text-ink-950">
                      {formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0))}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Shipping address */}
          <section className="rounded-xl2 border border-mist-200 bg-white p-6 shadow-panel">
            <h2 className="font-display text-base font-bold text-ink-950">Shipping address</h2>
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

            <label className="mt-4 flex items-center gap-2 text-sm text-mist-700">
              <input
                type="checkbox"
                checked={sameAsShipping}
                onChange={(e) => setSameAsShipping(e.target.checked)}
                className="h-4 w-4 rounded border-mist-300 text-teal-500 focus:ring-teal-500"
              />
              Billing address is the same as shipping
            </label>

            {!sameAsShipping && (
              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-mist-100 pt-4 sm:grid-cols-2">
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
          <section className="rounded-xl2 border border-mist-200 bg-white p-6 shadow-panel">
            <h2 className="font-display text-base font-bold text-ink-950">Payment</h2>
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

          <section className="rounded-xl2 border border-mist-200 bg-white p-6 shadow-panel">
            <h2 className="font-display text-base font-bold text-ink-950">Charges</h2>
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
              <Field label="GST amount">
                <TextInput
                  type="number"
                  min="0"
                  value={org.gstAmount}
                  onChange={(e) => setOrg((o) => ({ ...o, gstAmount: e.target.value }))}
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
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-mist-300">
                <span>Shipping</span>
                <span>{formatCurrency(charges.shippingCharge)}</span>
              </div>
              <div className="flex justify-between text-mist-300">
                <span>GST</span>
                <span>{formatCurrency(org.gstAmount)}</span>
              </div>
              <div className="flex justify-between text-mist-300">
                <span>Discount</span>
                <span>-{formatCurrency(charges.discount)}</span>
              </div>
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
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 py-3 text-sm font-semibold text-ink-950 transition hover:bg-teal-400 disabled:opacity-60"
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
