// import React from "react";
// import { FileText, Edit } from "lucide-react";

// const InvoiceTableRow = ({
//   inv,
//   handleDownloadClick,
//   handleEditClick,
//   onClick, // Changed from onRowClick to match parent prop name
// }) => (
//   <tr
//     onClick={() => onClick(inv)} // Trigger the correctly named function execution
//     className="cursor-pointer transition-colors hover:bg-orange-50/50"
//   >
//     <td className="p-3 text-sm font-bold text-orange-600">{inv.invoiceNumber}</td>
//     <td className="p-3 text-xs text-gray-600">{new Date(inv.invoiceDate).toLocaleDateString("en-IN")}</td>
//     <td className="p-3 text-sm font-semibold text-gray-800">₹{inv.summary?.totalPayAmount?.toLocaleString("en-IN")}</td>
//     <td className="p-3 text-center">
//       <span
//         className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black ${
//           inv.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
//         }`}
//       >
//         {inv.status}
//       </span>
//     </td>
//     <td className="p-3">
//       <div className="flex justify-center gap-2">
//         <button
//           onClick={(e) => {
//             e.stopPropagation();
//             handleDownloadClick(inv.invoiceId || inv._id);
//           }}
//           className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-orange-500 transition-all hover:bg-orange-50"
//           title="Download PDF"
//         >
//           <FileText size={16} />
//           <span>PDF</span>
//         </button>
//         <button
//           onClick={(e) => {
//             e.stopPropagation();
//             handleEditClick(inv);
//           }}
//           className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-amber-600 transition-all hover:bg-amber-50"
//           title="Edit Invoice"
//         >
//           <Edit size={16} />
//           <span>Edit</span>
//         </button>
//       </div>
//     </td>
//   </tr>
// );

// export default InvoiceTableRow;
import React from "react";
import { Download, Pencil, ReceiptText, Loader2 } from "lucide-react";

// Credit notes can only exist on invoices that took money, or that already
// have refund/credit history — no point offering the button anywhere else.
export const mayHaveCreditNote = (inv) =>
  ["paid", "partially_paid"].includes(inv.status) ||
  (inv.refundHistory?.length ?? 0) > 0 ||
  Number(inv.refundableAmount) > 0;

// "partially_paid" → "Partially paid"
export const statusLabel = (status = "") => {
  const s = String(status).replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const statusClass = (status) =>
  status === "paid"
    ? "bg-green-100 text-green-700"
    : status === "partially_paid"
    ? "bg-amber-100 text-amber-700"
    : status === "cancelled"
    ? "bg-gray-100 text-gray-500"
    : "bg-orange-100 text-orange-700";

const TONES = {
  orange: "border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100",
  amber: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  rose: "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100",
};

export const ActionButton = ({ icon: Icon, label, tone, onClick, busy, className = "" }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    disabled={busy}
    title={label}
    className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${TONES[tone]} ${className}`}
  >
    {busy ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
    <span>{label}</span>
  </button>
);

const InvoiceTableRow = ({
  inv,
  handleDownloadClick,
  handleEditClick,
  handleDownloadCreditNote,
  creditNoteBusy,
  onClick, // Changed from onRowClick to match parent prop name
}) => (
  <tr
    onClick={() => onClick(inv)} // Trigger the correctly named function execution
    className="cursor-pointer align-middle transition-colors hover:bg-orange-50/50"
  >
    <td className="truncate px-3 py-2.5 text-sm font-bold text-orange-600">{inv.invoiceNumber}</td>
    <td className="px-3 py-2.5 text-xs text-gray-600">{new Date(inv.invoiceDate).toLocaleDateString("en-IN")}</td>
    <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">₹{inv.summary?.totalPayAmount?.toLocaleString("en-IN")}</td>
    <td className="px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-1">
        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(inv.status)}`}>
          {statusLabel(inv.status)}
        </span>
        {Number(inv.refundableAmount) > 0 && (
          <span className="whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
            Refund owed
          </span>
        )}
      </div>
    </td>
    <td className="px-3 py-2.5">
      {/* Fixed order so buttons line up row to row; credit note sits last
          since it only appears on some invoices. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <ActionButton
          icon={Download}
          label="Download Invoice"
          tone="orange"
          onClick={() => handleDownloadClick(inv.invoiceId || inv._id)}
        />
        <ActionButton icon={Pencil} label="Edit Invoice" tone="amber" onClick={() => handleEditClick(inv)} />
        {handleDownloadCreditNote && mayHaveCreditNote(inv) && (
          <ActionButton
            icon={ReceiptText}
            label="Download Credit Note"
            tone="rose"
            busy={creditNoteBusy}
            onClick={() => handleDownloadCreditNote(inv)}
          />
        )}
      </div>
    </td>
  </tr>
);

export default InvoiceTableRow;
