import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // src klasörü ihtimaline karşı
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#800020', // Bordo
          dark: '#4a0012',
          light: '#a31534',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
export default config;