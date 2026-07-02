import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface CardTemplateProps {
  /** Card heading */
  title?: string
  /** Small text rendered below the title */
  subtitle?: string
  /** Content rendered at the bottom of the card */
  footer?: React.ReactNode
  /** Adds hover shadow + lift effect */
  isHoverable?: boolean
  /** Removes default inner padding */
  noPadding?: boolean
  /** Additional class names */
  className?: string
  /** Card body content */
  children?: React.ReactNode
}

export function CardTemplate({
  title,
  subtitle,
  footer,
  isHoverable = false,
  noPadding = false,
  className,
  children,
}: CardTemplateProps) {
  return (
    <Card
      className={cn(
        'border-0 shadow-sm rounded-xl',
        isHoverable && 'hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer',
        className,
      )}
    >
      <CardContent className={cn(noPadding && 'p-0')}>
        {(title || subtitle) && (
          <div className="mb-3">
            {title && (
              <h3 className="text-sm font-semibold text-(--brand-forest) leading-snug">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-(--brand-slate) mt-0.5">{subtitle}</p>
            )}
          </div>
        )}
        {children}
        {footer && (
          <div className="mt-3 pt-3 border-t border-gray-100">{footer}</div>
        )}
      </CardContent>
    </Card>
  )
}

/*
import { CardTemplate } from '@/customComponents/CardTemplate'

<CardTemplate title="Field Summary" subtitle="Last updated 2 days ago">
  <p className="text-sm text-gray-600">Overview of current field conditions.</p>
</CardTemplate>

<CardTemplate
  title="Farmer Profile"
  subtitle="Registered farmer"
  isHoverable
  footer={<span className="text-xs text-gray-400">View full profile →</span>}
>
  <p className="text-sm">John Doe — Maize, 3.4 ha</p>
</CardTemplate>

<CardTemplate noPadding>
  <img src="/farm.jpg" alt="Farm" className="w-full rounded-xl" />
</CardTemplate>
*/
