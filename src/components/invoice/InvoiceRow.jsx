/**
 * One invoice line inside a CustomerGroup: number, date, source, status, amounts and action
 * buttons.
 *
 * Used by: components/invoice/CustomerGroup.jsx
 */

import { Download, Pencil, ReceiptText } from "lucide-react";
import { SOURCE_LABEL, SOURCE_TEXT_CLASS, getInvoiceSource } from "../../utils/InvoiceSource";
import { ActionButton, mayHaveCreditNote, statusLabel, statusClass } from "./InvoiceTableRow";
import { fmtINR, figuresOf } from "../../utils/InvoiceListHelpers.js";

/* ════════════════════════════════════════════════════════════════════
   INVOICE TABLE ROW
════════════════════════════════════════════════════════════════════ */
const cell = "px-[18px] py-[14px]";

export function InvoiceRow({
  inv: invoice,
  onOpen,
  onDownload,
  onEdit,
  downloading,
  onDownloadCreditNotes,
  cnBusy,
}) {
  const fig = figuresOf(invoice);
  const src = getInvoiceSource(invoice);
  const cnCount = Array.isArray(invoice.creditNoteIds) ? invoice.creditNoteIds.length : null;
  const showCn = cnCount != null ? cnCount > 0 : mayHaveCreditNote(invoice);

  return (
    <tr
      onClick={() => onOpen(invoice)}
      className="cursor-pointer border-t border-orange-100/70 transition-colors hover:bg-orange-500/[.04] dark:border-white/5"
    >
      <td className={`${cell} whitespace-nowrap`}>
        <div className="text-[15px] font-extrabold text-orange-600">
          {invoice.invoiceNumber ? `#${String(invoice.invoiceNumber).replace(/^#+/, "")}` : "—"}
        </div>
        <div className="mt-[3px] text-[10px] font-bold text-slate-400">
          <span className={SOURCE_TEXT_CLASS[src]}>{SOURCE_LABEL[src]}</span>
          {invoice.createdByName && (
            <>
              {" "}
              · by <span className="text-slate-500">{invoice.createdByName}</span>
            </>
          )}
        </div>
      </td>
      <td className={`${cell} whitespace-nowrap text-[13px] text-slate-500 dark:text-mist-300`}>
        {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN") : "—"}
      </td>
      <td className={`${cell} whitespace-nowrap`}>
        <div className="text-[15px] font-extrabold text-slate-900 dark:text-white">
          {fmtINR(invoice.summary?.totalPayAmount)}
        </div>
        {fig.returnedValue > 0.01 && (
          <div
            className="mt-[3px] text-[10px] font-bold text-yellow-600"
            title="Value of goods returned"
          >
            ↩ {fmtINR(fig.returnedValue)} returned
          </div>
        )}
      </td>
      <td className={cell}>
        <div className="flex flex-col items-start gap-1">
          <span
            className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusClass(invoice.status)}`}
          >
            {statusLabel(invoice.status)}
          </span>
          {fig.settledBack > 0.01 && (
            <span className="whitespace-nowrap text-[10px] font-bold text-indigo-500">
              {fmtINR(fig.settledBack)} refunded / credited
            </span>
          )}
          {fig.owed > 0.01 && (
            <span className="whitespace-nowrap text-[10px] font-bold text-yellow-600">
              {fmtINR(fig.owed)} owed
            </span>
          )}
          {fig.creditUsed > 0.01 && (
            <span className="whitespace-nowrap text-[10px] font-bold text-emerald-600">
              {fmtINR(fig.creditUsed)} via credit
            </span>
          )}
        </div>
      </td>
      <td className={cell}>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            icon={Download}
            label="Download Invoice"
            tone="orange"
            busy={downloading}
            onClick={() => onDownload(invoice.invoiceId || invoice._id)}
          />
          <ActionButton
            icon={Pencil}
            label="Edit Invoice"
            tone="amber"
            onClick={() => onEdit(invoice)}
          />
          {showCn && (
            <ActionButton
              icon={ReceiptText}
              tone="rose"
              busy={cnBusy}
              label={`Download Credit Note${cnCount > 1 ? ` ×${cnCount}` : ""}`}
              onClick={() => onDownloadCreditNotes(invoice)}
            />
          )}
        </div>
      </td>
    </tr>
  );
}
