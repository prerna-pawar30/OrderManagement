/**
 * Card frame for one chart on the Analytics page, with an empty state when there is no data.
 *
 * Used by: pages/AnalyticsPage.jsx
 */

import { Inbox, MoreHorizontal } from "lucide-react";

// `fill`: stretch this card to match a taller sibling in the same grid row
// (row must NOT use items-start) and let its content grow to fill that
// height, instead of leaving dead space at the bottom.
export function ChartCard({
  title,
  subtitle,
  right,
  children,
  empty,
  className = "",
  fill = false,
}) {
  return (
    <div
      className={`rounded-xl2 border border-mist-200 bg-white p-3.5 shadow-panel dark:border-white/10 dark:bg-ink-900 sm:p-4 ${
        fill ? "flex h-full flex-col" : ""
      } ${className}`}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold text-ink-950 dark:text-white">{title}</h3>
          {subtitle && <p className="text-[11px] text-mist-500 dark:text-mist-300">{subtitle}</p>}
        </div>
        {right || (
          <MoreHorizontal size={16} className="shrink-0 text-mist-400 dark:text-mist-500" />
        )}
      </div>
      {empty ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <Inbox size={20} className="text-mist-300 dark:text-mist-500" />
          <p className="text-xs text-mist-500 dark:text-mist-300">No data for this range</p>
        </div>
      ) : (
        <div className={`overflow-x-auto ${fill ? "flex flex-1 flex-col justify-center" : ""}`}>
          {children}
        </div>
      )}
    </div>
  );
}
