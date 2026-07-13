'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MultiSelectOption {
  value: string
  label: string
}

export interface MultiSelectTemplateProps {
  label?: string
  options: MultiSelectOption[]
  value: string[]
  onChange: (vals: string[]) => void
  isRequired?: boolean
  placeholder?: string
  className?: string
}

export function MultiSelectTemplate({
  label,
  options,
  value,
  onChange,
  isRequired,
  placeholder = 'Select…',
  className,
}: MultiSelectTemplateProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggle(val: string) {
    onChange(value.includes(val) ? value.filter(v => v !== val) : [...value, val])
  }

  const selected = options.filter(o => value.includes(o.value))

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>
          {label}
          {isRequired && <span className="ml-0.5" style={{ color: 'var(--brand-red)' }}>*</span>}
        </label>
      )}

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={cn(
            'w-full h-10 text-sm px-3 rounded-lg border bg-white flex items-center justify-between transition-all',
            'hover:border-gray-300 focus:outline-none',
            open
              ? 'border-(--brand-green) ring-2 ring-(--brand-green)/20'
              : 'border-gray-200',
          )}
        >
          <span className={value.length === 0 ? 'text-gray-400' : 'text-gray-700'}>
            {value.length === 0 ? placeholder : `${value.length} selected`}
          </span>
          <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {options.map(opt => {
              const checked = value.includes(opt.value)
              return (
                <div
                  key={opt.value}
                  onClick={() => toggle(opt.value)}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer select-none"
                >
                  <div className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                    checked ? 'border-(--brand-green) bg-(--brand-green)' : 'border-gray-300',
                  )}>
                    {checked && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {selected.map(opt => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full border bg-green-50 border-green-200 text-green-700"
            >
              {opt.label}
              <button
                type="button"
                onClick={() => toggle(opt.value)}
                className="hover:text-green-900 leading-none"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/*
import { MultiSelectTemplate } from '@/customComponents/MultiSelectTemplate'

<MultiSelectTemplate
  label="Crop Types"
  isRequired
  placeholder="Select crops…"
  options={[{ value: 'maize', label: 'Maize' }, { value: 'rice', label: 'Rice' }]}
  value={selectedCrops}
  onChange={setSelectedCrops}
/>
*/
