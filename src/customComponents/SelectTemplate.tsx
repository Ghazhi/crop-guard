import React from 'react'
import { cn } from '@/lib/utils'

export interface SelectTemplateProps extends Omit<React.ComponentProps<'select'>, 'disabled' | 'required' | 'size'> {
  /** Label rendered above the select (omit for unlabeled filter selects) */
  label?: string
  /** 'default' = forest green medium; 'compact' = uppercase gray tracking-widest */
  labelVariant?: 'default' | 'compact'
  /** Options to render */
  options: { value: string; label: string }[]
  /** Placeholder option shown when no value is selected */
  placeholder?: string
  /** Error message shown below — also styles the border red */
  error?: string
  /** Helper text shown below when there is no error */
  hint?: string
  /** Disables the select */
  isDisabled?: boolean
  /** Appends a red asterisk to the label */
  isRequired?: boolean
  /** Size preset */
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = {
  sm: 'h-8 text-xs px-2.5',
  md: 'h-10 text-sm px-3',
  lg: 'h-12 text-base px-4',
}

export function SelectTemplate({
  label,
  labelVariant = 'default',
  options,
  placeholder,
  error,
  hint,
  isDisabled = false,
  isRequired = false,
  size = 'md',
  className,
  id,
  ...props
}: SelectTemplateProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        labelVariant === 'compact' ? (
          <label htmlFor={selectId} className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
            {label}{isRequired && <span className="text-(--brand-red) ml-0.5">*</span>}
          </label>
        ) : (
          <label htmlFor={selectId} className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>
            {label}{isRequired && <span className="text-(--brand-red) ml-0.5">*</span>}
          </label>
        )
      )}

      <select
        id={selectId}
        disabled={isDisabled}
        required={isRequired}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
        className={cn(
          'w-full rounded-lg border bg-white outline-none transition-all appearance-none cursor-pointer',
          'focus:border-(--brand-green) focus:ring-2 focus:ring-(--brand-green)/20',
          'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
          'pr-8',
          SIZE_MAP[size],
          error
            ? 'border-(--brand-red) focus:border-(--brand-red) focus:ring-(--brand-red)/20'
            : 'border-gray-200 hover:border-gray-300',
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && (
        <p id={`${selectId}-error`} className="text-xs text-(--brand-red)">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${selectId}-hint`} className="text-xs text-gray-400">
          {hint}
        </p>
      )}
    </div>
  )
}

/*
import { SelectTemplate } from '@/customComponents/SelectTemplate'

<SelectTemplate
  label="Crop Type"
  options={[
    { value: 'maize',   label: 'Maize' },
    { value: 'rice',    label: 'Rice' },
    { value: 'cassava', label: 'Cassava' },
  ]}
  placeholder="Select a crop..."
  value={crop}
  onChange={e => setCrop(e.target.value)}
/>

<SelectTemplate
  label="Risk Level"
  isRequired
  error={errors.risk}
  size="lg"
  options={[
    { value: 'low',      label: 'Low' },
    { value: 'medium',   label: 'Medium' },
    { value: 'high',     label: 'High' },
    { value: 'critical', label: 'Critical' },
  ]}
  value={risk}
  onChange={e => setRisk(e.target.value)}
/>

<SelectTemplate
  label="Field Agent"
  hint="Assign to an active agent"
  isDisabled={!agents.length}
  options={agents.map(a => ({ value: a.id, label: a.name }))}
  value={agentId}
  onChange={e => setAgentId(e.target.value)}
/>
*/
