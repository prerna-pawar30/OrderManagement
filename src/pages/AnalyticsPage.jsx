import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Loader2,
  Inbox,
  RefreshCw,
  MoreHorizontal,
  IndianRupee,
  ShoppingCart,
  Receipt,
  Users,
  PackageCheck,
  Truck,
  ClipboardList,
  CheckCircle2,
  RotateCcw,
  MapPin,
  XCircle,
} from "lucide-react";
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
import { formatCurrency, formatCompactCurrency, initials } from "../lib/format";
import { getMuiTheme, STATUS_COLORS, CHART_PALETTE, FUNNEL_RAMP } from "../theme/muiTheme";
import FulfillmentFunnel from "../components/FulfillmentFunnel";
import WelcomeBanner from "../components/WelcomeBanner";
import RadialTickRing from "../components/RadialTickRing";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

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

const STATUS_ICONS = {
  placed: ClipboardList,
  packed: PackageCheck,
  confirmed: CheckCircle2,
  shipped: Truck,
  delivered: PackageCheck,
  partial_returned: RotateCcw,
  returned: RotateCcw,
  cancelled: XCircle,
};

// Forward fulfillment pipeline only — cancelled orders never reach it, so
// they're excluded rather than shown as a "stage".
const FUNNEL_STAGES = [
  { stage: "placed", label: "Placed", icon: ClipboardList },
  { stage: "packed", label: "Packed", icon: PackageCheck },
  { stage: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { stage: "shipped", label: "Shipped", icon: Truck },
  { stage: "delivered", label: "Delivered", icon: CheckCircle2 },
];

const RADAR_METRICS = ["Units sold", "Revenue", "Orders"];

const LOCATION_TABS = [
  { key: "salesByCity", label: "City", field: "city" },
  { key: "salesByState", label: "State", field: "state" },
  { key: "salesByCountry", label: "Country", field: "country" },
];

const labelize = (v) => (v ? v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : v);

// ---------- Presentational atoms (Sellix-style: icon badge + big number) ----------

function IconStatTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl2 border border-mist-200 bg-white p-5 shadow-panel dark:border-white/10 dark:bg-ink-900">
      {/* Oversized watermark icon — turns the extra height (needed to match
          the donut card next to it) into a deliberate design flourish
          instead of dead whitespace. */}
      {Icon && (
        <Icon
          size={112}
          strokeWidth={1.3}
          className="pointer-events-none absolute -bottom-6 -right-6 text-orange-500/[0.07] dark:text-orange-400/[0.09]"
        />
      )}

      {/* Icon badge on its own row so the label below always has full card
          width to wrap into — prevents "TOTAL REVENUE" / "UNIQUE CUSTOMERS"
          from clipping against the card edge in a 4-up grid. */}
      <div className="relative flex items-start justify-between gap-2">
        {Icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
            <Icon size={22} />
          </span>
        )}
      </div>

      <p
        title={label}
        className="relative mt-3 line-clamp-2 min-h-[2.2em] text-[11px] font-semibold uppercase leading-tight tracking-normal text-mist-500 dark:text-mist-300"
      >
        {label}
      </p>

      <div className="relative mt-2">
        <p className="font-display text-3xl font-bold leading-none text-ink-950 dark:text-white">
          {value}
        </p>
        {sub && <p className="mt-2 text-xs text-mist-500 dark:text-mist-300">{sub}</p>}
      </div>
    </div>
  );
}

function StageTile({ icon: Icon, label, value }) {
  return (
    <div className="flex h-full flex-col justify-between gap-3 rounded-xl2 border border-mist-200 bg-white p-4 shadow-panel dark:border-white/10 dark:bg-ink-900">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-xl font-bold leading-tight text-ink-950 dark:text-white">
          {value.toLocaleString("en-IN")}
        </p>
        <p className="truncate text-xs font-medium text-mist-500 dark:text-mist-300">{label}</p>
      </div>
    </div>
  );
}

