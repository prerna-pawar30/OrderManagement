/**
 * Titled card that wraps one section (orders, invoices, credit notes) of the CustomerDetailPage.
 *
 * Used by: pages/CustomerDetailPage.jsx
 */

export function Section({ title, icon: Icon, children, className = "", right }) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={14} className="text-mist-400 dark:text-mist-500" />}
          <p className="text-xs font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-300">
            {title}
          </p>
        </div>
        {right}
      </div>
      <div className="overflow-hidden rounded-xl2 border border-mist-200 bg-white shadow-panel dark:border-white/10 dark:bg-ink-900">
        {children}
      </div>
    </div>
  );
}
