/**
 * Small label + value pair used in the CustomerDetailPage summary.
 *
 * Used by: pages/CustomerDetailPage.jsx
 */

export function MiniStat({ label, value, className }) {
  return (
    <div>
      <p className="text-mist-500 dark:text-mist-300">{label}</p>
      <p className={`font-semibold ${className || "text-ink-950 dark:text-white"}`}>{value}</p>
    </div>
  );
}
