import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'media', // <--- BU SATIRI EKLE (Sisteme göre otomatik)
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#800020', 
          dark: '#4a0012',
          light: '#a31534',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;