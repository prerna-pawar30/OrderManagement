/**
 * Headline number card (billed, paid, due ...) on the CustomerDetailPage.
 *
 * Used by: pages/CustomerDetailPage.jsx
 */

export function SummaryCard({ label, value, tone, extra }) {
  const toneClass =
    tone === "coral"
      ? "text-coral-500"
      : tone === "amber"
        ? "text-amber-500"
        : tone === "mint"
          ? "text-mint-500"
          : "text-ink-950 dark:text-white";
  return (
    <div className="rounded-xl2 border border-mist-200 bg-white p-4 dark:border-white/10 dark:bg-ink-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-300">
        {label}
      </p>
      <p className={`mt-1.5 font-display text-lg font-bold ${toneClass}`}>{value}</p>
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
}
