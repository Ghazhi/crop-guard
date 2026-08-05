'use client'

import { useState } from 'react'
import { Layers, Plus, Pencil, Trash2 } from 'lucide-react'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { TextareaTemplate } from '@/customComponents/TextareaTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { usePersistedState } from '@/lib/usePersistedState'
import {
  type BaselineTemplate, type BaselineItem,
  BASELINE_PILLAR_META, ECI_META, CROP_TYPE_OPTIONS, SEED_BASELINE_TEMPLATES,
} from '../../_logics/checkinConfig'

const BADGE_DOT_CLASS: Record<'blue' | 'green' | 'amber' | 'teal' | 'purple', string> = {
  blue:   'bg-blue-50 text-blue-700 border-blue-100',
  green:  'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber:  'bg-amber-50 text-amber-700 border-amber-100',
  teal:   'bg-teal-50 text-teal-700 border-teal-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
}

function PillarBadge({ color, label }: { color: 'blue' | 'green' | 'amber' | 'teal' | 'purple'; label: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${BADGE_DOT_CLASS[color]}`}>
      {label}
    </span>
  )
}

type PillarKey = 'p1Items' | 'p2Items' | 'p3Items' | 'p4Items'
const PILLAR_KEYS: PillarKey[] = ['p1Items', 'p2Items', 'p3Items', 'p4Items']
const PILLAR_META_KEY: Record<PillarKey, keyof typeof BASELINE_PILLAR_META> = {
  p1Items: 'p1', p2Items: 'p2', p3Items: 'p3', p4Items: 'p4',
}

function emptyItem(prefix: string): BaselineItem {
  return { id: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label: '', guidance: '', max: 6 }
}

function emptyTemplate(): BaselineTemplate {
  return {
    id: `bt-${Date.now()}`,
    title: '', description: '', cropType: 'maize',
    p1Items: [], p2Items: [], p3Items: [], p4Items: [],
    includeEci: false, eciItems: [], isActive: true,
  }
}

function itemCountSummary(t: BaselineTemplate) {
  const parts = [
    `P1: ${t.p1Items.length} items`,
    `P2: ${t.p2Items.length} items`,
    `P3: ${t.p3Items.length} items`,
    `P4: ${t.p4Items.length} items`,
  ]
  if (t.includeEci) parts.push(`ECI: ${t.eciItems.length} items`)
  return parts.join(' · ')
}

function ItemRow({
  item, onChange, onDelete,
}: {
  item: BaselineItem
  onChange: (next: BaselineItem) => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <InputTemplate
          size="sm"
          placeholder="Item label"
          value={item.label}
          onChange={e => onChange({ ...item, label: e.target.value })}
        />
      </div>
      <div className="flex-1 min-w-0">
        <InputTemplate
          size="sm"
          placeholder="Guidance"
          value={item.guidance}
          onChange={e => onChange({ ...item, guidance: e.target.value })}
        />
      </div>
      <div className="w-20 shrink-0">
        <InputTemplate
          size="sm"
          type="number"
          min={0}
          value={item.max}
          onChange={e => onChange({ ...item, max: Number(e.target.value) })}
        />
      </div>
      <ButtonTemplate
        variant="ghost" size="sm" isIcon tooltip="Delete item"
        leftIcon={<Trash2 className="w-3.5 h-3.5 text-gray-400" />}
        onClick={onDelete}
        className="shrink-0"
      />
    </div>
  )
}

function PillarEditor({
  pillarKey, items, onChange,
}: {
  pillarKey: PillarKey
  items: BaselineItem[]
  onChange: (items: BaselineItem[]) => void
}) {
  const meta = BASELINE_PILLAR_META[PILLAR_META_KEY[pillarKey]]

  function addItem() {
    onChange([...items, emptyItem(pillarKey)])
  }
  function updateItem(idx: number, next: BaselineItem) {
    onChange(items.map((it, i) => i === idx ? next : it))
  }
  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <PillarBadge color={meta.badge} label={meta.label} />
        <ButtonTemplate variant="outline" size="xs" label="+ Add Item" onClick={addItem} />
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-2">No items. Click &apos;Add Item&apos; to start.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, idx) => (
            <ItemRow key={item.id} item={item} onChange={next => updateItem(idx, next)} onDelete={() => removeItem(idx)} />
          ))}
        </div>
      )}
    </div>
  )
}

function TemplateFormSheet({
  open, template, onClose, onSave,
}: {
  open: boolean
  template: BaselineTemplate | null
  onClose: () => void
  onSave: (t: BaselineTemplate) => void
}) {
  // parent remounts this component (via `key`) each time the sheet is opened,
  // so this initial value is fresh for every open — either the template being
  // edited, or a blank one for "New Template".
  const [draft, setDraft] = useState<BaselineTemplate>(template ?? emptyTemplate())

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title={template ? 'Edit Baseline Template' : 'New Baseline Template'}
      size="xl"
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
          options={CROP_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          value={draft.cropType}
          onChange={e => setDraft({ ...draft, cropType: e.target.value as BaselineTemplate['cropType'] })}
        />

        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-800">Include ECI Section</p>
            <p className="text-xs text-gray-400">Adds an optional Eligibility & Commitment Index section</p>
          </div>
          <button
            type="button"
            onClick={() => setDraft({ ...draft, includeEci: !draft.includeEci })}
            className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${draft.includeEci ? 'bg-(--brand-green)' : 'bg-gray-200'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${draft.includeEci ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {PILLAR_KEYS.map(key => (
            <PillarEditor
              key={key}
              pillarKey={key}
              items={draft[key]}
              onChange={items => setDraft({ ...draft, [key]: items })}
            />
          ))}
        </div>

        {draft.includeEci && (
          <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between gap-2">
              <PillarBadge color={ECI_META.badge} label={ECI_META.label} />
              <ButtonTemplate
                variant="outline" size="xs" label="+ Add ECI Item"
                onClick={() => setDraft({ ...draft, eciItems: [...draft.eciItems, emptyItem('eci')] })}
              />
            </div>
            {draft.eciItems.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">No items. Click &apos;Add ECI Item&apos; to start.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {draft.eciItems.map((item, idx) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onChange={next => setDraft({ ...draft, eciItems: draft.eciItems.map((it, i) => i === idx ? next : it) })}
                    onDelete={() => setDraft({ ...draft, eciItems: draft.eciItems.filter((_, i) => i !== idx) })}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SheetTemplate>
  )
}

export function BaselineTemplatesSection() {
  const [templates, setTemplates] = usePersistedState<BaselineTemplate[]>('checkinConfigV2.baselineTemplates', SEED_BASELINE_TEMPLATES)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<BaselineTemplate | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [deleting, setDeleting] = useState<BaselineTemplate | null>(null)

  function openNew() {
    setEditing(null)
    setFormKey(k => k + 1)
    setSheetOpen(true)
  }
  function openEdit(t: BaselineTemplate) {
    setEditing(t)
    setFormKey(k => k + 1)
    setSheetOpen(true)
  }
  function handleSave(t: BaselineTemplate) {
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
          <h3 className="text-sm font-bold text-gray-900">Baseline Templates</h3>
          <p className="text-xs text-gray-400">Create reusable baseline assessments with 4 pillars + ECI</p>
        </div>
        <ButtonTemplate variant="primary" size="sm" label="New Template" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openNew} />
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center gap-2">
          <Layers className="w-8 h-8 text-gray-200" />
          <p className="text-sm font-medium text-gray-400 text-center">No baseline templates yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                  <BadgeTemplate label={t.cropType} variant="neutral" size="sm" />
                  {t.includeEci && <BadgeTemplate label="ECI" variant="info" size="sm" />}
                  {!t.isActive && <BadgeTemplate label="Inactive" variant="warning" size="sm" />}
                </div>
                {t.description && <p className="text-xs text-gray-500 mb-1">{t.description}</p>}
                <p className="text-xs text-gray-400">{itemCountSummary(t)}</p>
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
