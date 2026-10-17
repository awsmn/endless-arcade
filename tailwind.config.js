/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        game: {
          dark: '#090d16',
          card: '#131b2e',
          cardHover: '#1c2742',
          border: '#243254',
          accent: '#6366f1',
          accentGlow: '#818cf8',
          neonCyan: '#06b6d4',
          neonPink: '#ec4899',
          neonAmber: '#f59e0b',
          neonGreen: '#10b981',
        }
      },
      fontFamily: {
        game: ['Outfit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(6, 182, 212, 0.4)',
        'neon-pink': '0 0 15px rgba(236, 72, 153, 0.4)',
        'neon-indigo': '0 0 20px rgba(99, 102, 241, 0.4)',
      }
    },
  },
  plugins: [],
}
