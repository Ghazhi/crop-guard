'use client'

import { useState } from 'react'
import { LayoutTemplate, Plus, Pencil, Trash2, Check, X, RotateCcw, ChevronDown, ChevronRight, ChevronUp, List } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { CheckboxTemplate } from '@/customComponents/CheckboxTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { cn } from '@/lib/utils'
import {
  FORM_CONFIGS_KEY, DEFAULT_FORMS, sortedSteps, fieldsForStep, formsByPage,
  type FormDef, type FieldDef, type FieldType, type FieldOption,
} from '@/dataCenter/formEngine'

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text',        label: 'Text' },
  { value: 'textarea',    label: 'Textarea' },
  { value: 'number',      label: 'Number' },
  { value: 'phone',       label: 'Phone' },
  { value: 'email',       label: 'Email' },
  { value: 'date',        label: 'Date' },
  { value: 'time',        label: 'Time' },
  { value: 'select',      label: 'Select' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'chips',       label: 'Chips (multi)' },
  { value: 'checkbox',    label: 'Checkbox' },
  { value: 'yesno',       label: 'Yes / No' },
  { value: 'gps',         label: 'GPS Location' },
  // Uploads — each applies its own accept filter
  { value: 'photo',       label: 'Image upload' },
  { value: 'video',       label: 'Video upload' },
  { value: 'document',    label: 'Document upload' },
  { value: 'file',        label: 'Any file' },
]

// A 'custom' field is a bespoke section the page renders itself (nested
// matrices, repeaters). It stays renameable/removable, but its type is fixed —
// switching it to a plain input would silently drop the real widget.
const CUSTOM_TYPE_OPTION: { value: FieldType; label: string } = { value: 'custom', label: 'Custom section' }

