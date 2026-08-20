'use client'

import { useState } from 'react'
import { LayoutTemplate, Plus, Pencil, Trash2, Check, X, RotateCcw, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { CheckboxTemplate } from '@/customComponents/CheckboxTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { cn } from '@/lib/utils'
import {
  FORM_CONFIGS_KEY, DEFAULT_FORMS, sortedSteps, fieldsForStep,
  type FormDef, type FieldDef, type FieldType,
} from '@/dataCenter/formEngine'

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text',        label: 'Text' },
  { value: 'number',      label: 'Number' },
  { value: 'date',        label: 'Date' },
  { value: 'time',        label: 'Time' },
  { value: 'select',      label: 'Select' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'checkbox',    label: 'Checkbox' },
  { value: 'textarea',    label: 'Textarea' },
]

export function FormsConfigSection() {
  const [forms, setForms] = usePersistedState<FormDef[]>(FORM_CONFIGS_KEY, DEFAULT_FORMS)
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <LayoutTemplate className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
        <h2 className="text-base font-bold text-gray-900">Forms</h2>
      </div>

      <p className="text-xs text-gray-500">
        Configure the fields on every registration/CRUD form across the dashboard — field name, input type, and whether it&apos;s required.
        Every form ships with a working default; use <span className="font-semibold" style={{ color: 'var(--brand-forest)' }}>Reset to Default</span> to
        undo changes to a form at any time.
      </p>

      <div className="flex flex-col gap-2">
        {forms.map(form => {
          const open = openFormId === form.id
          return (
            <div key={form.id} className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50"
                onClick={() => setOpenFormId(open ? null : form.id)}
              >
                {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <p className="text-sm font-semibold text-gray-800 flex-1">{form.name}</p>
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
                        {fieldsForStep(form, step.id).map(field => (
                          <FieldRow
                            key={field.key}
                            field={field}
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

function FieldRow({
  field, isEditing, onEdit, onCancelEdit, onSave, onDelete,
}: {
  field: FieldDef
  isEditing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (f: FieldDef) => void
  onDelete: () => void
}) {
  const [label, setLabel] = useState(field.label)
  const [type, setType] = useState<FieldType>(field.type)
  const [required, setRequired] = useState(field.required)

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-50 last:border-b-0 bg-gray-50/50">
        <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
        <InputTemplate size="sm" value={label} onChange={e => setLabel(e.target.value)} className="flex-1" />
        <SelectTemplate size="sm" options={FIELD_TYPE_OPTIONS} value={type} onChange={e => setType(e.target.value as FieldType)} className="w-32" />
        <CheckboxTemplate size="sm" label="Required" checked={required} onChange={e => setRequired(e.target.checked)} />
        <ButtonTemplate variant="outline" size="xs" isIcon tooltip="Save" leftIcon={<Check className="w-3.5 h-3.5" />}
          onClick={() => onSave({ ...field, label: label.trim() || field.label, type, required })} />
        <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Cancel" leftIcon={<X className="w-3.5 h-3.5" />} onClick={onCancelEdit} />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-50 last:border-b-0 group hover:bg-gray-50/50">
      <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
      <p className="text-sm text-gray-800 flex-1 truncate">{field.label}</p>
      <BadgeTemplate label={FIELD_TYPE_OPTIONS.find(o => o.value === field.type)?.label ?? field.type} variant="info" size="sm" />
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
