import React from 'react'
import { cn } from '@/lib/utils'

export interface CheckboxTemplateProps extends Omit<React.ComponentProps<'input'>, 'type' | 'disabled' | 'size'> {
  /** Label rendered beside the checkbox */
  label?: string
  /** Helper text below the label */
  hint?: string
  /** Error message below — also styles the checkbox border red */
  error?: string
  /** Disables the checkbox */
  isDisabled?: boolean
  /** Size preset */
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = {
  sm: { box: 'w-3.5 h-3.5', label: 'text-xs' },
  md: { box: 'w-4 h-4',   label: 'text-sm' },
  lg: { box: 'w-5 h-5',   label: 'text-base' },
}

export function CheckboxTemplate({
  label,
  hint,
  error,
  isDisabled = false,
  size = 'md',
  className,
  id,
  ...props
}: CheckboxTemplateProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-0.5">
      <label
        htmlFor={inputId}
        className={cn(
          'flex items-start gap-2.5 cursor-pointer',
          isDisabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <input
          id={inputId}
          type="checkbox"
          disabled={isDisabled}
          aria-invalid={!!error}
          className={cn(
            'rounded border-2 transition-all outline-none mt-0.5 shrink-0',
            'focus-visible:ring-2 focus-visible:ring-(--brand-green)/30',
            'checked:bg-(--brand-dark) checked:border-(--brand-dark)',
            error
              ? 'border-(--brand-red)'
              : 'border-gray-300 hover:border-(--brand-green)',
            SIZE_MAP[size].box,
            className,
          )}
          {...props}
        />
        {label && (
          <div className="flex flex-col">
            <span
              className={cn('font-medium leading-tight', SIZE_MAP[size].label)}
              style={{ color: 'var(--brand-forest)' }}
            >
              {label}
            </span>
            {hint && !error && (
              <span className="text-xs text-gray-400 mt-0.5">{hint}</span>
            )}
          </div>
        )}
      </label>

      {error && (
        <p className="text-xs ml-6.5" style={{ color: 'var(--brand-red)' }}>
          {error}
        </p>
      )}
    </div>
  )
}

/*
import { CheckboxTemplate } from '@/customComponents/CheckboxTemplate'

<CheckboxTemplate
  label="Verified farmer"
  checked={isVerified}
  onChange={e => setIsVerified(e.target.checked)}
/>

<CheckboxTemplate
  label="Enrol in opportunity program"
  hint="Farmer will receive intervention support"
  checked={isEnrolled}
  onChange={e => setIsEnrolled(e.target.checked)}
  size="md"
/>

<CheckboxTemplate
  label="Accept terms"
  error={errors.terms}
  checked={accepted}
  onChange={e => setAccepted(e.target.checked)}
/>

<CheckboxTemplate label="Sync to portal" isDisabled checked={synced} />
*/