export function FormsConfigSection() {
  const [forms, setForms] = usePersistedState<FormDef[]>(FORM_CONFIGS_KEY, DEFAULT_FORMS)
  // One page open at a time, and within it one form — keeps a 32-form list scannable.
  const [openPage, setOpenPage] = useState<string | null>(null)
  const [openFormId, setOpenFormId] = useState<string | null>(null)
  const [resetting, setResetting] = useState<FormDef | null>(null)
  const [addingFieldStepId, setAddingFieldStepId] = useState<string | null>(null)
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null)

  function updateForm(formId: string, updater: (f: FormDef) => FormDef) {
    setForms(prev => prev.map(f => f.id === formId ? updater(f) : f))
  }

  function resetForm(formId: string) {
    const original = DEFAULT_FORMS.find(f => f.id === formId)
    if (!original) return
    setForms(prev => prev.map(f => f.id === formId ? original : f))
    setResetting(null)
  }

  function deleteField(formId: string, fieldKey: string) {
    updateForm(formId, f => ({ ...f, fields: f.fields.filter(x => x.key !== fieldKey) }))
  }

  // Swaps a field with its neighbour inside the same step, then renumbers that
  // step 1..n so `order` stays dense however the list has been edited before.
  function moveField(form: FormDef, stepId: string, fieldKey: string, delta: -1 | 1) {
    const stepFields = fieldsForStep(form, stepId)
    const idx = stepFields.findIndex(x => x.key === fieldKey)
    const target = idx + delta
    if (idx < 0 || target < 0 || target >= stepFields.length) return
    const reordered = [...stepFields]
    ;[reordered[idx], reordered[target]] = [reordered[target], reordered[idx]]
    const orderByKey = new Map(reordered.map((f, i) => [f.key, i + 1]))
    updateForm(form.id, f => ({
      ...f,
      fields: f.fields.map(x => orderByKey.has(x.key) ? { ...x, order: orderByKey.get(x.key)! } : x),
    }))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <LayoutTemplate className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
        <h2 className="text-base font-bold text-gray-900">Forms</h2>
      </div>

      <p className="text-xs text-gray-500">
        Forms are grouped by the dashboard page they belong to. Open a page to see its forms, then open a
        form to configure its fields — field name, input type, and whether it&apos;s required.
        Every form ships with a working default; use <span className="font-semibold" style={{ color: 'var(--brand-forest)' }}>Reset to Default</span> to
        undo changes to a form at any time.
      </p>

      <div className="flex flex-col gap-2">
        {formsByPage(forms).map(({ page, forms: pageForms }) => {
          const pageOpen = openPage === page
          return (
          <div key={page} className="rounded-xl border border-(--brand-pale)/50 bg-(--surface-card) overflow-hidden">
            {/* Level 1 — the dashboard page */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/60"
              onClick={() => { setOpenPage(pageOpen ? null : page); setOpenFormId(null) }}
            >
              {pageOpen
                ? <ChevronDown className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />
                : <ChevronRight className="w-4 h-4 text-gray-400" />}
              <p className="text-sm font-bold flex-1" style={{ color: 'var(--brand-forest)' }}>{page}</p>
              <BadgeTemplate
                label={`${pageForms.length} form${pageForms.length !== 1 ? 's' : ''}`}
                variant="neutral" size="sm"
              />
            </div>

            {/* Level 2 — the forms on that page */}
            {pageOpen && (
            <div className="border-t border-gray-100 p-3 flex flex-col gap-2 bg-gray-50/40">
            {pageForms.map(form => {
              const open = openFormId === form.id
              return (
                <div key={form.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div
                    className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-gray-50/70"
                    onClick={() => setOpenFormId(open ? null : form.id)}
                  >
                    {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                    <p className="text-[13px] font-semibold text-gray-800 flex-1">{form.name}</p>
                    <BadgeTemplate label={`${form.fields.length} field${form.fields.length !== 1 ? 's' : ''}`} variant="neutral" size="sm" />
                    <ButtonTemplate
                      variant="ghost" size="xs" label="Reset to Default"
                      leftIcon={<RotateCcw className="w-3 h-3" />}
                      onClick={e => { e.stopPropagation(); setResetting(form) }}
                    />
                  </div>

                  {open && (
                    <div className="border-t border-gray-100 px-4 py-4 flex flex-col gap-5">
                      {sortedSteps(form).map(step => (
                        <div key={step.id} className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{step.name}</p>
                            <ButtonTemplate
                              variant="ghost" size="xs" label="Add Field"
                              leftIcon={<Plus className="w-3 h-3" />}
                              onClick={() => setAddingFieldStepId(addingFieldStepId === step.id ? null : step.id)}
                            />
                          </div>

                          <div className="rounded-lg border border-gray-100 overflow-hidden">
                            {fieldsForStep(form, step.id).map((field, i, arr) => (
                              <FieldRow
                                key={field.key}
                                field={field}
                                isFirst={i === 0}
                                isLast={i === arr.length - 1}
                                onMoveUp={() => moveField(form, step.id, field.key, -1)}
                                onMoveDown={() => moveField(form, step.id, field.key, 1)}
                                isEditing={editingFieldKey === field.key}
                                onEdit={() => setEditingFieldKey(field.key)}
                                onCancelEdit={() => setEditingFieldKey(null)}
                                onSave={updated => {
                                  updateForm(form.id, f => ({ ...f, fields: f.fields.map(x => x.key === field.key ? updated : x) }))
                                  setEditingFieldKey(null)
                                }}
                                onDelete={() => deleteField(form.id, field.key)}
                              />
                            ))}
                            {fieldsForStep(form, step.id).length === 0 && (
                              <p className="px-3 py-3 text-xs text-gray-400 text-center">No fields in this step.</p>
                            )}
                          </div>

                          {addingFieldStepId === step.id && (
                            <NewFieldRow
                              existingKeys={form.fields.map(x => x.key)}
                              onCancel={() => setAddingFieldStepId(null)}
                              onAdd={newField => {
                                const stepFields = fieldsForStep(form, step.id)
                                const order = (stepFields[stepFields.length - 1]?.order ?? 0) + 1
                                updateForm(form.id, f => ({ ...f, fields: [...f.fields, { ...newField, stepId: step.id, order }] }))
                                setAddingFieldStepId(null)
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            </div>
            )}
          </div>
          )
        })}
      </div>

      <ConfirmModal
        open={!!resetting}
        title="Reset Form to Default"
        message={`Reset "${resetting?.name}" to its default field configuration? Any customizations to this form will be lost.`}
        confirmLabel="Reset"
        variant="warning"
        onConfirm={() => resetting && resetForm(resetting.id)}
        onCancel={() => setResetting(null)}
      />
    </div>
  )
}

/** Field types whose option list is author-editable here. Others ignore `options`. */
const OPTION_TYPES: FieldType[] = ['select', 'multiselect']

function FieldRow({
  field, isEditing, isFirst, isLast, onEdit, onCancelEdit, onSave, onDelete, onMoveUp, onMoveDown,
}: {
  field: FieldDef
  isEditing: boolean
  isFirst: boolean
  isLast: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (f: FieldDef) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [label, setLabel] = useState(field.label)
  const [type, setType] = useState<FieldType>(field.type)
  const [required, setRequired] = useState(field.required)
  // One option per line as `label` or `value|label`, which keeps stored values
  // stable when an author only edits the visible text.
  const [optionText, setOptionText] = useState(
    (field.options ?? []).map(o => (o.value === o.label ? o.label : `${o.value}|${o.label}`)).join('\n')
  )

  // reset the draft whenever a different field enters edit mode
  const [lastKey, setLastKey] = useState(field.key)
  if (lastKey !== field.key) {
    setLastKey(field.key)
    setLabel(field.label)
    setType(field.type)
    setRequired(field.required)
    setOptionText((field.options ?? []).map(o => (o.value === o.label ? o.label : `${o.value}|${o.label}`)).join('\n'))
  }

  function parseOptions(): FieldOption[] | undefined {
    if (!OPTION_TYPES.includes(type)) return undefined
    const parsed = optionText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [rawValue, ...rest] = line.split('|')
        const value = rawValue.trim()
        const text = rest.join('|').trim()
        return text ? { value, label: text } : { value, label: value }
      })
    return parsed.length > 0 ? parsed : undefined
  }

  if (isEditing) {
    const editsOptions = OPTION_TYPES.includes(type)
    return (
      <div className="flex flex-col gap-2 px-3 py-2.5 border-b border-gray-50 last:border-b-0 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <InputTemplate size="sm" value={label} onChange={e => setLabel(e.target.value)} className="flex-1" />
          <SelectTemplate
            size="sm"
            options={field.type === 'custom' ? [CUSTOM_TYPE_OPTION] : FIELD_TYPE_OPTIONS}
            isDisabled={field.type === 'custom'}
            value={type} onChange={e => setType(e.target.value as FieldType)} className="w-32" />
          <CheckboxTemplate size="sm" label="Required" checked={required} onChange={e => setRequired(e.target.checked)} />
          <ButtonTemplate variant="outline" size="xs" isIcon tooltip="Save" leftIcon={<Check className="w-3.5 h-3.5" />}
            onClick={() => onSave({ ...field, label: label.trim() || field.label, type, required, options: parseOptions() })} />
          <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Cancel" leftIcon={<X className="w-3.5 h-3.5" />} onClick={onCancelEdit} />
        </div>
        {editsOptions && (
          <div className="flex flex-col gap-1 pl-1">
            <label className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Options — one per line</label>
            <textarea
              rows={4}
              value={optionText}
              onChange={e => setOptionText(e.target.value)}
              placeholder={'Male\nFemale\nprefer_not_to_say|Prefer not to say'}
              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none transition-all focus:border-(--brand-green) focus:ring-2 focus:ring-(--brand-green)/20 placeholder:text-gray-300"
            />
            <p className="text-[10px] text-gray-400">
              Leave empty for lists the app fills in at runtime (programs, cohorts, crops, regions).
              Use <span className="font-mono">value|Label</span> to keep a stored value distinct from its display text.
            </p>
          </div>
        )}
      </div>
    )
  }

  const optionCount = field.options?.length ?? 0

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-50 last:border-b-0 group hover:bg-gray-50/50">
      <div className="flex flex-col shrink-0 -my-1">
        <button
          type="button" aria-label="Move field up" disabled={isFirst} onClick={onMoveUp}
          className="text-gray-300 hover:text-(--brand-forest) disabled:opacity-30 disabled:hover:text-gray-300 leading-none"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button" aria-label="Move field down" disabled={isLast} onClick={onMoveDown}
          className="text-gray-300 hover:text-(--brand-forest) disabled:opacity-30 disabled:hover:text-gray-300 leading-none"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-sm text-gray-800 flex-1 truncate">{field.label}</p>
      {OPTION_TYPES.includes(field.type) && (
        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 shrink-0">
          <List className="w-3 h-3" />
          {optionCount > 0 ? `${optionCount} option${optionCount !== 1 ? 's' : ''}` : 'dynamic'}
        </span>
      )}
      <BadgeTemplate
        label={(field.type === 'custom' ? CUSTOM_TYPE_OPTION : FIELD_TYPE_OPTIONS.find(o => o.value === field.type))?.label ?? field.type}
        variant={field.type === 'custom' ? 'neutral' : 'info'} size="sm" />
      {field.required && <BadgeTemplate label="Required" variant="warning" size="sm" />}
      <div className={cn('flex items-center gap-1 shrink-0', 'opacity-0 group-hover:opacity-100')}>
        <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={onEdit} />
        <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={onDelete} />
      </div>
    </div>
  )
}

function NewFieldRow({
  existingKeys, onAdd, onCancel,
}: {
  existingKeys: string[]
  onAdd: (f: Omit<FieldDef, 'stepId' | 'order'>) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState('')
  const [type, setType] = useState<FieldType>('text')
  const [required, setRequired] = useState(false)

  function slugify(s: string) {
    const base = s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field'
    let key = base
    let i = 2
    while (existingKeys.includes(key)) { key = `${base}_${i}`; i++ }
    return key
  }

  function submit() {
    if (!label.trim()) return
    onAdd({ key: slugify(label), label: label.trim(), type, required })
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-200 bg-gray-50/40">
      <InputTemplate size="sm" placeholder="Field name…" value={label} onChange={e => setLabel(e.target.value)} className="flex-1" />
      <SelectTemplate size="sm" options={FIELD_TYPE_OPTIONS} value={type} onChange={e => setType(e.target.value as FieldType)} className="w-32" />
      <CheckboxTemplate size="sm" label="Required" checked={required} onChange={e => setRequired(e.target.checked)} />
      <ButtonTemplate variant="primary" size="xs" label="Add" leftIcon={<Check className="w-3.5 h-3.5" />} onClick={submit} />
      <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Cancel" leftIcon={<X className="w-3.5 h-3.5" />} onClick={onCancel} />
    </div>
  )
}
