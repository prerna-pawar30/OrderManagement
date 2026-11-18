/**
 * Ranked list of cities / states by revenue on the Analytics page.
 *
 * Used by: pages/AnalyticsPage.jsx
 */

import { formatCompactCurrency } from "../../utils/Format";

// Sellix "Visitors"-style leaderboard: name + share bar + percentage, no
// map/geo dependency, so it never degrades into an empty/odd shape when
// there are only a couple of locations in range.
export function LocationLeaderboard({ rows, unitLabel }) {
  const total = rows.reduce((sum, row) => sum + row.totalRevenue, 0) || 1;
  const ranked = [...rows].sort((rowA, rowB) => rowB.totalRevenue - rowA.totalRevenue).slice(0, 6);

  return (
    <div className="flex flex-col gap-3">
      {ranked.map((rankedRow, index) => {
        const pct = Math.round((rankedRow.totalRevenue / total) * 100);
        return (
          <div key={rankedRow.name} className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[11px] font-bold text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold text-ink-950 dark:text-white">
                  {rankedRow.name}
                </p>
                <p className="shrink-0 text-xs font-bold text-orange-600 dark:text-orange-400">
                  {pct}%
                </p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-mist-100 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-orange-500"
                  style={{ width: `${Math.max(pct, 3)}%` }}
                />
              </div>
            </div>
            <p className="w-16 shrink-0 text-right text-[11px] text-mist-500 dark:text-mist-300">
              {formatCompactCurrency(rankedRow.totalRevenue)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
