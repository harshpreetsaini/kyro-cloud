import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        secondary: "var(--color-secondary)",
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        tertiary: "var(--color-tertiary)",
        text: "var(--color-text)",
        muted: "var(--color-muted)",
        danger: "var(--color-danger)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "12px",
        xl: "20px",
        "2xl": "26px",
        "3xl": "34px",
      },
      boxShadow: {
        clay: "inset 2px 2px 6px rgba(255,255,255,0.06), inset -3px -3px 8px rgba(0,0,0,0.45), 0 14px 30px -10px rgba(0,0,0,0.55)",
        "clay-sm": "inset 1px 1px 3px rgba(255,255,255,0.05), inset -2px -2px 5px rgba(0,0,0,0.4), 0 8px 18px -8px rgba(0,0,0,0.55)",
        "clay-inset": "inset 2px 2px 5px rgba(0,0,0,0.5), inset -1px -1px 3px rgba(255,255,255,0.04)",
        "glow-primary": "0 0 18px rgba(148,204,255,0.30)",
        "glow-secondary": "0 0 18px rgba(255,184,112,0.30)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
