/**
 * Fixed lists the Analytics page uses: status display order, funnel stages, radar metrics and
 * location tabs.
 *
 * Used by: pages/AnalyticsPage.jsx
 */

import { DIRECT_INVOICE_STATUS } from "../utils/InvoiceAnalytics";
import { PackageCheck, Truck, ClipboardList, CheckCircle2 } from "lucide-react";

export const ORDER_STATUS_ORDER = [
  "placed",
  "packed",
  "confirmed",
  "shipped",
  "delivered",
  "partial_returned",
  "returned",
  "cancelled",
  DIRECT_INVOICE_STATUS,
];

export const PAYMENT_STATUS_ORDER = [
  "pending",
  "partially_paid",
  "paid",
  "refund_pending",
  "partial_refunded",
  "refunded",
];

// Forward fulfillment pipeline only — cancelled orders never reach it, so
// they're excluded rather than shown as a "stage".
export const FUNNEL_STAGES = [
  { stage: "placed", label: "Placed", icon: ClipboardList },
  { stage: "packed", label: "Packed", icon: PackageCheck },
  { stage: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { stage: "shipped", label: "Shipped", icon: Truck },
  { stage: "delivered", label: "Delivered", icon: CheckCircle2 },
];

export const RADAR_METRICS = ["Units sold", "Revenue", "Orders"];

export const LOCATION_TABS = [
  { key: "salesByCity", label: "City", field: "city" },
  { key: "salesByState", label: "State", field: "state" },
  { key: "salesByCountry", label: "Country", field: "country" },
];
