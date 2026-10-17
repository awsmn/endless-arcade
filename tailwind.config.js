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
          yellow: '#FFE500',
          pink: '#FF2A85',
          cyan: '#00F0FF',
          purple: '#7928CA',
          lime: '#22E565',
          orange: '#FF5500',
          red: '#FF1E44',
          blue: '#1800FF',
          dark: '#0b0e1b',
          canvas: '#13182b',
          card: '#151b30',
          border: '#202945',
          ink: '#080a12',
          paper: '#f8fafc',
        },
        game: {
          dark: '#0b0e1b',
          card: '#13182b',
          cardHover: '#1c2440',
          border: '#242f52',
          accent: '#FF2A85',
          accentGlow: '#FF5EAE',
          neonCyan: '#00F0FF',
          neonPink: '#FF2A85',
          neonAmber: '#FFE500',
          neonGreen: '#22E565',
        }
      },
      fontFamily: {
        game: ['Outfit', 'system-ui', 'sans-serif'],
        pop: ['Righteous', 'Outfit', 'system-ui', 'sans-serif'],
        bungee: ['Bungee', 'Impact', 'sans-serif'],
      },
      boxShadow: {
        'pop-xs': '1.5px 1.5px 0px #000000',
        'pop-sm': '2.5px 2.5px 0px #000000',
        'pop': '4px 4px 0px #000000',
        'pop-md': '5px 5px 0px #000000',
        'pop-lg': '7px 7px 0px #000000',
        'pop-yellow': '4px 4px 0px #FFE500',
        'pop-pink': '4px 4px 0px #FF2A85',
        'pop-cyan': '4px 4px 0px #00F0FF',
        'pop-lime': '4px 4px 0px #22E565',
        'pop-purple': '4px 4px 0px #7928CA',
        'neon-cyan': '0 0 15px rgba(0, 240, 255, 0.45)',
        'neon-pink': '0 0 15px rgba(255, 42, 133, 0.45)',
        'neon-indigo': '0 0 20px rgba(121, 40, 202, 0.45)',
      }
    },
  },
  plugins: [],
}
