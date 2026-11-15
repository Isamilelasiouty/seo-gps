/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#B8892B',
          hover: '#9A7220',
          tint: '#FEF9EE',
          border: '#F3E4BE',
        },
        surface: {
          DEFAULT: '#F8FAFC',
          card: '#FFFFFF',
          hairline: '#E2E8F0',
          soft: '#F1F5F9',
        },
        ink: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
          subtle: '#94A3B8',
        },
        severity: {
          critical: '#B42318',
          'critical-bg': '#FEF3F2',
          'critical-border': '#FECDCA',
          warning: '#B54708',
          'warning-bg': '#FFFAEB',
          'warning-border': '#FEDF89',
          notice: '#175CD3',
          'notice-bg': '#EFF8FF',
          'notice-border': '#B2DDFF',
          healthy: '#067647',
          'healthy-bg': '#ECFDF3',
          'healthy-border': '#A6F4C5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans Arabic', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        arabic: ['IBM Plex Sans Arabic', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      fontSize: {
        'body-sm': ['13px', '1.6'],
        'body-md': ['15px', '1.65'],
        'body-lg': ['16px', '1.7'],
        'title-sm': ['18px', '1.4'],
        'title-md': ['22px', '1.3'],
        'title-lg': ['28px', '1.2'],
        'title-xl': ['34px', '1.15'],
      },
    },
  },
  plugins: [],
};
