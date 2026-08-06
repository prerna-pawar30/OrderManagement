/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B1220",
          900: "#101A2B",
          800: "#16223A",
          700: "#22314D",
        },
        mist: {
          50: "#F6F8FA",
          100: "#EEF1F5",
          200: "#E1E6ED",
          300: "#C9D1DC",
          500: "#667085",
          700: "#3A4356",
        },
        teal: {
          50: "#EAFAFB",
          100: "#CDF2F4",
          400: "#2FC0CE",
          500: "#0EA5B7",
          600: "#0B8695",
          700: "#0A6C79",
        },
        amber: {
          100: "#FDF0D5",
          400: "#F5A524",
          500: "#DB8E12",
        },
        coral: {
          100: "#FDE7E4",
          400: "#F0654F",
          500: "#DC4A34",
        },
        mint: {
          100: "#E1F8EE",
          400: "#1FB871",
          500: "#12A063",
        },
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(16, 26, 43, 0.06), 0 8px 24px rgba(16, 26, 43, 0.08)",
      },
      borderRadius: {
        xl2: "1.1rem",
      },
    },
  },
  plugins: [],
};
