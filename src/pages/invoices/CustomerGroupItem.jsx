import React, { useState } from "react";
import { User, ChevronRight, ChevronDown, Download } from "lucide-react";
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header Row */}
      <div className="p-4 md:p-5 flex items-center justify-between hover:bg-orange-50/30 transition-colors">
        {/* Clickable Area for Expansion */}
        <div
          onClick={() => toggleUser(groupKey)}
          className="flex items-center gap-4 cursor-pointer flex-1"
        >
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
            <User size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 md:text-lg">{user.customerName}</h3>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              {user.contactPerson} • {user.invoiceCount} {user.invoiceCount === 1 ? "Invoice" : "Invoices"}
            </p>
          </div>
        </div>

        {/* Stats and Action Buttons */}
        <div className="flex items-center gap-4 md:gap-8">
          {/* Total Billing Info */}
          <div className="hidden md:block text-right">
            <p className="text-xs text-gray-400">Total Billing</p>
            <p className="font-bold text-gray-800">₹{user.totalAmount.toLocaleString("en-IN")}</p>
          </div>

          {/* Individual Customer Report Download Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadCustomerReport(user);
            }}
            className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-600 px-3 py-2 rounded-lg transition-all text-xs font-bold border border-blue-100"
            title="Download Customer Statement"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Statement</span>
          </button>

          {/* Toggle Icon */}
          <div onClick={() => toggleUser(groupKey)} className="cursor-pointer p-1">
            {isExpanded ? <ChevronDown className="text-gray-400" /> : <ChevronRight className="text-gray-400" />}
          </div>
        </div>
      </div>

      {/* Expanded Invoice List */}
      {isExpanded && (
        <div className="border-t border-gray-50 bg-gray-50/30 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] uppercase text-gray-500 font-bold">
                <tr>
                  <th className="p-3">Inv No.</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {user.allInvoices.map((inv) => (
                  <InvoiceTableRow
                    key={inv.invoiceId || inv._id}
                    inv={inv}
                    user={user}
                    handleDownloadClick={handleDownloadClick}
                    handleEditClick={handleEditClick}
                    handleCreateInvoice={handleCreateInvoice}
                    onClick={() => openInvoiceDetails(inv)}
                  />
                ))}
              </tbody>
            </table>
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
