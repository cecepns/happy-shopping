/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e5f1f8',
          100: '#b8d9ec',
          500: '#1682ae',
          600: '#126d92',
          700: '#0e5876',
          800: '#0a4660'
        },
        accent: {
          500: '#f9a825',
          600: '#f09815'
        }
      },
      keyframes: {
        'hero-zoom': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' }
        }
      },
      animation: {
        'hero-zoom': 'hero-zoom 4s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
