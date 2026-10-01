import React from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Check, ChevronDown } from "lucide-react";
import { PaymentStatusBadge, statusLabel } from "./StatusBadge";
import { STATUS_COLORS } from "../theme/muiTheme";
import usePopover from "./usePopover";

const MENU_WIDTH = 200;
// Always listed in this order — Pending first, then Paid — with the
// current status shown as selected/checked rather than hidden.
const OPTIONS = ["pending", "paid"];

// Refunded/refund_pending/partial_refunded aren't directly settable by staff
// — they only happen through the return/refund flow — so the menu simply
// doesn't open for those, mirroring updateManualOrderPaymentStatusService's
// nonEditableStatuses on the backend.
const NON_EDITABLE = ["refunded", "refund_pending", "partial_refunded"];

// Same popover pattern as StatusActionMenu (see there for the variants).
export default function PaymentActionMenu({ currentStatus, disabled, onSelect, variant = "icon" }) {
  const { open, setOpen, coords, buttonRef, menuRef } = usePopover(MENU_WIDTH);

  if (NON_EDITABLE.includes(currentStatus)) {
    return variant === "pill" ? (
      <div className="flex min-h-[40px] w-full items-center rounded-lg border border-mist-100 bg-mist-50 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
        <PaymentStatusBadge status={currentStatus} />
      </div>
    ) : null;
  }

  const toggle = (e) => {
    e.stopPropagation();
    setOpen((o) => !o);
  };

  return (
    <>
      {variant === "pill" ? (
        <button
          ref={buttonRef}
          type="button"
          onClick={toggle}
          disabled={disabled}
          className="flex min-h-[40px] w-full items-center justify-between gap-2 rounded-lg border border-mist-200 bg-white px-2.5 py-1.5 text-left transition hover:border-orange-400 disabled:opacity-40 dark:border-white/10 dark:bg-ink-900 dark:hover:border-orange-500"
        >
          <PaymentStatusBadge status={currentStatus} />
          <ChevronDown
            size={16}
            className={`shrink-0 text-mist-500 transition-transform dark:text-mist-300 ${open ? "rotate-180" : ""}`}
          />
        </button>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={toggle}
          disabled={disabled}
          title="Change payment status"
          className="grid h-8 w-8 place-items-center rounded-full bg-ink-950 text-white transition hover:bg-ink-800 disabled:opacity-40 dark:bg-white dark:text-ink-950 dark:hover:bg-mist-100"
        >
          <MoreHorizontal size={16} />
        </button>
      )}

      {open &&
        createPortal(
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width }}
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
                      setOpen(false);
                      if (!isCurrent) onSelect(s);
                    }}
                    className={`flex w-full items-center justify-between gap-2.5 px-4 py-3 text-left text-sm font-bold uppercase tracking-wide ${
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
