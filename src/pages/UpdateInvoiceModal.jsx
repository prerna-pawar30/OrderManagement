/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { InvoiceService } from "../api/services";
import Swal from "sweetalert2";
import DropdownGroup from "../components/ui/DropdownGroup";
import {
  X, Building2, Truck, FileText, User,
  ShoppingBag, Calculator, Trash2, Plus
} from "lucide-react";

const UpdateInvoiceModal = ({ invoice, onClose, onRefresh }) => {
  const [formData, setFormData] = useState({
    status: invoice.status || "issued",
    paymentTerms: invoice.paymentTerms || "",
    termsOfDelivery: invoice.termsOfDelivery || "",
    shippingCondition: invoice.shippingCondition || "",
    customerServiceRep: invoice.customerServiceRep || "",
    notes: invoice.notes || "",
    invoiceDate: invoice.invoiceDate
      ? new Date(invoice.invoiceDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    orderDate: invoice.orderDate
      ? new Date(invoice.orderDate).toISOString().split('T')[0]
      : "",
    deliveryDate: invoice.deliveryDate
      ? new Date(invoice.deliveryDate).toISOString().split('T')[0]
      : "",
    billTo: {
      companyName: invoice.billTo?.companyName || "",
      address: invoice.billTo?.address || "",
      gstin: invoice.billTo?.gstin || "",
      contactPerson: invoice.billTo?.contactPerson || "",
      contactNumber: invoice.billTo?.contactNumber || "",
    },
    items: invoice.items && invoice.items.length > 0
      ? invoice.items.map(item => ({
          description: item.description || "",
          qty: item.qty !== undefined ? String(item.qty) : "1",
          price: item.price !== undefined ? String(item.price) : "0",
          discountPercent: item.discountPercent !== undefined ? String(item.discountPercent) : "0",
          discountValue: item.discountValue !== undefined ? String(item.discountValue) : "0"
        }))
      : [{ description: "", qty: "1", price: "0", discountPercent: "0", discountValue: "0" }],
    summary: {
      freightCost: invoice.summary?.freightCost !== undefined ? String(invoice.summary.freightCost) : "0",
      paidAmount: invoice.summary?.paidAmount !== undefined ? String(invoice.summary.paidAmount) : "0",
    },
    permission: "invoice.manage.update",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Utility functions to protect values from scroll logic distortions ---
  const cleanNumericInput = (val) => {
    return val.replace(/[^0-9.]/g, '');
  };

  const handleWheelBlur = (e) => {
    e.target.blur();
  };

  // --- Handlers ---
  const handleBillToChange = (field, value) => {
    setFormData(prev => ({ ...prev, billTo: { ...prev.billTo, [field]: value } }));
  };

  const handleSummaryChange = (field, value) => {
    const sanitizedValue = cleanNumericInput(value);
    setFormData(prev => ({
      ...prev,
      summary: { ...prev.summary, [field]: sanitizedValue }
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];

    if (field === 'description') {
      updatedItems[index][field] = value;
    } else {
      const sanitizedValue = cleanNumericInput(value);
      updatedItems[index][field] = sanitizedValue;

      // Calculate inline discounts adaptively based on which field was altered
      const qty = Number(field === 'qty' ? sanitizedValue : updatedItems[index].qty) || 0;
      const price = Number(field === 'price' ? sanitizedValue : updatedItems[index].price) || 0;
      const grossAmount = qty * price;

      if (field === 'discountPercent') {
        const percent = Number(sanitizedValue) || 0;
        updatedItems[index]['discountValue'] = String((grossAmount * percent) / 100);
      } else if (field === 'discountValue') {
        const discVal = Number(sanitizedValue) || 0;
        updatedItems[index]['discountPercent'] = grossAmount > 0 ? String((discVal / grossAmount) * 100) : "0";
      } else {
        const percent = Number(updatedItems[index].discountPercent) || 0;
        updatedItems[index]['discountValue'] = String((grossAmount * percent) / 100);
      }
    }

    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const addNewItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: "", qty: "1", price: "0", discountPercent: "0", discountValue: "0" }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length <= 1) {
        Swal.fire({
            icon: 'warning',
            title: 'Action Denied',
            text: 'At least one item is required in the invoice.',
            confirmButtonColor: '#f97316'
        });
        return;
    }
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const result = await Swal.fire({
      title: "Update Invoice?",
      text: "Are you sure you want to save these changes?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#9ca3af",
      confirmButtonText: "Yes, update it!"
    });

    if (result.isConfirmed) {
      setIsSubmitting(true);

      // Parse fields back into structural numbers for your backend storage model
      const validatedItems = formData.items.map(item => ({
        ...item,
        qty: Number(item.qty) || 0,
        price: Number(item.price) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        discountValue: Number(item.discountValue) || 0
      }));

      const finalSubmissionData = {
        ...formData,
        items: validatedItems,
        summary: {
          freightCost: Number(formData.summary.freightCost) || 0,
          paidAmount: Number(formData.summary.paidAmount) || 0
        }
      };

      try {
        await InvoiceService.updateInvoice(invoice.invoiceId || invoice._id, finalSubmissionData);

        await Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Invoice has been updated successfully.",
          timer: 2000,
          showConfirmButton: false
        });

        onRefresh();
        onClose();
      } catch (error) {
        console.error("Update Error:", error);
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: error.response?.data?.message || "Something went wrong while updating.",
          confirmButtonColor: "#ef4444"
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end justify-center p-4 z-[100]">
      <div className="bg-slate-50 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col h-[85vh] transition-all duration-200">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500/10 text-orange-600 p-2 rounded-xl">
              <FileText size={22} />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Update Invoice</h2>
              <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                #{invoice.invoiceNumber || "Draft"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="pt-6 px-6 pb-2 overflow-y-auto flex-1 text-left bg-slate-50/50">

          {/* 1. Billing Details */}
          <section className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm space-y-4 mb-6">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-slate-100 pb-3">
              <Building2 size={18} className="text-orange-500" />
              <span>Customer Information</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Company Name</label>
                <input
                  type="text"
                  className="w-full border-slate-200 border rounded-xl px-3 py-2 text-slate-800 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  value={formData.billTo.companyName}
                  onChange={(e) => handleBillToChange("companyName", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">GSTIN</label>
                <input
                  type="text"
                  className="w-full border-slate-200 border rounded-xl px-3 py-2 text-slate-800 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all placeholder-slate-400 uppercase"
                  placeholder="22AAAAA0000A1Z5"
                  value={formData.billTo.gstin}
                  onChange={(e) => handleBillToChange("gstin", e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Address</label>
                <textarea
                  className="w-full border-slate-200 border rounded-xl px-3 py-2 text-slate-800 text-sm h-20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all resize-none"
                  value={formData.billTo.address}
                  onChange={(e) => handleBillToChange("address", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Contact Person</label>
                <input
                  type="text"
                  className="w-full border-slate-200 border rounded-xl px-3 py-2 text-slate-800 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  value={formData.billTo.contactPerson}
                  onChange={(e) => handleBillToChange("contactPerson", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Contact Number</label>
                <input
                  type="text"
                  className="w-full border-slate-200 border rounded-xl px-3 py-2 text-slate-800 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  value={formData.billTo.contactNumber}
                  onChange={(e) => handleBillToChange("contactNumber", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* 2. Order & Shipping Details */}
          <section className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm space-y-4 mb-6">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-slate-100 pb-3">
              <Truck size={18} className="text-orange-500" />
              <span>Timeline & Logistics</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Invoice Date</label>
                <input
                  type="date"
                  className="w-full border-slate-200 border rounded-xl px-3 py-2 text-slate-800 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none bg-white transition-all"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({...formData, invoiceDate: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Order Date</label>
                <input
                  type="date"
                  className="w-full border-slate-200 border rounded-xl px-3 py-2 text-slate-800 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none bg-white transition-all"
                  value={formData.orderDate}
                  onChange={(e) => setFormData({...formData, orderDate: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Delivery Date</label>
                <input
                  type="date"
                  className="w-full border-slate-200 border rounded-xl px-3 py-2 text-slate-800 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none bg-white transition-all"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Delivery Terms</label>
                <input
                  type="text"
                  className="w-full border-slate-200 border rounded-xl px-3 py-2 text-slate-800 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  value={formData.termsOfDelivery}
                  onChange={(e) => setFormData({...formData, termsOfDelivery: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Shipping Cond.</label>
                <input
                  type="text"
                  className="w-full border-slate-200 border rounded-xl px-3 py-2 text-slate-800 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  value={formData.shippingCondition}
                  onChange={(e) => setFormData({...formData, shippingCondition: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Service Rep</label>
                <input
                  type="text"
                  className="w-full border-slate-200 border rounded-xl px-3 py-2 font-medium text-orange-600 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  value={formData.customerServiceRep}
                  onChange={(e) => setFormData({...formData, customerServiceRep: e.target.value})}
                />
              </div>
              <div>
                <DropdownGroup
                  label="Status"
                  value={formData.status}
                  options={[
                    { value: "issued", label: "Issued" },
                    { value: "paid", label: "Paid" },
                    { value: "partially_paid", label: "Partially Paid" },
                    { value: "cancelled", label: "Cancelled" }
                  ]}
                  onChange={(v) => setFormData({ ...formData, status: v })}
                />
              </div>
            </div>
          </section>

          {/* 3. Items List */}
          <section className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm space-y-4 mb-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <ShoppingBag size={18} className="text-orange-500" />
                <span>Line Items</span>
              </div>
              <button
                type="button"
                onClick={addNewItem}
                className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-orange-600 transition-all shadow-sm shadow-orange-500/10"
              >
                <Plus size={14} /> Add Line Item
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => {
                const grossAmount = (Number(item.qty) || 0) * (Number(item.price) || 0);
                const netAmount = grossAmount - (Number(item.discountValue) || 0);

                return (
                  <div key={index} className="flex flex-col gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 relative group">
                    <div className="w-full grid grid-cols-12 gap-3 items-end">

                      {/* Description - Spans wide */}
                      <div className="col-span-12 md:col-span-4">
                        <label className="block text-[11px] text-slate-500 font-semibold mb-1">Description</label>
                        <input
                          type="text"
                          className="w-full bg-white border-slate-200 border rounded-lg px-3 py-1.5 text-slate-800 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        />
                      </div>

                      {/* Quantity */}
                      <div className="col-span-3 md:col-span-1">
                        <label className="block text-[11px] text-slate-500 font-semibold mb-1 text-center">Qty</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          onWheel={handleWheelBlur}
                          className="w-full bg-white border-slate-200 border rounded-lg px-2 py-1.5 text-slate-800 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-center"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, "qty", e.target.value)}
                        />
                      </div>

                      {/* Price */}
                      <div className="col-span-5 md:col-span-2">
                        <label className="block text-[11px] text-slate-500 font-semibold mb-1 text-right">Price (₹)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          onWheel={handleWheelBlur}
                          className="w-full bg-white border-slate-200 border rounded-lg px-3 py-1.5 text-slate-800 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-right"
                          value={item.price}
                          onChange={(e) => handleItemChange(index, "price", e.target.value)}
                        />
                      </div>

                      {/* Discount Percent */}
                      <div className="col-span-4 md:col-span-1">
                        <label className="block text-[11px] text-slate-500 font-semibold mb-1 text-center">Disc %</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          onWheel={handleWheelBlur}
                          className="w-full bg-white border-slate-200 border rounded-lg px-2 py-1.5 text-slate-800 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-center font-medium"
                          value={item.discountPercent}
                          onChange={(e) => handleItemChange(index, "discountPercent", e.target.value)}
                        />
                      </div>

                      {/* Discount Value */}
                      <div className="col-span-6 md:col-span-2">
                        <label className="block text-[11px] text-slate-500 font-semibold mb-1 text-right">Disc Amt (₹)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          onWheel={handleWheelBlur}
                          className="w-full bg-white border-slate-200 border rounded-lg px-3 py-1.5 text-slate-800 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-right font-medium"
                          value={item.discountValue}
                          onChange={(e) => handleItemChange(index, "discountValue", e.target.value)}
                        />
                      </div>

                      {/* Total Computed Area */}
                      <div className="col-span-5 md:col-span-2 shadow-sm rounded-lg">
                        <label className="block text-[11px] text-slate-500 font-semibold mb-1 text-right">Total</label>
                        <div className="bg-orange-50 text-orange-600 font-bold text-sm px-2 py-1.5 text-right rounded-lg border border-orange-100">
                          ₹{netAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {/* Trash Button Isolation Row */}
                    <div className="absolute right-2 top-2 md:relative md:right-0 md:top-0 shrink-0 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. Financial Summary */}
          <section className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm space-y-4 mb-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-slate-100 pb-3">
              <Calculator size={18} className="text-orange-500" />
              <span>Summary & Payment</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Terms</label>
                  <input
                    type="text"
                    className="w-full border-slate-200 border rounded-xl px-3 py-2 text-slate-800 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Internal Notes</label>
                  <textarea
                    className="w-full border-slate-200 border rounded-xl px-3 py-2 text-slate-800 text-sm h-20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all resize-none"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
              </div>
              <div className="bg-slate-50/70 rounded-xl p-5 border border-slate-200/60 flex flex-col justify-center space-y-4">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-sm font-semibold text-slate-700">Freight Cost (₹)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    onWheel={handleWheelBlur}
                    className="w-32 bg-white border-slate-200 border rounded-lg px-3 py-1.5 text-right font-medium text-slate-800 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                    value={formData.summary.freightCost}
                    onChange={(e) => handleSummaryChange("freightCost", e.target.value)}
                  />
                </div>
                <div className="flex justify-between items-center gap-4 border-t border-slate-200 pt-4">
                  <span className="text-sm font-bold text-slate-800">Amount Paid (₹)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    onWheel={handleWheelBlur}
                    className="w-32 bg-white border-slate-200 border rounded-lg px-3 py-1.5 text-right font-bold text-orange-600 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                    value={formData.summary.paidAmount}
                    onChange={(e) => handleSummaryChange("paidAmount", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row gap-3 shrink-0 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-32 px-4 py-2.5 text-slate-600 font-semibold bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-48 px-4 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {isSubmitting ? "Processing..." : "Update Full Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateInvoiceModal;
