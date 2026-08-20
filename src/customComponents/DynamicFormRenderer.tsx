'use client'

import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { CheckboxTemplate } from '@/customComponents/CheckboxTemplate'
import { TextareaTemplate } from '@/customComponents/TextareaTemplate'
import { MultiSelectTemplate } from '@/customComponents/MultiSelectTemplate'
import { fieldsForStep, type FieldDef, type FormDef } from '@/dataCenter/formEngine'

export interface DynamicFormRendererProps {
  form:     FormDef
  stepId:   string
  values:   Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  /** Override options for a select/multiselect field at render time (e.g. dynamic program/cohort lists) — keyed by FieldDef.key. Falls back to the field's own static `options`. */
  optionsOverride?: Record<string, { value: string; label: string }[]>
}

/**
 * Renders every field configured for one step of a FormDef, using the
 * standard typed input primitives. Field TYPE/LABEL/REQUIRED come from
 * config; option lists for select/multiselect can be supplied dynamically
 * via optionsOverride (e.g. this cohort depends on the selected program).
 */
export function DynamicFormRenderer({ form, stepId, values, onChange, optionsOverride }: DynamicFormRendererProps) {
  const fields = fieldsForStep(form, stepId)

  function renderField(field: FieldDef) {
    const value = values[field.key]
    const options = optionsOverride?.[field.key] ?? field.options ?? []

    switch (field.type) {
      case 'text':
        return (
          <InputTemplate
            key={field.key}
            label={field.label}
            isRequired={field.required}
            value={typeof value === 'string' ? value : ''}
            onChange={e => onChange(field.key, e.target.value)}
          />
        )
      case 'number':
        return (
          <InputTemplate
            key={field.key}
            type="number"
            label={field.label}
            isRequired={field.required}
            value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
            onChange={e => onChange(field.key, e.target.value)}
          />
        )
      case 'date':
        return (
          <InputTemplate
            key={field.key}
            type="date"
            label={field.label}
            isRequired={field.required}
            value={typeof value === 'string' ? value : ''}
            onChange={e => onChange(field.key, e.target.value)}
          />
        )
      case 'time':
        return (
          <InputTemplate
            key={field.key}
            type="time"
            label={field.label}
            isRequired={field.required}
            value={typeof value === 'string' ? value : ''}
            onChange={e => onChange(field.key, e.target.value)}
          />
        )
      case 'textarea':
        return (
          <TextareaTemplate
            key={field.key}
            label={field.label}
            isRequired={field.required}
            value={typeof value === 'string' ? value : ''}
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
            label={field.label}
            isRequired={field.required}
            options={options}
            value={typeof value === 'string' ? value : ''}
            onChange={e => onChange(field.key, e.target.value)}
          />
        )
      case 'multiselect':
        return (
          <MultiSelectTemplate
            key={field.key}
            label={field.label}
            isRequired={field.required}
            options={options}
            value={Array.isArray(value) ? value as string[] : []}
            onChange={vals => onChange(field.key, vals)}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {fields.map(renderField)}
    </div>
  )
}
