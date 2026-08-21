'use client'

import { cn } from '@/lib/utils'

export interface YesNoTemplateProps {
  label?: string
  /** 'default' = forest green medium; 'compact' = uppercase gray tracking-widest */
  labelVariant?: 'default' | 'compact'
  value: '' | 'yes' | 'no'
  onChange: (v: 'yes' | 'no') => void
  isRequired?: boolean
  className?: string
}

/** Two-button yes/no selector — the paired-button treatment used across the farmer wizard. */
export function YesNoTemplate({ label, labelVariant = 'compact', value, onChange, isRequired, className }: YesNoTemplateProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        labelVariant === 'compact' ? (
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
            {label}{isRequired && <span className="text-(--brand-red) ml-0.5">*</span>}
          </p>
        ) : (
          <p className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>
            {label}{isRequired && <span className="text-(--brand-red) ml-0.5">*</span>}
          </p>
        )
      )}
      <div className="grid grid-cols-2 gap-2">
        {(['yes', 'no'] as const).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={value === v}
            className={cn(
              'h-10 rounded-lg border text-sm font-medium transition-colors',
              value === v
                ? 'border-(--brand-forest) text-(--brand-forest) bg-green-50'
                : 'border-gray-200 text-gray-500 hover:border-gray-300',
            )}
          >
            {v === 'yes' ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  )
}
