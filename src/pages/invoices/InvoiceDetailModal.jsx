// import React, { useEffect } from "react";
// import { X, User, Building, FileText } from "lucide-react";

// const InvoiceDetailModal = ({ invoice, isOpen, onClose }) => {
//   // Prevent background scrolling when modal is open
//   useEffect(() => {
//     if (isOpen) {
//       document.body.style.overflow = "hidden";
//     } else {
//       document.body.style.overflow = "unset";
//     }
//     return () => {
//       document.body.style.overflow = "unset";
//     };
//   }, [isOpen]);

//   if (!isOpen || !invoice) return null;

//   return (
//     <div
//       className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
//       onClick={onClose} // Clicking the background layout shade closes it
//     >
//       {/* Modal Card */}
//       <div
//         className="bg-white w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all transform scale-100 py-10"
//         onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the card
//       >
//         {/* Modal Header */}
//         <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
//           <div>
//             <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
//               <FileText className="text-orange-500" size={22} />
//               Invoice {invoice.invoiceNumber || "N/A"}
//             </h2>
//             <p className="text-xs text-gray-500 mt-1">ID: {invoice.invoiceId || invoice._id}</p>
//           </div>
//           <button
//             onClick={onClose}
//             className="p-2 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
//           >
//             <X size={20} />
//           </button>
//         </div>

//         {/* Modal Content (Scrollable) */}
//         <div className="p-6 overflow-y-auto space-y-6 text-sm text-gray-600">
//           {/* Status Badge & General Info */}
//           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-orange-50/40 p-4 rounded-xl border border-orange-100/50">
//             <div>
//               <span className="text-xs text-gray-400 block">Status</span>
//               <span
//                 className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize mt-1 ${
//                   invoice.status === "issued" || invoice.status === "paid"
//                     ? "bg-green-100 text-green-700"
//                     : "bg-yellow-100 text-yellow-700"
//                 }`}
//               >
//                 {invoice.status}
//               </span>
//             </div>
//             <div>
//               <span className="text-xs text-gray-400 block">Invoice Date</span>
//               <p className="font-medium text-gray-800 mt-1">
//                 {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN") : "N/A"}
//               </p>
//             </div>
//             <div>
//               <span className="text-xs text-gray-400 block">Due Date</span>
//               <p className="font-medium text-gray-800 mt-1">
//                 {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "N/A"}
//               </p>
//             </div>
//             <div>
//               <span className="text-xs text-gray-400 block">Rep. Person</span>
//               <p className="font-medium text-gray-800 mt-1">{invoice.customerServiceRep || "N/A"}</p>
//             </div>
//           </div>

//           {/* Seller vs Buyer Address Section */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {/* Seller */}
//             {invoice.seller && (
//               <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
//                 <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
//                   <Building size={16} className="text-gray-400" /> Seller Details
//                 </h4>
//                 <p className="font-semibold text-gray-900">{invoice.seller.companyName}</p>
//                 <p className="text-xs text-gray-500 mt-1 leading-relaxed">{invoice.seller.address}</p>
//                 <p className="text-xs mt-2">
//                   <strong>GSTIN:</strong> {invoice.seller.gstin}
//                 </p>
//                 <p className="text-xs">
//                   <strong>Email:</strong> {invoice.seller.email}
//                 </p>
//               </div>
//             )}

//             {/* Bill To */}
//             {invoice.billTo && (
//               <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
//                 <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
//                   <User size={16} className="text-gray-400" /> Billed To
//                 </h4>
//                 <p className="font-semibold text-gray-900 capitalize">{invoice.billTo.companyName}</p>
//                 <p className="text-xs text-gray-500 mt-1 leading-relaxed">{invoice.billTo.address}</p>
//                 <p className="text-xs mt-2">
//                   <strong>Contact:</strong> {invoice.billTo.contactPerson} ({invoice.billTo.contactNumber})
//                 </p>
//                 {invoice.billTo.gstin && (
//                   <p className="text-xs">
//                     <strong>GSTIN:</strong> {invoice.billTo.gstin}
//                   </p>
//                 )}
//               </div>
//             )}
//           </div>

