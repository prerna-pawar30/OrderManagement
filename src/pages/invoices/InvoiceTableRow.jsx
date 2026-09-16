import React from "react";
import { FileText, Edit } from "lucide-react";

const InvoiceTableRow = ({
  inv,
  handleDownloadClick,
  handleEditClick,
  onClick, // Changed from onRowClick to match parent prop name
}) => (
  <tr
    onClick={() => onClick(inv)} // Trigger the correctly named function execution
    className="cursor-pointer transition-colors hover:bg-orange-50/50"
  >
    <td className="p-3 text-sm font-bold text-orange-600">{inv.invoiceNumber}</td>
    <td className="p-3 text-xs text-gray-600">{new Date(inv.invoiceDate).toLocaleDateString("en-IN")}</td>
    <td className="p-3 text-sm font-semibold text-gray-800">₹{inv.summary?.totalPayAmount?.toLocaleString("en-IN")}</td>
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
      <div className="flex justify-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownloadClick(inv.invoiceId || inv._id);
          }}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-orange-500 transition-all hover:bg-orange-50"
          title="Download PDF"
        >
          <FileText size={16} />
          <span>PDF</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleEditClick(inv);
          }}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-amber-600 transition-all hover:bg-amber-50"
          title="Edit Invoice"
        >
          <Edit size={16} />
          <span>Edit</span>
        </button>
      </div>
    </td>
  </tr>
);

export default InvoiceTableRow;
