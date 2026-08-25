import React, { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { Lock, Mail, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user) {
    return <Navigate to={location.state?.from?.pathname || "/orders"} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      toast.success("Welcome back");
      navigate(location.state?.from?.pathname || "/orders", { replace: true });
    } catch (err) {
      const message = err?.response?.data?.message || "Invalid email or password";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-ink-950 p-8 text-mist-100 md:flex md:p-10 lg:p-12">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-orange-500 font-display font-extrabold text-ink-950">
            D
          </span>
          <span className="font-display text-base font-bold text-white">Digident</span>
        </div>

        <div>
          <p className="font-display text-2xl font-extrabold leading-tight text-white lg:text-3xl">
            One counter for every
            <br />
            manual order, invoice
            <br />
            and refund.
          </p>
          <p className="mt-4 max-w-sm text-sm text-mist-300">
            Staff-entered orders, courier tracking, returns and client payment history — kept in
            one ledger so nothing gets lost between calls.
          </p>
        </div>

        <p className="text-xs text-mist-400">© {new Date().getFullYear()} Digident Internal Tools</p>
      </div>

      <div className="flex items-center justify-center bg-white px-6 py-16 dark:bg-ink-950">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-bold text-ink-950 dark:text-white">Sign in</h1>
          <p className="mt-1 text-sm text-mist-500 dark:text-mist-300">Use your staff account to open the console.</p>

          <div className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-300">
                Email
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-mist-200 bg-white px-3.5 py-2.5 focus-within:border-orange-500 dark:border-ink-700 dark:bg-ink-900">
                <Mail size={16} className="text-mist-500 dark:text-mist-300" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@digident.in"
                  className="w-full bg-transparent text-sm text-ink-950 outline-none placeholder:text-mist-300 dark:text-white dark:placeholder:text-mist-500"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-300">
                Password
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-mist-200 bg-white px-3.5 py-2.5 focus-within:border-orange-500 dark:border-ink-700 dark:bg-ink-900">
                <Lock size={16} className="text-mist-500 dark:text-mist-300" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm text-ink-950 outline-none placeholder:text-mist-300 dark:text-white dark:placeholder:text-mist-500"
                />
              </div>
            </label>

            {error && (
              <p className="rounded-lg bg-coral-100 px-3 py-2 text-xs font-medium text-coral-500 dark:bg-coral-500/15 dark:text-coral-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
