import React, { useState } from "react";
import { User, ChevronRight, ChevronDown, Download, FileText, Edit, PlusCircle } from "lucide-react";
import InvoiceTableRow from "./InvoiceTableRow";
import InvoiceDetailModal from "./InvoiceDetailModal";

const CustomerGroupItem = ({
  user,
  expandedUser,
  toggleUser,
  handleDownloadClick,
  handleEditClick,
  handleCreateInvoice,
  handleDownloadCustomerReport,
}) => {
  // Use customerNo (the backend's own de-duplicated customer ID) as the
  // expand/collapse identity when available, falling back to name for the
  // "known contact, no invoices yet" directory rows that don't have one.
  const groupKey = user.customerNo ?? user.customerName;
  const isExpanded = expandedUser === groupKey;

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openInvoiceDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header Row */}
      <div className="flex flex-col gap-3 p-4 transition-colors hover:bg-orange-50/40 sm:flex-row sm:items-center sm:justify-between md:p-5">
        {/* Clickable Area for Expansion */}
        <div
          onClick={() => toggleUser(groupKey)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 sm:gap-4"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 sm:h-12 sm:w-12">
            <User size={22} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-bold text-gray-800 md:text-lg">{user.customerName}</h3>
            <p className="truncate text-xs font-medium uppercase tracking-wider text-gray-400">
              {user.contactPerson} • {user.invoiceCount} {user.invoiceCount === 1 ? "Invoice" : "Invoices"}
              <span className="text-orange-500 sm:hidden"> • ₹{user.totalAmount.toLocaleString("en-IN")}</span>
            </p>
          </div>
        </div>

        {/* Stats and Action Buttons */}
        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end sm:gap-6 md:gap-8">
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
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-600 transition-all hover:bg-emerald-100"
            title="Create New Invoice"
          >
            <PlusCircle size={16} />
            <span className="hidden sm:inline">Create Invoice</span>
          </button>

          {/* Individual Customer Report Download Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadCustomerReport(user);
            }}
            className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600 transition-all hover:bg-orange-100"
            title="Download Customer Statement"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Statement</span>
          </button>

          {/* Toggle Icon */}
          <div onClick={() => toggleUser(groupKey)} className="cursor-pointer rounded-full p-1 text-orange-400 hover:bg-orange-50 hover:text-orange-500">
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </div>
        </div>
      </div>

      {/* Expanded Invoice List */}
      {isExpanded && (
        <div className="animate-in fade-in slide-in-from-top-2 border-t border-orange-50 bg-orange-50/20 p-3 duration-300 sm:p-4">
          {/* Table — comfortable screens only */}
          <div className="hidden overflow-x-auto rounded-xl border border-orange-100 bg-white md:block">
            <table className="w-full text-left">
              <thead className="bg-orange-50 text-[10px] font-bold uppercase text-orange-700">
                <tr>
                  <th className="p-3">Inv No.</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-50">
                {user.allInvoices.map((inv) => (
                  <InvoiceTableRow
                    key={inv.invoiceId || inv._id}
                    inv={inv}
                    handleDownloadClick={handleDownloadClick}
                    handleEditClick={handleEditClick}
                    onClick={() => openInvoiceDetails(inv)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — phones/tablets, no horizontal scrolling */}
          <div className="space-y-2.5 md:hidden">
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
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                      inv.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-orange-50 pt-2.5">
                  <p className="text-sm font-semibold text-gray-800">
                    ₹{inv.summary?.totalPayAmount?.toLocaleString("en-IN")}
                  </p>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDownloadClick(inv.invoiceId || inv._id)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-orange-500 transition-all hover:bg-orange-50"
                      title="Download PDF"
                    >
                      <FileText size={16} />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => handleEditClick(inv)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-amber-600 transition-all hover:bg-amber-50"
                      title="Edit Invoice"
                    >
                      <Edit size={16} />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <InvoiceDetailModal invoice={selectedInvoice} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

export default CustomerGroupItem;
