'use client'

import { cn } from '@/lib/utils'

export interface ChipSelectTemplateProps {
  label?: string
  /** 'default' = forest green medium; 'compact' = uppercase gray tracking-widest */
  labelVariant?: 'default' | 'compact'
  options: { value: string; label: string }[]
  value: string[]
  onChange: (v: string[]) => void
  isRequired?: boolean
  className?: string
}

/** Pill multi-select — the "select all that apply" treatment used for asset/preference lists. */
export function ChipSelectTemplate({
  label, labelVariant = 'compact', options, value, onChange, isRequired, className,
}: ChipSelectTemplateProps) {
  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
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
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const on = value.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              aria-pressed={on}
              className={cn(
                'px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
                on ? 'border-(--brand-forest) text-(--brand-forest) bg-green-50'
                   : 'border-gray-200 text-gray-600 hover:border-gray-300',
              )}
            >
              {opt.label}
            </button>
          )
        })}
        {options.length === 0 && <p className="text-xs text-gray-400">No options configured.</p>}
      </div>
    </div>
  )
}
