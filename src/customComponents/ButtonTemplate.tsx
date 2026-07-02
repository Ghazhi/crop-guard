import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonTemplateProps extends Omit<React.ComponentProps<'button'>, 'disabled'> {
  /** Visual style */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  /** Size preset */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Shows a spinner and blocks interaction */
  isLoading?: boolean
  /** Square icon-only button — omit children when true */
  isIcon?: boolean
  /** Stretches to full container width */
  fullWidth?: boolean
  /** Icon placed before the label */
  leftIcon?: React.ReactNode
  /** Icon placed after the label */
  rightIcon?: React.ReactNode
  /** Disables the button */
  isDisabled?: boolean
  /** Button text — use instead of children for self-closing usage */
  label?: string
}

const VARIANT_MAP: Record<NonNullable<ButtonTemplateProps['variant']>, string> = {
  primary:   'bg-(--brand-dark) text-white hover:bg-(--brand-forest) border-transparent',
  secondary: 'bg-(--brand-mint) text-(--brand-forest) hover:bg-(--brand-pale) border-transparent',
  outline:   'border border-(--brand-dark) text-(--brand-dark) bg-transparent hover:bg-(--brand-mint)',
  ghost:     'bg-transparent text-(--brand-slate) hover:bg-gray-100 border-transparent',
  danger:    'bg-(--brand-red) text-white hover:bg-red-700 border-transparent',
}

const SIZE_MAP: Record<NonNullable<ButtonTemplateProps['size']>, string> = {
  xs: 'h-6 px-2 text-[10px] gap-0.5',
  sm: 'h-7 px-2.5 text-xs gap-1',
  md: 'h-8 px-3.5 text-sm gap-1.5',
  lg: 'h-9 px-5 text-sm gap-2',
}

const ICON_SIZE_MAP: Record<NonNullable<ButtonTemplateProps['size']>, string> = {
  xs: 'h-6 w-6',
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-9 w-9',
}

export function ButtonTemplate({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isIcon = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  isDisabled = false,
  label,
  className,
  children,
  ...props
}: ButtonTemplateProps) {
  return (
    <Button
      disabled={isDisabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-green) focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
        VARIANT_MAP[variant],
        isIcon ? ICON_SIZE_MAP[size] : SIZE_MAP[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {!isIcon && (label ?? children)}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </Button>
  )
}

/*
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { Plus, Trash2, Download } from 'lucide-react'

<ButtonTemplate variant="primary" size="md" label="Save Farmer" onClick={handleSave} />

<ButtonTemplate variant="primary" size="md" label="Add Record" leftIcon={<Plus />} onClick={handleAdd} />

<ButtonTemplate variant="primary" size="md" label="Saving..." isLoading={saving} />

<ButtonTemplate variant="ghost" size="md" isIcon leftIcon={<Trash2 />} onClick={handleDelete} />

<ButtonTemplate variant="danger" size="lg" label="Delete Farmer" fullWidth onClick={handleDelete} />

<ButtonTemplate variant="outline" size="sm" label="Export" isDisabled rightIcon={<Download />} />
*/
