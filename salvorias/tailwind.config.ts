import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#06080F",
          900: "#06080F",
          800: "#0A0E1A",
          700: "#0F1421",
          600: "#181F35",
          500: "#252D44",
        },
        bullion: {
          50: "#FBEFCF",
          100: "#F4DDA0",
          200: "#EBC777",
          300: "#DBB263",
          400: "#D4A752",
          500: "#B98A3D",
          600: "#8C682E",
          700: "#5C4421",
          800: "#3D2E14",
          900: "#241B0C",
        },
        cream: {
          DEFAULT: "#F4F1E8",
          muted: "#C8C4B7",
          dim: "#7E8093",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
