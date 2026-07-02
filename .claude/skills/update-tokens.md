---
name: update-tokens
description: Add or update design tokens (colors, fonts, spacing, border radius, shadows) in the cropguard design system. Use when introducing a new color, font size, spacing value, or any visual constant.
arguments: [token-type, token-name, value, description]
---

# Update design token: $token-name

**Type:** $token-type  
**Value:** $value  
**Purpose:** $description

## Current tokens file

!`cat src/styles/tokens.ts 2>/dev/null || echo "tokens file not found — will create"`

## Current CSS variables

!`cat src/app/globals.css 2>/dev/null`

## Instructions

There are two files to keep in sync:

### 1. `src/styles/tokens.ts` — TypeScript token constants (used in components)

Add or update the token under the correct category. If the file doesn't exist, create it with this structure:

```ts
export const tokens = {
  colors: {
    primary: 'var(--color-primary)',
    secondary: 'var(--color-secondary)',
    background: 'var(--background)',
    foreground: 'var(--foreground)',
    muted: 'var(--color-muted)',
    border: 'var(--color-border)',
    error: 'var(--color-error)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
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
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  },
} as const

export type Tokens = typeof tokens
```

### 2. `src/app/globals.css` — CSS custom properties (used by Tailwind v4 and shadcn)

Add the corresponding CSS variable under `:root` if it doesn't already exist.

After updating both files, show:
1. The token added/updated in `tokens.ts`
2. The CSS variable added/updated in `globals.css`
3. How to use it in a component: `tokens.colors.primary` or `var(--color-primary)`
