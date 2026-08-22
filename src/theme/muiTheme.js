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
  placed: "#6B6B6B",
  packed: "#F2701C",
  confirmed: "#F2701C",
  shipped: "#FA9143",
  delivered: "#12A063",
  cancelled: "#DC4A34",
  partial_returned: "#DB8E12",
  returned: "#DB8E12",
  pending: "#DB8E12",
  paid: "#12A063",
  refunded: "#DC4A34",
  refund_pending: "#DB8E12",
  partial_refunded: "#DB8E12",
};

export const CHART_PALETTE = ["#F2701C", "#DB8E12", "#DC4A34", "#12A063", "#FA9143", "#3D3D3D"];

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
