/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Trash2, Plus, Send, FileText, Loader2, Package, Calendar, CreditCard } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { InvoiceService } from '../api/services';

import DropdownGroup from '../components/ui/DropdownGroup';

const MySwal = withReactContent(Swal);

const CreateInvoicePage = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { label: "Issued", value: "issued" },
    { label: "Paid", value: "paid" },
    { label: "Partially Paid", value: "partially_paid" },
    { label: "Cancelled", value: "cancelled" }
  ];

  const today = new Date().toISOString().split('T')[0];
  const defaultDueDate = new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    paymentTerms: "Payable due amount in 10 days",
    termsOfDelivery: "",
    shippingCondition: "Normal",
    customerServiceRep: "",
    invoiceDate: today,
    dueDate: defaultDueDate,
    deliveryDate: "",
    permission: "invoice.manage.create",
    billTo: {
      companyName: "",
      address: "",
      gstin: "",
      contactPerson: "",
      contactNumber: ""
    },
    items: [
      { description: "", qty: "", price: "", discountPercent: 0, discountValue: 0, gstType: "IGST", gstPercent: 5 }
    ],
    summary: { freightCost: "", paidAmount: 0 },
    status: "issued"
  });

  const dynamicOptions = useMemo(() => {
    const rawData = location.state?.customerData;
    const invoices = Array.isArray(rawData) ? rawData : (rawData?.invoices || []);

    const descriptions = new Set();
    const prices = new Set();
    const quantities = new Set();

    invoices.forEach(invoice => {
      invoice.items?.forEach(item => {
        if (item.description) descriptions.add(item.description);
        if (item.price) prices.add(String(item.price));
        if (item.qty) quantities.add(String(item.qty));
      });
    });

    if (quantities.size === 0) ["1", "2", "3", "5", "10"].forEach(q => quantities.add(q));
    if (prices.size === 0) ["500", "1000", "1200", "1500", "2500"].forEach(p => prices.add(p));

    return {
      descriptions: Array.from(descriptions),
      prices: Array.from(prices).sort((a, b) => Number(a) - Number(b)),
      quantities: Array.from(quantities).sort((a, b) => Number(a) - Number(b))
    };
  }, [location.state?.customerData]);

  useEffect(() => {
    if (location.state?.customerData) {
      const rawData = location.state.customerData;
      const invoiceData = Array.isArray(rawData) ? rawData[0] : rawData;

      if (!invoiceData) return;

      const billToData = invoiceData.billTo || {};

      setFormData(prev => ({
        ...prev,
        billTo: {
          companyName: billToData.companyName || invoiceData.companyName || "",
          contactPerson: billToData.contactPerson || invoiceData.contactPerson || "",
          contactNumber: billToData.contactNumber || invoiceData.contactNumber || "",
          address: billToData.address || invoiceData.address || "",
          gstin: billToData.gstin || invoiceData.gstin || ""
        },
        paymentTerms: invoiceData.paymentTerms || prev.paymentTerms,
        termsOfDelivery: invoiceData.termsOfDelivery || prev.termsOfDelivery,
        shippingCondition: invoiceData.shippingCondition || prev.shippingCondition,
        customerServiceRep: invoiceData.customerServiceRep || prev.customerServiceRep,
        items: invoiceData.items?.length > 0
          ? invoiceData.items.map((item) => ({
              description: item.description || "",
              qty: item.qty ? String(item.qty) : "",
              price: item.price ? String(item.price) : "",
              discountPercent: item.discountPercent !== undefined ? Number(item.discountPercent) : 0,
              discountValue: item.discountValue !== undefined ? Number(item.discountValue) : 0,
              gstType: item.gstType || "IGST",
              gstPercent: item.gstPercent || 5,
            }))
          : prev.items,
      }));
    }
  }, [location.state]);

  const handleDescriptionChange = (index, value) => {
    const newItems = [...formData.items];
    newItems[index]['description'] = value;

    const rawData = location.state?.customerData;
    const invoices = Array.isArray(rawData) ? rawData : (rawData?.invoices || []);

    let autoMatchedPrice = null;
    let autoMatchedDiscountPercent = 0;
    let autoMatchedDiscountValue = 0;

    for (const inv of invoices) {
      const match = inv.items?.find(i => i.description?.toLowerCase() === value.trim().toLowerCase());
      if (match) {
        if (match.price) autoMatchedPrice = match.price;
        if (match.discountPercent !== undefined) autoMatchedDiscountPercent = match.discountPercent;
        if (match.discountValue !== undefined) autoMatchedDiscountValue = match.discountValue;
        break;
      }
    }

    if (autoMatchedPrice) {
      newItems[index]['price'] = String(autoMatchedPrice);
      newItems[index]['discountPercent'] = autoMatchedDiscountPercent;
      newItems[index]['discountValue'] = autoMatchedDiscountValue;
    }

    setFormData({ ...formData, items: newItems });
  };

  const handleBillToChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      billTo: { ...prev.billTo, [name]: value }
    }));
  };

  // Utility to safely strip non-numeric parameters while maintaining typed logic
  const cleanNumericInput = (val) => {
    return val.replace(/[^0-9.]/g, '');
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];

    if (field === 'discountPercent' || field === 'discountValue' || field === 'qty' || field === 'price') {
      const sanitizedValue = cleanNumericInput(value);
      newItems[index][field] = sanitizedValue;

      const qty = Number(field === 'qty' ? sanitizedValue : newItems[index].qty) || 0;
      const price = Number(field === 'price' ? sanitizedValue : newItems[index].price) || 0;
      const grossAmount = qty * price;

      if (field === 'discountPercent') {
        const percent = Number(sanitizedValue) || 0;
        newItems[index]['discountValue'] = (grossAmount * percent) / 100;
      } else if (field === 'discountValue') {
        const discVal = Number(sanitizedValue) || 0;
        newItems[index]['discountPercent'] = grossAmount > 0 ? (discVal / grossAmount) * 100 : 0;
      } else {
        const percent = Number(newItems[index].discountPercent) || 0;
        newItems[index]['discountValue'] = (grossAmount * percent) / 100;
      }
    } else {
      newItems[index][field] = value;
    }

    setFormData({ ...formData, items: newItems });
  };

  // Global blur trick handler to guarantee wheel event isolation
  const handleWheelBlur = (e) => {
    e.target.blur();
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", qty: "", price: "", discountPercent: 0, discountValue: 0, gstType: "IGST", gstPercent: 5 }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        ...formData.summary,
        freightCost: Number(formData.summary.freightCost) || 0,
        paidAmount: Number(formData.summary.paidAmount) || 0
      },
      invoiceDate: new Date(formData.invoiceDate).toISOString(),
      dueDate: new Date(formData.dueDate).toISOString(),
      deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate).toISOString() : null
    };

    const result = await MySwal.fire({
      title: <span className="text-black font-black uppercase text-xl">Generate Invoice?</span>,
      text: "Double check dates and freight charges before confirming.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Create it!',
      cancelButtonText: 'No, Keep Editing',
      confirmButtonColor: '#f97316',
      cancelButtonColor: '#000000',
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const response = await InvoiceService.createInvoice(finalSubmissionData);
        if (response.success) {
          await MySwal.fire({
            title: <span className="text-black font-black uppercase">Success!</span>,
            text: `Invoice ${response.data.invoiceNumber} created successfully.`,
            icon: 'success',
            confirmButtonColor: '#f97316',
          });
        }
      } catch (error) {
        MySwal.fire({
          title: <span className="text-red-600 font-black uppercase">Submission Failed</span>,
          text: error.response?.data?.message || "Error communicating with server.",
          icon: 'error',
          confirmButtonColor: '#000000',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 min-h-screen text-black overflow-visible">
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 shadow-xl rounded-2xl overflow-visible">

        {/* Header */}
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-lg">
              <FileText className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-black tracking-tight uppercase">New Tax Invoice</h1>
          </div>
        </div>

        <div className="p-4 md:p-8 overflow-visible">
          {/* Dates & Logistics Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10 overflow-visible relative z-50">

            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 flex flex-col justify-center">
              <label className="text-[10px] font-black text-orange-600 uppercase mb-1 flex items-center gap-1">
                <Calendar size={12} /> Invoice Date
              </label>
              <input
                type="date"
                className="w-full bg-transparent font-bold outline-none text-slate-800 text-sm"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({...formData, invoiceDate: e.target.value})}
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-center">
              <label className="text-[10px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1">
                <Calendar size={12} /> Due Date
              </label>
              <input
                type="date"
                className="w-full bg-transparent font-bold outline-none text-slate-800 text-sm"
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Delivery Method</p>
              <input
                className="w-full bg-transparent font-bold outline-none focus:text-orange-600 text-sm text-slate-800"
                value={formData.termsOfDelivery}
                onChange={(e) => setFormData({...formData, termsOfDelivery: e.target.value})}
              />
            </div>

            <DropdownGroup
              label="Payment Timeline"
              value={formData.paymentTerms}
              options={[
                { value: "Payable due amount in 10 days", label: "Payable in 10 days" },
                { value: "Immediate", label: "Immediate" },
                { value: "Net 30", label: "Net 30" }
              ]}
              onChange={(v) => setFormData({...formData, paymentTerms: v})}
            />

            <DropdownGroup
              label="Invoice Status"
              value={formData.status}
              options={statusOptions}
              onChange={(v) => setFormData({...formData, status: v})}
            />

          </div>

          {/* Client Details */}
          <div className="mb-12 relative z-40">
            <div className="flex items-center gap-2 mb-6">
                <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Client Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 p-6 rounded-2xl border border-dashed border-slate-200">
              <div className="space-y-5">
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Company / Clinic Name</label>
                    <input required name="companyName" value={formData.billTo.companyName} placeholder="Enter full name..." className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 ring-orange-500/20 outline-none transition-all font-bold text-sm" onChange={handleBillToChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Contact Person</label>
                        <input required name="contactPerson" value={formData.billTo.contactPerson} placeholder="Name" className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none font-bold text-sm" onChange={handleBillToChange} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Mobile No.</label>
                        <input name="contactNumber" value={formData.billTo.contactNumber} placeholder="+91" className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none font-bold text-sm" onChange={handleBillToChange} />
                    </div>
                </div>
              </div>
              <div className="space-y-5">
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">GST Identification Number</label>
                    <input name="gstin" value={formData.billTo.gstin} placeholder="22AAAAA0000A1Z5" className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none font-bold uppercase text-sm" onChange={handleBillToChange} />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Shipping Address</label>
                    <textarea required name="address" value={formData.billTo.address} placeholder="Building, Street, City, State, PIN" rows="2" className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none font-bold resize-none text-sm" onChange={handleBillToChange} />
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-10 relative z-10">
            <div className="space-y-4">
              {formData.items.map((item, index) => {
                const grossAmount = (Number(item.qty) || 0) * (Number(item.price) || 0);
                const netAmount = grossAmount - (Number(item.discountValue) || 0);

                return (
                  <div key={index} className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-orange-300 transition-all shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

                        {/* 1. Description Field */}
                        <div className="md:col-span-3">
                          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2">
                            <Package size={12}/> Product Description
                          </label>
                          <input
                            required
                            type="text"
                            list={`dynamic-descriptions-${index}`}
                            value={item.description}
                            placeholder="Type or select a product..."
                            className="w-full p-2 border-b-2 border-slate-100 focus:border-orange-500 outline-none font-bold text-base bg-transparent transition-colors text-slate-800"
                            onChange={(e) => handleDescriptionChange(index, e.target.value)}
                          />
                          <datalist id={`dynamic-descriptions-${index}`}>
                            {dynamicOptions.descriptions.map((desc, idx) => (
                              <option key={idx} value={desc} />
                            ))}
                          </datalist>
                        </div>

                        {/* 2. Quantity Field */}
                        <div className="md:col-span-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Qty</label>
                          <input
                            required
                            type="text"
                            inputMode="decimal"
                            list={`dynamic-qty-${index}`}
                            placeholder="0"
                            value={item.qty}
                            onWheel={handleWheelBlur}
                            className="w-full bg-slate-50 rounded-lg p-2 text-center font-black outline-none border border-slate-200 text-slate-800 text-sm"
                            onChange={(e) => updateItem(index, 'qty', e.target.value)}
                          />
                          <datalist id={`dynamic-qty-${index}`}>
                            {dynamicOptions.quantities.map((qtyVal) => (
                              <option key={qtyVal} value={qtyVal} />
                            ))}
                          </datalist>
                        </div>

                        {/* 3. Unit Price Field */}
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Unit Price (₹)</label>
                          <input
                            required
                            type="text"
                            inputMode="decimal"
                            list={`dynamic-price-${index}`}
                            placeholder="0.00"
                            value={item.price}
                            onWheel={handleWheelBlur}
                            className="w-full bg-slate-50 rounded-lg p-2 text-right font-black outline-none border border-slate-200 text-slate-800 text-sm"
                            onChange={(e) => updateItem(index, 'price', e.target.value)}
                          />
                          <datalist id={`dynamic-price-${index}`}>
                            {dynamicOptions.prices.map((priceVal, idx) => (
                              <option key={idx} value={priceVal}>₹{Number(priceVal).toLocaleString('en-IN')}</option>
                            ))}
                          </datalist>
                        </div>

                        {/* 4. Discount Percent Field */}
                        <div className="md:col-span-1">
                          <label className="flex items-center gap-0.5 text-[10px] font-black text-slate-400 uppercase mb-2 block">
                            Disc %
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={item.discountPercent || ''}
                            onWheel={handleWheelBlur}
                            className="w-full bg-slate-50 rounded-lg p-2 text-center font-bold outline-none border border-slate-200 text-slate-800 text-sm"
                            onChange={(e) => updateItem(index, 'discountPercent', e.target.value)}
                          />
                        </div>

                        {/* 5. Discount Value Field */}
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Disc Amt (₹)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={item.discountValue || ''}
                            onWheel={handleWheelBlur}
                            className="w-full bg-slate-50 rounded-lg p-2 text-right font-bold outline-none border border-slate-200 text-slate-800 text-sm"
                            onChange={(e) => updateItem(index, 'discountValue', e.target.value)}
                          />
                        </div>

                        {/* 6. Computed Item Total Container */}
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Item Total</label>
                          <div className="p-2 text-right font-black text-orange-600 bg-orange-50 rounded-lg border border-orange-100 text-sm">
                            ₹{netAmount.toLocaleString('en-IN')}
                          </div>
                        </div>

                        {/* 7. Action Button Block */}
                        <div className="md:col-span-1 text-center">
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-2 text-slate-300 hover:text-red-500 rounded-full transition-all"
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="mt-6 flex items-center gap-2 px-6 py-3 bg-white border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold uppercase text-[11px] hover:border-orange-500 hover:text-orange-600 transition-all w-full justify-center"
            >
              <Plus size={16} /> Add Another Product
            </button>
          </div>

          {/* Footer & Submit */}
          <div className="flex flex-col md:flex-row justify-between items-center border-t border-slate-100 pt-10 gap-8">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 text-slate-400 bg-slate-100 px-4 py-2 rounded-full w-fit">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">System will auto-calculate IGST/GST & Grand Total</span>
                </div>
            </div>

            <div className="w-full md:w-80 space-y-4">
              <div className="flex justify-between items-center px-4 py-3 bg-slate-900 text-white rounded-xl">
                 <span className="text-[10px] font-black uppercase tracking-widest">Freight / Shipping</span>
                 <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    onWheel={handleWheelBlur}
                    className="w-20 text-right bg-transparent outline-none font-black text-white text-sm"
                    value={formData.summary.freightCost}
                    onChange={(e) => setFormData({
                      ...formData,
                      summary: { ...formData.summary, freightCost: cleanNumericInput(e.target.value) }
                    })}
                  />
              </div>

              {/* PAID AMOUNT INPUT */}
              <div className="flex justify-between items-center px-4 py-3 bg-green-50 rounded-xl border border-green-100">
                 <div className="flex items-center gap-2">
                    <CreditCard size={14} className="text-green-600"/>
                    <span className="text-[10px] font-black uppercase text-green-700">Amount Paid</span>
                 </div>
                 <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    onWheel={handleWheelBlur}
                    className="w-24 text-right bg-transparent outline-none font-black text-green-800 text-sm"
                    value={formData.summary.paidAmount}
                    onChange={(e) => setFormData({
                      ...formData,
                      summary: { ...formData.summary, paidAmount: cleanNumericInput(e.target.value) }
                    })}
                  />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-5 rounded-xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-lg text-xs
                  ${loading ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-orange-500 text-white hover:bg-orange-600"}`}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <><Send size={16} /> Finalize & Create</>}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateInvoicePage;
