import React from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, ChevronDown } from "lucide-react";
import { OrderStatusBadge, statusLabel } from "./StatusBadge";
import { STATUS_COLORS } from "../theme/muiTheme";
import usePopover from "./usePopover";

const MENU_WIDTH = 224;

// Status-change menu — combines the forward status transitions with Cancel
// in one quick popover instead of a plain <select>. Portaled to
// document.body: the orders list sits in an `overflow-hidden` card (for its
// rounded corners), which would clip an in-place absolutely-positioned popover.
//
// variant="icon" (default): compact "..." trigger for the desktop table.
// variant="pill": full-width button showing the current status + chevron,
// so on phones it's obvious what the button changes.
export default function StatusActionMenu({
  nextStatuses,
  canCancel,
  disabled,
  onSelectStatus,
  onCancel,
  variant = "icon",
  currentStatus,
}) {
  const { open, setOpen, coords, buttonRef, menuRef } = usePopover(MENU_WIDTH);
  const hasActions = nextStatuses.length > 0 || canCancel;

  if (!hasActions) {
    // Nothing left to do (delivered/cancelled) — the pill still shows the
    // status so the card layout stays consistent; the icon simply disappears.
    return variant === "pill" ? (
      <div className="flex min-h-[40px] w-full items-center rounded-lg border border-mist-100 bg-mist-50 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
        <OrderStatusBadge status={currentStatus} />
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
          <OrderStatusBadge status={currentStatus} />
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
          title="Change order status"
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
              Change order status to
            </p>
            <div className="py-1">
              {nextStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSelectStatus(s);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-bold uppercase tracking-wide text-ink-950 hover:bg-mist-50 dark:text-white dark:hover:bg-white/5"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[s] }}
                  />
                  {statusLabel(s)}
                </button>
              ))}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onCancel();
                  }}
                  className="flex w-full items-center gap-2.5 border-t border-mist-100 px-4 py-3 text-left text-sm font-bold uppercase tracking-wide text-coral-500 hover:bg-coral-100/50 dark:border-white/10 dark:text-coral-400 dark:hover:bg-coral-500/10"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS.cancelled }}
                  />
                  Cancel order
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
