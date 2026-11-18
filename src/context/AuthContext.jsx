/**
 * Login state for the whole app: current employee, login(), logout(); the token is kept by
 * ApiService.tokenStorage.
 *
 * Used by: components/layout/Header.jsx, main.jsx, pages/AnalyticsPage.jsx, pages/LoginPage.jsx,
 * routes/ProtectedRoute.jsx
 * API: AuthService.login, AuthService.logout, extractToken, tokenStorage.clear, tokenStorage.get,
 * tokenStorage.set
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthService } from "../backend/ApiService";
import { tokenStorage, extractToken } from "../backend/ApiService";

const AuthContext = createContext(null);

const STORAGE_KEY = "digident_employee";

/**
 * Provides the logged-in employee, login() and logout() to the whole app. The profile is kept in
 * sessionStorage.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children The app.
 * @returns {JSX.Element}
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      // Only treat a stored profile as a real session if a token also
      // survived (a token-less profile can't authorize any request).
      return raw && tokenStorage.get() ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [initializing, setInitializing] = useState(false);

  const persist = useCallback((employee) => {
    setUser(employee);
    if (employee) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(employee));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(
    async (credentials) => {
      const res = await AuthService.login(credentials);
      const employee = res?.data?.employee || res?.data?.user || res?.data || null;
      const token = extractToken(res);
      if (!token) {
        // Surface this loudly during setup — without a token every
        // subsequent call will fail with AUTH_HEADER_MISSING.
        console.warn(
          "No access token found in the login response. Check the actual field name your " +
            "/employee/login endpoint returns and update extractToken() in src/api/tokenStorage.js."
        );
      }
      tokenStorage.set(token);
      persist(employee);
      return employee;
    },
    [persist]
  );

  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
    } finally {
      tokenStorage.clear();
      persist(null);
    }
  }, [persist]);

  useEffect(() => {
    const onForceLogout = () => persist(null);
    window.addEventListener("auth:logout", onForceLogout);
    return () => window.removeEventListener("auth:logout", onForceLogout);
  }, [persist]);

  return (
    <AuthContext.Provider value={{ user, login, logout, initializing }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Reads the auth state. Must be used inside AuthProvider.
 *
 * @returns {{ user: object|null, login: Function, logout: Function, initializing: boolean }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
