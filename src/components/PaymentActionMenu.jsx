import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Check } from "lucide-react";
import { statusLabel } from "./StatusBadge";
import { STATUS_COLORS } from "../theme/muiTheme";

const MENU_WIDTH = 200;
// Always listed in this order — Pending first, then Paid — with the
// current status shown as selected/checked rather than hidden.
const OPTIONS = ["pending", "paid"];

// Refunded/refund_pending/partial_refunded aren't directly settable by staff
// — they only happen through the return/refund flow — so the menu simply
// doesn't render for those, mirroring updateManualOrderPaymentStatusService's
// nonEditableStatuses on the backend.
const NON_EDITABLE = ["refunded", "refund_pending", "partial_refunded"];

// Same "..." popover pattern as StatusActionMenu, portaled to document.body
// for the same reason: the table card clips absolutely-positioned children.
export default function PaymentActionMenu({ currentStatus, disabled, onSelect }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const updateCoords = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      top: rect.bottom + 8,
      left: Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8),
    });
  };

  useLayoutEffect(() => {
    if (open) updateCoords();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (buttonRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const reposition = () => updateCoords();
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  if (NON_EDITABLE.includes(currentStatus)) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        disabled={disabled}
        className="grid h-8 w-8 place-items-center rounded-full bg-ink-950 text-white transition hover:bg-ink-800 disabled:opacity-40 dark:bg-white dark:text-ink-950 dark:hover:bg-mist-100"
      >
        <MoreHorizontal size={16} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: MENU_WIDTH }}
            className="z-50 overflow-hidden rounded-xl2 border border-mist-200 bg-white shadow-panel dark:border-white/10 dark:bg-ink-900"
          >
            <p className="border-b border-mist-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-mist-400 dark:border-white/10 dark:text-mist-500">
              Payment status
            </p>
            <div className="py-1">
              {OPTIONS.map((s) => {
                const isCurrent = s === currentStatus;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      if (isCurrent) {
                        setOpen(false);
                        return;
                      }
                      setOpen(false);
                      onSelect(s);
                    }}
                    className={`flex w-full items-center justify-between gap-2.5 px-4 py-2.5 text-left text-sm font-bold uppercase tracking-wide ${
                      isCurrent
                        ? "cursor-default bg-mist-50 text-ink-950 dark:bg-white/10 dark:text-white"
                        : "text-ink-950 hover:bg-mist-50 dark:text-white dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[s] }}
                      />
                      {statusLabel(s)}
                    </span>
                    {isCurrent && <Check size={14} className="shrink-0 text-mist-500 dark:text-mist-300" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

