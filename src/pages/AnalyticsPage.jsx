/**
 * Analytics dashboard: revenue, orders, statuses, funnel, products and locations for a date range
 * (manual orders + direct invoices).
 *
 * Route: /analytics
 * Used by: routes/AppRoutes.jsx
 * API: InvoiceService.getAllInvoices, ManualOrderService.getAnalytics
 */

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Loader2,
  Inbox,
  RefreshCw,
  IndianRupee,
  ShoppingCart,
  Receipt,
  Users,
  RotateCcw,
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

import { ManualOrderService, InvoiceService } from "../backend/ApiService";
import { fetchAllInvoices } from "../utils/InvoiceCustomers";
import { directInvoicesInRange, mergeInvoiceAnalytics } from "../utils/InvoiceAnalytics";
import { formatCurrency, formatCompactCurrency, initials } from "../utils/Format";
import { getMuiTheme, STATUS_COLORS, CHART_PALETTE, FUNNEL_RAMP } from "../constants/MuiTheme";
import FulfillmentFunnel from "../components/dashboard/FulfillmentFunnel";
import WelcomeBanner from "../components/dashboard/WelcomeBanner";
import RadialTickRing from "../components/dashboard/RadialTickRing";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/UseIsMobile";
import {
  ORDER_STATUS_ORDER,
  PAYMENT_STATUS_ORDER,
  FUNNEL_STAGES,
  RADAR_METRICS,
  LOCATION_TABS,
} from "../constants/AnalyticsConfig";
import { IconStatTile } from "../components/dashboard/IconStatTile";
import { StageTile } from "../components/dashboard/StageTile";
import { ChartCard } from "../components/dashboard/ChartCard";
import { CenterLabelDonut } from "../components/dashboard/CenterLabelDonut";
import { LocationLeaderboard } from "../components/dashboard/LocationLeaderboard";

const labelize = (text) =>
  text ? text.replace(/_/g, " ").replace(/^\w/, (firstLetter) => firstLetter.toUpperCase()) : text;

