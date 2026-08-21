'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DatePickerTemplateProps {
  /** Label rendered above the field */
  label?: string
  /** 'default' = forest green medium; 'compact' = uppercase gray tracking-widest */
  labelVariant?: 'default' | 'compact'
  /** ISO date string, `YYYY-MM-DD`. Empty string means no selection. */
  value?: string
  /** Fires with the new ISO date string, or '' when the selection is cleared. */
  onChange?: (value: string) => void
  /** Error message shown below — also styles the border red */
  error?: string
  /** Helper text shown below when there is no error */
  hint?: string
  /** Disables the field */
  isDisabled?: boolean
  /** Appends a red asterisk to the label */
  isRequired?: boolean
  /** Size preset */
  size?: 'sm' | 'md' | 'lg'
  /** Earliest selectable date, `YYYY-MM-DD` */
  min?: string
  /** Latest selectable date, `YYYY-MM-DD` */
  max?: string
  placeholder?: string
  className?: string
  id?: string
}

const SIZE_MAP = {
  sm: 'h-7 text-xs px-2',
  md: 'h-8 text-sm px-2.5',
  lg: 'h-9 text-sm px-3',
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Parses `YYYY-MM-DD` as a LOCAL date — `new Date(iso)` would parse it as UTC and shift the day in western timezones. */
function parseISO(iso: string | undefined): Date | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDisplay(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}

/**
 * Brand-styled date picker built on the CropGuard palette — replaces the native
 * `<input type="date">`, whose calendar popup cannot be themed. Renders a text
 * trigger plus a custom month grid using the forest/mint/green tokens for the
 * selected day, hover, and today markers.
 */
export function DatePickerTemplate({
  label,
  labelVariant = 'default',
  value,
  onChange,
  error,
  hint,
  isDisabled = false,
  isRequired = false,
  size = 'md',
  min,
  max,
  placeholder = 'Select date',
  className,
  id,
}: DatePickerTemplateProps) {
  const fieldId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const selected = parseISO(value)
  const minDate = parseISO(min)
  const maxDate = parseISO(max)

  const [open, setOpen] = useState(false)
  // Month the grid is showing. Null means "follow the selected value", so a
  // value arriving from outside re-centres the calendar without an effect;
  // paging with the arrows pins it until the popup closes again.
  const [cursorOverride, setCursorOverride] = useState<Date | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Keyed on primitives so the month grid memo is stable across renders — a
  // fresh Date object would be a new reference every time.
  const fallback = selected ?? new Date()
  const cursorYear  = cursorOverride ? cursorOverride.getFullYear() : fallback.getFullYear()
  const cursorMonth = cursorOverride ? cursorOverride.getMonth()    : fallback.getMonth()

  // close on outside click / Escape
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const today = new Date()

  // leading blanks + every day of the visible month
  const cells: (Date | null)[] = (() => {
    const firstWeekday = new Date(cursorYear, cursorMonth, 1).getDay()
    const daysInMonth = new Date(cursorYear, cursorMonth + 1, 0).getDate()
    const out: (Date | null)[] = Array.from({ length: firstWeekday }, () => null)
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(cursorYear, cursorMonth, d))
    return out
  })()

  function outOfRange(d: Date): boolean {
    if (minDate && d < minDate) return true
    if (maxDate && d > maxDate) return true
    return false
  }

  function pick(d: Date) {
    if (outOfRange(d)) return
    onChange?.(toISO(d))
    setCursorOverride(null)
    setOpen(false)
  }

  function shiftMonth(delta: number) {
    setCursorOverride(new Date(cursorYear, cursorMonth + delta, 1))
  }

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

      <div className="relative" ref={wrapRef}>
        <button
          id={fieldId}
          type="button"
          disabled={isDisabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => { setCursorOverride(null); setOpen(o => !o) }}
          className={cn(
            'w-full rounded-lg border bg-white outline-none transition-all text-left flex items-center gap-2',
            'focus:border-(--brand-green) focus:ring-2 focus:ring-(--brand-green)/20',
            'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
            SIZE_MAP[size],
            error
              ? 'border-(--brand-red) focus:border-(--brand-red) focus:ring-(--brand-red)/20'
              : 'border-gray-200 hover:border-gray-300',
            className,
          )}
        >
          <CalendarIcon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--brand-green)' }} />
          <span className={cn('flex-1 truncate', !selected && 'text-gray-400')}>
            {selected ? formatDisplay(selected) : placeholder}
          </span>
        </button>

        {open && !isDisabled && (
          <div
            role="dialog"
            aria-label="Choose date"
            className="absolute z-50 mt-1 w-72 rounded-xl border bg-white shadow-lg p-3"
            style={{ borderColor: 'var(--brand-pale)' }}
          >
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button" aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-(--brand-mint) transition-colors"
              >
                <ChevronLeft className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />
              </button>
              <p className="text-sm font-semibold" style={{ color: 'var(--brand-forest)' }}>
                {MONTHS[cursorMonth]} {cursorYear}
              </p>
              <button
                type="button" aria-label="Next month"
                onClick={() => shiftMonth(1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-(--brand-mint) transition-colors"
              >
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAYS.map(w => (
                <div key={w} className="h-6 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((d, i) => {
                if (!d) return <div key={`blank-${i}`} className="h-8" />
                const isSelected = !!selected && sameDay(d, selected)
                const isToday = sameDay(d, today)
                const disabled = outOfRange(d)
                return (
                  <button
                    key={toISO(d)}
                    type="button"
                    disabled={disabled}
                    onClick={() => pick(d)}
                    className={cn(
                      'h-8 rounded-lg text-xs font-medium transition-colors',
                      disabled && 'text-gray-300 cursor-not-allowed',
                      !disabled && !isSelected && 'text-gray-700 hover:bg-(--brand-mint)',
                    )}
                    style={
                      isSelected
                        ? { backgroundColor: 'var(--brand-forest)', color: 'white' }
                        : isToday
                          ? { color: 'var(--brand-green)', boxShadow: 'inset 0 0 0 1px var(--brand-light)' }
                          : undefined
                    }
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { onChange?.(''); setOpen(false) }}
                className="text-xs font-medium text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => pick(new Date())}
                className="text-xs font-semibold hover:underline"
                style={{ color: 'var(--brand-forest)' }}
              >
                Today
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p id={`${fieldId}-error`} className="text-xs" style={{ color: 'var(--brand-red)' }}>{error}</p>
      )}
      {!error && hint && (
        <p id={`${fieldId}-hint`} className="text-xs text-gray-400">{hint}</p>
      )}
    </div>
  )
}

/*
import { DatePickerTemplate } from '@/customComponents/DatePickerTemplate'

<DatePickerTemplate
  label="Start Date"
  isRequired
  value={startDate}
  onChange={setStartDate}
/>

<DatePickerTemplate
  label="DATE OF BIRTH"
  labelVariant="compact"
  value={dob}
  max={new Date().toISOString().slice(0, 10)}
  onChange={v => set('dob', v)}
/>
*/
