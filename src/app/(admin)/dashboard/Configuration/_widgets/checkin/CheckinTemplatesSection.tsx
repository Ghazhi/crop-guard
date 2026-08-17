'use client'

import { useState } from 'react'
import { ClipboardCheck, Plus, Pencil, Trash2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { TextareaTemplate } from '@/customComponents/TextareaTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { usePersistedState } from '@/lib/usePersistedState'
import {
  type CheckinTemplate, type CheckinWeek, type CheckinItem, type CheckinComponent,
  CHECKIN_COMPONENT_META, CHECKIN_CROP_OPTIONS, SEED_CHECKIN_TEMPLATES,
} from '../../_logics/checkinConfig'

const COMPONENT_BADGE_CLASS: Record<CheckinComponent, string> = {
  agronomy:             'bg-blue-50 text-blue-700 border-blue-100',
  climate_smart:        'bg-emerald-50 text-emerald-700 border-emerald-100',
  advisory_commitment:  'bg-amber-50 text-amber-700 border-amber-100',
  farm_enterprise:      'bg-teal-50 text-teal-700 border-teal-100',
}

function ComponentBadge({ component }: { component: CheckinComponent }) {
  const meta = CHECKIN_COMPONENT_META[component]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${COMPONENT_BADGE_CLASS[component]}`}>
      {meta.label}
    </span>
  )
}

function weekRange(weeks: CheckinWeek[]): string {
  if (weeks.length === 0) return '—'
  const nums = weeks.map(w => w.weekNumber)
  return `${Math.min(...nums)}–${Math.max(...nums)}`
}

function totalItems(weeks: CheckinWeek[]): number {
  return weeks.reduce((sum, w) => sum + w.items.length, 0)
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
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

function NewTemplateSheet({
  open, onClose, onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (t: Omit<CheckinTemplate, 'id' | 'weeks' | 'isActive'>) => void
}) {
  const [title, setTitle] = useState('')
  const [cropType, setCropType] = useState<CheckinTemplate['cropType']>('maize')
  const [season, setSeason] = useState('')
  const [description, setDescription] = useState('')

  function reset() {
    setTitle(''); setCropType('maize'); setSeason(''); setDescription('')
  }

  function handleSave() {
    if (!title.trim()) return
    onCreate({ title: title.trim(), cropType, season: season.trim(), description: description.trim() })
    reset()
  }

  return (
    <SheetTemplate
      open={open}
      onClose={() => { reset(); onClose() }}
      title="New Check-in Template"
      size="md"
      footer={
        <>
          <ButtonTemplate variant="outline" label="Cancel" onClick={() => { reset(); onClose() }} />
          <ButtonTemplate variant="primary" label="Save Template" isDisabled={!title.trim()} onClick={handleSave} />
        </>
      }
    >
      <div className="px-6 py-5 flex flex-col gap-4">
        <InputTemplate label="Check-in Title" isRequired value={title} onChange={e => setTitle(e.target.value)} />
        <SelectTemplate
          label="Crop"
          options={CHECKIN_CROP_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          value={cropType}
          onChange={e => setCropType(e.target.value as CheckinTemplate['cropType'])}
        />
        <InputTemplate label="Season" placeholder="e.g. 2026A" value={season} onChange={e => setSeason(e.target.value)} />
        <TextareaTemplate label="Description" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">This template covers all weeks of the season. Add items per week in the template editor after saving.</p>
        </div>
      </div>
    </SheetTemplate>
  )
}

function WeekAccordion({
  template, onChange,
}: {
  template: CheckinTemplate
  onChange: (t: CheckinTemplate) => void
}) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set(template.weeks.slice(0, 1).map(w => w.weekNumber)))

  function toggleWeek(n: number) {
    setExpandedWeeks(prev => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n); else next.add(n)
      return next
    })
  }

  function addWeek() {
    const nextNum = template.weeks.length === 0 ? 1 : Math.max(...template.weeks.map(w => w.weekNumber)) + 1
    onChange({ ...template, weeks: [...template.weeks, { weekNumber: nextNum, items: [] }] })
    setExpandedWeeks(prev => new Set(prev).add(nextNum))
  }

  function updateWeekItems(weekNumber: number, items: CheckinItem[]) {
    onChange({ ...template, weeks: template.weeks.map(w => w.weekNumber === weekNumber ? { ...w, items } : w) })
  }

  function addItem(weekNumber: number) {
    const item: CheckinItem = {
      id: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      component: 'agronomy', label: '', description: '', isActive: true,
    }
    const week = template.weeks.find(w => w.weekNumber === weekNumber)
    if (!week) return
    updateWeekItems(weekNumber, [...week.items, item])
  }

  return (
    <div className="flex flex-col gap-2">
      {template.weeks.map(week => {
        const open = expandedWeeks.has(week.weekNumber)
        const grouped: Partial<Record<CheckinComponent, CheckinItem[]>> = {}
        for (const item of week.items) {
          grouped[item.component] = grouped[item.component] ?? []
          grouped[item.component]!.push(item)
        }
        return (
          <div key={week.weekNumber} className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 overflow-hidden">
            <button
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
                            <Toggle
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

export function CheckinTemplatesSection() {
  const [templates, setTemplates] = usePersistedState<CheckinTemplate[]>('checkinConfigV2.checkinTemplates', SEED_CHECKIN_TEMPLATES)
  const [newOpen, setNewOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<CheckinTemplate | null>(null)

  function createTemplate(t: Omit<CheckinTemplate, 'id' | 'weeks' | 'isActive'>) {
    const id = `ct-${Date.now()}`
    setTemplates(prev => [...prev, { ...t, id, weeks: [], isActive: true }])
    setNewOpen(false)
    setExpandedId(id)
  }

  function updateTemplate(t: CheckinTemplate) {
    setTemplates(prev => prev.map(p => p.id === t.id ? t : p))
  }

  function confirmDelete() {
    if (!deleting) return
    setTemplates(prev => prev.filter(p => p.id !== deleting.id))
    if (expandedId === deleting.id) setExpandedId(null)
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Weekly Check-in Templates</h3>
          <p className="text-xs text-gray-400">Create multi-week check-in templates by crop &amp; season</p>
        </div>
        <ButtonTemplate variant="primary" size="sm" label="New Template" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setNewOpen(true)} />
      </div>

      {templates.length === 0 ? (
        <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-12 flex flex-col items-center gap-2">
          <ClipboardCheck className="w-8 h-8 text-gray-200" />
          <p className="text-sm font-medium text-gray-400 text-center">No check-in templates yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map(t => {
            const open = expandedId === t.id
            return (
              <div key={t.id} className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 overflow-hidden">
                <div className="flex items-start justify-between gap-3 p-4">
                  <button className="min-w-0 flex-1 text-left" onClick={() => setExpandedId(open ? null : t.id)}>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                      <BadgeTemplate label={t.cropType} variant="neutral" size="sm" />
                      <BadgeTemplate label={t.season} variant="info" size="sm" />
                      <BadgeTemplate label={`${t.weeks.length} weeks`} variant="warning" size="sm" />
                    </div>
                    <p className="text-xs text-gray-400">
                      {t.description}{t.description ? ' · ' : ''}{totalItems(t.weeks)} items · Weeks {weekRange(t.weeks)}
                    </p>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <ButtonTemplate
                      variant="ghost" size="sm" isIcon tooltip={open ? 'Collapse' : 'Expand'}
                      leftIcon={open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      onClick={() => setExpandedId(open ? null : t.id)}
                    />
                    <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setExpandedId(t.id)} />
                    <ButtonTemplate variant="danger" size="sm" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setDeleting(t)} />
                  </div>
                </div>
                {open && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                    <WeekAccordion template={t} onChange={updateTemplate} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <NewTemplateSheet open={newOpen} onClose={() => setNewOpen(false)} onCreate={createTemplate} />

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
