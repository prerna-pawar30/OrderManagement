/**
 * Decorative ring chart that shows each category's share as coloured ticks.
 *
 * Used by: pages/AnalyticsPage.jsx
 */

import { useMemo } from "react";

// Sellix-style "barcode" gauge: a ring built out of many short radial ticks
// (instead of a few smooth wedges), with a gap left open at the bottom and
// the total centered inside. `rows` must already be ordered the way they
// should appear around the ring — each needs { value, color }.
export default function RadialTickRing({
  rows,
  total,
  centerValue,
  centerLabel,
  size = 160,
  tickCount = 56,
  gapDeg = 64,
}) {
  const ticks = useMemo(() => {
    const grand = total || rows.reduce((sum, row) => sum + row.value, 0) || 1;
    const out = [];
    rows.forEach((row) => {
      const share = row.value / grand;
      const rowTickCount = Math.max(row.value > 0 ? 1 : 0, Math.round(share * tickCount));
      for (let i = 0; i < rowTickCount; i++) out.push(row.color);
    });
    while (out.length > tickCount) out.pop();
    while (out.length < tickCount) out.push(rows[rows.length - 1]?.color || "#F2701C");

    const sweep = 360 - gapDeg;
    const start = 180 + gapDeg / 2;
    const centerX = size / 2;
    const centerY = size / 2;
    const outerR = size * 0.46;
    const innerR = size * 0.32;

    return out.map((color, index) => {
      const angle = start + (sweep * (index + 0.5)) / out.length;
      const rad = (angle * Math.PI) / 180;
      const sin = Math.sin(rad);
      const cos = Math.cos(rad);
      return {
        color,
        x1: centerX + innerR * sin,
        y1: centerY - innerR * cos,
        x2: centerX + outerR * sin,
        y2: centerY - outerR * cos,
      };
    });
  }, [rows, total, tickCount, gapDeg, size]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
        {ticks.map((tick, index) => (
          <line
            key={index}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.color}
            strokeWidth={size * 0.028}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        {centerLabel && (
          <p className="text-[10px] font-medium text-mist-500 dark:text-mist-300">{centerLabel}</p>
        )}
        <p className="font-display text-lg font-bold text-ink-950 dark:text-white">{centerValue}</p>
      </div>
    </div>
  );
}
