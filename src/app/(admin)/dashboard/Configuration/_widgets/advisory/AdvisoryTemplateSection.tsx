'use client'

import { useState } from 'react'
import { Lightbulb, Plus, Pencil, Trash2 } from 'lucide-react'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { TextareaTemplate } from '@/customComponents/TextareaTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { usePersistedState } from '@/lib/usePersistedState'
import { useCropOptions } from '@/dataCenter/useCropOptions'
import {
  type AdvisoryTemplate, type AdvisoryMessage,
  SEED_ADVISORY_TEMPLATES,
} from '../../_logics/advisoryConfig'

function emptyMessage(): AdvisoryMessage {
  return { id: `am-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: '' }
}

function emptyTemplate(): AdvisoryTemplate {
  return { id: `at-${Date.now()}`, title: '', description: '', cropType: '', messages: [], isActive: true }
}

function TemplateFormSheet({
  open, template, onClose, onSave,
}: {
  open: boolean
  template: AdvisoryTemplate | null
  onClose: () => void
  onSave: (t: AdvisoryTemplate) => void
}) {
  const [draft, setDraft] = useState<AdvisoryTemplate>(template ?? emptyTemplate())
  const CROP_OPTIONS = useCropOptions()

  function updateMessage(idx: number, text: string) {
    setDraft({ ...draft, messages: draft.messages.map((m, i) => i === idx ? { ...m, text } : m) })
  }
  function removeMessage(idx: number) {
    setDraft({ ...draft, messages: draft.messages.filter((_, i) => i !== idx) })
  }
  function addMessage() {
    setDraft({ ...draft, messages: [...draft.messages, emptyMessage()] })
  }

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title={template ? 'Edit Advisory Template' : 'New Advisory Template'}
      size="lg"
      footer={
        <>
          <ButtonTemplate variant="outline" label="Cancel" onClick={onClose} />
          <ButtonTemplate
            variant="primary"
            label="Save Template"
            isDisabled={!draft.title.trim()}
            onClick={() => onSave(draft)}
          />
        </>
      }
    >
      <div className="px-6 py-5 flex flex-col gap-5">
        <InputTemplate
          label="Template Title" isRequired
          value={draft.title}
          onChange={e => setDraft({ ...draft, title: e.target.value })}
        />
        <TextareaTemplate
          label="Description"
          rows={2}
          value={draft.description}
          onChange={e => setDraft({ ...draft, description: e.target.value })}
        />
        <SelectTemplate
          label="Crop Type"
          placeholder="Select a crop..."
          options={CROP_OPTIONS}
          value={draft.cropType}
          onChange={e => setDraft({ ...draft, cropType: e.target.value })}
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Messages ({draft.messages.length})</p>
            <ButtonTemplate variant="outline" size="xs" label="+ Add Message" onClick={addMessage} />
          </div>
          {draft.messages.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-2">No messages yet. Click &apos;Add Message&apos; to start.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {draft.messages.map((m, idx) => (
                <div key={m.id} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <InputTemplate
                      size="sm"
                      placeholder="Advisory message text"
                      value={m.text}
                      onChange={e => updateMessage(idx, e.target.value)}
                    />
                  </div>
                  <ButtonTemplate
                    variant="ghost" size="sm" isIcon tooltip="Delete message"
                    leftIcon={<Trash2 className="w-3.5 h-3.5 text-gray-400" />}
                    onClick={() => removeMessage(idx)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SheetTemplate>
  )
}

export function AdvisoryTemplateSection() {
  const [templates, setTemplates] = usePersistedState<AdvisoryTemplate[]>('advisoryConfig.templates', SEED_ADVISORY_TEMPLATES)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<AdvisoryTemplate | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [deleting, setDeleting] = useState<AdvisoryTemplate | null>(null)

  function openNew() {
    setEditing(null)
    setFormKey(k => k + 1)
    setSheetOpen(true)
  }
  function openEdit(t: AdvisoryTemplate) {
    setEditing(t)
    setFormKey(k => k + 1)
    setSheetOpen(true)
  }
  function handleSave(t: AdvisoryTemplate) {
    setTemplates(prev => {
      const exists = prev.some(p => p.id === t.id)
      return exists ? prev.map(p => p.id === t.id ? t : p) : [...prev, t]
    })
    setSheetOpen(false)
  }
  function confirmDelete() {
    if (!deleting) return
    setTemplates(prev => prev.filter(p => p.id !== deleting.id))
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Advisory Template</h3>
          <p className="text-xs text-gray-400">Create reusable advisory message sets by crop</p>
        </div>
        <ButtonTemplate variant="primary" size="sm" label="New Template" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openNew} />
      </div>

      {templates.length === 0 ? (
        <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-12 flex flex-col items-center gap-2">
          <Lightbulb className="w-8 h-8 text-gray-200" />
          <p className="text-sm font-medium text-gray-400 text-center">No advisory templates yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map(t => (
            <div key={t.id} className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                  {t.cropType && <BadgeTemplate label={t.cropType} variant="info" size="sm" />}
                  <BadgeTemplate label={`${t.messages.length} messages`} variant="neutral" size="sm" />
                  {!t.isActive && <BadgeTemplate label="Inactive" variant="warning" size="sm" />}
                </div>
                {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openEdit(t)} />
                <ButtonTemplate variant="danger" size="sm" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setDeleting(t)} />
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateFormSheet
        key={formKey}
        open={sheetOpen}
        template={editing}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
      />

      <ConfirmModal
        open={!!deleting}
        title="Delete Template"
        message={`Delete "${deleting?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