//           {/* Logistics Data */}
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-y border-gray-100 py-3">
//             <div>
//               <strong>Order No:</strong> {invoice.orderNumber || "N/A"}
//             </div>
//             <div>
//               <strong>Terms of Delivery:</strong> {invoice.termsOfDelivery || "N/A"}
//             </div>
//             <div>
//               <strong>Shipping:</strong> {invoice.shippingCondition || "N/A"}
//             </div>
//             <div>
//               <strong>Payment Terms:</strong> {invoice.paymentTerms || "N/A"}
//             </div>
//           </div>

//           {/* Items Table */}
//           {invoice.items && invoice.items.length > 0 && (
//             <div>
//               <h4 className="font-bold text-gray-800 mb-2">Itemized Breakdown</h4>
//               <div className="overflow-x-auto border border-gray-100 rounded-xl">
//                 <table className="w-full text-left border-collapse">
//                   <thead className="bg-gray-50 text-xs font-semibold text-gray-600 border-b border-gray-100">
//                     <tr>
//                       <th className="p-3">Art No.</th>
//                       <th className="p-3">Description</th>
//                       <th className="p-3 text-right">Qty</th>
//                       <th className="p-3 text-right">Price</th>
//                       <th className="p-3 text-right">Tax</th>
//                       <th className="p-3 text-right">Total</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-gray-100 text-xs">
//                     {invoice.items.map((item, index) => (
//                       <tr key={item.itemId || index} className="hover:bg-gray-50/50">
//                         <td className="p-3 font-medium text-gray-700">{item.articleNo}</td>
//                         <td className="p-3 text-gray-800">{item.description}</td>
//                         <td className="p-3 text-right">{item.qty}</td>
//                         <td className="p-3 text-right">₹{item.price?.toLocaleString("en-IN")}</td>
//                         <td className="p-3 text-right">
//                           {item.gstPercent}% (₹{item.gstAmount})
//                         </td>
//                         <td className="p-3 text-right font-semibold text-gray-900">
//                           ₹{item.totalAmount?.toLocaleString("en-IN")}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           )}

//           {/* Financial Calculation Summary Block */}
//           {invoice.summary && (
//             <div className="flex flex-col items-end pt-2">
//               <div className="w-full sm:w-72 space-y-2 border-t border-gray-100 pt-4 text-xs">
//                 <div className="flex justify-between text-gray-500">
//                   <span>Gross Value:</span>
//                   <span>₹{invoice.summary.totalGrossValue?.toLocaleString("en-IN")}</span>
//                 </div>
//                 <div className="flex justify-between text-gray-500">
//                   <span>Total Tax:</span>
//                   <span>₹{invoice.summary.totalTax?.toLocaleString("en-IN")}</span>
//                 </div>
//                 <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-100 pt-2">
//                   <span>Grand Total:</span>
//                   <span className="text-orange-600">₹{invoice.summary.totalPayAmount?.toLocaleString("en-IN")}</span>
//                 </div>
//                 <div className="flex justify-between text-xs text-green-600 font-medium">
//                   <span>Paid Amount:</span>
//                   <span>₹{invoice.summary.paidAmount?.toLocaleString("en-IN")}</span>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* Bank Details */}
//           {invoice.bankDetails && (
//             <div className="p-4 bg-gray-50 rounded-xl text-xs border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
//               <div>
//                 <p className="font-semibold text-gray-700 mb-1">Bank Account Transfer Details</p>
//                 <p>
//                   <strong className="text-gray-400">Holder:</strong> {invoice.bankDetails.holderName}
//                 </p>
//                 <p>
//                   <strong className="text-gray-400">A/C No:</strong> {invoice.bankDetails.accountNo} (
//                   {invoice.bankDetails.accountType})
//                 </p>
//               </div>
//               <div className="sm:text-right sm:self-end">
//                 <p>
//                   <strong className="text-gray-400">IFSC Code:</strong> {invoice.bankDetails.ifscCode}
//                 </p>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default InvoiceDetailModal;
import React, { useEffect, useState } from "react";
import { X, User, Building, FileText, Undo2, IndianRupee, FilePlus2, Download, Pencil, ReceiptText } from "lucide-react";
import SettleInvoiceCreditModal from "../../components/SettleInvoiceCreditModal";
import CreateCreditNoteModal from "../../components/CreateCreditNoteModal";
import RecordInvoiceReturnModal from "../../components/RecordInvoiceReturnModal";
import { ActionButton, mayHaveCreditNote } from "./InvoiceTableRow";

