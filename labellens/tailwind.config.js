/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7f3",
          100: "#dcf0e4",
          200: "#bbe0cc",
          300: "#8ec9ad",
          400: "#5ca98b",
          500: "#388c6e",
          600: "#277157",
          700: "#1d6b4a", // Primary brand green
          800: "#194a36",
          900: "#153d2d",
          950: "#0b2219",
        },
        regulatory: {
          pass: "#1d6b4a",
          review: "#d97706",
          fail: "#e11d48",
          neutral: "#475569",
        }
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
