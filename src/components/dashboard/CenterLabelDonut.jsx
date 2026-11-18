/**
 * Donut chart with the total written in the middle of the ring (Analytics page).
 *
 * Used by: pages/AnalyticsPage.jsx
 */

// Donut with a real total centered inside the ring, Sellix-style.
export function CenterLabelDonut({ height, centerValue, centerLabel, children }) {
  return (
    <div className="relative" style={{ height }}>
      {children}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <p className="font-display text-lg font-bold text-ink-950 dark:text-white">{centerValue}</p>
        <p className="text-[10px] font-medium text-mist-500 dark:text-mist-300">{centerLabel}</p>
      </div>
    </div>
  );
}
