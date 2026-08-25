import React from "react";

// Each entry: { stage, label, count, color, text: "dark" | "light" }.
// `count` must already be cumulative ("orders that reached at least this
// stage"), descending — the caller computes that from ordersByStatus.
export default function FulfillmentFunnel({ stages }) {
  const top = stages[0]?.count || 1;

  return (
    <div>
      {stages.map((s, i) => {
        const topPct = Math.max((s.count / top) * 100, 10);
        const next = stages[i + 1];
        const nextPct = next ? Math.max((next.count / top) * 100, 10) : topPct;
        const leftTop = (100 - topPct) / 2;
        const rightTop = 100 - leftTop;
        const leftBot = (100 - nextPct) / 2;
        const rightBot = 100 - leftBot;
        const shareOfTop = top ? Math.round((s.count / top) * 100) : 0;
        const dropPct =
          next && s.count > 0 ? Math.round(((s.count - next.count) / s.count) * 100) : null;

        return (
          <div key={s.stage}>
            <div
              className={`mx-auto flex h-14 items-center justify-center text-center ${
                s.text === "light" ? "text-white" : "text-ink-950"
              }`}
              style={{
                width: "100%",
                clipPath: `polygon(${leftTop}% 0%, ${rightTop}% 0%, ${rightBot}% 100%, ${leftBot}% 100%)`,
                backgroundColor: s.color,
              }}
            >
              <div>
                <p className="text-xs font-semibold">{s.label}</p>
                <p className="text-sm font-bold leading-tight">
                  {s.count.toLocaleString("en-IN")}{" "}
                  <span className="text-[10px] font-medium opacity-80">({shareOfTop}%)</span>
                </p>
              </div>
            </div>
            {dropPct !== null && dropPct > 0 && (
              <p className="py-1 text-center text-[10px] font-medium text-coral-500 dark:text-coral-400">
                ↓ {dropPct}% drop-off
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
