/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgDark: "#0a0b10",
        cardDark: "#141622",
        neonGreen: "#4dff91",
        neonBlue: "#3d7eff",
        neonPink: "#ff38a4",
        textDim: "#8b8ea8",
      },
      boxShadow: {
        neon: "0 0 20px rgba(77,255,145,0.4)",
        neonBlue: "0 0 20px rgba(61,126,255,0.4)",
        neonPink: "0 0 20px rgba(255,56,164,0.4)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
