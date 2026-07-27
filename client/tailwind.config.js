/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { bank: { 50: '#eef8f6', 600: '#087f6b', 700: '#076657', 900: '#123b35' } },
      boxShadow: { card: '0 8px 30px rgba(15, 23, 42, 0.06)' },
    },
  },
  plugins: [],
};
