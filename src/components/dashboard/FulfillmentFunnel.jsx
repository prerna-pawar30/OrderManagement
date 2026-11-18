/**
 * Funnel chart of how many orders reached each fulfilment stage, with the drop-off between stages.
 *
 * Used by: pages/AnalyticsPage.jsx
 */

// Each entry: { stage, label, count, color, text: "dark" | "light" }.
// `count` must already be cumulative ("orders that reached at least this
// stage"), descending — the caller computes that from ordersByStatus.
export default function FulfillmentFunnel({ stages }) {
  const top = stages[0]?.count || 1;

  return (
    <div>
      {stages.map((stage, index) => {
        const topPct = Math.max((stage.count / top) * 100, 10);
        const next = stages[index + 1];
        const nextPct = next ? Math.max((next.count / top) * 100, 10) : topPct;
        const leftTop = (100 - topPct) / 2;
        const rightTop = 100 - leftTop;
        const leftBot = (100 - nextPct) / 2;
        const rightBot = 100 - leftBot;
        const shareOfTop = top ? Math.round((stage.count / top) * 100) : 0;
        const dropPct =
          next && stage.count > 0
            ? Math.round(((stage.count - next.count) / stage.count) * 100)
            : null;

        return (
          <div key={stage.stage}>
            <div
              className={`mx-auto flex h-14 items-center justify-center text-center ${
                stage.text === "light" ? "text-white" : "text-ink-950"
              }`}
              style={{
                width: "100%",
                clipPath: `polygon(${leftTop}% 0%, ${rightTop}% 0%, ${rightBot}% 100%, ${leftBot}% 100%)`,
                backgroundColor: stage.color,
              }}
            >
              <div>
                <p className="text-xs font-semibold">{stage.label}</p>
                <p className="text-sm font-bold leading-tight">
                  {stage.count.toLocaleString("en-IN")}{" "}
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
