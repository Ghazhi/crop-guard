import React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeTemplateProps {
  /** Badge text (compulsory) */
  label: string
  /** Visual style variant */
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'improving' | 'stable' | 'declining'
  /** Size preset */
  size?: 'sm' | 'md'
  /** Shows a colored dot before the label */
  dot?: boolean
  /** Additional class names */
  className?: string
}

const VARIANT_MAP: Record<NonNullable<BadgeTemplateProps['variant']>, { bg: string; text: string; dot: string }> = {
  success:   { bg: '#D1FAE5', text: '#065F46', dot: '#065F46' },
  warning:   { bg: '#FEF3C7', text: '#92400E', dot: '#92400E' },
  danger:    { bg: '#FEE2E2', text: '#991B1B', dot: '#991B1B' },
  info:      { bg: '#DBEAFE', text: '#1E40AF', dot: '#1E40AF' },
  neutral:   { bg: '#F3F4F6', text: '#374151', dot: '#374151' },
  improving: { bg: '#D1FAE5', text: '#065F46', dot: '#065F46' },
  stable:    { bg: '#F3F4F6', text: '#374151', dot: '#374151' },
  declining: { bg: '#FEE2E2', text: '#991B1B', dot: '#991B1B' },
}

const SIZE_MAP: Record<NonNullable<BadgeTemplateProps['size']>, string> = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
}

export function BadgeTemplate({
  label,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className,
}: BadgeTemplateProps) {
  const colors = VARIANT_MAP[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        SIZE_MAP[size],
        className,
      )}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {dot && (
        <span
          className="rounded-full shrink-0"
          style={{
            width: size === 'sm' ? '5px' : '6px',
            height: size === 'sm' ? '5px' : '6px',
            backgroundColor: colors.dot,
          }}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  )
}

/*
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'

<BadgeTemplate label="Improving" variant="improving" size="md" dot />
<BadgeTemplate label="Low Risk" variant="success" size="sm" />
<BadgeTemplate label="Critical" variant="danger" size="md" />
<BadgeTemplate label="Stable" variant="stable" size="sm" dot />
<BadgeTemplate label="Pending Review" variant="warning" size="md" />
*/
