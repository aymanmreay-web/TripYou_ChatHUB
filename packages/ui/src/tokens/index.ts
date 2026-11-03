/**
 * TripYou ChatHUB Design Tokens
 * Luxury Royal Obsidian & Deep Violet Theme (Inspired by beIN Sports Broadcast & Modern Geometric Typography)
 * With Subtle Champagne Gold Accents.
 * Fully supports Arabic (RTL) & English (LTR), High Contrast Dark & Light Modes.
 */

export const colors = {
  // Dark Mode Palette (Royal Obsidian & Electric Violet)
  dark: {
    bg: {
      base: '#080512',      // Deep Royal Obsidian
      subtle: '#110A22',    // Card & Surface Dark
      surface: '#1A0F33',   // Elevated surfaces & hovers
      glass: 'rgba(17, 10, 34, 0.82)',
      border: 'rgba(168, 85, 247, 0.15)',
      borderFocus: '#8B5CF6',
    },
    text: {
      primary: '#FBF9FE',
      secondary: '#C4B5FD',
      muted: '#7C6F9C',
      inverse: '#080512',
    },
  },

  // Light Mode Palette (Pearl & Crisp Royal Violet)
  light: {
    bg: {
      base: '#FAF8FD',      // Pearl Lilac White
      subtle: '#FFFFFF',    // Crisp Card Surface
      surface: '#F3EDFC',   // Elevated subtle tint
      glass: 'rgba(255, 255, 255, 0.92)',
      border: 'rgba(124, 58, 237, 0.12)',
      borderFocus: '#7C3AED',
    },
    text: {
      primary: '#140A26',
      secondary: '#4C3B6E',
      muted: '#8A7B9F',
      inverse: '#FFFFFF',
    },
  },

  // Brand Primary (Royal Violet)
  primary: {
    DEFAULT: '#7C3AED',     // Violet 600
    hover: '#6D28D9',       // Violet 700
    light: '#9333EA',       // Purple 600
    electric: '#A855F7',    // Vibrant Violet
    dark: '#4C1D95',        // Deep Indigo Violet
    glow: 'rgba(124, 58, 237, 0.32)',
  },

  // Accent Brand (Champagne Gold / Amber from TripYouIN)
  accent: {
    DEFAULT: '#D97706',
    hover: '#B45309',
    light: '#F59E0B',
    glow: 'rgba(217, 119, 6, 0.25)',
  },

  // Functional Status
  status: {
    live: '#10B981',        // Emerald
    beta: '#7C3AED',        // Royal Violet
    comingSoon: '#A855F7',  // Electric Lavender
    warning: '#F59E0B',     // Amber
    danger: '#EF4444',      // Crimson
  },
};

export const typography = {
  fontFamily: {
    // beIN Sports Broadcast & Modern Geometric Arabic Font Stack
    sans: 'var(--font-alexandria), var(--font-cairo), "DIN Next LT Arabic", "SST Arabic", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  letterSpacing: {
    tighter: '-0.03em',
    tight: '-0.015em',
    normal: '0',
    wide: '0.025em',
  },
};

export const radii = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.25rem',
  full: '9999px',
};
