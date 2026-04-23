import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d4d8e0",
          300: "#aeb5c2",
          400: "#818a9b",
          500: "#616a7d",
          600: "#4c5365",
          700: "#3e4453",
          800: "#353a46",
          900: "#0b0e14",
          950: "#05070b",
        },
        brand: {
          50: "#ecfbf5",
          100: "#d1f5e6",
          200: "#a6ead0",
          300: "#6fd9b5",
          400: "#3dc198",
          500: "#1ea67e",
          600: "#138665",
          700: "#106b53",
          800: "#0f5543",
          900: "#0c4638",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "Helvetica", "Arial", "sans-serif"],
        display: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgba(11,14,20,0.04), 0 8px 24px -12px rgba(11,14,20,0.12)",
        card: "0 1px 2px 0 rgba(11,14,20,0.05), 0 20px 40px -20px rgba(11,14,20,0.25)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(30,166,126,0.18), transparent 60%)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
