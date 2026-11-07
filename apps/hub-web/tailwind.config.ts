import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Deep Obsidian & Black Tones
        obsidian: {
          950: '#06030D',
          900: '#090514',
          850: '#110A22',
          800: '#180E30',
          700: '#231442',
        },
        // Royal Violet Brand Palette (beIN & Luxury Style)
        brand: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE', // Royal Violet Core
          800: '#6B21A8',
          900: '#581C87',
          950: '#3B0764',
        },
        // Champagne Gold (from TripYouIN Identity)
        gold: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
      },
      fontFamily: {
        sans: [
          'var(--font-alexandria)',
          'var(--font-cairo)',
          'DIN Next LT Arabic',
          'SST Arabic',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'glow-violet': '0 0 35px -5px rgba(139, 92, 246, 0.25)',
        'glow-gold': '0 0 35px -5px rgba(217, 119, 6, 0.2)',
      },
    },
  },
  plugins: [
    // ═══════════════════════════════════════════════════════
    // Arabic RTL Plugin — ضبط النص العربي وثنائي الاتجاه
    // ═══════════════════════════════════════════════════════
    plugin(function ({ addUtilities }) {
      addUtilities({
        // حاوية RTL كاملة
        '.rtl-container': {
          direction: 'rtl',
          textAlign: 'right',
          unicodeBidi: 'embed',
        },
        // عزل الكلمات الإنجليزية / الأرقام / الأكواد
        '.ltr-isolate': {
          display: 'inline-block',
          direction: 'ltr',
          unicodeBidi: 'isolate',
        },
        // أرقام وأكواد monospace محاذية يساراً داخل نص RTL
        '.ltr-mono': {
          display: 'inline-block',
          direction: 'ltr',
          unicodeBidi: 'isolate',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.03em',
        },
        // إخفاء التمرير مع الحفاظ على الوظيفة
        '.scrollbar-none': {
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      });
    }),
  ],
};

export default config;
