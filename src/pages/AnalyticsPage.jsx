import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Inbox, RefreshCw } from "lucide-react";
import { ThemeProvider } from "@mui/material/styles";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { RadarChart } from "@mui/x-charts/RadarChart";
import { ScatterChart } from "@mui/x-charts/ScatterChart";

import { ManualOrderService } from "../api/services";
import { formatCurrency, formatCompactCurrency } from "../lib/format";
import { getMuiTheme, STATUS_COLORS, CHART_PALETTE, FUNNEL_RAMP } from "../theme/muiTheme";
import FulfillmentFunnel from "../components/FulfillmentFunnel";
import { useTheme } from "../context/ThemeContext";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 640
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

const ORDER_STATUS_ORDER = [
  "placed",
  "packed",
  "confirmed",
  "shipped",
  "delivered",
  "partial_returned",
  "returned",
  "cancelled",
];

const PAYMENT_STATUS_ORDER = ["pending", "paid", "refund_pending", "partial_refunded", "refunded"];

// Forward fulfillment pipeline only — cancelled orders never reach it, so
// they're excluded rather than shown as a "stage".
const FUNNEL_STAGES = [
  { stage: "placed", label: "Placed" },
  { stage: "packed", label: "Packed" },
  { stage: "confirmed", label: "Confirmed" },
  { stage: "shipped", label: "Shipped" },
  { stage: "delivered", label: "Delivered" },
];

const RADAR_METRICS = ["Units sold", "Revenue", "Orders"];

const LOCATION_TABS = [
  { key: "salesByCity", label: "City", field: "city" },
  { key: "salesByState", label: "State", field: "state" },
  { key: "salesByCountry", label: "Country", field: "country" },
];

const labelize = (v) => (v ? v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : v);

