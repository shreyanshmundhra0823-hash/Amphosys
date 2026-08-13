/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fbeaec',
          100: '#f4c9cf',
          200: '#e79aa5',
          300: '#d66475',
          400: '#b8384c',
          500: '#921d31',
          600: '#7a1229',
          700: '#620e21',
          800: '#4a0a19',
          900: '#330711'
        },
        paper: '#faf9f7',
        ink: '#1c1a19'
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
}
