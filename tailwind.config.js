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
        pop: {
          yellow: '#F59E0B',
          pink: '#FB7185',
          cyan: '#38BDF8',
          purple: '#8B5CF6',
          lime: '#10B981',
          orange: '#F97316',
          red: '#EF4444',
          blue: '#6366F1',
          dark: '#0B0F19',
          canvas: '#0F1422',
          card: '#161F30',
          border: '#283548',
          ink: '#0A0E17',
          paper: '#F8FAFC',
        },
        game: {
          dark: '#0B0F19',
          card: '#161F30',
          cardHover: '#1E293B',
          border: '#283548',
          accent: '#FB7185',
          accentGlow: '#FDA4AF',
          neonCyan: '#38BDF8',
          neonPink: '#FB7185',
          neonAmber: '#F59E0B',
          neonGreen: '#10B981',
        }
      },
      fontFamily: {
        game: ['Outfit', 'system-ui', 'sans-serif'],
        pop: ['Righteous', 'Outfit', 'system-ui', 'sans-serif'],
        bungee: ['Bungee', 'Impact', 'sans-serif'],
      },
      boxShadow: {
        'pop-xs': '0 1px 2px 0 rgba(0, 0, 0, 0.08), 1px 1px 0 rgba(0, 0, 0, 0.12)',
        'pop-sm': '0 2px 4px -1px rgba(0, 0, 0, 0.12), 2px 2px 0 rgba(0, 0, 0, 0.1)',
        'pop': '0 4px 8px -2px rgba(0, 0, 0, 0.14), 2px 2px 0 rgba(0, 0, 0, 0.08)',
        'pop-md': '0 6px 14px -3px rgba(0, 0, 0, 0.18)',
        'pop-lg': '0 10px 24px -4px rgba(0, 0, 0, 0.22)',
        'pop-yellow': '0 0 16px rgba(245, 158, 11, 0.3)',
        'pop-pink': '0 0 16px rgba(251, 113, 133, 0.3)',
        'pop-cyan': '0 0 16px rgba(56, 189, 248, 0.3)',
        'pop-lime': '0 0 16px rgba(16, 185, 129, 0.3)',
        'pop-purple': '0 0 16px rgba(139, 92, 246, 0.3)',
        'neon-cyan': '0 0 16px rgba(56, 189, 248, 0.35)',
        'neon-pink': '0 0 16px rgba(251, 113, 133, 0.35)',
        'neon-indigo': '0 0 20px rgba(139, 92, 246, 0.35)',
      }
    },
  },
  plugins: [],
}
