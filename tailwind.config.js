/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#111111",
          900: "#1A1A1A",
          800: "#242424",
          700: "#3D3D3D",
        },
        mist: {
          50: "#F7F7F7",
          100: "#EFEFEF",
          200: "#E0E0E0",
          300: "#C7C7C7",
          500: "#6B6B6B",
          700: "#3F3F3F",
        },
        orange: {
          50: "#FFF4EA",
          100: "#FFE3C7",
          200: "#FFC79A",
          300: "#FFA35E",
          400: "#FA9143",
          500: "#F2701C",
          600: "#D8590E",
          700: "#B14708",
          800: "#8A3608",
          900: "#5C2405",
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
