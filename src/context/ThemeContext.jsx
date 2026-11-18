/**
 * Light / dark theme state and toggle.
 *
 * Used by: components/layout/Header.jsx, main.jsx, pages/AnalyticsPage.jsx
 */

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "digident-theme";

/**
 * Provides the light / dark theme and a toggle; the choice is remembered in localStorage.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children The app.
 * @returns {JSX.Element}
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || "light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

/**
 * Reads the current theme and the toggle function.
 *
 * @returns {{ theme: "light"|"dark", toggleTheme: Function }}
 */
export function useTheme() {
  return useContext(ThemeContext);
}
