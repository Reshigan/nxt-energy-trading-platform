/**
 * Design Tokens — Centralized design system constants
 * Rule 10: Both themes work. All colors, spacing, radii, shadows defined here.
 */

export const colors = {
  // Primary brand
  blue: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
    400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
  },
  // Semantic
  emerald: { 400: '#34d399', 500: '#10b981', 600: '#059669' },
  amber: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
  rose: { 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48' },
  // NXT Brand
  nxt: {
    sidebar: '#1a2e1a',
    accent: '#d4e157',
    bg: '#f0ece4',
    card: '#ffffff',
    border: '#e8e4dc',
    accentDark: '#c0ca33',
    sidebarHover: '#2a4a2a',
    textOnSidebar: '#e8e4dc',
  },
  // Surface (dark)
  dark: {
    bg: '#0B1120',
    surface: '#151F32',
    surfaceAlt: '#1A2640',
    border: 'rgba(255,255,255,0.08)',
  },
  // Surface (light)
  light: {
    bg: '#f0ece4',
    surface: '#ffffff',
    surfaceAlt: '#f8f6f2',
    border: '#e8e4dc',
  },
} as const;

export const spacing = {
  xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', '2xl': '3rem',
} as const;

export const radii = {
  sm: '0.5rem', md: '0.75rem', lg: '1rem', xl: '1.25rem', '2xl': '1.5rem', full: '9999px',
} as const;

export const shadows = {
  card: '0 1px 3px rgba(0,0,0,0.04)',
  cardHover: '0 8px 24px rgba(59,130,246,0.08)',
  modal: '0 20px 60px rgba(0,0,0,0.3)',
  button: '0 4px 12px rgba(59,130,246,0.25)',
} as const;

export const typography = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  heading: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem', lg: '2rem', xl: '2.625rem' },
  body: { xs: '0.6875rem', sm: '0.75rem', md: '0.875rem', lg: '1rem' },
} as const;

export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
} as const;

// Role accent colors
export const roleColors: Record<string, string> = {
  admin: '#3b82f6',
  trader: '#8b5cf6',
  ipp: '#10b981',
  offtaker: '#f59e0b',
  carbon_fund: '#06b6d4',
  lender: '#ec4899',
  grid: '#ef4444',
};