const InvoiceDetailModal = ({
  invoice,
  isOpen,
  onClose,
  onChanged,
  onDownload,
  onEdit,
  onDownloadCreditNote,
  creditNoteBusy,
}) => {
  const [showSettle, setShowSettle] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showCreditNote, setShowCreditNote] = useState(false);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !invoice) return null;

  const refundableAmount = Number(invoice.refundableAmount || 0);
  const hasRefundOwed = refundableAmount > 0.01;
  // Manual-order and ecommerce invoices already have their own return flow
  // (on the order); "Record return" only ever applies to a standalone
  // invoice created directly via "Create Invoice".
  const isStandalone = !invoice.sourceOrderId;
  // A return refunds money the customer actually paid — on an "issued"
  // (unpaid) or "cancelled" invoice nothing has been received yet, so
  // there's nothing to give back. Only allow it once payment has come in,
  // fully or partially.
  const hasBeenPaid = invoice.status === "paid" || invoice.status === "partially_paid";
  const canRecordReturn = isStandalone && hasBeenPaid;

  const handleChanged = () => {
    setShowSettle(false);
    setShowReturn(false);
    setShowCreditNote(false);
    onChanged?.();
    onClose();
  };

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={onClose} // Clicking the background layout shade closes it
    >
      {/* Modal Card */}
      <div
        className="bg-white w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all transform scale-100 py-10"
        onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the card
      >
        {/* Modal Header */}
        <div className="space-y-3 border-b border-gray-100 bg-gray-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="text-orange-500" size={22} />
                Invoice {invoice.invoiceNumber || "N/A"}
              </h2>
              <p className="text-xs text-gray-500 mt-1">ID: {invoice.invoiceId || invoice._id}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onDownload && (
              <ActionButton
                icon={Download}
                label="Download Invoice"
                tone="orange"
                onClick={() => onDownload(invoice.invoiceId || invoice._id)}
              />
            )}
            {onEdit && (
              <ActionButton
                icon={Pencil}
                label="Edit Invoice"
                tone="amber"
                onClick={() => {
                  onClose(); // edit opens its own modal — don't stack them
                  onEdit(invoice);
                }}
              />
            )}
            {onDownloadCreditNote && mayHaveCreditNote(invoice) && (
              <ActionButton
                icon={ReceiptText}
                label="Download Credit Note"
                tone="rose"
                busy={creditNoteBusy}
                onClick={() => onDownloadCreditNote(invoice)}
              />
            )}
            {hasRefundOwed && (
              <button
                onClick={() => setShowSettle(true)}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-amber-500 bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-600"
              >
                <IndianRupee size={13} /> Settle refund
              </button>
            )}
            {canRecordReturn && (
              <button
                onClick={() => setShowReturn(true)}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-600 hover:bg-orange-100"
              >
                <Undo2 size={13} /> Record return
              </button>
            )}
            {hasBeenPaid && (
              <button
                onClick={() => setShowCreditNote(true)}
                title="Credit note without a return — rate difference, discount after billing, goodwill…"
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100"
              >
                <FilePlus2 size={13} /> Create credit note
              </button>
            )}
            {isStandalone && !hasBeenPaid && (
              <span
                className="text-xs text-gray-400 italic"
                title="A return can only be recorded once this invoice has been paid — nothing's been received yet to refund."
              >
                Return available once paid
              </span>
            )}
          </div>
        </div>

        {/* Modal Content (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-gray-600">
          {hasRefundOwed && (
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-amber-700">
                  ₹{refundableAmount.toLocaleString("en-IN")} owed to this customer
                </p>
                <p className="text-xs text-amber-600">
                  {invoice.refundStatus === "partial_refunded"
                    ? "Partially settled so far — settle the rest when it's paid back or credited."
                    : "Not settled yet — settle it once it's paid back or credited."}
                </p>
              </div>
            </div>
          )}
          {/* Status Badge & General Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-orange-50/40 p-4 rounded-xl border border-orange-100/50">
            <div>
              <span className="text-xs text-gray-400 block">Status</span>
              <span
                className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize mt-1 ${
                  invoice.status === "issued" || invoice.status === "paid"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Invoice Date</span>
              <p className="font-medium text-gray-800 mt-1">
                {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN") : "N/A"}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Due Date</span>
              <p className="font-medium text-gray-800 mt-1">
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "N/A"}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Rep. Person</span>
              <p className="font-medium text-gray-800 mt-1">{invoice.customerServiceRep || "N/A"}</p>
            </div>
          </div>

          {/* Seller vs Buyer Address Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Seller */}
            {invoice.seller && (
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                  <Building size={16} className="text-gray-400" /> Seller Details
                </h4>
                <p className="font-semibold text-gray-900">{invoice.seller.companyName}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{invoice.seller.address}</p>
                <p className="text-xs mt-2">
                  <strong>GSTIN:</strong> {invoice.seller.gstin}
                </p>
                <p className="text-xs">
                  <strong>Email:</strong> {invoice.seller.email}
                </p>
              </div>
            )}

            {/* Bill To */}
            {invoice.billTo && (
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                  <User size={16} className="text-gray-400" /> Billed To
                </h4>
                <p className="font-semibold text-gray-900 capitalize">{invoice.billTo.companyName}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{invoice.billTo.address}</p>
                <p className="text-xs mt-2">
                  <strong>Contact:</strong> {invoice.billTo.contactPerson} ({invoice.billTo.contactNumber})
                </p>
                {invoice.billTo.gstin && (
                  <p className="text-xs">
                    <strong>GSTIN:</strong> {invoice.billTo.gstin}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Logistics Data */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-y border-gray-100 py-3">
            <div>
              <strong>Order No:</strong> {invoice.orderNumber || "N/A"}
            </div>
            <div>
              <strong>Terms of Delivery:</strong> {invoice.termsOfDelivery || "N/A"}
            </div>
            <div>
              <strong>Shipping:</strong> {invoice.shippingCondition || "N/A"}
            </div>
            <div>
              <strong>Payment Terms:</strong> {invoice.paymentTerms || "N/A"}
            </div>
          </div>

          {/* Items Table */}
          {invoice.items && invoice.items.length > 0 && (
            <div>
              <h4 className="font-bold text-gray-800 mb-2">Itemized Breakdown</h4>
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-600 border-b border-gray-100">
                    <tr>
                      <th className="p-3">Art No.</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-right">Tax</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 text-right">Returned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {invoice.items.map((item, index) => {
                      const returnedQty = Number(item.returnedQty) || 0;
                      return (
                        <tr key={item.itemId || index} className="hover:bg-gray-50/50">
                          <td className="p-3 font-medium text-gray-700">{item.articleNo}</td>
                          <td className="p-3 text-gray-800">{item.description}</td>
                          <td className="p-3 text-right">{item.qty}</td>
                          <td className="p-3 text-right">₹{item.price?.toLocaleString("en-IN")}</td>
                          <td className="p-3 text-right">
                            {item.gstPercent}% (₹{item.gstAmount})
                          </td>
                          <td className="p-3 text-right font-semibold text-gray-900">
                            ₹{item.totalAmount?.toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-right">
                            {returnedQty > 0 ? (
                              <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                {returnedQty} returned
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Returns recorded against this invoice */}
          {invoice.returns && invoice.returns.length > 0 && (
            <div>
              <h4 className="font-bold text-gray-800 mb-2">Returns</h4>
              <div className="space-y-2">
                {invoice.returns.map((ret, idx) => (
                  <div
                    key={ret.requestId || idx}
                    className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-700">{ret.requestId}</span>
                      <span className="text-gray-500">
                        {ret.requestedAt ? new Date(ret.requestedAt).toLocaleString("en-IN") : "N/A"}
                      </span>
                    </div>
                    <ul className="mt-1.5 space-y-0.5 text-gray-700">
                      {(ret.items || []).map((it, i) => (
                        <li key={it.itemId || i}>
                          {it.quantity} × {it.description} — ₹{Number(it.price)?.toLocaleString("en-IN")} each
                          {it.reason ? ` (${it.reason})` : ""}
                        </li>
                      ))}
                    </ul>
                    {ret.processedBy && (
                      <p className="mt-1 text-gray-400">Processed by {ret.processedBy}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refund / credit-note history against this invoice */}
          {invoice.refundHistory && invoice.refundHistory.length > 0 && (
            <div>
              <h4 className="font-bold text-gray-800 mb-2">Refund History</h4>
              <div className="space-y-2">
                {invoice.refundHistory.map((r, idx) => (
                  <div
                    key={r.refundId || idx}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">
                        ₹{Number(r.amount)?.toLocaleString("en-IN")} · {r.method?.replace("_", " ")}
                      </p>
                      <p className="text-gray-400">
                        {r.refundedAt ? new Date(r.refundedAt).toLocaleString("en-IN") : "N/A"}
                        {r.refundedBy ? ` · by ${r.refundedBy}` : ""}
                      </p>
                      {r.notes && <p className="text-gray-500 mt-0.5">{r.notes}</p>}
                    </div>
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-green-700">
                      {r.refundStatus || "processed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Calculation Summary Block */}
          {invoice.summary && (
            <div className="flex flex-col items-end pt-2">
              <div className="w-full sm:w-72 space-y-2 border-t border-gray-100 pt-4 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Gross Value:</span>
                  <span>₹{invoice.summary.totalGrossValue?.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Total Tax:</span>
                  <span>₹{invoice.summary.totalTax?.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-100 pt-2">
                  <span>Grand Total:</span>
                  <span className="text-orange-600">₹{invoice.summary.totalPayAmount?.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-xs text-green-600 font-medium">
                  <span>Paid Amount:</span>
                  <span>₹{invoice.summary.paidAmount?.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          )}

          {/* Bank Details */}
          {invoice.bankDetails && (
            <div className="p-4 bg-gray-50 rounded-xl text-xs border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <p className="font-semibold text-gray-700 mb-1">Bank Account Transfer Details</p>
                <p>
                  <strong className="text-gray-400">Holder:</strong> {invoice.bankDetails.holderName}
                </p>
                <p>
                  <strong className="text-gray-400">A/C No:</strong> {invoice.bankDetails.accountNo} (
                  {invoice.bankDetails.accountType})
                </p>
              </div>
              <div className="sm:text-right sm:self-end">
                <p>
                  <strong className="text-gray-400">IFSC Code:</strong> {invoice.bankDetails.ifscCode}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {showSettle && (
      <SettleInvoiceCreditModal
        invoice={invoice}
        onClose={() => setShowSettle(false)}
        onDone={handleChanged}
      />
    )}
    {showReturn && (
      <RecordInvoiceReturnModal
        invoice={invoice}
        onClose={() => setShowReturn(false)}
        onDone={handleChanged}
      />
    )}
    {showCreditNote && (
      <CreateCreditNoteModal
        invoice={invoice}
        onClose={() => setShowCreditNote(false)}
        onDone={handleChanged}
      />
    )}
    </>
  );
};

export default InvoiceDetailModal;
