import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        agro: {
          green: '#166534',
          light: '#22c55e',
          dark: '#14532d',
          accent: '#4ade80',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  safelist: [
    // Cores do Kanban — headers (garantidas em produção)
    'bg-blue-300', 'bg-yellow-300', 'bg-orange-300', 'bg-purple-300',
    'bg-sky-300', 'bg-green-400', 'bg-rose-300', 'bg-red-300', 'bg-slate-300',
    // Cores de fundo das colunas
    'bg-blue-100', 'bg-yellow-100', 'bg-orange-100', 'bg-purple-100',
    'bg-sky-100', 'bg-green-100', 'bg-rose-100', 'bg-red-100', 'bg-slate-100',
    // Bordas das colunas
    'border-blue-300', 'border-yellow-300', 'border-orange-300', 'border-purple-300',
    'border-sky-300', 'border-green-300', 'border-rose-300', 'border-red-300', 'border-slate-300',
    // Texto escuro/claro nos headers
    'text-gray-900', 'text-white',
    'bg-black/15', 'bg-white/30',
  ],
  plugins: [],
}

export default config
