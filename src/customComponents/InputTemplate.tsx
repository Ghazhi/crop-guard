import React from 'react'
import { cn } from '@/lib/utils'

export interface InputTemplateProps extends Omit<React.ComponentProps<'input'>, 'disabled' | 'required'> {
  /** Label rendered above the input */
  label?: string
  /** 'default' = forest green medium; 'compact' = uppercase gray tracking-widest */
  labelVariant?: 'default' | 'compact'
  /** Error message shown below — also styles the border red */
  error?: string
  /** Helper text shown below when there is no error */
  hint?: string
  /** Icon or element rendered on the left inside the input */
  leftIcon?: React.ReactNode
  /** Icon or element rendered on the right inside the input */
  rightIcon?: React.ReactNode
  /** Disables the input */
  isDisabled?: boolean
  /** Appends a red asterisk to the label */
  isRequired?: boolean
  /** Size preset */
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = {
  sm: 'h-7 text-xs px-2',
  md: 'h-8 text-sm px-2.5',
  lg: 'h-9 text-sm px-3',
}

export function InputTemplate({
  label,
  labelVariant = 'default',
  error,
  hint,
  leftIcon,
  rightIcon,
  isDisabled = false,
  isRequired = false,
  size = 'md',
  className,
  id,
  ...props
}: InputTemplateProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        labelVariant === 'compact' ? (
          <label htmlFor={inputId} className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
            {label}{isRequired && <span className="text-(--brand-red) ml-0.5">*</span>}
          </label>
        ) : (
          <label htmlFor={inputId} className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>
            {label}{isRequired && <span className="text-(--brand-red) ml-0.5">*</span>}
          </label>
        )
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 flex items-center text-gray-400 pointer-events-none">
            {leftIcon}
          </span>
        )}

        <input
          id={inputId}
          disabled={isDisabled}
          required={isRequired}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            'w-full rounded-lg border bg-white outline-none transition-all',
            'placeholder:text-gray-400',
            'focus:border-(--brand-green) focus:ring-2 focus:ring-(--brand-green)/20',
            'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
            SIZE_MAP[size],
            leftIcon && 'pl-9',
            rightIcon && 'pr-9',
            error
              ? 'border-(--brand-red) focus:border-(--brand-red) focus:ring-(--brand-red)/20'
              : 'border-gray-200 hover:border-gray-300',
            className,
          )}
          {...props}
        />

        {rightIcon && (
          <span className="absolute right-3 flex items-center text-gray-400 pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} className="text-xs" style={{ color: 'var(--brand-red)' }}>
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-xs text-gray-400">
          {hint}
        </p>
      )}
    </div>
  )
}

/*
import { InputTemplate } from '@/customComponents/InputTemplate'
import { Search, Phone } from 'lucide-react'

<InputTemplate
  label="Full Name"
  placeholder="Enter farmer name"
  value={name}
  onChange={e => setName(e.target.value)}
/>

<InputTemplate
  label="Phone Number"
  isRequired
  error={errors.phone}
  leftIcon={<Phone className="w-4 h-4" />}
  value={phone}
  onChange={e => setPhone(e.target.value)}
/>

<InputTemplate
  label="Search"
  placeholder="Search farmers..."
  hint="Search by name or ID"
  leftIcon={<Search className="w-4 h-4" />}
  size="md"
  value={query}
  onChange={e => setQuery(e.target.value)}
/>

<InputTemplate label="Farm ID" value="FRM-00123" isDisabled size="lg" />
*/
