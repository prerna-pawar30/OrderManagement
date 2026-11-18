/**
 * Accordion row on the Invoices page: one customer with their totals; opens to list that customer's
 * invoices.
 *
 * Used by: pages/InvoiceListPage.jsx
 */

import { Download, PlusCircle, User, ChevronDown, UserCircle2 } from "lucide-react";
import { ActionButton } from "./InvoiceTableRow";
import { fmtINR } from "../../utils/InvoiceListHelpers.js";
import { InvoiceRow } from "./InvoiceRow.jsx";
import { LgButton } from "./LgButton.jsx";

/* ════════════════════════════════════════════════════════════════════
   CUSTOMER GROUP — accordion
════════════════════════════════════════════════════════════════════ */
export function CustomerGroup({
  group,
  isOpen,
  onToggle,
  onOpenInvoice,
  onDownload,
  downloading,
  onEdit,
  onNewInvoice,
  onStatement,
  onDownloadCreditNotes,
  cnBusyId,
  onProfile,
}) {
  const count = group.allInvoices.length;
  return (
    <div
      className={`overflow-hidden rounded-[18px] border bg-white transition-shadow dark:bg-white/5 ${
        isOpen
          ? "border-orange-500/35 shadow-[0_8px_24px_rgba(249,115,22,.10)]"
          : "border-orange-500/20 shadow-[0_1px_3px_rgba(0,0,0,.04)]"
      }`}
    >
      {/* Header */}
      <div
        onClick={onToggle}
        className="flex cursor-pointer select-none items-center gap-3 px-3.5 py-3 sm:gap-5 sm:px-7 sm:py-5"
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange-500/20 text-orange-600 sm:h-14 sm:w-14">
          <User size={24} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white sm:text-xl">
            <span className="truncate">{group.customerName}</span>
            {group.clientId && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600">
                {group.clientId}
              </span>
            )}
          </div>
          <div className="mt-[3px] truncate text-xs uppercase tracking-[.04em] text-slate-400 sm:text-[13px]">
            {group.contactPerson && <>{group.contactPerson} • </>}
            {count} {count === 1 ? "invoice" : "invoices"}
          </div>
        </div>

        <div className="hidden text-right min-[480px]:block">
          <div className="mb-0.5 text-xs text-slate-400 sm:text-[13px]">Total Billing</div>
          <div className="text-base font-extrabold text-slate-900 dark:text-white sm:text-[19px]">
            {fmtINR(group.totalAmount)}
          </div>
        </div>

        {onProfile && group.contactNumber && (
          <LgButton
            icon={UserCircle2}
            label="Profile"
            tone="green"
            title="Customer Profile"
            onClick={() => onProfile(group)}
          />
        )}
        <LgButton
          icon={PlusCircle}
          label="Create Invoice"
          tone="green"
          onClick={() => onNewInvoice(group)}
        />
        <LgButton
          icon={Download}
          label="Statement"
          tone="orange"
          title="Download Statement"
          onClick={() => onStatement(group)}
        />

        <ChevronDown
          size={22}
          className={`shrink-0 text-orange-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {/* Phone: buttons neeche */}
      <div className="grid grid-cols-2 gap-2 px-3.5 pb-3 sm:hidden">
        <ActionButton
          icon={PlusCircle}
          label="Create Invoice"
          tone="orange"
          onClick={() => onNewInvoice(group)}
          className="py-2"
        />
        <ActionButton
          icon={Download}
          label="Statement"
          tone="amber"
          onClick={() => onStatement(group)}
          className="py-2"
        />
      </div>

      {/* Expanded body */}
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-1 border-t border-orange-500/10 bg-orange-500/[.02] p-3 duration-200 sm:px-6 sm:py-[22px]">
          {/* The table scrolls inside its own card, so the page itself never scrolls sideways */}
          <div className="overflow-x-auto rounded-[14px] border border-orange-500/20 bg-white dark:bg-transparent">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="bg-orange-500/[.08]">
                  {["Invoice No.", "Date", "Amount", "Status", "Actions"].map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-[18px] py-4 text-left text-xs font-bold uppercase tracking-[.06em] text-orange-700"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {count === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-[18px] py-[22px] text-center text-[13px] text-slate-400"
                    >
                      No invoices yet — use <b>Create Invoice</b> above to bill this customer.
                    </td>
                  </tr>
                )}
                {group.allInvoices.map((allInvoice) => (
                  <InvoiceRow
                    key={allInvoice._id || allInvoice.invoiceId}
                    inv={allInvoice}
                    onOpen={onOpenInvoice}
                    onDownload={onDownload}
                    onEdit={onEdit}
                    downloading={downloading}
                    onDownloadCreditNotes={onDownloadCreditNotes}
                    cnBusy={cnBusyId === (allInvoice.invoiceId || allInvoice._id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
