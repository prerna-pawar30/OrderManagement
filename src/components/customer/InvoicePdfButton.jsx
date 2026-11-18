/**
 * Small button that downloads one invoice PDF (shows a spinner while it is generated).
 *
 * Used by: pages/CustomerDetailPage.jsx
 */

import { Loader2, FileDown } from "lucide-react";

export function InvoicePdfButton({ busy, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      title="Download invoice"
      className="inline-flex items-center gap-1.5 rounded-lg border border-mist-200 px-2.5 py-1 text-[11px] font-semibold text-mist-700 hover:bg-mist-50 disabled:opacity-40 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
      PDF
    </button>
  );
}
