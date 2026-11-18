/**
 * useIsMobile(): true when the screen is phone-sized; updates on resize.
 *
 * Used by: pages/AnalyticsPage.jsx
 */

import { useEffect, useState } from "react";

/**
 * Tells whether the screen is phone-sized (narrower than 640px). Updates on resize.
 *
 * @returns {boolean}
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 640
  );
  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 639px)");
    const onChange = (event) => setIsMobile(event.matches);
    mobileQuery.addEventListener("change", onChange);
    return () => mobileQuery.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}
