import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        ink: {
          950: '#070506',
          900: '#0c0809',
          800: '#15100f',
          700: '#1f1614',
        },
        crimson: {
          50:  '#fdf2f2',
          200: '#f5b9bc',
          400: '#d1424a',
          500: '#b91c1c',
          600: '#991b1b',
          700: '#7f1d1d',
          800: '#5d1414',
          900: '#3a0c0c',
        },
        bone: {
          50: '#fbf6ef',
          100: '#f3ebdc',
          200: '#e2d3b8',
          400: '#bda177',
        },
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
        'aurora': 'radial-gradient(ellipse at 20% 0%, rgba(185,28,28,0.18), transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(127,29,29,0.22), transparent 55%), radial-gradient(ellipse at 50% 50%, rgba(20,12,12,0.6), #050304 70%)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        fadeIn: 'fadeIn 0.6s cubic-bezier(.2,.8,.2,1) both',
        shimmer: 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