// `fill`: stretch this card to match a taller sibling in the same grid row
// (row must NOT use items-start) and let its content grow to fill that
// height, instead of leaving dead space at the bottom.
function ChartCard({ title, subtitle, right, children, empty, className = "", fill = false }) {
  return (
    <div
      className={`rounded-xl2 border border-mist-200 bg-white p-3.5 shadow-panel dark:border-white/10 dark:bg-ink-900 sm:p-4 ${
        fill ? "flex h-full flex-col" : ""
      } ${className}`}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold text-ink-950 dark:text-white">{title}</h3>
          {subtitle && <p className="text-[11px] text-mist-500 dark:text-mist-300">{subtitle}</p>}
        </div>
        {right || <MoreHorizontal size={16} className="shrink-0 text-mist-400 dark:text-mist-500" />}
      </div>
      {empty ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <Inbox size={20} className="text-mist-300 dark:text-mist-500" />
          <p className="text-xs text-mist-500 dark:text-mist-300">No data for this range</p>
        </div>
      ) : (
        <div className={`overflow-x-auto ${fill ? "flex flex-1 flex-col justify-center" : ""}`}>
          {children}
        </div>
      )}
    </div>
  );
}

// Donut with a real total centered inside the ring, Sellix-style.
function CenterLabelDonut({ height, centerValue, centerLabel, children }) {
  return (
    <div className="relative" style={{ height }}>
      {children}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <p className="font-display text-lg font-bold text-ink-950 dark:text-white">{centerValue}</p>
        <p className="text-[10px] font-medium text-mist-500 dark:text-mist-300">{centerLabel}</p>
      </div>
    </div>
  );
}

