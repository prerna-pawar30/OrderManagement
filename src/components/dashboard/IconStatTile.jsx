/**
 * KPI tile with an icon, a value and a caption (top row of the Analytics page).
 *
 * Used by: pages/AnalyticsPage.jsx
 */

export function IconStatTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl2 border border-mist-200 bg-white p-5 shadow-panel dark:border-white/10 dark:bg-ink-900">
      {/* Oversized watermark icon — turns the extra height (needed to match
          the donut card next to it) into a deliberate design flourish
          instead of dead whitespace. */}
      {Icon && (
        <Icon
          size={112}
          strokeWidth={1.3}
          className="pointer-events-none absolute -bottom-6 -right-6 text-orange-500/[0.07] dark:text-orange-400/[0.09]"
        />
      )}

      {/* Icon badge on its own row so the label below always has full card
          width to wrap into — prevents "TOTAL REVENUE" / "UNIQUE CUSTOMERS"
          from clipping against the card edge in a 4-up grid. */}
      <div className="relative flex items-start justify-between gap-2">
        {Icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
            <Icon size={22} />
          </span>
        )}
      </div>

      <p
        title={label}
        className="relative mt-3 line-clamp-2 min-h-[2.2em] text-[11px] font-semibold uppercase leading-tight tracking-normal text-mist-500 dark:text-mist-300"
      >
        {label}
      </p>

      <div className="relative mt-2">
        <p className="font-display text-3xl font-bold leading-none text-ink-950 dark:text-white">
          {value}
        </p>
        {sub && <p className="mt-2 text-xs text-mist-500 dark:text-mist-300">{sub}</p>}
      </div>
    </div>
  );
}
