import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8F9FB",
        foreground: "#111827",
        primary: "#4F46E5",
        "primary-hover": "#4338CA",
      },
    },
  },
  plugins: [],
};
export default config;
