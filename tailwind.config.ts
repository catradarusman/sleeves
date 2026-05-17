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
        display: ["13px", { lineHeight: "1.2", letterSpacing: "0.08em" }],
        label:   ["11px", { lineHeight: "1.4" }],
        body:    ["11px", { lineHeight: "1.65" }],
        caption: ["9px",  { lineHeight: "1.3" }],
      },
    },
  },
  plugins: [],
};
export default config;