function StatTile({ label, value, sub }) {
  return (
    <div className="rounded-xl2 border border-mist-200 bg-white p-4 shadow-panel dark:border-white/10 dark:bg-ink-900">
      <p className="text-xs font-medium uppercase tracking-wide text-mist-500 dark:text-mist-300">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-bold text-ink-950 dark:text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-mist-500 dark:text-mist-300">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, children, empty }) {
  return (
    <div className="rounded-xl2 border border-mist-200 bg-white p-4 shadow-panel dark:border-white/10 dark:bg-ink-900 sm:p-5">
      <div className="mb-2">
        <h3 className="font-display text-sm font-bold text-ink-950 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-mist-500 dark:text-mist-300">{subtitle}</p>}
      </div>
      {empty ? (
        <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
          <Inbox size={22} className="text-mist-300 dark:text-mist-500" />
          <p className="text-xs text-mist-500 dark:text-mist-300">No data for this range</p>
        </div>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const { theme } = useTheme();
  const muiTheme = useMemo(() => getMuiTheme(theme), [theme]);
  const isMobile = useIsMobile();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const monthAgo = useMemo(
    () => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    []
  );

  const [filters, setFilters] = useState({
    startDate: monthAgo,
    endDate: today,
    groupBy: "day",
    includeCancelled: false,
  });
  const [locationTab, setLocationTab] = useState(LOCATION_TABS[0].key);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await ManualOrderService.getAnalytics(filters);
      setData(res?.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const summary = data?.summary;

  const trendDataset = useMemo(
    () =>
      (data?.salesTrend || []).map((d) => ({
        ...d,
        label:
          filters.groupBy === "month"
            ? new Date(`${d.date}-01`).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              })
            : new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      })),
    [data, filters.groupBy]
  );

  const orderStatusPie = useMemo(() => {
    const rows = data?.ordersByStatus || [];
    const ordered = [...rows].sort(
      (a, b) => ORDER_STATUS_ORDER.indexOf(a.status) - ORDER_STATUS_ORDER.indexOf(b.status)
    );
    return ordered.map((r) => ({
      id: r.status,
      value: r.count,
      label: labelize(r.status),
      color: STATUS_COLORS[r.status] || "#6B6B6B",
    }));
  }, [data]);

  const paymentStatusBars = useMemo(() => {
    const rows = data?.paymentStatusBreakdown || [];
    return [...rows].sort(
      (a, b) =>
        PAYMENT_STATUS_ORDER.indexOf(a.paymentStatus) - PAYMENT_STATUS_ORDER.indexOf(b.paymentStatus)
    );
  }, [data]);

  const topProducts = useMemo(
    () => [...(data?.topProducts || [])].sort((a, b) => a.totalQuantitySold - b.totalQuantitySold),
    [data]
  );

  // Cumulative "reached at least this stage" counts, computed from current
  // orderStatus snapshots — a delivered (or later) order reached every
  // earlier stage too, so each stage sums itself plus everything after it.
  const funnelStages = useMemo(() => {
    const rows = data?.ordersByStatus || [];
    const countOf = (s) => rows.find((r) => r.status === s)?.count || 0;
    const reachedDelivered = countOf("delivered") + countOf("partial_returned") + countOf("returned");
    const raw = {
      placed: countOf("placed") + countOf("packed") + countOf("confirmed") + countOf("shipped") + reachedDelivered,
      packed: countOf("packed") + countOf("confirmed") + countOf("shipped") + reachedDelivered,
      confirmed: countOf("confirmed") + countOf("shipped") + reachedDelivered,
      shipped: countOf("shipped") + reachedDelivered,
      delivered: reachedDelivered,
    };
    return FUNNEL_STAGES.map((s, i) => ({
      ...s,
      count: raw[s.stage],
      color: FUNNEL_RAMP[i].bg,
      text: FUNNEL_RAMP[i].text,
    }));
  }, [data]);
  const funnelHasData = funnelStages.some((s) => s.count > 0);

  const radarProducts = useMemo(() => [...(data?.topProducts || [])].slice(0, 5), [data]);
  const radarMax = useMemo(
    () => ({
      units: Math.max(1, ...radarProducts.map((p) => p.totalQuantitySold)),
      revenue: Math.max(1, ...radarProducts.map((p) => p.totalRevenue)),
      orders: Math.max(1, ...radarProducts.map((p) => p.totalOrders)),
    }),
    [radarProducts]
  );

  const scatterPoints = useMemo(
    () =>
      (data?.salesTrend || []).map((d) => ({
        id: d.date,
        x: d.totalOrders,
        y: d.totalRevenue,
      })),
    [data]
  );

  const activeLocationTab = LOCATION_TABS.find((t) => t.key === locationTab);
  const locationRows = useMemo(
    () =>
      [...(data?.[locationTab] || [])]
        .sort((a, b) => a.totalRevenue - b.totalRevenue)
        .map((r) => ({ ...r, name: r[activeLocationTab.field] })),
    [data, locationTab, activeLocationTab]
  );

  return (
    <ThemeProvider theme={muiTheme}>
      <div className="space-y-5">
        {/* ---------- FILTERS ---------- */}
        <div className="flex flex-col gap-3 rounded-xl2 border border-mist-200 bg-white p-4 shadow-panel dark:border-white/10 dark:bg-ink-900 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-mist-500 dark:text-mist-300">From</label>
              <input
                type="date"
                value={filters.startDate}
                max={filters.endDate}
                onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                className="rounded-lg border border-mist-200 bg-white px-2.5 py-1.5 text-xs text-ink-950 outline-none focus:border-orange-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-mist-500 dark:text-mist-300">To</label>
              <input
                type="date"
                value={filters.endDate}
                min={filters.startDate}
                max={today}
                onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                className="rounded-lg border border-mist-200 bg-white px-2.5 py-1.5 text-xs text-ink-950 outline-none focus:border-orange-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              />
            </div>
            <ToggleButtonGroup
              size="small"
              value={filters.groupBy}
              exclusive
              onChange={(_, v) => v && setFilters((f) => ({ ...f, groupBy: v }))}
            >
              <ToggleButton value="day" sx={{ textTransform: "none", px: 1.5 }}>
                Daily
              </ToggleButton>
              <ToggleButton value="month" sx={{ textTransform: "none", px: 1.5 }}>
                Monthly
              </ToggleButton>
            </ToggleButtonGroup>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.includeCancelled}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, includeCancelled: e.target.checked }))
                  }
                />
              }
              label={<span className="text-xs text-mist-700 dark:text-mist-300">Include cancelled</span>}
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 self-start rounded-lg border border-mist-200 px-3 py-1.5 text-xs font-semibold text-mist-700 hover:bg-mist-50 disabled:opacity-50 dark:border-white/10 dark:text-mist-300 dark:hover:bg-white/5"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center gap-2 rounded-xl2 border border-mist-200 bg-white py-20 text-sm text-mist-500 shadow-panel dark:border-white/10 dark:bg-ink-900 dark:text-mist-300">
            <Loader2 size={16} className="animate-spin" /> Loading analytics…
          </div>
        ) : !data ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl2 border border-mist-200 bg-white py-20 text-center shadow-panel dark:border-white/10 dark:bg-ink-900">
            <Inbox size={28} className="text-mist-300 dark:text-mist-500" />
            <p className="text-sm font-medium text-ink-950 dark:text-white">No analytics available</p>
          </div>
        ) : (
          <>
            {/* ---------- KPI TILES ---------- */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatTile label="Total orders" value={summary.totalOrders.toLocaleString("en-IN")} />
              <StatTile label="Total revenue" value={formatCurrency(summary.totalRevenue)} />
              <StatTile
                label="Avg order value"
                value={formatCurrency(summary.avgOrderValue)}
              />
              <StatTile
                label="Items sold"
                value={summary.totalItemsSold.toLocaleString("en-IN")}
              />
              <StatTile
                label="Unique customers"
                value={summary.totalUniqueCustomers.toLocaleString("en-IN")}
              />
            </div>

            {/* ---------- REVENUE HERO ---------- */}
            <ChartCard
              title="Revenue trend"
              subtitle={`Grouped by ${filters.groupBy}`}
              empty={trendDataset.length === 0}
            >
              <LineChart
                dataset={trendDataset}
                xAxis={[{ scaleType: "point", dataKey: "label" }]}
                yAxis={[{ valueFormatter: (v) => formatCompactCurrency(v) }]}
                series={[
                  {
                    id: "revenue",
                    dataKey: "totalRevenue",
                    label: "Revenue",
                    color: "url(#revenueGradient)",
                    area: true,
                    showMark: trendDataset.length <= 20,
                    curve: "monotoneX",
                    valueFormatter: (v) => formatCurrency(v),
                  },
                ]}
                height={isMobile ? 240 : 320}
                margin={{ left: isMobile ? 40 : 64, right: isMobile ? 12 : 32, top: 16, bottom: 30 }}
                grid={{ horizontal: true }}
                hideLegend
              >
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_PALETTE[0]} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={CHART_PALETTE[0]} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
              </LineChart>
            </ChartCard>

            {/* ---------- ORDERS TREND + FULFILLMENT FUNNEL ---------- */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCard
                title="Orders trend"
                subtitle={`Grouped by ${filters.groupBy}`}
                empty={trendDataset.length === 0}
              >
                <BarChart
                  dataset={trendDataset}
                  xAxis={[{ scaleType: "band", dataKey: "label" }]}
                  series={[
                    {
                      dataKey: "totalOrders",
                      label: "Orders",
                      color: CHART_PALETTE[1],
                      valueFormatter: (v) => `${v} order${v === 1 ? "" : "s"}`,
                    },
                  ]}
                  height={isMobile ? 220 : 280}
                  margin={{ left: isMobile ? 36 : 50, right: 16, top: 16, bottom: 30 }}
                  grid={{ horizontal: true }}
                  hideLegend
                  borderRadius={4}
                />
              </ChartCard>

              <ChartCard
                title="Fulfillment funnel"
                subtitle="Orders that reached at least this stage · excludes cancelled"
                empty={!funnelHasData}
              >
                <FulfillmentFunnel stages={funnelStages} />
              </ChartCard>
            </div>

            {/* ---------- STATUS BREAKDOWNS ---------- */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCard title="Orders by status" empty={orderStatusPie.length === 0}>
                <PieChart
                  series={[
                    {
                      data: orderStatusPie,
                      innerRadius: 55,
                      outerRadius: 100,
                      paddingAngle: 2,
                      cornerRadius: 3,
                      arcLabel: (item) => `${item.value}`,
                      arcLabelMinAngle: 18,
                      valueFormatter: (item) => `${item.value} order${item.value === 1 ? "" : "s"}`,
                    },
                  ]}
                  height={isMobile ? 340 : 280}
                  slotProps={{
                    legend: isMobile
                      ? { direction: "horizontal", position: { vertical: "bottom", horizontal: "center" } }
                      : { direction: "vertical", position: { vertical: "middle", horizontal: "end" } },
                  }}
                  sx={{ "& .MuiChartsArcLabel-root": { fill: "#fff", fontSize: 11, fontWeight: 600 } }}
                />
              </ChartCard>

              <ChartCard title="Payment status" empty={paymentStatusBars.length === 0}>
                <BarChart
                  layout="horizontal"
                  dataset={paymentStatusBars}
                  yAxis={[
                    {
                      scaleType: "band",
                      dataKey: "paymentStatus",
                      valueFormatter: labelize,
                      width: isMobile ? 70 : 110,
                    },
                  ]}
                  xAxis={[{ label: "Orders" }]}
                  series={[
                    {
                      dataKey: "count",
                      label: "Orders",
                      valueFormatter: (v) => `${v} order${v === 1 ? "" : "s"}`,
                      colorGetter: ({ dataIndex }) =>
                        STATUS_COLORS[paymentStatusBars[dataIndex]?.paymentStatus] || "#6B6B6B",
                    },
                  ]}
                  height={280}
                  margin={{ left: isMobile ? 60 : 100, right: 16, top: 16, bottom: 30 }}
                  grid={{ vertical: true }}
                  hideLegend
                  borderRadius={4}
                />
              </ChartCard>
            </div>

            {/* ---------- TOP PRODUCTS ---------- */}
            <ChartCard
              title="Top selling products"
              subtitle="By units sold"
              empty={topProducts.length === 0}
            >
              <BarChart
                layout="horizontal"
                dataset={topProducts}
                yAxis={[{ scaleType: "band", dataKey: "productName", width: isMobile ? 90 : 140 }]}
                xAxis={[{ label: "Units sold" }]}
                series={[
                  {
                    dataKey: "totalQuantitySold",
                    label: "Units sold",
                    color: CHART_PALETTE[0],
                    valueFormatter: (v) => `${v} unit${v === 1 ? "" : "s"}`,
                  },
                ]}
                height={Math.max(200, topProducts.length * (isMobile ? 34 : 42))}
                margin={{ left: isMobile ? 80 : 130, right: 16, top: 16, bottom: 30 }}
                grid={{ vertical: true }}
                hideLegend
                borderRadius={4}
              />
            </ChartCard>

            {/* ---------- PRODUCT PROFILE (RADAR) + REVENUE VS ORDERS (SCATTER) ---------- */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCard
                title="Top product profile"
                subtitle="Units sold, revenue and orders — each on its own scale"
                empty={radarProducts.length === 0}
              >
                <RadarChart
                  height={isMobile ? 260 : 320}
                  radar={{
                    metrics: [
                      { name: RADAR_METRICS[0], max: radarMax.units },
                      { name: RADAR_METRICS[1], max: radarMax.revenue },
                      { name: RADAR_METRICS[2], max: radarMax.orders },
                    ],
                  }}
                  series={radarProducts.map((p, i) => ({
                    id: p.productName,
                    label: p.productName,
                    data: [p.totalQuantitySold, p.totalRevenue, p.totalOrders],
                    color: CHART_PALETTE[i % CHART_PALETTE.length],
                    fillArea: true,
                    valueFormatter: (v, ctx) =>
                      ctx.dataIndex === 1 ? formatCurrency(v) : `${v}`,
                  }))}
                  slotProps={{
                    legend: {
                      direction: "horizontal",
                      position: { vertical: "bottom", horizontal: "center" },
                    },
                  }}
                />
              </ChartCard>

              <ChartCard
                title="Revenue vs. orders"
                subtitle={`Each point is one ${filters.groupBy === "month" ? "month" : "day"} in range`}
                empty={scatterPoints.length === 0}
              >
                <ScatterChart
                  series={[
                    {
                      label: "Daily performance",
                      data: scatterPoints,
                      color: CHART_PALETTE[0],
                      markerSize: 7,
                      valueFormatter: (v) => `${v.x} orders · ${formatCurrency(v.y)}`,
                    },
                  ]}
                  xAxis={[{ label: "Orders", min: 0 }]}
                  yAxis={[{ label: "Revenue", valueFormatter: (v) => formatCompactCurrency(v) }]}
                  height={isMobile ? 260 : 320}
                  margin={{ left: isMobile ? 44 : 64, right: 24, top: 16, bottom: 40 }}
                  grid={{ horizontal: true, vertical: true }}
                  hideLegend
                />
              </ChartCard>
            </div>

            {/* ---------- SALES BY LOCATION ---------- */}
            <ChartCard
              title="Sales by location"
              subtitle="By revenue"
              empty={locationRows.length === 0}
            >
              <div className="mb-3">
                <ToggleButtonGroup
                  size="small"
                  value={locationTab}
                  exclusive
                  onChange={(_, v) => v && setLocationTab(v)}
                >
                  {LOCATION_TABS.map((t) => (
                    <ToggleButton key={t.key} value={t.key} sx={{ textTransform: "none", px: 2 }}>
                      {t.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </div>
              <BarChart
                layout="horizontal"
                dataset={locationRows}
                yAxis={[{ scaleType: "band", dataKey: "name", width: isMobile ? 70 : 110 }]}
                xAxis={[{ label: "Revenue", valueFormatter: (v) => formatCompactCurrency(v) }]}
                series={[
                  {
                    dataKey: "totalRevenue",
                    label: "Revenue",
                    color: CHART_PALETTE[0],
                    valueFormatter: (v) => formatCurrency(v),
                  },
                ]}
                height={Math.max(200, locationRows.length * (isMobile ? 34 : 42))}
                margin={{ left: isMobile ? 60 : 100, right: 16, top: 16, bottom: 30 }}
                grid={{ vertical: true }}
                hideLegend
                borderRadius={4}
              />
            </ChartCard>
          </>
        )}
      </div>
    </ThemeProvider>
  );
}
