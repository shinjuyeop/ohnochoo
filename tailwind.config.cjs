/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0B0D12",
        surface: "#13161D",
        raised: "#1A1E28",
        brand: "#8B5CF6",
        promote: "#22C55E",
        hold: "#94A3B8",
        release: "#F43F5E",
      },
      fontFamily: { sans: ["Pretendard Variable", "Pretendard", "sans-serif"] },
    },
  },
  plugins: [],
};
