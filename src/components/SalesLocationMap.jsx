import React, { useMemo } from "react";
import { formatCurrency } from "../lib/format";
import { CHART_PALETTE } from "../theme/muiTheme";

// Approximate lat/lon for cities that commonly show up in orders. Anything
// missing falls back to a deterministic (hash-based) position inside the
// India bounding box below, so the dot still lands somewhere sane and
// stable across re-renders instead of jumping around.
const CITY_COORDS = {
  mumbai: [19.076, 72.8777],
  pune: [18.5204, 73.8567],
  nashik: [19.9975, 73.7898],
  surat: [21.1702, 72.8311],
  delhi: [28.7041, 77.1025],
  "new delhi": [28.6139, 77.209],
  bangalore: [12.9716, 77.5946],
  bengaluru: [12.9716, 77.5946],
  hyderabad: [17.385, 78.4867],
  chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
  ahmedabad: [23.0225, 72.5714],
  jaipur: [26.9124, 75.7873],
  lucknow: [26.8467, 80.9462],
  indore: [22.7196, 75.8577],
  nagpur: [21.1458, 79.0882],
  bhopal: [23.2599, 77.4126],
  patna: [25.5941, 85.1376],
  vadodara: [22.3072, 73.1812],
  coimbatore: [11.0168, 76.9558],
  kochi: [9.9312, 76.2673],
  chandigarh: [30.7333, 76.7794],
  gurgaon: [28.4595, 77.0266],
  gurugram: [28.4595, 77.0266],
  noida: [28.5355, 77.391],
  thane: [19.2183, 72.9781],
  rajkot: [22.3039, 70.8022],
  visakhapatnam: [17.6868, 83.2185],
  bhubaneswar: [20.2961, 85.8245],
  guwahati: [26.1445, 91.7362],
  ludhiana: [30.901, 75.8573],
  agra: [27.1767, 78.0081],
  varanasi: [25.3176, 82.9739],
  amritsar: [31.634, 74.8723],
  mysore: [12.2958, 76.6394],
  madurai: [9.9252, 78.1198],
  jodhpur: [26.2389, 73.0243],
  ranchi: [23.3441, 85.3096],
  raipur: [21.2514, 81.6296],
};

const BOUNDS = { latMin: 8, latMax: 35.5, lonMin: 68, lonMax: 97.5 };

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function coordsFor(name) {
  const key = (name || "").trim().toLowerCase();
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  const h = hashString(key || "unknown");
  const lat = BOUNDS.latMin + 10 + ((h % 1000) / 1000) * (BOUNDS.latMax - BOUNDS.latMin - 16);
  const lon = BOUNDS.lonMin + 8 + (((h >> 3) % 1000) / 1000) * (BOUNDS.lonMax - BOUNDS.lonMin - 16);
  return [lat, lon];
}

function project([lat, lon]) {
  const x = ((lon - BOUNDS.lonMin) / (BOUNDS.lonMax - BOUNDS.lonMin)) * 100;
  const y = 100 - ((lat - BOUNDS.latMin) / (BOUNDS.latMax - BOUNDS.latMin)) * 100;
  return { x: Math.min(94, Math.max(6, x)), y: Math.min(94, Math.max(6, y)) };
}

export default function SalesLocationMap({ rows = [] }) {
  const points = useMemo(() => {
    const total = rows.reduce((sum, r) => sum + (r.totalRevenue || 0), 0) || 1;
    return [...rows]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 8)
      .map((r, i) => {
        const { x, y } = project(coordsFor(r.name));
        return {
          ...r,
          x,
          y,
          pct: Math.round((r.totalRevenue / total) * 100),
          color: CHART_PALETTE[i % CHART_PALETTE.length],
        };
      });
  }, [rows]);

  if (!points.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
        <p className="text-xs text-mist-500 dark:text-mist-300">No location data for this range</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div
        className="relative mx-auto aspect-square w-full max-w-[240px] shrink-0 overflow-hidden rounded-xl2"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(242,112,28,0.35) 1px, transparent 1px)",
          backgroundSize: "12px 12px",
        }}
      >
        <svg viewBox="0 0 200 220" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path
            d="M62,8 C95,0 145,6 168,32 C190,58 196,92 182,122 C170,148 190,170 160,192 C130,214 78,216 50,196 C22,176 8,150 10,118 C12,88 18,62 32,42 C40,30 34,18 62,8 Z"
            className="fill-orange-100 dark:fill-orange-500/10"
          />
        </svg>
        {points.map((p) => (
          <div
            key={p.name}
            title={`${p.name} — ${formatCurrency(p.totalRevenue)} (${p.pct}%)`}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <span
              className="block rounded-full ring-2 ring-white transition-transform group-hover:scale-125 dark:ring-ink-900"
              style={{
                width: 10 + p.pct / 3,
                height: 10 + p.pct / 3,
                backgroundColor: p.color,
              }}
            />
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3">
        {points.map((p) => (
          <div key={p.name} className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium capitalize text-mist-600 dark:text-mist-300">
                {p.name}
              </p>
              <p className="text-sm font-bold text-ink-950 dark:text-white">
                {p.pct}%{" "}
                <span className="text-[11px] font-medium text-mist-500 dark:text-mist-300">
                  {formatCurrency(p.totalRevenue)}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
