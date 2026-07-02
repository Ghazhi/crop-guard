import React from 'react'
import { cn } from '@/lib/utils'

export interface RadioOption {
  /** Unique value for this option */
  value: string
  /** Display label */
  label: string
  /** Optional sub-text below the label */
  hint?: string
  /** Disable only this option */
  isDisabled?: boolean
}

export interface RadioTemplateProps {
  /** Group name (required — ties all options together) */
  name: string
  /** The currently selected value */
  value?: string
  /** Called when selection changes */
  onChange?: (value: string) => void
  /** Array of options to render */
  options: RadioOption[]
  /** Label for the entire group */
  label?: string
  /** Error message for the group */
  error?: string
  /** Disables all options */
  isDisabled?: boolean
  /** Layout direction */
  direction?: 'vertical' | 'horizontal'
  /** Size preset */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_MAP = {
  sm: { dot: 'w-3.5 h-3.5', label: 'text-xs', hint: 'text-[10px]' },
  md: { dot: 'w-4 h-4',   label: 'text-sm', hint: 'text-xs'    },
  lg: { dot: 'w-5 h-5',   label: 'text-base', hint: 'text-sm'  },
}

export function RadioTemplate({
  name,
  value,
  onChange,
  options,
  label,
  error,
  isDisabled = false,
  direction = 'vertical',
  size = 'md',
  className,
}: RadioTemplateProps) {
  return (
    <fieldset className={cn('flex flex-col gap-1.5', className)} aria-invalid={!!error}>
      {label && (
        <legend
          className="text-sm font-medium mb-1"
          style={{ color: 'var(--brand-forest)' }}
        >
          {label}
        </legend>
      )}

      <div
        className={cn(
          'flex gap-3',
          direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        )}
      >
        {options.map(opt => {
          const disabled = isDisabled || opt.isDisabled
          return (
            <label
              key={opt.value}
              className={cn(
                'flex items-start gap-2.5 cursor-pointer',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={value === opt.value}
                disabled={disabled}
                onChange={() => onChange?.(opt.value)}
                className={cn(
                  'rounded-full border-2 transition-all outline-none mt-0.5 shrink-0 appearance-none',
                  'focus-visible:ring-2 focus-visible:ring-(--brand-green)/30',
                  'checked:border-(--brand-dark) checked:bg-(--brand-dark)',
                  error
                    ? 'border-(--brand-red)'
                    : 'border-gray-300 hover:border-(--brand-green)',
                  SIZE_MAP[size].dot,
                  // inner dot via box-shadow when checked
                  'checked:[box-shadow:inset_0_0_0_3px_white]',
                )}
              />
              <div className="flex flex-col">
                <span
                  className={cn('font-medium leading-tight', SIZE_MAP[size].label)}
                  style={{ color: 'var(--brand-forest)' }}
                >
                  {opt.label}
                </span>
                {opt.hint && (
                  <span className={cn('text-gray-400 mt-0.5', SIZE_MAP[size].hint)}>
                    {opt.hint}
                  </span>
                )}
              </div>
            </label>
          )
        })}
      </div>

      {error && (
        <p className="text-xs" style={{ color: 'var(--brand-red)' }}>
          {error}
        </p>
      )}
    </fieldset>
  )
}

/*
import { RadioTemplate } from '@/customComponents/RadioTemplate'

<RadioTemplate
  name="risk-level"
  label="Risk Level"
  value={risk}
  onChange={setRisk}
  options={[
    { value: 'low',      label: 'Low',      hint: 'Minimal intervention needed' },
    { value: 'medium',   label: 'Medium',   hint: 'Monitor closely' },
    { value: 'high',     label: 'High',     hint: 'Priority follow-up required' },
    { value: 'critical', label: 'Critical', hint: 'Immediate action needed' },
  ]}
/>

<RadioTemplate
  name="gender"
  label="Gender"
  value={gender}
  onChange={setGender}
  direction="horizontal"
  options={[
    { value: 'male',   label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other',  label: 'Other' },
  ]}
/>

<RadioTemplate
  name="zone"
  label="FRI Zone"
  value={zone}
  onChange={setZone}
  error={errors.zone}
  options={[
    { value: 'leader',  label: 'Resilience Leader' },
    { value: 'builder', label: 'Resilience Builder' },
    { value: 'learner', label: 'Resilience Learner' },
    { value: 'starter', label: 'Resilience Starter', isDisabled: true },
  ]}
/>
*/
