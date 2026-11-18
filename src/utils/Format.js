/**
 * The one place for display formatting: currency (INR), compact currency, dates and date-times in
 * India time, initials.
 *
 * Used by: 20 files (shared), e.g. components/creditnote/CreateCreditNoteModal.jsx,
 * components/creditnote/CreditNoteDetailModal.jsx, components/creditnote/InvoicePicker.jsx
 */

/**
 * Formats rupees for display, whole rupees, Indian grouping. Example: 180000 -> "₹1,80,000".
 *
 * @param {number|string} value Amount in rupees.
 * @returns {string}
 */
export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

/**
 * Short currency text for chart axes. Example: 180000 -> "₹1.8L".
 *
 * Short form for axis ticks/labels where space is tight, e.g. "₹1.8L" instead of "₹1,80,000".
 *
 * @param {number|string} value Amount in rupees.
 * @returns {string}
 */
export const formatCompactCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);

// All dates from the backend are stored in UTC. Without an explicit
// timeZone, the browser's own local zone gets used to render them — for
// most staff that's fine (they're in India), but this makes it correct
// regardless of the device/browser's own settings.
const IST = "Asia/Kolkata";

/**
 * Formats a date in India time, e.g. "05 Mar 2026". Empty or invalid input gives "—".
 *
 * @param {string|Date} value ISO date from the API.
 * @returns {string}
 */
export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: IST,
  });
};

/**
 * Formats a date and time in India time, e.g. "05 Mar 2026 · 4:30 pm". Empty or invalid input gives
 * "—".
 *
 * @param {string|Date} value ISO date from the API.
 * @returns {string}
 */
export const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${formatDate(value)} · ${date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: IST,
  })}`;
};

/**
 * First letters of the first two words of a name, e.g. "Ravi Kumar" -> "RK"; "?" when empty.
 *
 * @param {string} [name=""]
 * @returns {string}
 */
export const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
