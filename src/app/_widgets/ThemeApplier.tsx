'use client'

import { useEffect } from 'react'
import { usePersistedState } from '@/lib/usePersistedState'
import { type ThemeColors, DEFAULT_THEME } from '@/app/(admin)/dashboard/Configuration/_logics/branding'

const VAR_MAP: Record<keyof ThemeColors, string> = {
  forest: '--brand-forest',
  dark:   '--brand-dark',
  green:  '--brand-green',
  mid:    '--brand-mid',
  pale:   '--brand-pale',
  mint:   '--brand-mint',
  amber:  '--brand-amber',
  red:    '--brand-red',
  slate:  '--brand-slate',
}

/** Applies the tenant-configured theme colors as CSS custom-property overrides on the document root, so every `var(--brand-*)` usage in the app picks them up live. */
export function ThemeApplier() {
  const [theme] = usePersistedState<ThemeColors>('branding.theme', DEFAULT_THEME)

  useEffect(() => {
    const root = document.documentElement
    for (const key of Object.keys(VAR_MAP) as (keyof ThemeColors)[]) {
      root.style.setProperty(VAR_MAP[key], theme[key])
    }
  }, [theme])

  return null
}
