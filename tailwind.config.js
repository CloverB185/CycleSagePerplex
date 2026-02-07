/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Construction-grade primary: Industrial Blue
        brand: {
          50: '#e8f0fe',
          100: '#c5d9fc',
          200: '#9ebffa',
          300: '#74a4f7',
          400: '#508ff5',
          500: '#1a56db',
          600: '#1648c2',
          700: '#113a9e',
          800: '#0d2d7a',
          900: '#091f57',
        },
        // Construction-grade accent: Safety Orange
        construction: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        // Safety palette (high-visibility)
        safety: {
          red: '#dc2626',
          amber: '#f59e0b',
          green: '#16a34a',
          orange: '#f97316',
        },
        // Neutral construction grays (concrete/steel tones)
        site: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.08)',
        'action': '0 4px 14px 0 rgba(249, 115, 22, 0.25)',
      },
      borderRadius: {
        'action': '14px',
      },
    },
  },
  plugins: [],
}
