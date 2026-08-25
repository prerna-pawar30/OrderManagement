import { createTheme } from "@mui/material/styles";

// Mirrors tailwind.config.js so MUI X Charts / form controls on the
// Analytics page sit on the same palette as the rest of the (Tailwind) app.
export function getMuiTheme(mode = "light") {
  const dark = mode === "dark";
  return createTheme({
    palette: {
      mode,
      primary: { main: "#F2701C", light: "#FA9143", dark: "#B14708", contrastText: "#fff" },
      text: {
        primary: dark ? "#FFFFFF" : "#111111",
        secondary: dark ? "#C7C7C7" : "#6B6B6B",
      },
      divider: dark ? "rgba(255,255,255,0.1)" : "#E0E0E0",
      background: {
        paper: dark ? "#1A1A1A" : "#FFFFFF",
        default: dark ? "#111111" : "#F7F7F7",
      },
    },
    typography: {
      fontFamily: "Inter, sans-serif",
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
        },
      },
      MuiButtonBase: {
        defaultProps: { disableRipple: true },
      },
    },
  });
}

export default getMuiTheme("light");

// Fixed categorical hue order — shared with StatusBadge.jsx so a status
// means the same color everywhere in the app. Never reassign per-filter.
export const STATUS_COLORS = {
  placed: "#FFD9B3",
  packed: "#FA9143",
  confirmed: "#F2701C",
  shipped: "#DB8E12",
  delivered: "#B14708",
  cancelled: "#5C2405",
  partial_returned: "#DB8E12",
  returned: "#DB8E12",
  pending: "#DB8E12",
  paid: "#B14708",
  refunded: "#5C2405",
  refund_pending: "#DB8E12",
  partial_refunded: "#DB8E12",
};

export const CHART_PALETTE = ["#F2701C", "#FA9143", "#DB8E12", "#B14708", "#FFC79A", "#5C2405"];

// Sequential orange ramp, light -> dark, one hue only (magnitude, not identity) —
// used by the fulfillment funnel where each stop represents a smaller slice
// of the same "how many orders got this far" measure.
export const FUNNEL_RAMP = [
  { bg: "#FFE3C7", text: "dark" },
  { bg: "#FCC48A", text: "dark" },
  { bg: "#FA9143", text: "dark" },
  { bg: "#F2701C", text: "light" },
  { bg: "#B14708", text: "light" },
];