// Sellix "Visitors"-style leaderboard: name + share bar + percentage, no
// map/geo dependency, so it never degrades into an empty/odd shape when
// there are only a couple of locations in range.
function LocationLeaderboard({ rows, unitLabel }) {
  const total = rows.reduce((sum, r) => sum + r.totalRevenue, 0) || 1;
  const ranked = [...rows].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 6);

  return (
    <div className="flex flex-col gap-3">
      {ranked.map((r, i) => {
        const pct = Math.round((r.totalRevenue / total) * 100);
        return (
          <div key={r.name} className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[11px] font-bold text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold text-ink-950 dark:text-white">{r.name}</p>
                <p className="shrink-0 text-xs font-bold text-orange-600 dark:text-orange-400">{pct}%</p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-mist-100 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-orange-500"
                  style={{ width: `${Math.max(pct, 3)}%` }}
                />
              </div>
            </div>
            <p className="w-16 shrink-0 text-right text-[11px] text-mist-500 dark:text-mist-300">
              {formatCompactCurrency(r.totalRevenue)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
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
      color: STATUS_COLORS[r.status] || "#F2701C",
    }));
  }, [data]);
  const orderStatusTotal = useMemo(
    () => orderStatusPie.reduce((sum, r) => sum + r.value, 0),
    [orderStatusPie]
  );

  const paymentStatusBars = useMemo(() => {
    const rows = data?.paymentStatusBreakdown || [];
    return [...rows].sort(
      (a, b) =>
        PAYMENT_STATUS_ORDER.indexOf(a.paymentStatus) - PAYMENT_STATUS_ORDER.indexOf(b.paymentStatus)
    );
  }, [data]);
  const paymentStatusPie = useMemo(
    () =>
      paymentStatusBars.map((r) => ({
        id: r.paymentStatus,
        value: r.count,
        label: labelize(r.paymentStatus),
        color: STATUS_COLORS[r.paymentStatus] || "#F2701C",
      })),
    [paymentStatusBars]
  );
  const paymentStatusTotal = useMemo(
    () => paymentStatusPie.reduce((sum, r) => sum + r.value, 0),
    [paymentStatusPie]
  );

  const topProducts = useMemo(
    () => [...(data?.topProducts || [])].sort((a, b) => b.totalQuantitySold - a.totalQuantitySold),
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
  const returnedCount = useMemo(() => {
    const rows = data?.ordersByStatus || [];
    const countOf = (s) => rows.find((r) => r.status === s)?.count || 0;
    return countOf("partial_returned") + countOf("returned");
  }, [data]);

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
  const locationRowsDesc = useMemo(() => [...locationRows].reverse(), [locationRows]);

  const firstName =
    user?.firstName || (user?.email ? user.email.split("@")[0] : null) || "there";

  const locationTabSwitcher = (
    <ToggleButtonGroup
      size="small"
      value={locationTab}
      exclusive
      onChange={(_, v) => v && setLocationTab(v)}
    >
      {LOCATION_TABS.map((t) => (
        <ToggleButton key={t.key} value={t.key} sx={{ textTransform: "none", px: 1.5, py: 0.25 }}>
          {t.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );

  return (
    <ThemeProvider theme={muiTheme}>
      <div className="space-y-4">
        {/* ---------- WELCOME BANNER ---------- */}
        <WelcomeBanner name={firstName} subtitle="Welcome back — let's do the best today!" />

        {/* ---------- FILTERS ---------- */}
        <div className="flex flex-col gap-3 rounded-xl2 border border-mist-200 bg-white p-3.5 shadow-panel dark:border-white/10 dark:bg-ink-900 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
            {/* ---------- HERO: KPI TILES + ORDERS-BY-STATUS DONUT ---------- */}
            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.7fr_1fr] lg:items-stretch">
              <div className="grid h-full grid-cols-2 gap-3 sm:grid-cols-4">
                <IconStatTile
                  icon={IndianRupee}
                  label="Total revenue"
                  value={formatCurrency(summary.totalRevenue)}
                />
                <IconStatTile
                  icon={ShoppingCart}
                  label="Total orders"
                  value={summary.totalOrders.toLocaleString("en-IN")}
                  sub={`${formatCurrency(summary.avgOrderValue)} avg`}
                />
                <IconStatTile
                  icon={Receipt}
                  label="Items sold"
                  value={summary.totalItemsSold.toLocaleString("en-IN")}
                />
                <IconStatTile
                  icon={Users}
                  label="Unique customers"
                  value={summary.totalUniqueCustomers.toLocaleString("en-IN")}
                />
              </div>

              <ChartCard title="Orders by Status" empty={orderStatusPie.length === 0}>
                <CenterLabelDonut
                  height={isMobile ? 172 : 152}
                  centerValue={orderStatusTotal.toLocaleString("en-IN")}
                  centerLabel="Total Orders"
                >
                  <PieChart
                    series={[
                      {
                        data: orderStatusPie,
                        innerRadius: "68%",
                        outerRadius: "100%",
                        paddingAngle: 2,
                        cornerRadius: 3,
                        valueFormatter: (item) => `${item.value} order${item.value === 1 ? "" : "s"}`,
                      },
                    ]}
                    height={isMobile ? 172 : 152}
                    hideLegend
                    margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  />
                </CenterLabelDonut>
                <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {orderStatusPie.map((r) => (
                    <div key={r.id} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="h-2 w-2 shrink-0 rounded-sm"
                        style={{ backgroundColor: r.color }}
                      />
                      <span className="truncate text-mist-600 dark:text-mist-300">{r.label}</span>
                      <span className="ml-auto shrink-0 font-semibold text-ink-950 dark:text-white">
                        {r.value}
                      </span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>

            {/* ---------- SALES DISTRIBUTION (half-donut) + STAGE TILES + REVENUE OVERVIEW ---------- */}
            <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[1fr_1fr_1.6fr]">
              <ChartCard title="Sales Distribution" subtitle="By payment status" empty={paymentStatusPie.length === 0}>
                <div className="flex justify-center">
                  <RadialTickRing
                    rows={paymentStatusPie}
                    total={paymentStatusTotal}
                    centerValue={paymentStatusTotal.toLocaleString("en-IN")}
                    centerLabel="Total Orders"
                    size={isMobile ? 148 : 128}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
                  {paymentStatusPie.map((r) => {
                    const pct = paymentStatusTotal ? Math.round((r.value / paymentStatusTotal) * 100) : 0;
                    return (
                      <div key={r.id} className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: r.color }} />
                        <div className="min-w-0">
                          <p className="truncate text-[11px] text-mist-500 dark:text-mist-300">{r.label}</p>
                          <p className="text-sm font-bold text-ink-950 dark:text-white">
                            {pct}%{" "}
                            <span className="text-[11px] font-medium text-mist-500 dark:text-mist-300">
                              {r.value} order{r.value === 1 ? "" : "s"}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>

              <div className="grid auto-rows-fr grid-cols-2 gap-3.5 self-stretch">
                {funnelStages.slice(1, 4).map((s) => (
                  <StageTile key={s.stage} icon={s.icon} label={s.label} value={s.count} />
                ))}
                <StageTile icon={RotateCcw} label="Returned" value={returnedCount} />
              </div>

              <ChartCard
                title="Revenue Overview"
                subtitle={`Grouped by ${filters.groupBy}`}
                right={<span className="text-xs font-semibold text-mist-500 dark:text-mist-300">{formatCurrency(summary.totalRevenue)}</span>}
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
                  height={isMobile ? 220 : 232}
                  margin={{ left: isMobile ? 40 : 60, right: isMobile ? 12 : 28, top: 14, bottom: 28 }}
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
            </div>

            {/* ---------- ORDERS TREND + FULFILLMENT FUNNEL (same height) ---------- */}
            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
              <ChartCard
                title="Orders trend"
                subtitle={`Grouped by ${filters.groupBy}`}
                empty={trendDataset.length === 0}
                fill
              >
                <div className="h-full min-h-[220px]">
                  <BarChart
                    dataset={trendDataset}
                    xAxis={[{ scaleType: "band", dataKey: "label" }]}
                    series={[
                      {
                        dataKey: "totalOrders",
                        label: "Orders",
                        color: CHART_PALETTE[0],
                        valueFormatter: (v) => `${v} order${v === 1 ? "" : "s"}`,
                      },
                    ]}
                    margin={{ left: isMobile ? 32 : 46, right: 14, top: 14, bottom: 28 }}
                    grid={{ horizontal: true }}
                    hideLegend
                    borderRadius={6}
                  />
                </div>
              </ChartCard>

              <ChartCard
                title="Fulfillment funnel"
                subtitle="Orders that reached at least this stage · excludes cancelled"
                empty={!funnelHasData}
                fill
              >
                <FulfillmentFunnel stages={funnelStages} />
              </ChartCard>
            </div>

            {/* ---------- TOP PRODUCTS (list, Sellix-style) + PRODUCT PROFILE RADAR (same height) ---------- */}
            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
              <ChartCard title="Top Products" subtitle="By units sold" empty={topProducts.length === 0} fill>
                <div className="flex flex-col divide-y divide-mist-100 dark:divide-white/10">
                  {topProducts.slice(0, 6).map((p) => (
                    <div key={p.productName} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-xs font-bold text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">
                        {initials(p.productName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-950 dark:text-white">
                          {p.productName}
                        </p>
                        <p className="text-[11px] text-mist-500 dark:text-mist-300">
                          {p.totalOrders} order{p.totalOrders === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-ink-950 dark:text-white">
                          {formatCurrency(p.totalRevenue)}
                        </p>
                        <p className="text-[11px] text-mist-500 dark:text-mist-300">
                          {p.totalQuantitySold} unit{p.totalQuantitySold === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard
                title="Top product profile"
                subtitle="Units sold, revenue and orders — each on its own scale"
                empty={radarProducts.length === 0}
                fill
              >
                <div>
                  <RadarChart
                    height={isMobile ? 220 : 260}
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
                    hideLegend
                  />
                  <div className="mt-2 flex flex-col gap-1.5">
                    {radarProducts.map((p, i) => (
                      <div key={p.productName} className="flex items-center gap-2 text-xs">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] }}
                        />
                        <span className="truncate text-mist-600 dark:text-mist-300">{p.productName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            </div>

            {/* ---------- REVENUE VS. ORDERS (SCATTER) ---------- */}
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
                height={isMobile ? 230 : 260}
                margin={{ left: isMobile ? 44 : 62, right: 20, top: 14, bottom: 36 }}
                grid={{ horizontal: true, vertical: true }}
                hideLegend
              />
            </ChartCard>

            {/* ---------- SALES BY LOCATION (same height) ---------- */}
            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
              <ChartCard
                title="Sales by location"
                subtitle={`Where orders are coming from · by ${activeLocationTab.label.toLowerCase()}`}
                right={locationTabSwitcher}
                empty={locationRows.length === 0}
                fill
              >
                <LocationLeaderboard rows={locationRowsDesc} />
              </ChartCard>

              <ChartCard
                title="Revenue by location"
                subtitle="By revenue"
                empty={locationRows.length === 0}
                fill
              >
                <BarChart
                  layout="horizontal"
                  dataset={locationRows}
                  yAxis={[{ scaleType: "band", dataKey: "name", width: isMobile ? 66 : 96 }]}
                  xAxis={[{ label: "Revenue", valueFormatter: (v) => formatCompactCurrency(v) }]}
                  series={[
                    {
                      dataKey: "totalRevenue",
                      label: "Revenue",
                      color: CHART_PALETTE[0],
                      valueFormatter: (v) => formatCurrency(v),
                    },
                  ]}
                  height={Math.max(190, locationRows.length * (isMobile ? 32 : 38))}
                  margin={{ left: isMobile ? 56 : 90, right: isMobile ? 28 : 40, top: 14, bottom: 28 }}
                  grid={{ vertical: true }}
                  hideLegend
                  borderRadius={4}
                />
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </ThemeProvider>
  );
}