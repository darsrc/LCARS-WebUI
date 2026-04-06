/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#FFCC99",
        secondary: "#CC99CC",
        alert: "#CC0000",
      },
    },
  },
  plugins: [],
};
