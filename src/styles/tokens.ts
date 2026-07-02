export const tokens = {
  colors: {
    // Semantic
    primary: 'var(--primary)',
    primaryForeground: 'var(--primary-foreground)',
    secondary: 'var(--secondary)',
    secondaryForeground: 'var(--secondary-foreground)',
    background: 'var(--background)',
    foreground: 'var(--foreground)',
    card: 'var(--card)',
    cardForeground: 'var(--card-foreground)',
    muted: 'var(--muted)',
    mutedForeground: 'var(--muted-foreground)',
    accent: 'var(--accent)',
    accentForeground: 'var(--accent-foreground)',
    destructive: 'var(--destructive)',
    destructiveForeground: 'var(--destructive-foreground)',
    border: 'var(--border)',
    input: 'var(--input)',
    ring: 'var(--ring)',

    // CropGuard brand palette
    brand: {
      forest: '#1A3D2B',
      dark: '#2C5F3F',
      green: '#3D7A56',
      mid: '#5A9E74',
      light: '#7DC49A',
      pale: '#B3DCBF',
      mint: '#E6F4EC',
      amber: '#E8963A',
      red: '#D94F3D',
      blue: '#2B7BB9',
      slate: '#4A5568',
      gray: '#EDF2F7',
    },

    // Risk levels
    risk: {
      low: { bg: '#D1FAE5', text: '#065F46' },
      medium: { bg: '#FEF3C7', text: '#92400E' },
      high: { bg: '#FFEDD5', text: '#9A3412' },
      critical: { bg: '#FEE2E2', text: '#991B1B' },
    },
  },

  font: {
    sans: 'var(--font-sans)',
    mono: 'var(--font-mono)',
    size: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
    },
    weight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      heading: '1.2',
      body: '1.6',
    },
  },

  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },

  radius: {
    sm: 'calc(var(--radius) * 0.6)',
    md: 'calc(var(--radius) * 0.8)',
    lg: 'var(--radius)',
    xl: 'calc(var(--radius) * 1.4)',
    full: '9999px',
  },

  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  },

  // Component sizing
  component: {
    button: {
      sm: { height: '2.25rem', padding: '0 0.75rem' },
      md: { height: '2.5rem', padding: '0 1rem' },
      lg: { height: '2.75rem', padding: '0 2rem' },
      icon: { height: '2.5rem', width: '2.5rem' },
    },
    card: {
      padding: '1.5rem',
    },
    badge: {
      padding: '0.125rem 0.625rem',
    },
  },
} as const

export type Tokens = typeof tokens
