/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#308ce8",
        "primary-content": "#ffffff",
        "primary-light": "#eef6fd",
        "background-light": "#f6f7f8",
        "background-dark": "#111921",
        "surface-light": "#ffffff",
        "surface-dark": "#1a242f",
        "text-main": "#111418",
        "text-secondary": "#637588",
        "border-light": "#e5e7eb",
      },
      fontFamily: {
        "display": ["Manrope", "sans-serif"],
        "body": ["Manrope", "sans-serif"],
      },
      borderRadius: {
        "sm": "0.125rem",
        "md": "0.25rem",
        "lg": "0.375rem",
        "xl": "0.5rem",
        "2xl": "0.75rem",
        "3xl": "1rem",
      }
    },
  },
  plugins: [],
}
