import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/templates/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "480px",
      },
      colors: {
        navy: "#0d1f4a",
        navy2: "#091228",
        blue: {
          DEFAULT: "#1a6fd4",
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          500: "#1a6fd4",
          600: "#155cb4",
          700: "#114994",
        },
        cyan: {
          DEFAULT: "#00c8e8",
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          400: "#00c8e8",
          500: "#00b2ce",
        },
        hexacore: {
          navy: "#0d1f4a",
          navy2: "#091228",
          blue: "#1a6fd4",
          cyan: "#00c8e8",
          text: "#1e293b",
          muted: "#64748b",
          light: "#f8fafc",
          border: "#e2e8f0",
          card: "#ffffff",
          white: "#ffffff",
          accent: "#1a6fd4",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta-sans)", "Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "brand-grad": "linear-gradient(135deg, #00c8e8 0%, #1a6fd4 100%)",
        "grid-pattern": "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
