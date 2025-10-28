/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        neon: {
          green: "#39FF14",
          purple: "#9D4EDD",
          blue: "#00E5FF"
        }
      }
    }
  },
  plugins: []
}