// ---------- Presentational atoms (Sellix-style: icon badge + big number) ----------

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
    includeInvoices: true,
  });
  const [locationTab, setLocationTab] = useState(LOCATION_TABS[0].key);
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState(null);
  // Every invoice, fetched once and filtered here per date range; the
  // Refresh button refetches them.
  const [allInvoices, setAllInvoices] = useState(null);

  const load = async (refreshInvoices = false) => {
    setLoading(true);
    try {
      const needInvoices = filters.includeInvoices && (refreshInvoices || !allInvoices);
      const [res, invoices] = await Promise.all([
        ManualOrderService.getAnalytics(filters),
        needInvoices ? fetchAllInvoices(InvoiceService.getAllInvoices) : null,
      ]);
      setOrderData(res?.data || null);
      if (invoices) setAllInvoices(invoices);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load analytics");
    } finally {
      setLoading(false);
    }
  };

  // includeInvoices only needs the invoices (fetched once), not the backend.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate, filters.groupBy, filters.includeCancelled]);

  useEffect(() => {
    if (filters.includeInvoices && !allInvoices && orderData) {
      fetchAllInvoices(InvoiceService.getAllInvoices)
        .then(setAllInvoices)
        .catch(() => toast.error("Could not load invoices"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.includeInvoices]);

  // Orders from the backend + invoices made directly on the Invoices page.
  const directInvoices = useMemo(
    () =>
      filters.includeInvoices && allInvoices ? directInvoicesInRange(allInvoices, filters) : [],
    [allInvoices, filters]
  );
  const data = useMemo(
    () => mergeInvoiceAnalytics(orderData, directInvoices, filters.groupBy),
    [orderData, directInvoices, filters.groupBy]
  );
  const summary = data?.summary;

  const trendDataset = useMemo(
    () =>
      (data?.salesTrend || []).map((salesTrendEntry) => ({
        ...salesTrendEntry,
        label:
          filters.groupBy === "month"
            ? new Date(`${salesTrendEntry.date}-01`).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              })
            : new Date(salesTrendEntry.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
              }),
      })),
    [data, filters.groupBy]
  );

  const orderStatusPie = useMemo(() => {
    const rows = data?.ordersByStatus || [];
    const ordered = [...rows].sort(
      (rowA, rowB) =>
        ORDER_STATUS_ORDER.indexOf(rowA.status) - ORDER_STATUS_ORDER.indexOf(rowB.status)
    );
    return ordered.map((statusRow) => ({
      id: statusRow.status,
      value: statusRow.count,
      label: labelize(statusRow.status),
      color: STATUS_COLORS[statusRow.status] || "#F2701C",
    }));
  }, [data]);
  const orderStatusTotal = useMemo(
    () => orderStatusPie.reduce((sum, orderStatusPieEntry) => sum + orderStatusPieEntry.value, 0),
    [orderStatusPie]
  );

  const paymentStatusBars = useMemo(() => {
    const rows = data?.paymentStatusBreakdown || [];
    return [...rows].sort(
      (rowA, rowB) =>
        PAYMENT_STATUS_ORDER.indexOf(rowA.paymentStatus) -
        PAYMENT_STATUS_ORDER.indexOf(rowB.paymentStatus)
    );
  }, [data]);
  const paymentStatusPie = useMemo(
    () =>
      paymentStatusBars.map((paymentStatusBar) => ({
        id: paymentStatusBar.paymentStatus,
        value: paymentStatusBar.count,
        label: labelize(paymentStatusBar.paymentStatus),
        color: STATUS_COLORS[paymentStatusBar.paymentStatus] || "#F2701C",
      })),
    [paymentStatusBars]
  );
  const paymentStatusTotal = useMemo(
    () =>
      paymentStatusPie.reduce((sum, paymentStatusPieEntry) => sum + paymentStatusPieEntry.value, 0),
    [paymentStatusPie]
  );

  const topProducts = useMemo(
    () =>
      [...(data?.topProducts || [])].sort(
        (topProductA, topProductB) => topProductB.totalQuantitySold - topProductA.totalQuantitySold
      ),
    [data]
  );

  // Cumulative "reached at least this stage" counts, computed from current
  // orderStatus snapshots — a delivered (or later) order reached every
  // earlier stage too, so each stage sums itself plus everything after it.
  const funnelStages = useMemo(() => {
    const rows = data?.ordersByStatus || [];
    const countOf = (status) => rows.find((row) => row.status === status)?.count || 0;
    const reachedDelivered =
      countOf("delivered") + countOf("partial_returned") + countOf("returned");
    const raw = {
      placed:
        countOf("placed") +
        countOf("packed") +
        countOf("confirmed") +
        countOf("shipped") +
        reachedDelivered,
      packed: countOf("packed") + countOf("confirmed") + countOf("shipped") + reachedDelivered,
      confirmed: countOf("confirmed") + countOf("shipped") + reachedDelivered,
      shipped: countOf("shipped") + reachedDelivered,
      delivered: reachedDelivered,
    };
    return FUNNEL_STAGES.map((funnelStage, index) => ({
      ...funnelStage,
      count: raw[funnelStage.stage],
      color: FUNNEL_RAMP[index].bg,
      text: FUNNEL_RAMP[index].text,
    }));
  }, [data]);
  const funnelHasData = funnelStages.some((funnelStage) => funnelStage.count > 0);
  const returnedCount = useMemo(() => {
    const rows = data?.ordersByStatus || [];
    const countOf = (status) => rows.find((row) => row.status === status)?.count || 0;
    return countOf("partial_returned") + countOf("returned");
  }, [data]);

  const radarProducts = useMemo(() => [...(data?.topProducts || [])].slice(0, 5), [data]);
  const radarMax = useMemo(
    () => ({
      units: Math.max(1, ...radarProducts.map((radarProduct) => radarProduct.totalQuantitySold)),
      revenue: Math.max(1, ...radarProducts.map((radarProduct) => radarProduct.totalRevenue)),
      orders: Math.max(1, ...radarProducts.map((radarProduct) => radarProduct.totalOrders)),
    }),
    [radarProducts]
  );

  const scatterPoints = useMemo(
    () =>
      (data?.salesTrend || []).map((salesTrendEntry) => ({
        id: salesTrendEntry.date,
        x: salesTrendEntry.totalOrders,
        y: salesTrendEntry.totalRevenue,
      })),
    [data]
  );

  const activeLocationTab = LOCATION_TABS.find(
    (currentLocationTab) => currentLocationTab.key === locationTab
  );
  const locationRows = useMemo(
    () =>
      [...(data?.[locationTab] || [])]
        .sort((entryA, entryB) => entryA.totalRevenue - entryB.totalRevenue)
        .map((entry) => ({ ...entry, name: entry[activeLocationTab.field] })),
    [data, locationTab, activeLocationTab]
  );
  const locationRowsDesc = useMemo(() => [...locationRows].reverse(), [locationRows]);

  const firstName = user?.firstName || (user?.email ? user.email.split("@")[0] : null) || "there";

  const locationTabSwitcher = (
    <ToggleButtonGroup
      size="small"
      value={locationTab}
      exclusive
      onChange={(_, selectedTab) => selectedTab && setLocationTab(selectedTab)}
    >
      {LOCATION_TABS.map((locationTab) => (
        <ToggleButton
          key={locationTab.key}
          value={locationTab.key}
          sx={{ textTransform: "none", px: 1.5, py: 0.25 }}
        >
          {locationTab.label}
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
                onChange={(event) =>
                  setFilters((prevFilters) => ({ ...prevFilters, startDate: event.target.value }))
                }
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
                onChange={(event) =>
                  setFilters((prevFilters) => ({ ...prevFilters, endDate: event.target.value }))
                }
                className="rounded-lg border border-mist-200 bg-white px-2.5 py-1.5 text-xs text-ink-950 outline-none focus:border-orange-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              />
            </div>
            <ToggleButtonGroup
              size="small"
              value={filters.groupBy}
              exclusive
              onChange={(_, groupBy) =>
                groupBy && setFilters((prevFilters) => ({ ...prevFilters, groupBy: groupBy }))
              }
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
                  onChange={(event) =>
                    setFilters((prevFilters) => ({
                      ...prevFilters,
                      includeCancelled: event.target.checked,
                    }))
                  }
                />
              }
              label={
                <span className="text-xs text-mist-700 dark:text-mist-300">Include cancelled</span>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={filters.includeInvoices}
                  onChange={(event) =>
                    setFilters((prevFilters) => ({
                      ...prevFilters,
                      includeInvoices: event.target.checked,
                    }))
                  }
                />
              }
              label={
                <span className="text-xs text-mist-700 dark:text-mist-300">Include invoices</span>
              }
            />
          </div>
          <button
            onClick={() => load(true)}
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
            <p className="text-sm font-medium text-ink-950 dark:text-white">
              No analytics available
            </p>
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
                  sub={
                    summary.directInvoiceCustomers
                      ? `${summary.directInvoiceCustomers} on direct invoices`
                      : undefined
                  }
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
                        valueFormatter: (item) =>
                          `${item.value} order${item.value === 1 ? "" : "s"}`,
                      },
                    ]}
                    height={isMobile ? 172 : 152}
                    hideLegend
                    margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  />
                </CenterLabelDonut>
                <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {orderStatusPie.map((orderStatusPieEntry) => (
                    <div key={orderStatusPieEntry.id} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="h-2 w-2 shrink-0 rounded-sm"
                        style={{ backgroundColor: orderStatusPieEntry.color }}
                      />
                      <span className="truncate text-mist-600 dark:text-mist-300">
                        {orderStatusPieEntry.label}
                      </span>
                      <span className="ml-auto shrink-0 font-semibold text-ink-950 dark:text-white">
                        {orderStatusPieEntry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>

            {/* ---------- SALES DISTRIBUTION (half-donut) + STAGE TILES + REVENUE OVERVIEW ---------- */}
            <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[1fr_1fr_1.6fr]">
              <ChartCard
                title="Sales Distribution"
                subtitle="By payment status"
                empty={paymentStatusPie.length === 0}
              >
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
                  {paymentStatusPie.map((paymentStatusPieEntry) => {
                    const pct = paymentStatusTotal
                      ? Math.round((paymentStatusPieEntry.value / paymentStatusTotal) * 100)
                      : 0;
                    return (
                      <div key={paymentStatusPieEntry.id} className="flex items-start gap-2">
                        <span
                          className="mt-1 h-2 w-2 shrink-0 rounded-sm"
                          style={{ backgroundColor: paymentStatusPieEntry.color }}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[11px] text-mist-500 dark:text-mist-300">
                            {paymentStatusPieEntry.label}
                          </p>
                          <p className="text-sm font-bold text-ink-950 dark:text-white">
                            {pct}%{" "}
                            <span className="text-[11px] font-medium text-mist-500 dark:text-mist-300">
                              {paymentStatusPieEntry.value} order
                              {paymentStatusPieEntry.value === 1 ? "" : "s"}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>

              <div className="grid auto-rows-fr grid-cols-2 gap-3.5 self-stretch">
                {funnelStages.slice(1, 4).map((funnelStage) => (
                  <StageTile
                    key={funnelStage.stage}
                    icon={funnelStage.icon}
                    label={funnelStage.label}
                    value={funnelStage.count}
                  />
                ))}
                <StageTile icon={RotateCcw} label="Returned" value={returnedCount} />
              </div>

              <ChartCard
                title="Revenue Overview"
                subtitle={`Grouped by ${filters.groupBy}`}
                right={
                  <span className="text-xs font-semibold text-mist-500 dark:text-mist-300">
                    {formatCurrency(summary.totalRevenue)}
                  </span>
                }
                empty={trendDataset.length === 0}
              >
                <LineChart
                  dataset={trendDataset}
                  xAxis={[{ scaleType: "point", dataKey: "label" }]}
                  yAxis={[{ valueFormatter: (amount) => formatCompactCurrency(amount) }]}
                  series={[
                    {
                      id: "revenue",
                      dataKey: "totalRevenue",
                      label: "Revenue",
                      color: "url(#revenueGradient)",
                      area: true,
                      showMark: trendDataset.length <= 20,
                      curve: "monotoneX",
                      valueFormatter: (amount) => formatCurrency(amount),
                    },
                  ]}
                  height={isMobile ? 220 : 232}
                  margin={{
                    left: isMobile ? 40 : 60,
                    right: isMobile ? 12 : 28,
                    top: 14,
                    bottom: 28,
                  }}
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
                        valueFormatter: (orderCount) =>
                          `${orderCount} order${orderCount === 1 ? "" : "s"}`,
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
              <ChartCard
                title="Top Products"
                subtitle="By units sold"
                empty={topProducts.length === 0}
                fill
              >
                <div className="flex flex-col divide-y divide-mist-100 dark:divide-white/10">
                  {topProducts.slice(0, 6).map((topProduct) => (
                    <div
                      key={topProduct.productName}
                      className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-xs font-bold text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">
                        {initials(topProduct.productName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-950 dark:text-white">
                          {topProduct.productName}
                        </p>
                        <p className="text-[11px] text-mist-500 dark:text-mist-300">
                          {topProduct.totalOrders} order{topProduct.totalOrders === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-ink-950 dark:text-white">
                          {formatCurrency(topProduct.totalRevenue)}
                        </p>
                        <p className="text-[11px] text-mist-500 dark:text-mist-300">
                          {topProduct.totalQuantitySold} unit
                          {topProduct.totalQuantitySold === 1 ? "" : "s"}
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
                    series={radarProducts.map((radarProduct, index) => ({
                      id: radarProduct.productName,
                      label: radarProduct.productName,
                      data: [
                        radarProduct.totalQuantitySold,
                        radarProduct.totalRevenue,
                        radarProduct.totalOrders,
                      ],
                      color: CHART_PALETTE[index % CHART_PALETTE.length],
                      fillArea: true,
                      valueFormatter: (value, ctx) =>
                        ctx.dataIndex === 1 ? formatCurrency(value) : `${value}`,
                    }))}
                    hideLegend
                  />
                  <div className="mt-2 flex flex-col gap-1.5">
                    {radarProducts.map((radarProduct, index) => (
                      <div
                        key={radarProduct.productName}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: CHART_PALETTE[index % CHART_PALETTE.length] }}
                        />
                        <span className="truncate text-mist-600 dark:text-mist-300">
                          {radarProduct.productName}
                        </span>
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
                    valueFormatter: (point) => `${point.x} orders · ${formatCurrency(point.y)}`,
                  },
                ]}
                xAxis={[{ label: "Orders", min: 0 }]}
                yAxis={[
                  { label: "Revenue", valueFormatter: (amount) => formatCompactCurrency(amount) },
                ]}
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
                  xAxis={[
                    { label: "Revenue", valueFormatter: (amount) => formatCompactCurrency(amount) },
                  ]}
                  series={[
                    {
                      dataKey: "totalRevenue",
                      label: "Revenue",
                      color: CHART_PALETTE[0],
                      valueFormatter: (amount) => formatCurrency(amount),
                    },
                  ]}
                  height={Math.max(190, locationRows.length * (isMobile ? 32 : 38))}
                  margin={{
                    left: isMobile ? 56 : 90,
                    right: isMobile ? 28 : 40,
                    top: 14,
                    bottom: 28,
                  }}
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
