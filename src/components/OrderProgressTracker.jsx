import React from "react";
import { Check, X, Undo2 } from "lucide-react";

// The normal forward path every order should walk through.
const STEPS = [
  { key: "placed", label: "Placed" },
  { key: "packed", label: "Packed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

/**
 * Horizontal step tracker for the order detail drawer — mirrors the
 * storefront's OrderProgressTracker so staff see the same shape of "where is
 * this order right now" that customers see, just with admin-relevant labels.
 *
 * Cancelled / returned / partial_returned orders left the normal path, so
 * instead of bending the stepper to fit them, this shows a plain-language
 * banner explaining what happened instead.
 */
export default function OrderProgressTracker({ orderStatus }) {
  if (orderStatus === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-xl2 border border-coral-200 bg-coral-100 px-4 py-3.5 dark:border-coral-500/30 dark:bg-coral-500/10">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-coral-500 text-white">
          <X size={16} />
        </span>
        <div>
          <p className="text-sm font-semibold text-coral-600 dark:text-coral-400">This order was cancelled</p>
          <p className="text-xs text-coral-500/80 dark:text-coral-400/70">
            It left the normal placed → delivered flow and won't move forward.
          </p>
        </div>
      </div>
    );
  }

  if (orderStatus === "returned" || orderStatus === "partial_returned") {
    const isFull = orderStatus === "returned";
    return (
      <div className="flex items-center gap-3 rounded-xl2 border border-amber-200 bg-amber-100 px-4 py-3.5 dark:border-amber-500/30 dark:bg-amber-500/10">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-500 text-white">
          <Undo2 size={16} />
        </span>
        <div>
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            {isFull ? "Everything on this order was returned" : "Some items on this order were returned"}
          </p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
            See the return history below for what came back and what's still owed.
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === orderStatus);

  return (
    <div className="flex items-center">
      {STEPS.map((step, idx) => {
        const isDone = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isLast = idx === STEPS.length - 1;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${
                  isDone
                    ? "bg-mint-500 text-white"
                    : isCurrent
                    ? "bg-orange-500 text-white ring-4 ring-orange-100 dark:ring-orange-500/20"
                    : "bg-mist-200 text-mist-500 dark:bg-white/10 dark:text-mist-400"
                }`}
              >
                {isDone ? <Check size={15} /> : idx + 1}
              </span>
              <span
                className={`text-[11px] font-semibold whitespace-nowrap ${
                  isCurrent
                    ? "text-orange-600 dark:text-orange-400"
                    : isDone
                    ? "text-ink-950 dark:text-white"
                    : "text-mist-400 dark:text-mist-500"
                }`}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={`mx-1.5 h-0.5 flex-1 rounded-full transition-colors ${
                  isDone ? "bg-mint-500" : "bg-mist-200 dark:bg-white/10"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
