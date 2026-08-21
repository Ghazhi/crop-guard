'use client'

import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { CheckboxTemplate } from '@/customComponents/CheckboxTemplate'
import { TextareaTemplate } from '@/customComponents/TextareaTemplate'
import { MultiSelectTemplate } from '@/customComponents/MultiSelectTemplate'
import { DatePickerTemplate } from '@/customComponents/DatePickerTemplate'
import { YesNoTemplate } from '@/customComponents/YesNoTemplate'
import { ChipSelectTemplate } from '@/customComponents/ChipSelectTemplate'
import { GpsFieldTemplate } from '@/customComponents/GpsFieldTemplate'
import { FileUploadTemplate } from '@/customComponents/FileUploadTemplate'
import { cn } from '@/lib/utils'
import { visibleFieldsForStep, fieldIsRequired, UPLOAD_ACCEPT, UPLOAD_PLACEHOLDER, type FieldDef, type FormDef } from '@/dataCenter/formEngine'

export interface DynamicFormRendererProps {
  form:     FormDef
  stepId:   string
  values:   Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  /** Override options for a select/multiselect/chips field at render time (e.g. dynamic program/cohort lists) — keyed by FieldDef.key. Falls back to the field's own static `options`. */
  optionsOverride?: Record<string, { value: string; label: string }[]>
  /** 'default' = forest green medium labels; 'compact' = uppercase gray tracking-widest. */
  labelVariant?: 'default' | 'compact'
  /** Placeholder text per field key. */
  placeholders?: Record<string, string>
  /** Field keys to skip — for values handled outside the generic renderer. */
  omitKeys?: string[]
  /** Field keys to render read-only (e.g. fields gated behind an earlier choice). */
  disabledKeys?: string[]
  /**
   * Lay fields out in two columns, the way the hand-written sheets did. Fields
   * flagged `fullWidth` in config — plus types that need the room (textarea,
   * multiselect, chips, gps, photo) — still span both columns.
   */
  columns?: 1 | 2
  className?: string
}

/**
 * Renders every field configured for one step of a FormDef, using the standard
 * typed input primitives. Field TYPE / LABEL / REQUIRED / ORDER all come from
 * config, so a tenant admin editing Configuration > Forms changes what these
 * forms capture without a code change.
 *
 * Option lists for select/multiselect/chips can be supplied at runtime via
 * `optionsOverride` — needed wherever the choices are derived from live data
 * (programs, cohorts, crops, communities) rather than authored in config.
 */
/** Field types that need the full row even in a two-column layout. */
const WIDE_TYPES = new Set(['textarea', 'multiselect', 'chips', 'gps', 'photo', 'video', 'document', 'file', 'custom'])

function spansFullWidth(field: FieldDef): boolean {
  return field.fullWidth === true || WIDE_TYPES.has(field.type)
}

export function DynamicFormRenderer({
  form, stepId, values, onChange, optionsOverride,
  labelVariant = 'default', placeholders, omitKeys, disabledKeys, columns = 1, className,
}: DynamicFormRendererProps) {
  const fields = visibleFieldsForStep(form, stepId, values).filter(f => !omitKeys?.includes(f.key))

  function renderField(field: FieldDef) {
    const value = values[field.key]
    const options = optionsOverride?.[field.key] ?? field.options ?? []
    const placeholder = placeholders?.[field.key] ?? field.placeholder
    const required = fieldIsRequired(field, values)
    const isDisabled = disabledKeys?.includes(field.key) ?? false
    const asText = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
    const asList = Array.isArray(value) ? (value as string[]) : []

    switch (field.type) {
      case 'text':
      case 'phone':
      case 'email':
        return (
          <InputTemplate
            key={field.key}
            isDisabled={isDisabled}
            type={field.type === 'text' ? 'text' : field.type === 'phone' ? 'tel' : 'email'}
            label={field.label}
            labelVariant={labelVariant}
            placeholder={placeholder}
            isRequired={required}
            value={asText}
            onChange={e => onChange(field.key, e.target.value)}
          />
        )
      case 'number':
        return (
          <InputTemplate
            key={field.key}
            isDisabled={isDisabled}
            type="number"
            label={field.label}
            labelVariant={labelVariant}
            placeholder={placeholder}
            isRequired={required}
            value={asText}
            onChange={e => onChange(field.key, e.target.value)}
          />
        )
      case 'date':
        return (
          <DatePickerTemplate
            key={field.key}
            label={field.label}
            labelVariant={labelVariant}
            isRequired={required}
            value={asText}
            onChange={v => onChange(field.key, v)}
          />
        )
      case 'time':
        return (
          <InputTemplate
            key={field.key}
            isDisabled={isDisabled}
            type="time"
            label={field.label}
            labelVariant={labelVariant}
            isRequired={required}
            value={asText}
            onChange={e => onChange(field.key, e.target.value)}
          />
        )
      case 'textarea':
        return (
          <TextareaTemplate
            key={field.key}
            isDisabled={isDisabled}
            label={field.label}
            labelVariant={labelVariant}
            placeholder={placeholder}
            isRequired={required}
            value={asText}
            onChange={e => onChange(field.key, e.target.value)}
          />
        )
      case 'checkbox':
        return (
          <CheckboxTemplate
            key={field.key}
            label={field.label}
            checked={value === true}
            onChange={e => onChange(field.key, e.target.checked)}
          />
        )
      case 'select':
        return (
          <SelectTemplate
            key={field.key}
            isDisabled={isDisabled}
            label={field.label}
            labelVariant={labelVariant}
            isRequired={required}
            options={[{ value: '', label: placeholder ?? 'Select' }, ...options]}
            value={asText}
            onChange={e => onChange(field.key, e.target.value)}
          />
        )
      case 'multiselect':
        return (
          <MultiSelectTemplate
            key={field.key}
            isDisabled={isDisabled}
            label={field.label}
            isRequired={required}
            placeholder={placeholder}
            options={options}
            value={asList}
            onChange={vals => onChange(field.key, vals)}
          />
        )
      case 'yesno':
        return (
          <YesNoTemplate
            key={field.key}
            label={field.label}
            labelVariant={labelVariant}
            isRequired={required}
            value={asText === 'yes' || asText === 'no' ? asText : ''}
            onChange={v => onChange(field.key, v)}
          />
        )
      case 'chips':
        return (
          <ChipSelectTemplate
            key={field.key}
            label={field.label}
            labelVariant={labelVariant}
            isRequired={required}
            options={options}
            value={asList}
            onChange={vals => onChange(field.key, vals)}
          />
        )
      case 'gps':
        return (
          <GpsFieldTemplate
            key={field.key}
            label={field.label}
            isRequired={required}
            value={asText}
            onChange={v => onChange(field.key, v)}
          />
        )
      // photo / video / document / file — same widget, different accept filter
      case 'photo':
      case 'video':
      case 'document':
      case 'file':
        return (
          <FileUploadTemplate
            key={field.key}
            label={field.label}
            isRequired={required}
            accept={UPLOAD_ACCEPT[field.type] || undefined}
            placeholder={placeholder ?? UPLOAD_PLACEHOLDER[field.type]}
            onChange={file => onChange(field.key, file?.name ?? '')}
          />
        )
      // 'custom' — a bespoke widget the owning screen renders itself
      default:
        return null
    }
  }

  if (columns === 2) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-4', className)}>
        {fields.map(field => (
          <div key={field.key} className={cn(spansFullWidth(field) && 'sm:col-span-2')}>
            {renderField(field)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {fields.map(renderField)}
    </div>
  )
}
