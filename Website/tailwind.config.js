/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'page':       '#0d1117',
        'surface':    '#161b22',
        'border':     '#21262d',
        'border-em':  '#f8514933',
        'green-em':   '#3fb950',
        'red-em':     '#f85149',
        'amber-em':   '#d29922',
        'blue-em':    '#58a6ff',
        'text-main':  '#e6edf3',
        'text-dim':   '#7d8590',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        'pulse-pill': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.6' },
        },
        'event-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-in': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-pill': 'pulse-pill 1.5s ease-in-out infinite',
        'event-in':   'event-in 200ms ease forwards',
        'toast-in':   'toast-in 200ms ease forwards',
      },
    },
  },
  plugins: [],
};
