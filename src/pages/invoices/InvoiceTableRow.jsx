import React from "react";
import { FileText, Edit, PlusCircle } from "lucide-react";

const InvoiceTableRow = ({
  inv,
  user,
  handleDownloadClick,
  handleEditClick,
  handleCreateInvoice,
  onClick, // Changed from onRowClick to match parent prop name
}) => (
  <tr
    onClick={() => onClick(inv)} // Trigger the correctly named function execution
    className="hover:bg-orange-50/30 cursor-pointer transition-colors"
  >
    <td className="p-3 font-bold text-orange-600 text-sm">{inv.invoiceNumber}</td>
    <td className="p-3 text-xs text-gray-600">{new Date(inv.invoiceDate).toLocaleDateString("en-IN")}</td>
    <td className="p-3 font-semibold text-gray-800 text-sm">₹{inv.summary?.totalPayAmount?.toLocaleString("en-IN")}</td>
    <td className="p-3 text-center">
      <span
        className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black ${
          inv.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
        }`}
      >
        {inv.status}
      </span>
    </td>
    <td className="p-3">
      <div className="flex justify-end gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownloadClick(inv.invoiceId || inv._id);
          }}
          className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-all"
          title="Download PDF"
        >
          <FileText size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleEditClick(inv);
          }}
          className="text-orange-500 hover:bg-orange-50 p-1.5 rounded-lg transition-all"
          title="Edit"
        >
          <Edit size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCreateInvoice(user);
          }}
          className="text-green-500 hover:bg-green-50 p-1.5 rounded-lg transition-all"
          title="Create New Invoice"
        >
          <PlusCircle size={16} />
        </button>
      </div>
    </td>
  </tr>
);

export default InvoiceTableRow;
