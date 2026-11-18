/**
 * Button + dialog that exports all invoices of a chosen month and year to a two-sheet Excel report.
 *
 * Used by: pages/InvoiceListPage.jsx
 */

import { useState } from "react";
import { FileSpreadsheet, Loader2, X as CloseIcon } from "lucide-react";
import { MONTH_NAMES, generateExcel } from "../../utils/InvoiceExcelReport";

// ─── Component ────────────────────────────────────────────────────────────────
const MonthYearExcelExport = ({ fetchInvoices }) => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const yearOptions = Array.from({ length: 5 }, (_, yearOffset) => now.getFullYear() - yearOffset);

  const handleExport = async () => {
    setLoading(true);
    try {
      const invoices = await fetchInvoices(month, year);
      if (!invoices || invoices.length === 0) {
        alert(`No invoices found for ${MONTH_NAMES[month - 1]} ${year}.`);
        return;
      }
      await generateExcel(invoices, month, year);
      setOpen(false);
    } catch (err) {
      console.error("Excel export failed:", err);
      alert("Export failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-[7px] whitespace-nowrap rounded-[10px] border border-orange-200 bg-orange-50
                   px-3.5 py-[9px] text-xs font-extrabold text-orange-600 transition-colors hover:bg-orange-100"
      >
        <FileSpreadsheet size={15} className="shrink-0" />
        Export Excel
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#1A1A2E] to-[#E68736] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <FileSpreadsheet className="text-white" size={22} />
                </div>
                <div>
                  <h2 className="font-bold text-white text-lg leading-tight">
                    Export Invoice Report
                  </h2>
                  <p className="text-white/70 text-xs">Professional Excel · 2 Sheets</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/60 hover:text-white transition"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Month
                  </label>
                  <select
                    value={month}
                    onChange={(event) => setMonth(Number(event.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700
                               focus:ring-2 focus:ring-orange-400 outline-none bg-gray-50 text-sm"
                  >
                    {MONTH_NAMES.map((monthName, index) => (
                      <option key={monthName} value={index + 1}>
                        {monthName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Year
                  </label>
                  <select
                    value={year}
                    onChange={(event) => setYear(Number(event.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700
                               focus:ring-2 focus:ring-orange-400 outline-none bg-gray-50 text-sm"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview card */}
              <div className="bg-gradient-to-r from-[#1A1A2E] to-[#374151] rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-xs">Exporting report for</p>
                  <p className="text-white font-bold text-base mt-0.5">
                    {MONTH_NAMES[month - 1]} {year}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-xs">Format</p>
                  <p className="text-[#E68736] font-semibold text-sm mt-0.5">.xlsx · 2 Sheets</p>
                </div>
              </div>

              {/* What's included */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 mb-5 space-y-1.5">
                {[
                  ["Sheet 1", "Invoice List with status color-coding"],
                  ["Sheet 2", "KPI Dashboard + Customer Breakdown"],
                ].map(([sheet, desc]) => (
                  <div key={sheet} className="flex items-center gap-2.5 text-sm">
                    <span className="w-16 text-xs font-bold text-orange-500 bg-orange-50 rounded-md px-1.5 py-0.5">
                      {sheet}
                    </span>
                    <span className="text-gray-500">{desc}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleExport}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white
                           py-3 rounded-xl font-semibold hover:bg-orange-600 transition-all
                           disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Generating Professional Report…
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={17} />
                    Download Excel Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MonthYearExcelExport;
