/**
 * Small tile with the count of orders in one status (Analytics page).
 *
 * Used by: pages/AnalyticsPage.jsx
 */

export function StageTile({ icon: Icon, label, value }) {
  return (
    <div className="flex h-full flex-col justify-between gap-3 rounded-xl2 border border-mist-200 bg-white p-4 shadow-panel dark:border-white/10 dark:bg-ink-900">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-xl font-bold leading-tight text-ink-950 dark:text-white">
          {value.toLocaleString("en-IN")}
        </p>
        <p className="truncate text-xs font-medium text-mist-500 dark:text-mist-300">{label}</p>
      </div>
    </div>
  );
}
