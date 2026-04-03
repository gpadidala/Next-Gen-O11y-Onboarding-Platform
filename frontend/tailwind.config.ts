import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Primary brand palette */
        brand: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bce0ff',
          300: '#8eccff',
          400: '#59b0ff',
          500: '#338dff',
          600: '#1b6df5',
          700: '#1457e1',
          800: '#1746b6',
          900: '#193e8f',
          950: '#142757',
        },
        /* Status: healthy / success */
        status: {
          healthy: '#22c55e',
          'healthy-bg': '#f0fdf4',
          'healthy-border': '#86efac',
        },
        /* Status: warning / degraded */
        warning: {
          DEFAULT: '#f59e0b',
          bg: '#fffbeb',
          border: '#fcd34d',
        },
        /* Status: critical / error */
        critical: {
          DEFAULT: '#ef4444',
          bg: '#fef2f2',
          border: '#fca5a5',
        },
        /* Status: unknown / pending */
        pending: {
          DEFAULT: '#6b7280',
          bg: '#f9fafb',
          border: '#d1d5db',
        },
        /* Observability signal colors */
        signal: {
          metrics: '#8b5cf6',
          logs: '#06b6d4',
          traces: '#f97316',
          profiles: '#ec4899',
        },
        /* Surface colors for cards and backgrounds */
        surface: {
          primary: '#ffffff',
          secondary: '#f8fafc',
          tertiary: '#f1f5f9',
          inverse: '#0f172a',
        },
        /* Sidebar and navigation */
        nav: {
          bg: '#0f172a',
          'bg-hover': '#1e293b',
          text: '#94a3b8',
          'text-active': '#f8fafc',
          accent: '#338dff',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'sidebar': '2px 0 8px -2px rgb(0 0 0 / 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(1rem)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(0.5rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
