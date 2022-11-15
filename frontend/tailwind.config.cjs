/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './public/index.html',
    './src/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
    './src/pages/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    'bg-red-400',
    'bg-orange-400',
    'bg-amber-400',
    'bg-lime-400',
    'bg-cyan-400',
    'bg-indigo-400'
  ]
}
