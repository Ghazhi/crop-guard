import React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaTemplateProps extends Omit<React.ComponentProps<'textarea'>, 'disabled' | 'required'> {
  /** Label rendered above the textarea */
  label?: string
  /** 'default' = forest green medium; 'compact' = uppercase gray tracking-widest */
  labelVariant?: 'default' | 'compact'
  /** Error message shown below — also styles the border red */
  error?: string
  /** Helper text shown below when there is no error */
  hint?: string
  /** Disables the textarea */
  isDisabled?: boolean
  /** Appends a red asterisk to the label */
  isRequired?: boolean
}

export function TextareaTemplate({
  label,
  labelVariant = 'default',
  error,
  hint,
  isDisabled = false,
  isRequired = false,
  className,
  id,
  rows = 3,
  ...props
}: TextareaTemplateProps) {
  const fieldId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        labelVariant === 'compact' ? (
          <label htmlFor={fieldId} className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
            {label}{isRequired && <span className="text-(--brand-red) ml-0.5">*</span>}
          </label>
        ) : (
          <label htmlFor={fieldId} className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>
            {label}{isRequired && <span className="text-(--brand-red) ml-0.5">*</span>}
          </label>
        )
      )}

      <textarea
        id={fieldId}
        disabled={isDisabled}
        required={isRequired}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn(
          'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition-all resize-none',
          'placeholder:text-gray-400',
          'focus:border-(--brand-green) focus:ring-2 focus:ring-(--brand-green)/20',
          'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
          error
            ? 'border-(--brand-red) focus:border-(--brand-red) focus:ring-(--brand-red)/20'
            : 'border-gray-200 hover:border-gray-300',
          className,
        )}
        style={{ color: 'var(--brand-slate)' }}
        {...props}
      />

      {error && (
        <p id={`${fieldId}-error`} className="text-xs" style={{ color: 'var(--brand-red)' }}>
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${fieldId}-hint`} className="text-xs text-gray-400">
          {hint}
        </p>
      )}
    </div>
  )
}

/*
import { TextareaTemplate } from '@/customComponents/TextareaTemplate'

<TextareaTemplate
  label="Description"
  labelVariant="compact"
  placeholder="Short description of the intervention"
  rows={2}
  value={form.description}
  onChange={e => set('description', e.target.value)}
/>
*/
