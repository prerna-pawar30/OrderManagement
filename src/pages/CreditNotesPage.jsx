import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, FileDown, Loader2, Inbox, Search, FilePlus2, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { CreditNoteService } from "../api/services";
import { generateCreditNotePdf } from "../lib/generateCreditNotePdf";
import { formatCurrency, formatDate, formatDateTime, initials } from "../lib/format";
import CreateCreditNoteModal from "../components/CreateCreditNoteModal";
import CreditNoteDetailModal from "../components/CreditNoteDetailModal";

/*
 * Credit Notes — reads the CreditNote collection (own model/service/
 * controller/routes, same as invoices). A credit note here is either:
 *   • Manual   — created by hand from "New credit note"
 *   • Return / Cancellation — created automatically when an invoice's
 *     pending refund is settled as store credit
 * and is used up by being applied to a new order/invoice or paid back.
 */

const TYPE_BADGE = {
  manual: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
  return: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
  cancellation: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
};
const STATUS = {
  open: { label: "Not yet used", cls: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" },
  partially_used: { label: "Partly used", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  used: { label: "Used", cls: "bg-mint-100 text-mint-500 dark:bg-mint-500/15 dark:text-mint-400" },
  cancelled: { label: "Cancelled", cls: "bg-mist-100 text-mist-500 dark:bg-white/10 dark:text-mist-300" },
};

const METHOD_LABEL = { cash: "Cash", upi: "UPI", bank_transfer: "Bank transfer", card: "Card", other: "Other" };

const noteItems = (note) =>
  (note.items || note.returnedItems || []).map((it) => ({
    label: it.description || `${it.productName || ""}${it.variantName ? ` (${it.variantName})` : ""}`,
    quantity: it.qty ?? it.quantity ?? 0,
    price: Number(it.price || 0),
    total: Number(it.totalAmount ?? (it.qty ?? it.quantity ?? 0) * (it.price || 0)),
  }));

const noteTotal = (note) => Number(note.amount ?? note.summary?.totalAmount ?? 0);
const noteBalance = (note) => Number(note.balance ?? 0);

export default function CreditNotesPage() {
  const navigate = useNavigate();
  const openCustomer = (note) =>
    navigate(`/customers/${encodeURIComponent(note.customerPhone)}?name=${encodeURIComponent(note.customerName || "")}`);

  const [creditNotes, setCreditNotes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [openNote, setOpenNote] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await CreditNoteService.getAll({
        search: query.trim() || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      });
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
  }, [query, statusFilter, typeFilter]);

  const download = async (note) => {
    setBusyId(note.creditNoteId);
    try {
      await generateCreditNotePdf(note);
    } catch {
      toast.error("Could not generate the PDF");
    } finally {
      setBusyId(null);
    }
  };

  const canUse = (note) => ["open", "partially_used"].includes(note.status) && Number(note.balance) > 0.01;

  // Everything (apply to invoice, pay back, cancel, history) happens in the
  // detail screen — the list only needs one clear button + PDF.
  const Actions = ({ note }) => (
    <div className="flex flex-wrap justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpenNote(note)}
        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
          canUse(note)
            ? "bg-orange-500 text-white hover:bg-orange-600"
            : "border border-mist-200 text-mist-700 hover:bg-mist-50 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
        }`}
      >
        {canUse(note) ? "Use credit" : "View"} <ChevronRight size={13} />
      </button>
      <button
        onClick={() => download(note)}
        disabled={busyId === note.creditNoteId}
        title="Download PDF"
        className="inline-flex items-center rounded-lg border border-mist-200 px-2 py-1.5 text-xs text-mist-700 hover:bg-mist-50 disabled:opacity-50 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
      >
        {busyId === note.creditNoteId ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
      </button>
    </div>
  );

  const StatusBadge = ({ note }) => {
    const st = STATUS[note.status] || STATUS.open;
    return <span className={`inline-block w-fit whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>;
  };

  // Where the credit went — one small line per usage entry
  const UsageList = ({ note }) => {
    const usage = note.usage || [];
    if (!usage.length) {
      return <p className="text-xs text-mist-500 dark:text-mist-500">{note.status === "cancelled" ? "Cancelled" : "Not used yet"}</p>;
    }
    return (
      <ul className="space-y-1.5">
        {usage.map((u, i) => (
          <li key={u.usageId || i} className="text-xs">
            <div className="flex items-center justify-between gap-3">
              {u.kind === "applied" ? (
                <span className="text-mist-700 dark:text-mist-300">
                  Applied to{" "}
                  <span className="rounded bg-mint-100 px-1.5 py-0.5 font-mono font-semibold text-mint-500 dark:bg-mint-500/15 dark:text-mint-400">
                    {u.appliedToNumber || "invoice"}
                  </span>
                </span>
              ) : (
                <span className="text-mist-700 dark:text-mist-300">
                  Paid back{" "}
                  <span className="rounded bg-sky-50 px-1.5 py-0.5 font-semibold text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
                    {METHOD_LABEL[u.method] || u.method || "—"}
                  </span>
                </span>
              )}
              <span className="whitespace-nowrap font-semibold text-ink-950 dark:text-white">{formatCurrency(u.amount)}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-mist-500 dark:text-mist-500">{formatDateTime(u.at)}</p>
          </li>
        ))}
      </ul>
    );
  };

  // Total + how much of it is used, with a small progress bar
  const AmountCell = ({ note }) => {
    const total = noteTotal(note);
    const balance = noteBalance(note);
    const usedPct = total > 0 ? Math.min(100, Math.max(0, ((total - balance) / total) * 100)) : 0;
    return (
      <div className="">
        <p className="whitespace-nowrap font-display text-base font-bold text-ink-950 dark:text-white">{formatCurrency(total)}</p>
        {note.summary?.totalTax > 0 && (
          <p className="text-[11px] text-mist-500 dark:text-mist-500">
            incl. GST {formatCurrency(note.summary.totalTax)}
          </p>
        )}
        {note.status !== "cancelled" && (
          <>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-mist-100 dark:bg-white/10">
              <div className="h-full rounded-full bg-mint-500" style={{ width: `${usedPct}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-mist-500 dark:text-mist-500">
              {balance > 0.01 ? (
                <>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(balance)}</span> left
                </>
              ) : (
                "Fully used"
              )}
            </p>
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-ink-950 dark:text-white">Credit Notes</h2>
          <p className="text-sm text-mist-500 dark:text-mist-300">
            Click any credit note to see its details and use it — apply it to one of the customer's invoices or give
            the money back.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          <FilePlus2 size={15} /> New credit note
        </button>
      </div>

      {summary && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total issued", value: summary.totalIssued, sub: `${summary.totalCreditNotes} credit notes`, cls: "text-mist-500 dark:text-mist-300" },
            { label: "Applied to orders", value: summary.totalApplied, cls: "text-mint-500" },
            { label: "Paid back", value: summary.totalRefunded, cls: "text-sky-500" },
            { label: "Still unused", value: summary.totalUnapplied, cls: "text-amber-500" },
          ].map((card) => (
            <div key={card.label} className="rounded-xl2 border border-mist-200 bg-white p-4 dark:border-white/10 dark:bg-ink-900">
              <p className={`text-xs font-semibold uppercase tracking-wide ${card.cls}`}>{card.label}</p>
              <p className="mt-1.5 font-display text-xl font-bold text-ink-950 dark:text-white">{formatCurrency(card.value)}</p>
              {card.sub && <p className="text-xs text-mist-500 dark:text-mist-300">{card.sub}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-500 dark:text-mist-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search CN no., invoice, customer, phone…"
            className="w-full rounded-lg border border-mist-200 bg-white py-2.5 pl-9 pr-3 text-sm text-ink-950 outline-none focus:border-orange-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-mist-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-mist-200 bg-white px-3 py-2.5 text-sm text-ink-950 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        >
          <option value="">All statuses</option>
          <option value="open,partially_used">Unused / partly used</option>
          <option value="used">Used</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-mist-200 bg-white px-3 py-2.5 text-sm text-ink-950 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        >
          <option value="">All types</option>
          <option value="manual">Manual</option>
          <option value="return">Return</option>
          <option value="cancellation">Cancellation</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl2 border border-mist-200 bg-white shadow-panel dark:border-white/10 dark:bg-ink-900">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-mist-500 dark:text-mist-300">
            <Loader2 size={16} className="animate-spin" /> Loading credit notes…
          </div>
        ) : creditNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Inbox size={28} className="text-mist-300 dark:text-mist-500" />
            <p className="text-sm font-medium text-ink-950 dark:text-white">No credit notes found</p>
            <p className="text-xs text-mist-500 dark:text-mist-300">Create one with “New credit note”.</p>
          </div>
        ) : (
          <>
            <div className="hidden xl:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-mist-100 bg-mist-50/60 text-[11px] uppercase tracking-wide text-mist-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-mist-300">
                    <th className="px-3 py-3 font-semibold">Credit note</th>
                    <th className="px-3 py-3 font-semibold">Customer</th>
                    <th className="px-3 py-3 font-semibold">Reason &amp; items</th>
                    <th className="px-3 py-3 font-semibold">Amount</th>
                    <th className="px-3 py-3 font-semibold">Status &amp; usage</th>
                    <th className="px-3 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {creditNotes.map((note) => (
                    <tr
                      key={note.creditNoteId}
                      onClick={() => setOpenNote(note)}
                      className="cursor-pointer border-b border-mist-100 align-top transition-colors last:border-0 hover:bg-orange-50/40 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      {/* Credit note */}
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-1.5 whitespace-nowrap font-mono text-xs font-semibold text-ink-950 dark:text-white">
                          <FileText size={14} className="shrink-0 text-orange-500" /> {note.creditNoteNumber}
                        </div>
                        <span className={`mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${TYPE_BADGE[note.type] || ""}`}>
                          {note.type}
                        </span>
                        <p className="mt-1.5 text-[11px] text-mist-500">{formatDateTime(note.creditNoteDate)}</p>
                        <p className="mt-1.5 text-[11px] text-mist-500">
                          {note.invoiceNumber ? (
                            <>
                              Against{" "}
                              <span className="rounded bg-mist-100 px-1 py-0.5 font-mono font-semibold text-ink-950 dark:bg-white/10 dark:text-white">
                                {note.invoiceNumber}
                              </span>
                              {note.invoiceDate && <span className="block pt-0.5">Invoice date {formatDate(note.invoiceDate)}</span>}
                            </>
                          ) : (
                            "No invoice"
                          )}
                        </p>
                      </td>

                      {/* Customer */}
                      <td className="px-3 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCustomer(note);
                          }}
                          className="flex items-start gap-2.5 text-left"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-950 text-[10px] font-bold text-white dark:bg-white/10">
                            {initials(note.customerName)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-ink-950 hover:underline dark:text-white">{note.customerName}</p>
                            {note.customerCompany && note.customerCompany !== note.customerName && (
                              <p className="text-xs text-mist-700 dark:text-mist-300">{note.customerCompany}</p>
                            )}
                            <p className="text-xs text-mist-500 dark:text-mist-500">{note.customerPhone}</p>
                          </div>
                        </button>
                      </td>

                      {/* Reason & items */}
                      <td className="px-3 py-4">
                        <p className="text-xs font-semibold text-ink-950 dark:text-white">{note.reason || "—"}</p>
                        <ul className="mt-1 space-y-0.5">
                          {noteItems(note).map((it, i) => (
                            <li key={i} className="text-xs text-mist-700 dark:text-mist-300">
                              <span className="font-semibold text-ink-950 dark:text-white">{it.quantity} ×</span> {it.label}
                              {it.price > 0 && (
                                <span className="whitespace-nowrap text-mist-500 dark:text-mist-500"> @ {formatCurrency(it.price)}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </td>

                      {/* Amount */}
                      <td className="px-3 py-4">
                        <AmountCell note={note} />
                      </td>

                      {/* Status & usage */}
                      <td className=" px-3 py-4">
                        <StatusBadge note={note} />
                        <div className="mt-2">
                          <UsageList note={note} />
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <Actions note={note} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards for phones/tablets */}
            <div className="divide-y divide-mist-100 dark:divide-white/10 xl:hidden">
              {creditNotes.map((note) => (
                <div key={note.creditNoteId} className="cursor-pointer p-4 hover:bg-orange-50/40 dark:hover:bg-white/5" onClick={() => setOpenNote(note)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 font-mono text-xs font-semibold text-ink-950 dark:text-white">
                        <FileText size={13} className="text-orange-500" /> {note.creditNoteNumber}
                        <span className={`rounded px-1.5 py-0.5 font-sans text-[10px] font-semibold capitalize ${TYPE_BADGE[note.type] || ""}`}>
                          {note.type}
                        </span>
                      </p>
                      <p className="mt-1 text-[11px] text-mist-500 dark:text-mist-500">{formatDateTime(note.creditNoteDate)}</p>
                    </div>
                    <StatusBadge note={note} />
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openCustomer(note);
                    }}
                    className="mt-3 flex min-w-0 items-center gap-2.5 text-left"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-950 text-xs font-bold text-white dark:bg-white/10">
                      {initials(note.customerName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-950 hover:underline dark:text-white">
                        {note.customerName}
                        {note.customerCompany && note.customerCompany !== note.customerName && (
                          <span className="font-normal text-mist-500 dark:text-mist-500"> · {note.customerCompany}</span>
                        )}
                      </p>
                      <p className="text-xs text-mist-500 dark:text-mist-500">{note.customerPhone}</p>
                    </div>
                  </button>

                  <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg bg-mist-50 p-3 sm:grid-cols-3 dark:bg-white/5">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-500">Reason &amp; items</p>
                      <p className="mt-1 text-xs font-semibold text-ink-950 dark:text-white">{note.reason || "—"}</p>
                      {noteItems(note).map((it, i) => (
                        <p key={i} className="text-xs text-mist-700 dark:text-mist-300">
                          {it.quantity} × {it.label}
                          {it.price > 0 && <span className="text-mist-500"> @ {formatCurrency(it.price)}</span>}
                        </p>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-500">Against invoice</p>
                      <p className="mt-1 font-mono text-xs font-semibold text-ink-950 dark:text-white">{note.invoiceNumber || "No invoice"}</p>
                      {note.invoiceDate && <p className="text-[11px] text-mist-500 dark:text-mist-500">{formatDate(note.invoiceDate)}</p>}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-500">Amount</p>
                      <div className="mt-1">
                        <AmountCell note={note} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-[200px] flex-1">
                      <UsageList note={note} />
                    </div>
                    <Actions note={note} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <CreateCreditNoteModal
          onClose={() => setShowCreate(false)}
          onDone={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
      {openNote && (
        <CreditNoteDetailModal
          creditNote={openNote}
          onClose={() => setOpenNote(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
