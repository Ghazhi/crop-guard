'use client'

import { useState } from 'react'
import { Layers, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Copy } from 'lucide-react'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { TextareaTemplate } from '@/customComponents/TextareaTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { usePersistedState } from '@/lib/usePersistedState'
import { PARTNERS } from '@/dataCenter/partners'
import {
  type BaselineTemplate, type BaselineItem,
  type CheckinTemplate, type CheckinWeek, type CheckinItem, type CheckinComponent,
  BASELINE_PILLAR_META, ECI_META, CROP_TYPE_OPTIONS, SEED_BASELINE_TEMPLATES,
  CHECKIN_COMPONENT_META, SEED_CHECKIN_TEMPLATES,
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
    partnerId: null, partnerName: null,
    p1Items: [], p2Items: [], p3Items: [], p4Items: [],
    includeEci: false, eciItems: [], isActive: true,
    linkedCheckinTemplateId: null,
  }
}

function emptyCheckinTemplate(): CheckinTemplate {
  return {
    id: `ct-${Date.now()}`,
    title: '', cropType: 'maize', season: '', description: '',
    isActive: true, weeks: [],
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

// ─── Embedded check-in weeks editor (ported from CheckinTemplatesSection) ──

function CheckinToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${checked ? 'bg-(--brand-green)' : 'bg-gray-200'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

function ComponentBadge({ component }: { component: CheckinComponent }) {
  const meta = CHECKIN_COMPONENT_META[component]
  const cls: Record<CheckinComponent, string> = {
    agronomy:             'bg-blue-50 text-blue-700 border-blue-100',
    climate_smart:        'bg-emerald-50 text-emerald-700 border-emerald-100',
    advisory_commitment:  'bg-amber-50 text-amber-700 border-amber-100',
    farm_enterprise:      'bg-teal-50 text-teal-700 border-teal-100',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls[component]}`}>
      {meta.label}
    </span>
  )
}

function CheckinWeeksEditor({
  weeks, onChange,
}: {
  weeks: CheckinWeek[]
  onChange: (weeks: CheckinWeek[]) => void
}) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set(weeks.slice(0, 1).map(w => w.weekNumber)))

  function toggleWeek(n: number) {
    setExpandedWeeks(prev => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n); else next.add(n)
      return next
    })
  }

  function addWeek() {
    const nextNum = weeks.length === 0 ? 1 : Math.max(...weeks.map(w => w.weekNumber)) + 1
    onChange([...weeks, { weekNumber: nextNum, items: [] }])
    setExpandedWeeks(prev => new Set(prev).add(nextNum))
  }

  function updateWeekItems(weekNumber: number, items: CheckinItem[]) {
    onChange(weeks.map(w => w.weekNumber === weekNumber ? { ...w, items } : w))
  }

  function addItem(weekNumber: number) {
    const item: CheckinItem = {
      id: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      component: 'agronomy', label: '', description: '', isActive: true,
    }
    const week = weeks.find(w => w.weekNumber === weekNumber)
    if (!week) return
    updateWeekItems(weekNumber, [...week.items, item])
  }

  return (
    <div className="flex flex-col gap-2">
      {weeks.map(week => {
        const open = expandedWeeks.has(week.weekNumber)
        const grouped: Partial<Record<CheckinComponent, CheckinItem[]>> = {}
        for (const item of week.items) {
          grouped[item.component] = grouped[item.component] ?? []
          grouped[item.component]!.push(item)
        }
        return (
          <div key={week.weekNumber} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleWeek(week.weekNumber)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: 'var(--brand-forest)' }}>
                W{week.weekNumber}
              </div>
              <p className="flex-1 text-left text-sm font-semibold text-gray-900">Week {week.weekNumber}</p>
              <span className="text-xs text-gray-400">{week.items.length} items</span>
              {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {open && (
              <div className="border-t border-gray-100 flex flex-col">
                {(Object.keys(CHECKIN_COMPONENT_META) as CheckinComponent[]).map(comp => {
                  const items = grouped[comp]
                  if (!items || items.length === 0) return null
                  return (
                    <div key={comp} className="px-4 py-3 border-b border-gray-100 last:border-b-0 flex flex-col gap-2">
                      <ComponentBadge component={comp} />
                      {items.map(item => (
                        <div key={item.id} className="flex items-start gap-2 pl-1">
                          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <SelectTemplate
                                size="sm"
                                className="max-w-40"
                                options={(Object.keys(CHECKIN_COMPONENT_META) as CheckinComponent[]).map(c => ({ value: c, label: CHECKIN_COMPONENT_META[c].label }))}
                                value={item.component}
                                onChange={e => updateWeekItems(week.weekNumber, week.items.map(it => it.id === item.id ? { ...it, component: e.target.value as CheckinComponent } : it))}
                              />
                            </div>
                            <InputTemplate
                              size="sm" placeholder="Item label"
                              value={item.label}
                              onChange={e => updateWeekItems(week.weekNumber, week.items.map(it => it.id === item.id ? { ...it, label: e.target.value } : it))}
                            />
                            <InputTemplate
                              size="sm" placeholder="Description"
                              value={item.description}
                              onChange={e => updateWeekItems(week.weekNumber, week.items.map(it => it.id === item.id ? { ...it, description: e.target.value } : it))}
                            />
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 mt-1">
                            <CheckinToggle
                              checked={item.isActive}
                              onChange={v => updateWeekItems(week.weekNumber, week.items.map(it => it.id === item.id ? { ...it, isActive: v } : it))}
                            />
                            <ButtonTemplate
                              variant="ghost" size="sm" isIcon tooltip="Delete item"
                              leftIcon={<Trash2 className="w-3.5 h-3.5 text-gray-400" />}
                              onClick={() => updateWeekItems(week.weekNumber, week.items.filter(it => it.id !== item.id))}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
                <div className="px-4 py-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => addItem(week.weekNumber)}
                    className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--brand-forest)' }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add item
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      <ButtonTemplate variant="outline" size="sm" label="+ Add Week" onClick={addWeek} className="self-start" />
    </div>
  )
}

// ─── Combined Template Form Sheet ───────────────────────────────────────────

function TemplateFormSheet({
  open, template, checkinTemplate, onClose, onSave,
}: {
  open: boolean
  template: BaselineTemplate | null
  checkinTemplate: CheckinTemplate | null
  onClose: () => void
  onSave: (baseline: BaselineTemplate, checkin: CheckinTemplate) => void
}) {
  // parent remounts this component (via `key`) each time the sheet is opened,
  // so this initial value is fresh for every open — either the template being
  // edited, or a blank one for "New Template".
  const [draft, setDraft] = useState<BaselineTemplate>(template ?? emptyTemplate())
  const [checkinDraft, setCheckinDraft] = useState<CheckinTemplate>(checkinTemplate ?? emptyCheckinTemplate())

  function handleSave() {
    const syncedCheckin: CheckinTemplate = {
      ...checkinDraft,
      title: checkinDraft.title.trim() || `${draft.title} — Weekly Check-in`,
      cropType: draft.cropType === 'cocoa' ? 'maize' : draft.cropType,
    }
    onSave({ ...draft, linkedCheckinTemplateId: syncedCheckin.id }, syncedCheckin)
  }

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title={template ? 'Edit Baseline & Check-in Template' : 'New Baseline & Check-in Template'}
      size="xl"
      footer={
        <>
          <ButtonTemplate variant="outline" label="Cancel" onClick={onClose} />
          <ButtonTemplate
            variant="primary"
            label="Save Template"
            isDisabled={!draft.title.trim()}
            onClick={handleSave}
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
        <div className="grid grid-cols-2 gap-3">
          <SelectTemplate
            label="Crop Type"
            options={CROP_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
            value={draft.cropType}
            onChange={e => setDraft({ ...draft, cropType: e.target.value as BaselineTemplate['cropType'] })}
          />
          <SelectTemplate
            label="Partner"
            placeholder="No partner selected"
            options={PARTNERS.map(p => ({ value: p.id, label: p.name }))}
            value={draft.partnerId ?? ''}
            onChange={e => {
              const partner = PARTNERS.find(p => p.id === e.target.value)
              setDraft({ ...draft, partnerId: partner?.id ?? null, partnerName: partner?.name ?? null })
            }}
          />
        </div>

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

        {/* ── Linked weekly check-in template ── */}
        <div className="flex flex-col gap-4 border-t border-gray-100 pt-4">
          <div>
            <p className="text-sm font-bold text-gray-900">Weekly Check-in Template</p>
            <p className="text-xs text-gray-400">Created together with this baseline template, linked to the same cohort schedule</p>
          </div>
          <InputTemplate
            label="Check-in Title"
            placeholder={`${draft.title || 'Template'} — Weekly Check-in`}
            value={checkinDraft.title}
            onChange={e => setCheckinDraft({ ...checkinDraft, title: e.target.value })}
          />
          <InputTemplate
            label="Season" placeholder="e.g. 2026A"
            value={checkinDraft.season}
            onChange={e => setCheckinDraft({ ...checkinDraft, season: e.target.value })}
          />
          <TextareaTemplate
            label="Check-in Description"
            rows={2}
            value={checkinDraft.description}
            onChange={e => setCheckinDraft({ ...checkinDraft, description: e.target.value })}
          />
          <CheckinWeeksEditor
            weeks={checkinDraft.weeks}
            onChange={weeks => setCheckinDraft({ ...checkinDraft, weeks })}
          />
        </div>
      </div>
    </SheetTemplate>
  )
}

export function BaselineTemplatesSection() {
  const [templates, setTemplates] = usePersistedState<BaselineTemplate[]>('checkinConfigV2.baselineTemplates', SEED_BASELINE_TEMPLATES)
  const [checkinTemplates, setCheckinTemplates] = usePersistedState<CheckinTemplate[]>('checkinConfigV2.checkinTemplates', SEED_CHECKIN_TEMPLATES)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<BaselineTemplate | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [deleting, setDeleting] = useState<BaselineTemplate | null>(null)

  function linkedCheckinFor(t: BaselineTemplate | null): CheckinTemplate | null {
    if (!t?.linkedCheckinTemplateId) return null
    return checkinTemplates.find(c => c.id === t.linkedCheckinTemplateId) ?? null
  }

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
  function handleSave(baseline: BaselineTemplate, checkin: CheckinTemplate) {
    setTemplates(prev => {
      const exists = prev.some(p => p.id === baseline.id)
      return exists ? prev.map(p => p.id === baseline.id ? baseline : p) : [...prev, baseline]
    })
    setCheckinTemplates(prev => {
      const exists = prev.some(p => p.id === checkin.id)
      return exists ? prev.map(p => p.id === checkin.id ? checkin : p) : [...prev, checkin]
    })
    setSheetOpen(false)
  }
  function confirmDelete() {
    if (!deleting) return
    setTemplates(prev => prev.filter(p => p.id !== deleting.id))
    setDeleting(null)
  }
  function handleDuplicate(t: BaselineTemplate) {
    const newId = `bt-${Date.now()}`
    const duplicate: BaselineTemplate = {
      ...t,
      id: newId,
      title: `${t.title} (Copy)`,
      p1Items: t.p1Items.map(i => ({ ...i, id: `${i.id}-copy-${Date.now()}` })),
      p2Items: t.p2Items.map(i => ({ ...i, id: `${i.id}-copy-${Date.now()}` })),
      p3Items: t.p3Items.map(i => ({ ...i, id: `${i.id}-copy-${Date.now()}` })),
      p4Items: t.p4Items.map(i => ({ ...i, id: `${i.id}-copy-${Date.now()}` })),
      eciItems: t.eciItems.map(i => ({ ...i, id: `${i.id}-copy-${Date.now()}` })),
      linkedCheckinTemplateId: null,
    }
    const linkedCheckin = linkedCheckinFor(t)
    if (linkedCheckin) {
      const newCheckinId = `ct-${Date.now()}`
      const duplicateCheckin: CheckinTemplate = {
        ...linkedCheckin,
        id: newCheckinId,
        title: `${linkedCheckin.title} (Copy)`,
        weeks: linkedCheckin.weeks.map(w => ({
          ...w,
          items: w.items.map(i => ({ ...i, id: `${i.id}-copy-${Date.now()}` })),
        })),
      }
      duplicate.linkedCheckinTemplateId = newCheckinId
      setCheckinTemplates(prev => [...prev, duplicateCheckin])
    }
    setTemplates(prev => [...prev, duplicate])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Baseline Templates</h3>
          <p className="text-xs text-gray-400">Create reusable baseline assessments with 4 pillars + ECI, plus a linked weekly check-in template</p>
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
                  {t.partnerName && <BadgeTemplate label={t.partnerName} variant="success" size="sm" />}
                  {t.linkedCheckinTemplateId && <BadgeTemplate label="Check-in linked" variant="warning" size="sm" />}
                  {!t.isActive && <BadgeTemplate label="Inactive" variant="warning" size="sm" />}
                </div>
                {t.description && <p className="text-xs text-gray-500 mb-1">{t.description}</p>}
                <p className="text-xs text-gray-400">{itemCountSummary(t)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Duplicate" leftIcon={<Copy className="w-3.5 h-3.5" />} onClick={() => handleDuplicate(t)} />
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
        checkinTemplate={linkedCheckinFor(editing)}
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
