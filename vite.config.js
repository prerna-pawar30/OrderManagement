import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  optimizeDeps: {
    // Force every @mui/x-charts subpath used by AnalyticsPage.jsx into the
    // initial dependency pre-bundle. Without this, Vite's scanner can miss
    // a subpath that's only reached via a client-side route (rather than
    // the index.html entry chain), discover it lazily on first navigation,
    // and trigger a mid-session re-optimize + full reload. Chart pieces
    // that were already mounted from the old pre-bundle then reference a
    // different module instance of the chart context than the ones loaded
    // after the reload, which throws "Could not find the Charts context".
    include: [
      "@mui/material/styles",
      "@mui/material/ToggleButton",
      "@mui/material/ToggleButtonGroup",
      "@mui/material/FormControlLabel",
      "@mui/material/Switch",
      "@mui/x-charts/BarChart",
      "@mui/x-charts/LineChart",
      "@mui/x-charts/PieChart",
      "@mui/x-charts/RadarChart",
      "@mui/x-charts/ScatterChart",
    ],
  },
});
