import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LoaderTemplateProps {
  /** Spinner size preset */
  size?: 'sm' | 'md' | 'lg'
  /** Optional text shown below the spinner */
  label?: string
  /** Centers the loader in a full-height/width container — use for whole-page or whole-section loading */
  fullScreen?: boolean
  /** Additional class names on the outer wrapper */
  className?: string
  /** Spinner color — defaults to the brand color; pass e.g. "text-white" to override on a dark background */
  colorClassName?: string
}

const SIZE_MAP: Record<NonNullable<LoaderTemplateProps['size']>, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-9 h-9',
}

export function LoaderTemplate({
  size = 'md',
  label,
  fullScreen = false,
  className,
  colorClassName,
}: LoaderTemplateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2.5',
        fullScreen && 'min-h-[50vh] w-full',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2
        className={cn('animate-spin', SIZE_MAP[size], colorClassName)}
        style={colorClassName ? undefined : { color: 'var(--brand-forest)' }}
      />
      {label && <p className="text-sm text-gray-400">{label}</p>}
    </div>
  )
}

/*
import { LoaderTemplate } from '@/customComponents/LoaderTemplate'

// Inline, inside a card or section
{loading ? <LoaderTemplate label="Loading programs…" /> : <Content />}

// Whole-page loading (centers vertically in the available viewport)
{loading ? <LoaderTemplate size="lg" fullScreen label="Loading dashboard…" /> : <Content />}

// On a dark/colored background — override the spinner color
{loading && <LoaderTemplate size="sm" colorClassName="text-white" />}
*/
