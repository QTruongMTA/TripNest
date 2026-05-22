import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#ecfdf5", 100: "#ccfbf1", 500: "#0f766e", 600: "#115e59", 700: "#0f3f3b", 900: "#102420" },
        accent: "#fbbf24",
        sidebar: "#0f3f3b",
      },
    },
  },
  plugins: [],
};
export default config;
