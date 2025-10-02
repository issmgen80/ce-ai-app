/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "carexpert-red": "#eb0800",
        "carexpert-black": "#11111a",
        "carexpert-off-white": "#f3f3f4",
      },
    },
  },
  plugins: [],
};
