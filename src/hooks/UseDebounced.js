/**
 * useDebounced(value, delayMs): returns the value only after it stopped changing for delayMs (used
 * for search boxes).
 *
 * Used by: pages/InvoiceListPage.jsx
 */

import { useEffect, useState } from "react";

/**
 * Returns `value` only after it has stopped changing for `milliseconds` (for search boxes).
 *
 * @param {*} value The fast-changing value.
 * @param {number} [milliseconds=300] Wait time, default 300.
 * @returns {*} The settled value.
 */
export const useDebounced = (value, milliseconds = 300) => {
  const [draftValue, setDraftValue] = useState(value);
  useEffect(() => {
    const timerId = setTimeout(() => setDraftValue(value), milliseconds);
    return () => clearTimeout(timerId);
  }, [value, milliseconds]);
  return draftValue;
};
