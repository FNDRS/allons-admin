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
        // Allons palette (mirrors constants/colors.ts in allons-mobile)
        background: "#131516",
        surface: "#1A1C1E",
        surfaceMuted: "#222226",
        primary: {
          DEFAULT: "#F67010", // Liquid Lava
          soft: "rgba(246,112,16,0.16)",
        },
        success: "#34B013",
        warning: "#FFBE0B",
        danger: "#CE0F0F",
        info: "#3A86FF",
        violet: "#8338EC",
        muted: {
          DEFAULT: "rgba(255,255,255,0.6)",
          strong: "rgba(255,255,255,0.85)",
          weak: "rgba(255,255,255,0.4)",
        },
      },
      fontFamily: {
        sans: ["var(--font-urbanist)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
