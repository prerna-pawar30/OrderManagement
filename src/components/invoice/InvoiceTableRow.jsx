/**
 * Shared invoice-table pieces: status label/colour helpers, the ActionButton, and the rule for when
 * an invoice may have credit notes.
 *
 * Used by: components/invoice/CustomerGroup.jsx, components/invoice/InvoiceDetailModal.jsx,
 * components/invoice/InvoiceRow.jsx
 */

import { Download, Pencil, ReceiptText, Loader2 } from "lucide-react";
import { getInvoiceSource, SOURCE_LABEL, SOURCE_TEXT_CLASS } from "../../utils/InvoiceSource";

// Credit notes can only exist on invoices that took money, or that already
// have refund/credit history — no point offering the button anywhere else.
export const mayHaveCreditNote = (invoice) =>
  ["paid", "partially_paid"].includes(invoice.status) ||
  (invoice.refundHistory?.length ?? 0) > 0 ||
  Number(invoice.refundableAmount) > 0;

// "partially_paid" → "Partially paid"
export const statusLabel = (status = "") => {
  const label = String(status).replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
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
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    disabled={busy}
    title={label}
    className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${TONES[tone]} ${className}`}
  >
    {busy ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
    <span>{label}</span>
  </button>
);

const InvoiceTableRow = ({
  inv: invoice,
  handleDownloadClick,
  handleEditClick,
  handleDownloadCreditNote,
  creditNoteBusy,
  onClick, // Changed from onRowClick to match parent prop name
}) => (
  <tr
    onClick={() => onClick(invoice)} // Trigger the correctly named function execution
    className="cursor-pointer align-middle transition-colors hover:bg-orange-50/50"
  >
    <td className="px-4 py-3">
      <p className="truncate text-sm font-bold text-orange-600">
        #{String(invoice.invoiceNumber ?? "").replace(/^#/, "")}
      </p>
      <p className={`text-[11px] font-semibold ${SOURCE_TEXT_CLASS[getInvoiceSource(invoice)]}`}>
        {SOURCE_LABEL[getInvoiceSource(invoice)]}
      </p>
    </td>
    <td className="px-4 py-3 text-xs text-gray-600">
      {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}
    </td>
    <td className="px-4 py-3 text-sm font-semibold text-gray-800">
      ₹{invoice.summary?.totalPayAmount?.toLocaleString("en-IN")}
    </td>
    <td className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-1">
        <span
          className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(invoice.status)}`}
        >
          {statusLabel(invoice.status)}
        </span>
        {Number(invoice.refundableAmount) > 0 && (
          <span className="whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
            Refund owed
          </span>
        )}
      </div>
    </td>
    <td className="px-4 py-3">
      {/* Fixed order so buttons line up row to row; credit note sits last
          since it only appears on some invoices. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <ActionButton
          icon={Download}
          label="Download Invoice"
          tone="orange"
          onClick={() => handleDownloadClick(invoice.invoiceId || invoice._id)}
        />
        <ActionButton
          icon={Pencil}
          label="Edit Invoice"
          tone="amber"
          onClick={() => handleEditClick(invoice)}
        />
        {handleDownloadCreditNote && mayHaveCreditNote(invoice) && (
          <ActionButton
            icon={ReceiptText}
            label="Download Credit Note"
            tone="rose"
            busy={creditNoteBusy}
            onClick={() => handleDownloadCreditNote(invoice)}
          />
        )}
      </div>
    </td>
  </tr>
);

export default InvoiceTableRow;
