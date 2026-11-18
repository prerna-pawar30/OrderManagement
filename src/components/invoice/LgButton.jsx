/**
 * Large button used in the CustomerGroup accordion header.
 *
 * Used by: components/invoice/CustomerGroup.jsx
 */

/* Large button (for the accordion header) */
const LG_TONES = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
  orange: "border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100",
};

export const LgButton = ({ icon: Icon, label, tone, onClick, title }) => (
  <button
    type="button"
    title={title || label}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    className={`hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border px-4 py-2.5 text-sm font-bold transition-colors sm:inline-flex ${LG_TONES[tone]}`}
  >
    <Icon size={17} /> {label}
  </button>
);
