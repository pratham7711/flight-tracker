/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#050810',
          800: '#0a0f1e',
          700: '#0f1729',
          600: '#141f35',
        },
        accent: {
          blue: '#3b82f6',
          cyan: '#06b6d4',
          glow: '#60a5fa',
        }
      },
      boxShadow: {
        'glow': '0 0 20px rgba(96, 165, 250, 0.3)',
        'glow-sm': '0 0 10px rgba(96, 165, 250, 0.2)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
