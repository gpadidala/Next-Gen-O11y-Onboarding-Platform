import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        /* Primary brand palette — driven by CSS variables, theme-aware */
        brand: {
          50:  'rgb(var(--brand-50)  / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
          950: 'rgb(var(--brand-900) / <alpha-value>)',
        },
        /* Status colors */
        status: {
          healthy:        'rgb(var(--status-healthy)        / <alpha-value>)',
          'healthy-bg':   'rgb(var(--status-healthy-bg)     / <alpha-value>)',
          'healthy-border': 'rgb(var(--status-healthy-border) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning)        / <alpha-value>)',
          bg:      'rgb(var(--warning-bg)     / <alpha-value>)',
          border:  'rgb(var(--warning-border) / <alpha-value>)',
        },
        critical: {
          DEFAULT: 'rgb(var(--critical)        / <alpha-value>)',
          bg:      'rgb(var(--critical-bg)     / <alpha-value>)',
          border:  'rgb(var(--critical-border) / <alpha-value>)',
        },
        pending: {
          DEFAULT: 'rgb(var(--pending)        / <alpha-value>)',
          bg:      'rgb(var(--pending-bg)     / <alpha-value>)',
          border:  'rgb(var(--pending-border) / <alpha-value>)',
        },
        /* Signal colors — fixed, look good in all themes */
        signal: {
          metrics:  '#8b5cf6',
          logs:     '#06b6d4',
          traces:   '#f97316',
          profiles: '#ec4899',
        },
        /* Surfaces — theme-aware */
        surface: {
          primary:   'rgb(var(--surface-primary)   / <alpha-value>)',
          secondary: 'rgb(var(--surface-secondary) / <alpha-value>)',
          tertiary:  'rgb(var(--surface-tertiary)  / <alpha-value>)',
          inverse:   'rgb(var(--surface-inverse)   / <alpha-value>)',
        },
        /* Navigation — theme-aware */
        nav: {
          bg:            'rgb(var(--nav-bg)          / <alpha-value>)',
          'bg-hover':    'rgb(var(--nav-bg-hover)    / <alpha-value>)',
          text:          'rgb(var(--nav-text)        / <alpha-value>)',
          'text-active': 'rgb(var(--nav-text-active) / <alpha-value>)',
          accent:        'rgb(var(--nav-accent)      / <alpha-value>)',
        },
        /* Semantic text */
        text: {
          primary:   'rgb(var(--text-primary)   / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          tertiary:  'rgb(var(--text-tertiary)  / <alpha-value>)',
          muted:     'rgb(var(--text-muted)     / <alpha-value>)',
          inverse:   'rgb(var(--text-inverse)   / <alpha-value>)',
        },
        /* Borders */
        border: {
          primary: 'rgb(var(--border-color)  / <alpha-value>)',
          strong:  'rgb(var(--border-strong) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          'Inter', 'ui-sans-serif', 'system-ui', '-apple-system',
          'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
        mono: [
          'JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular',
          'Menlo', 'Monaco', 'Consolas', 'monospace',
        ],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'card':       'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        'sidebar':    '2px 0 8px -2px rgb(0 0 0 / 0.15)',
        'dropdown':   'var(--shadow-dropdown)',
      },
      animation: {
        'fade-in':       'fadeIn 0.2s ease-in-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-up':   'slideInUp 0.3s ease-out',
        'pulse-slow':    'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn:       { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideInRight: { '0%': { transform: 'translateX(1rem)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        slideInUp:    { '0%': { transform: 'translateY(0.5rem)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
      transitionProperty: {
        'colors-bg': 'color, background-color, border-color, box-shadow',
      },
    },
  },
  plugins: [],
};

export default config;
