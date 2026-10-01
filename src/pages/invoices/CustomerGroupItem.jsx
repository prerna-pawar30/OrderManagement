// import React, { useState } from "react";
// import { User, ChevronRight, ChevronDown, Download, FileText, Edit, PlusCircle } from "lucide-react";
// import InvoiceTableRow from "./InvoiceTableRow";
// import InvoiceDetailModal from "./InvoiceDetailModal";

// const CustomerGroupItem = ({
//   user,
//   expandedUser,
//   toggleUser,
//   handleDownloadClick,
//   handleEditClick,
//   handleCreateInvoice,
//   handleDownloadCustomerReport,
// }) => {
//   // Use customerNo (the backend's own de-duplicated customer ID) as the
//   // expand/collapse identity when available, falling back to name for the
//   // "known contact, no invoices yet" directory rows that don't have one.
//   const groupKey = user.customerNo ?? user.customerName;
//   const isExpanded = expandedUser === groupKey;

//   const [selectedInvoice, setSelectedInvoice] = useState(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);

//   const openInvoiceDetails = (invoice) => {
//     setSelectedInvoice(invoice);
//     setIsModalOpen(true);
//   };

//   return (
//     <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition-shadow hover:shadow-md">
//       {/* Header Row */}
//       <div className="flex flex-col gap-3 p-4 transition-colors hover:bg-orange-50/40 sm:flex-row sm:items-center sm:justify-between md:p-5">
//         {/* Clickable Area for Expansion */}
//         <div
//           onClick={() => toggleUser(groupKey)}
//           className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 sm:gap-4"
//         >
//           <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 sm:h-12 sm:w-12">
//             <User size={22} />
//           </div>
//           <div className="min-w-0">
//             <h3 className="truncate font-bold text-gray-800 md:text-lg">{user.customerName}</h3>
//             <p className="truncate text-xs font-medium uppercase tracking-wider text-gray-400">
//               {user.contactPerson} • {user.invoiceCount} {user.invoiceCount === 1 ? "Invoice" : "Invoices"}
//               <span className="text-orange-500 sm:hidden"> • ₹{user.totalAmount.toLocaleString("en-IN")}</span>
//             </p>
//           </div>
//         </div>

//         {/* Stats and Action Buttons */}
//         <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end sm:gap-6 md:gap-8">
//           {/* Total Billing Info */}
//           <div className="hidden text-right sm:block">
//             <p className="text-xs text-gray-400">Total Billing</p>
//             <p className="font-bold text-gray-800">₹{user.totalAmount.toLocaleString("en-IN")}</p>
//           </div>

//           {/* Create New Invoice Button */}
//           <button
//             onClick={(e) => {
//               e.stopPropagation();
//               handleCreateInvoice(user);
//             }}
//             className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-600 transition-all hover:bg-emerald-100"
//             title="Create New Invoice"
//           >
//             <PlusCircle size={16} />
//             <span className="hidden sm:inline">Create Invoice</span>
//           </button>

//           {/* Individual Customer Report Download Button */}
//           <button
//             onClick={(e) => {
//               e.stopPropagation();
//               handleDownloadCustomerReport(user);
//             }}
//             className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600 transition-all hover:bg-orange-100"
//             title="Download Customer Statement"
//           >
//             <Download size={16} />
//             <span className="hidden sm:inline">Statement</span>
//           </button>

//           {/* Toggle Icon */}
//           <div onClick={() => toggleUser(groupKey)} className="cursor-pointer rounded-full p-1 text-orange-400 hover:bg-orange-50 hover:text-orange-500">
//             {isExpanded ? <ChevronDown /> : <ChevronRight />}
//           </div>
//         </div>
//       </div>

