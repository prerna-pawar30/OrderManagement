import React, { useEffect, useRef, useState } from "react";
import { Menu, ChevronDown, LogOut, User, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { initials } from "../lib/format";

export default function Header({ onMenuClick, title }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Staff";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-mist-200 bg-white/90 px-4 backdrop-blur dark:border-white/10 dark:bg-ink-950/90 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          className="grid h-9 w-9 place-items-center rounded-lg text-mist-500 hover:bg-mist-100 dark:text-mist-300 dark:hover:bg-white/5 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={19} />
        </button>
        <h1 className="font-display text-lg font-bold text-ink-950 dark:text-white truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="grid h-9 w-9 place-items-center rounded-lg text-mist-500 hover:bg-mist-100 dark:text-mist-300 dark:hover:bg-white/5"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-full border border-mist-200 py-1 pl-1 pr-3 hover:bg-mist-50 dark:border-white/10 dark:hover:bg-white/5"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-orange-500 text-xs font-bold text-white">
              {initials(displayName)}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold text-ink-950 leading-tight dark:text-white">
                {displayName}
              </span>
              <span className="block text-[11px] text-mist-500 leading-tight dark:text-mist-300">
                {user?.email || ""}
              </span>
            </span>
            <ChevronDown size={15} className="text-mist-500 dark:text-mist-300" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl2 border border-mist-200 bg-white shadow-panel dark:border-white/10 dark:bg-ink-900">
              <div className="border-b border-mist-100 px-4 py-3 dark:border-white/10">
                <p className="text-sm font-semibold text-ink-950 dark:text-white">{displayName}</p>
                <p className="truncate text-xs text-mist-500 dark:text-mist-300">{user?.email}</p>
              </div>
              <button className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-mist-700 hover:bg-mist-50 dark:text-mist-300 dark:hover:bg-white/5">
                <User size={15} /> My profile
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-coral-500 hover:bg-coral-100/60 dark:text-coral-400 dark:hover:bg-coral-500/10"
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
