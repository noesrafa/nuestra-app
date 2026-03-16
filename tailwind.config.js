/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        surface: "var(--color-surface)",
        background: "var(--color-background)",
        accent: "var(--color-accent)",
        "accent-light": "var(--color-accent-light)",
        primary: "var(--color-text)",
        secondary: "var(--color-text-secondary)",
        "border-default": "var(--color-border)",
        "gradient-start": "var(--color-gradient-start)",
        "gradient-end": "var(--color-gradient-end)",
        danger: "#EF4444",
        "warning-bg": "#FEF3C7",
        "warning-text": "#92400E",
        "error-bg": "#FEE2E2",
        "error-text": "#991B1B",
      },
    },
  },
  plugins: [],
};
