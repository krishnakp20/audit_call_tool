/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glass: "0 8px 30px rgba(14, 165, 233, 0.15)"
      },
      colors: {
        neon: {
          blue: "#38bdf8",
          violet: "#a78bfa"
        }
      }
    }
  },
  plugins: []
};
