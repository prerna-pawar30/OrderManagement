import { createTheme } from "@mui/material/styles";

// Mirrors tailwind.config.js so MUI X Charts / form controls on the
// Analytics page sit on the same palette as the rest of the (Tailwind) app.
const muiTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0EA5B7", light: "#2FC0CE", dark: "#0A6C79", contrastText: "#fff" },
    text: { primary: "#0B1220", secondary: "#667085" },
    divider: "#E1E6ED",
    background: { paper: "#FFFFFF", default: "#F6F8FA" },
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

export default muiTheme;

// Fixed categorical hue order — shared with StatusBadge.jsx so a status
// means the same color everywhere in the app. Never reassign per-filter.
export const STATUS_COLORS = {
  placed: "#667085",
  packed: "#0EA5B7",
  confirmed: "#0EA5B7",
  shipped: "#2FC0CE",
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

export const CHART_PALETTE = ["#0EA5B7", "#DB8E12", "#DC4A34", "#12A063", "#2FC0CE", "#3A4356"];
