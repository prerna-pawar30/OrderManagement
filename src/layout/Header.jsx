import React, { useEffect, useRef, useState } from "react";
import { Menu, ChevronDown, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { initials } from "../lib/format";

export default function Header({ onMenuClick, title }) {
  const { user, logout } = useAuth();
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
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-mist-200 bg-white/90 px-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button
          className="grid h-9 w-9 place-items-center rounded-lg text-mist-500 hover:bg-mist-100 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={19} />
        </button>
        <h1 className="font-display text-lg font-bold text-ink-950">{title}</h1>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-full border border-mist-200 py-1 pl-1 pr-3 hover:bg-mist-50"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-teal-500 text-xs font-bold text-white">
            {initials(displayName)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold text-ink-950 leading-tight">
              {displayName}
            </span>
            <span className="block text-[11px] text-mist-500 leading-tight">
              {user?.email || ""}
            </span>
          </span>
          <ChevronDown size={15} className="text-mist-500" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl2 border border-mist-200 bg-white shadow-panel">
            <div className="border-b border-mist-100 px-4 py-3">
              <p className="text-sm font-semibold text-ink-950">{displayName}</p>
              <p className="truncate text-xs text-mist-500">{user?.email}</p>
            </div>
            <button className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-mist-700 hover:bg-mist-50">
              <User size={15} /> My profile
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-coral-500 hover:bg-coral-100/60"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
