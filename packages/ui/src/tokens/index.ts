/**
 * ResvBAR Hub Design Tokens
 * Luxury Obsidian & Emerald Theme with Golden Highlights
 * Optimized for Arabic typography and high-density SaaS dashboards.
 */

export const colors = {
  // Background palette
  bg: {
    base: '#0B0F17', // Deep Obsidian
    subtle: '#111827', // Card & Surface dark
    surface: '#161F30', // Elevated surfaces / hover
    glass: 'rgba(17, 24, 39, 0.75)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderFocus: '#10B981',
  },
  // Primary brand (Emerald)
  primary: {
    DEFAULT: '#10B981',
    hover: '#059669',
    light: '#34D399',
    dark: '#065F46',
    glow: 'rgba(16, 185, 129, 0.25)',
  },
  // Accent brand (Gold / Amber)
  accent: {
    DEFAULT: '#F59E0B',
    hover: '#D97706',
    light: '#FBBF24',
    glow: 'rgba(245, 158, 11, 0.25)',
  },
  // Status colors
  status: {
    live: '#10B981',       // Emerald
    beta: '#3B82F6',       // Electric Blue
    comingSoon: '#8B5CF6', // Purple/Violet
    warning: '#F59E0B',    // Amber
    danger: '#EF4444',     // Crimson
  },
  // Typography colors
  text: {
    primary: '#F9FAFB',
    secondary: '#9CA3AF',
    muted: '#6B7280',
    inverse: '#0B0F17',
  }
};

export const typography = {
  fontFamily: {
    sans: 'var(--font-cairo), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  direction: 'rtl',
};

export const radii = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
};
