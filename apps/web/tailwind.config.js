/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f5ff",
          100: "#e6ecff",
          500: "#4f5eff",
          600: "#3c4ae6",
          700: "#2f3ab8",
        },
      },
    },
  },
  plugins: [],
};
