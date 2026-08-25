import React from "react";
import { ChevronDown } from "lucide-react";

/**
 * Label + select, styled to match the surrounding "box" fields used
 * throughout CreateInvoice.jsx / UpdateInvoiceModal.jsx (rounded-xl,
 * bg-slate-50, tiny uppercase black label on top).
 *
 * Reconstructed to match usage: <DropdownGroup label value options onChange />
 * where options is [{ value, label }].
 */
export default function DropdownGroup({ label, value, options = [], onChange }) {
  return (
    <div className="relative p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-center">
      <label className="text-[10px] font-black text-slate-500 uppercase mb-1">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-transparent font-bold outline-none text-slate-800 text-sm pr-5 cursor-pointer"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  );
}
