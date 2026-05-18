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
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "rgba(255,255,255,0.92)",
        secondary: "rgba(255,255,255,0.55)",
        meta: "rgba(255,255,255,0.38)",
      },
      fontFamily: {
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      fontSize: {
        display: ["20px", { lineHeight: "1.3", fontWeight: "500" }],
        label:   ["13px", { lineHeight: "1.4", fontWeight: "500" }],
        body:    ["14px", { lineHeight: "1.6", fontWeight: "400" }],
        caption: ["11px", { lineHeight: "1.4", fontWeight: "400" }],
      },
    },
  },
  plugins: [],
};
export default config;
