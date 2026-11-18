/**
 * Search box that finds an invoice to raise a credit note against; only paid / partly paid invoices
 * can be picked.
 *
 * Used by: components/creditnote/CreateCreditNoteModal.jsx
 * API: InvoiceService.searchInvoices
 */

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { InvoiceService } from "../../backend/ApiService";
import { formatCurrency } from "../../utils/Format";
import { isCreditNoteEligible } from "../../utils/CreditNoteRules";

export function InvoicePicker({ onPick, onNoInvoice }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchText = query.trim();
    if (searchText.length < 2) {
      setResults([]);
      return;
    }
    const timerId = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await InvoiceService.searchInvoices(searchText));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timerId);
  }, [query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Invoice number or customer / company name…"
          className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-orange-500"
        />
      </div>

      <div className="max-h-64 space-y-1.5 overflow-y-auto">
        {loading && (
          <p className="flex items-center gap-2 py-4 text-xs text-gray-500">
            <Loader2 size={14} className="animate-spin" /> Searching…
          </p>
        )}
        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <p className="py-4 text-xs text-gray-500">No invoices found.</p>
        )}
        {results.map((result) => {
          const eligible = isCreditNoteEligible(result);
          return (
            <button
              key={result.invoiceId}
              disabled={!eligible}
              onClick={() => onPick(result)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 text-left hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold text-gray-900">
                  {result.invoiceNumber}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {result.billTo?.contactPerson || result.billTo?.companyName} ·{" "}
                  {result.billTo?.contactNumber}
                </p>
                {!eligible && (
                  <p className="text-[11px] text-gray-400">
                    Not paid yet — edit the invoice instead
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(result.summary?.totalPayAmount || 0)}
                </p>
                <p className="text-[11px] capitalize text-gray-500">
                  {String(result.status).replace("_", " ")}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNoInvoice}
        className="text-xs font-semibold text-gray-500 hover:text-gray-900 hover:underline"
      >
        No invoice — enter customer manually
      </button>
    </div>
  );
}
