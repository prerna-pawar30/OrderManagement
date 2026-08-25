import React, { useEffect, useState } from "react";
import { FileText, FileDown, Loader2, Inbox, Search } from "lucide-react";
import toast from "react-hot-toast";
import { ManualOrderService } from "../api/services";
import { generateCreditNotePdf } from "../lib/generateCreditNotePdf";
import { formatCurrency, formatDateTime, initials } from "../lib/format";

export default function CreditNotesPage() {
  const [creditNotes, setCreditNotes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await ManualOrderService.getCreditNotes({ search: query.trim() || undefined });
      setCreditNotes(res?.data?.creditNotes || []);
      setSummary(res?.data?.summary || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load credit notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300); // debounce search
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const download = async (note) => {
    setDownloadingId(note.refundId);
    try {
      await generateCreditNotePdf(note);
    } catch (err) {
      toast.error("Could not generate the PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-base font-bold text-ink-950 dark:text-white">Credit Notes</h2>
        <p className="text-sm text-mist-500 dark:text-mist-300">
          Every time a return or cancellation was settled as "customer will take it next time" instead
          of a cash refund — issued here, and marked "Applied" once it's actually used on a new order.
        </p>
      </div>

      {summary && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl2 border border-mist-200 bg-white p-4 dark:border-white/10 dark:bg-ink-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-300">
              Total issued
            </p>
            <p className="mt-1.5 font-display text-xl font-bold text-ink-950 dark:text-white">
              {formatCurrency(summary.totalIssued)}
            </p>
            <p className="text-xs text-mist-500 dark:text-mist-300">{summary.totalCreditNotes} credit notes</p>
          </div>
          <div className="rounded-xl2 border border-mist-200 bg-white p-4 dark:border-white/10 dark:bg-ink-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-mint-500">Already applied</p>
            <p className="mt-1.5 font-display text-xl font-bold text-ink-950 dark:text-white">
              {formatCurrency(summary.totalApplied)}
            </p>
          </div>
          <div className="rounded-xl2 border border-mist-200 bg-white p-4 dark:border-white/10 dark:bg-ink-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">Still unused</p>
            <p className="mt-1.5 font-display text-xl font-bold text-ink-950 dark:text-white">
              {formatCurrency(summary.totalUnapplied)}
            </p>
          </div>
        </div>
      )}

      <div className="relative mb-5 w-full sm:w-80">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-400 dark:text-mist-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customer, phone, order ID…"
          className="w-full rounded-lg border border-mist-200 bg-white py-2.5 pl-9 pr-3 text-sm text-ink-950 outline-none focus:border-orange-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-mist-500"
        />
      </div>

      <div className="overflow-hidden rounded-xl2 border border-mist-200 bg-white shadow-panel dark:border-white/10 dark:bg-ink-900">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-mist-500 dark:text-mist-300">
            <Loader2 size={16} className="animate-spin" /> Loading credit notes…
          </div>
        ) : creditNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Inbox size={28} className="text-mist-300 dark:text-mist-500" />
            <p className="text-sm font-medium text-ink-950 dark:text-white">No credit notes yet</p>
            <p className="text-xs text-mist-500 dark:text-mist-300">
              They show up here when a refund is settled as store credit instead of cash.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-mist-100 text-xs uppercase tracking-wide text-mist-500 dark:border-white/10 dark:text-mist-300">
                    <th className="px-5 py-3 font-semibold">Credit note</th>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">For (returned)</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">From order</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Issued</th>
                    <th className="px-5 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {creditNotes.map((note) => (
                    <tr
                      key={note.refundId}
                      className="border-b border-mist-100 last:border-0 dark:border-white/10"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 font-mono text-xs text-mist-700 dark:text-mist-300">
                          <FileText size={14} className="text-mist-400 dark:text-mist-500" /> {note.refundId}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-950 text-[10px] font-bold text-white">
                            {initials(note.customerName)}
                          </span>
                          <div>
                            <p className="font-medium text-ink-950 dark:text-white">{note.customerName}</p>
                            <p className="text-xs text-mist-500 dark:text-mist-300">{note.customerPhone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-mist-700 dark:text-mist-300">
                        {note.returnedItems?.length > 0 ? (
                          <ul className="space-y-0.5">
                            {note.returnedItems.map((it, i) => (
                              <li key={i}>
                                {it.quantity} × {it.productName}
                                {it.variantName ? ` (${it.variantName})` : ""}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-mist-400 dark:text-mist-500">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-ink-950 dark:text-white">
                        {formatCurrency(note.amount)}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-mist-700 dark:text-mist-300">
                        {note.sourceInvoiceNumber || note.sourceOrderId}
                      </td>
                      <td className="px-5 py-3.5">
                        {note.appliedToOrderId ? (
                          <span className="inline-flex flex-col">
                            <span className="w-fit rounded-full bg-mint-100 px-2.5 py-1 text-[11px] font-semibold text-mint-600 dark:bg-mint-500/15 dark:text-mint-400">
                              Applied
                            </span>
                            <span className="mt-1 font-mono text-[10px] text-mist-500 dark:text-mist-300">
                              → {note.appliedInvoiceNumber || note.appliedToOrderId}
                            </span>
                            {note.appliedOrderDate && (
                              <span className="text-[10px] text-mist-400 dark:text-mist-500">
                                on {formatDateTime(note.appliedOrderDate)}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                            Not yet used
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-mist-500 dark:text-mist-300">
                        {formatDateTime(note.refundedAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => download(note)}
                          disabled={downloadingId === note.refundId}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-mist-200 px-3 py-1.5 text-xs font-semibold text-mist-700 hover:bg-mist-50 disabled:opacity-50 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
                        >
                          {downloadingId === note.refundId ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <FileDown size={13} />
                          )}
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards for phones/tablets */}
            <div className="divide-y divide-mist-100 dark:divide-white/10 lg:hidden">
              {creditNotes.map((note) => (
                <div key={note.refundId} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-950 text-xs font-bold text-white">
                        {initials(note.customerName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-950 dark:text-white">{note.customerName}</p>
                        <p className="text-xs text-mist-500 dark:text-mist-300">{note.customerPhone}</p>
                      </div>
                    </div>
                    <p className="shrink-0 font-semibold text-ink-950 dark:text-white">
                      {formatCurrency(note.amount)}
                    </p>
                  </div>

                  <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-mist-500 dark:text-mist-300">
                    <FileText size={12} /> {note.refundId}
                  </p>

                  {note.returnedItems?.length > 0 && (
                    <div className="mt-2 text-xs text-mist-700 dark:text-mist-300">
                      {note.returnedItems.map((it, i) => (
                        <p key={i}>
                          {it.quantity} × {it.productName}
                          {it.variantName ? ` (${it.variantName})` : ""}
                        </p>
                      ))}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-mist-500 dark:text-mist-300">
                    From <span className="font-mono">{note.sourceInvoiceNumber || note.sourceOrderId}</span> ·{" "}
                    {formatDateTime(note.refundedAt)}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-mist-100 pt-3 dark:border-white/10">
                    {note.appliedToOrderId ? (
                      <div>
                        <span className="w-fit rounded-full bg-mint-100 px-2.5 py-1 text-[11px] font-semibold text-mint-600 dark:bg-mint-500/15 dark:text-mint-400">
                          Applied
                        </span>
                        <p className="mt-1 font-mono text-[10px] text-mist-500 dark:text-mist-300">
                          → {note.appliedInvoiceNumber || note.appliedToOrderId}
                        </p>
                      </div>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                        Not yet used
                      </span>
                    )}
                    <button
                      onClick={() => download(note)}
                      disabled={downloadingId === note.refundId}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-mist-200 px-3 py-1.5 text-xs font-semibold text-mist-700 hover:bg-mist-50 disabled:opacity-50 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
                    >
                      {downloadingId === note.refundId ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <FileDown size={13} />
                      )}
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
