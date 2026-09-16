import React from "react";
import { Search, Loader2 } from "lucide-react";

const InvoiceSearch = ({ searchTerm, setSearchTerm, isSearching }) => (
  <div className="relative mb-6">
    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300" size={20} />
    <input
      type="text"
      placeholder="Search by customer name or company…"
      className="w-full rounded-2xl border border-orange-100 bg-white py-3 pl-12 pr-10 shadow-sm outline-none
                 transition-all placeholder:text-gray-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-500/40"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
    {isSearching && (
      <Loader2
        className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-orange-400"
        size={18}
      />
    )}
  </div>
);

export default InvoiceSearch;
