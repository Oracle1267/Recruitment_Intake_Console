import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#191514",
        field: "#f7f8f4",
        moss: "#116149",
        brass: "#c6a15b",
        signal: "#b11f2a",
        clay: "#7f1720",
        scarlet: "#b11f2a",
        emerald: "#116149",
        pearl: "#ffffff",
      },
      boxShadow: {
        panel: "0 12px 30px rgba(25, 21, 20, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