//       {/* Expanded Invoice List */}
//       {isExpanded && (
//         <div className="animate-in fade-in slide-in-from-top-2 border-t border-orange-50 bg-orange-50/20 p-3 duration-300 sm:p-4">
//           {/* Table — comfortable screens only */}
//           <div className="hidden overflow-x-auto rounded-xl border border-orange-100 bg-white md:block">
//             <table className="w-full text-left">
//               <thead className="bg-orange-50 text-[10px] font-bold uppercase text-orange-700">
//                 <tr>
//                   <th className="p-3">Inv No.</th>
//                   <th className="p-3">Date</th>
//                   <th className="p-3">Amount</th>
//                   <th className="p-3 text-center">Status</th>
//                   <th className="p-3 text-center">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-orange-50">
//                 {user.allInvoices.map((inv) => (
//                   <InvoiceTableRow
//                     key={inv.invoiceId || inv._id}
//                     inv={inv}
//                     handleDownloadClick={handleDownloadClick}
//                     handleEditClick={handleEditClick}
//                     onClick={() => openInvoiceDetails(inv)}
//                   />
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           {/* Cards — phones/tablets, no horizontal scrolling */}
//           <div className="space-y-2.5 md:hidden">
//             {user.allInvoices.map((inv) => (
//               <div
//                 key={inv.invoiceId || inv._id}
//                 onClick={() => openInvoiceDetails(inv)}
//                 className="cursor-pointer rounded-xl border border-orange-100 bg-white p-3.5 shadow-sm active:bg-orange-50/50"
//               >
//                 <div className="flex items-start justify-between gap-2">
//                   <div className="min-w-0">
//                     <p className="truncate text-sm font-bold text-orange-600">{inv.invoiceNumber}</p>
//                     <p className="text-xs text-gray-500">
//                       {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
//                     </p>
//                   </div>
//                   <span
//                     className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
//                       inv.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
//                     }`}
//                   >
//                     {inv.status}
//                   </span>
//                 </div>
//                 <div className="mt-2.5 flex items-center justify-between border-t border-orange-50 pt-2.5">
//                   <p className="text-sm font-semibold text-gray-800">
//                     ₹{inv.summary?.totalPayAmount?.toLocaleString("en-IN")}
//                   </p>
//                   <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
//                     <button
//                       onClick={() => handleDownloadClick(inv.invoiceId || inv._id)}
//                       className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-orange-500 transition-all hover:bg-orange-50"
//                       title="Download PDF"
//                     >
//                       <FileText size={16} />
//                       <span>PDF</span>
//                     </button>
//                     <button
//                       onClick={() => handleEditClick(inv)}
//                       className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-amber-600 transition-all hover:bg-amber-50"
//                       title="Edit Invoice"
//                     >
//                       <Edit size={16} />
//                       <span>Edit</span>
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       {isModalOpen && (
//         <InvoiceDetailModal invoice={selectedInvoice} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
//       )}
//     </div>
//   );
// };

// export default CustomerGroupItem;
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, ChevronRight, ChevronDown, Download, Pencil, PlusCircle, ReceiptText } from "lucide-react";
import toast from "react-hot-toast";
import InvoiceTableRow, { mayHaveCreditNote, statusLabel, statusClass, ActionButton } from "./InvoiceTableRow";
import InvoiceDetailModal from "./InvoiceDetailModal";
import { CreditNoteService } from "../../api/services";
import { generateCreditNotePdf } from "../../lib/generateCreditNotePdf";

const CustomerGroupItem = ({
  user,
  expandedUser,
  toggleUser,
  handleDownloadClick,
  handleEditClick,
  handleCreateInvoice,
  handleDownloadCustomerReport,
  onChanged,
}) => {
  // Use customerNo (the backend's own de-duplicated customer ID) as the
  // expand/collapse identity when available, falling back to name for the
  // "known contact, no invoices yet" directory rows that don't have one.
  const groupKey = user.groupKey ?? user.customerNo ?? user.customerName;
  const isExpanded = expandedUser === groupKey;

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const [cnBusyId, setCnBusyId] = useState(null);

  // Fetch every credit note raised against this invoice and download each PDF.
  const handleDownloadCreditNote = async (inv) => {
    const invoiceId = inv.invoiceId || inv._id;
    setCnBusyId(invoiceId);
    try {
      const res = await CreditNoteService.getAll({ invoiceId });
      const notes = res?.data?.creditNotes || [];
      if (notes.length === 0) {
        toast.error(`No credit note found for ${inv.invoiceNumber}`);
        return;
      }
      for (const note of notes) await generateCreditNotePdf(note);
      if (notes.length > 1) toast.success(`${notes.length} credit notes downloaded`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not download credit note");
    } finally {
      setCnBusyId(null);
    }
  };

  const openInvoiceDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };

  // Full customer profile (ledger, invoices, credit notes, products) —
  // same page the Orders list opens.
  const customerPhone = user.contactNumber ?? user.allInvoices?.[0]?.billTo?.contactNumber;
  const openCustomerProfile = (e) => {
    e.stopPropagation();
    if (!customerPhone) return;
    navigate(
      `/customers/${encodeURIComponent(customerPhone)}?name=${encodeURIComponent(user.contactPerson || "")}`
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header Row */}
      <div className="p-4 transition-colors hover:bg-orange-50/40 sm:flex sm:items-center sm:justify-between sm:gap-3 md:p-5">
        {/* Clickable Area for Expansion */}
        <div
          onClick={() => toggleUser(groupKey)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 sm:gap-4"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 sm:h-12 sm:w-12">
            <User size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              onClick={customerPhone ? openCustomerProfile : undefined}
              title={customerPhone ? "Open customer profile" : undefined}
              className={`truncate text-base font-bold text-gray-800 md:text-lg ${
                customerPhone ? "hover:text-orange-600 hover:underline" : ""
              }`}
            >
              {user.customerName}
            </h3>
            <p className="truncate text-xs font-medium text-gray-500 sm:uppercase sm:tracking-wider sm:text-gray-400">
              {user.contactPerson}
              <span className="hidden sm:inline">
                {" "}• {user.invoiceCount} {user.invoiceCount === 1 ? "Invoice" : "Invoices"}
              </span>
            </p>
          </div>
          {/* Phone: expand chevron sits next to the name */}
          <div className="shrink-0 rounded-full p-1 text-orange-400 sm:hidden">
            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>
        </div>

        {/* Phone: labelled stats, so "what is this number" is never a guess */}
        <div
          onClick={() => toggleUser(groupKey)}
          className="mt-3 grid cursor-pointer grid-cols-2 gap-2 sm:hidden"
        >
          <div className="rounded-xl bg-orange-50/70 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Total billing</p>
            <p className="text-sm font-bold text-gray-800">₹{user.totalAmount.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl bg-orange-50/70 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Invoices</p>
            <p className="text-sm font-bold text-gray-800">
              {user.invoiceCount}{" "}
              <span className="text-xs font-medium text-orange-600">
                {isExpanded ? "· Hide" : "· Tap to view"}
              </span>
            </p>
          </div>
        </div>

        {/* Stats and Action Buttons */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-0 sm:flex sm:shrink-0 sm:items-center sm:justify-end sm:gap-6 md:gap-8">
          {/* Total Billing Info */}
          <div className="hidden text-right sm:block">
            <p className="text-xs text-gray-400">Total Billing</p>
            <p className="font-bold text-gray-800">₹{user.totalAmount.toLocaleString("en-IN")}</p>
          </div>

          {/* Create New Invoice Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCreateInvoice(user);
            }}
            className="flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-600 transition-all hover:bg-emerald-100 sm:py-2"
            title="Create New Invoice"
          >
            <PlusCircle size={16} className="shrink-0" />
            <span className="sm:hidden">New Invoice</span>
            <span className="hidden sm:inline">Create Invoice</span>
          </button>

          {/* Individual Customer Report Download Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadCustomerReport(user);
            }}
            className="flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs font-bold text-orange-600 transition-all hover:bg-orange-100 sm:py-2"
            title="Download Customer Statement"
          >
            <Download size={16} className="shrink-0" />
            <span>Statement</span>
          </button>

          {/* Toggle Icon */}
          <div onClick={() => toggleUser(groupKey)} className="hidden cursor-pointer rounded-full p-1 text-orange-400 hover:bg-orange-50 hover:text-orange-500 sm:block">
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </div>
        </div>
      </div>

      {/* Expanded Invoice List */}
      {isExpanded && (
        <div className="animate-in fade-in slide-in-from-top-2 border-t border-orange-50 bg-orange-50/20 p-3 duration-300 sm:p-4">
          {/* Table — wide screens only. Fixed column widths + wrapping
              action buttons, so it never scrolls sideways. */}
          <div className="hidden overflow-hidden rounded-xl border border-orange-100 bg-white lg:block">
            <table className="w-full table-fixed text-left">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[56%]" />
              </colgroup>
              <thead className="bg-orange-50 text-[10px] font-bold uppercase tracking-wide text-orange-700">
                <tr>
                  <th className="px-3 py-2.5">Invoice No.</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Amount</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-50">
                {user.allInvoices.map((inv) => (
                  <InvoiceTableRow
                    key={inv.invoiceId || inv._id}
                    inv={inv}
                    handleDownloadClick={handleDownloadClick}
                    handleEditClick={handleEditClick}
                    handleDownloadCreditNote={handleDownloadCreditNote}
                    creditNoteBusy={cnBusyId === (inv.invoiceId || inv._id)}
                    onClick={() => openInvoiceDetails(inv)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — phones/tablets, no horizontal scrolling */}
          <div className="space-y-2.5 lg:hidden">
            {user.allInvoices.map((inv) => (
              <div
                key={inv.invoiceId || inv._id}
                onClick={() => openInvoiceDetails(inv)}
                className="cursor-pointer rounded-xl border border-orange-100 bg-white p-3.5 shadow-sm active:bg-orange-50/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-orange-600">{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">
                      ₹{inv.summary?.totalPayAmount?.toLocaleString("en-IN")}
                    </p>
                    <span
                      className={`mt-1 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(inv.status)}`}
                    >
                      {statusLabel(inv.status)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-orange-50 pt-3 sm:flex sm:flex-wrap">
                  <ActionButton
                    icon={Download}
                    label="Download Invoice"
                    tone="orange"
                    onClick={() => handleDownloadClick(inv.invoiceId || inv._id)}
                  />
                  <ActionButton icon={Pencil} label="Edit Invoice" tone="amber" onClick={() => handleEditClick(inv)} />
                  {mayHaveCreditNote(inv) && (
                    <ActionButton
                      icon={ReceiptText}
                      label="Download Credit Note"
                      tone="rose"
                      busy={cnBusyId === (inv.invoiceId || inv._id)}
                      onClick={() => handleDownloadCreditNote(inv)}
                      className="col-span-2"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onChanged={onChanged}
          onDownload={handleDownloadClick}
          onEdit={handleEditClick}
          onDownloadCreditNote={handleDownloadCreditNote}
          creditNoteBusy={cnBusyId === (selectedInvoice?.invoiceId || selectedInvoice?._id)}
        />
      )}
    </div>
  );
};

export default CustomerGroupItem;
