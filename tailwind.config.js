/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0D0D0D',
        graphite: '#17181C',
        'graphite-2': '#1F2024',
        'graphite-3': '#2A2B30',
        accent: '#CF3A0B',
        'accent-soft': '#F0572B',
        signal: '#2FAE66',
        caution: '#E3A63E',
        paper: '#F3F1EA',
        muted: '#9A9CA3',
      },
      fontFamily: {
        display: ['"Oswald"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}