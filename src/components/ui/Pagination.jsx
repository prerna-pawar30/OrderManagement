import React from "react";

/**
 * Row of page-number buttons. Reconstructed to match usage:
 * <Pagination currentPage totalPages onPageChange />
 * (the surrounding Previous/Next buttons live in the parent page already).
 */
export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  // Keep the row short: current page, 1 neighbour each side, first/last,
  // with "…" gaps — standard compact pagination.
  const pages = [];
  const add = (p) => pages.push(p);
  const addGap = () => pages.push("...");

  add(1);
  if (currentPage > 3) addGap();
  for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) {
    add(p);
  }
  if (currentPage < totalPages - 2) addGap();
  if (totalPages > 1) add(totalPages);

  return (
    <div className="flex items-center gap-1.5">
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`gap-${idx}`} className="px-1.5 text-gray-400 text-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`h-8 min-w-8 rounded-lg px-2 text-sm font-semibold transition-all ${
              p === currentPage
                ? "bg-orange-500 text-white shadow"
                : "bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600 border border-gray-200"
            }`}
          >
            {p}
          </button>
        )
      )}
    </div>
  );
}
