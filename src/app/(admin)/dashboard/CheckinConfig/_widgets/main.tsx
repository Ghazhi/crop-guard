'use client'

import { useState } from 'react'
import { ClipboardCheck, Calendar, Layers, ChevronDown, ChevronUp, Pencil, Trash2, Plus, X, Sprout, Check, CalendarDays, Eye, Wallet } from 'lucide-react'
import { MultiSelectTabsTemplate } from '@/customComponents/MultiSelectTabsTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { MultiSelectTemplate } from '@/customComponents/MultiSelectTemplate'
import { DatagridTemplate } from '@/customComponents/DatagridTemplate'
import type { DatagridColumn } from '@/customComponents/DatagridTemplate'

import type { Pillar, Section, CropDef, Org, Question, Week, BaselineActivity, OrgConfig, CohortSchedule } from '@/app/(admin)/dashboard/CheckinConfig/_logics/interface'
import {
  ORGS,
  BUILT_IN_CROPS,
  BUILT_IN_SEED_MAP,
  BASELINE_SEED,
  BASELINE_PILLARS,
  PILLARS,
  PILLAR_DISPLAY,
  cloneWeeks,
  freshConfig,
} from '@/dataCenter/checkinConfig'
import { ScrollTabsTemplate } from '@/customComponents/ScrollTabsTemplate'
import { PARTNERS } from '@/dataCenter/partners'
import { PARTNER_BASELINES, createDefaultP4Questions } from '@/dataCenter/partnerBaselines'
import type { PartnerP4Question } from '@/dataCenter/partnerBaselines'


function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${
        checked ? 'bg-(--brand-green)' : 'bg-gray-200'
      }`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

// ── Per-partner P4 baseline panel (Baseline Activities section) ────────────────

function PartnerP4Panel({
  questions, onAdd, onEdit, onDelete, onToggleActive,
}: {
  questions:      PartnerP4Question[]
  onAdd:          (label: string, desc: string) => void
  onEdit:         (id: string, label: string, desc: string) => void
  onDelete:       (id: string) => void
  onToggleActive: (id: string) => void
}) {
  const [adding,    setAdding]    = useState(false)
  const [newLabel,  setNewLabel]  = useState('')
  const [newDesc,   setNewDesc]   = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editDesc,  setEditDesc]  = useState('')
  const [deleteTarget, setDeleteTarget] = useState<PartnerP4Question | null>(null)

  function submitAdd() {
    if (!newLabel.trim()) return
    onAdd(newLabel.trim(), newDesc.trim())
    setNewLabel(''); setNewDesc(''); setAdding(false)
  }

  function startEdit(q: PartnerP4Question) {
    setEditingId(q.id); setEditLabel(q.label); setEditDesc(q.desc)
  }

  function submitEdit() {
    if (!editingId || !editLabel.trim()) return
    onEdit(editingId, editLabel.trim(), editDesc.trim())
    setEditingId(null)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Questions ({questions.length})
        </p>
        <button
          onClick={() => { setAdding(true); setNewLabel(''); setNewDesc('') }}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white rounded-lg transition-colors hover:opacity-90"
          style={{ background: 'var(--brand-forest)' }}
        >
          <Plus className="w-3.5 h-3.5" /> Add Question
        </button>
      </div>

      {questions.length === 0 && !adding && (
        <p className="text-sm text-gray-400 py-10 text-center">No P4 questions yet for this partner.</p>
      )}

      {questions.map(q => (
        editingId === q.id ? (
          <div key={q.id} className="px-4 py-4 border-b border-gray-100 last:border-b-0 bg-gray-50/50 flex flex-col gap-2.5">
            <input
              type="text"
              value={editLabel}
              onChange={e => setEditLabel(e.target.value)}
              placeholder="Question statement..."
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300"
            />
            <input
              type="text"
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              placeholder="Description"
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300"
            />
            <div className="flex items-center gap-2">
              <button onClick={submitEdit}
                className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white rounded-lg transition-colors hover:opacity-90"
                style={{ background: '#4b5563' }}>
                <Check className="w-3.5 h-3.5" /> Save
              </button>
              <button onClick={() => setEditingId(null)}
                className="flex items-center gap-1 h-8 px-3 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div key={q.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 group">
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium leading-tight ${q.active ? 'text-gray-800' : 'text-gray-400'}`}>{q.label}</p>
              {q.desc && <p className="text-xs text-gray-400 mt-0.5">{q.desc}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Toggle checked={q.active} onChange={() => onToggleActive(q.id)} />
              <button onClick={() => startEdit(q)}
                className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:text-gray-500 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setDeleteTarget(q)}
                className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      ))}

      {adding && (
        <div className="px-4 py-4 border-t border-gray-100 flex flex-col gap-2.5">
          <input
            autoFocus
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Question statement..."
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300"
          />
          <input
            type="text"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Description"
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300"
          />
          <div className="flex items-center gap-2">
            <button onClick={submitAdd}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white rounded-lg transition-colors hover:opacity-90"
              style={{ background: 'var(--brand-forest)' }}>
              <Check className="w-3.5 h-3.5" /> Save
            </button>
            <button onClick={() => setAdding(false)}
              className="flex items-center gap-1 h-8 px-3 text-xs text-gray-500 hover:text-gray-700">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete question?"
        message={`"${deleteTarget?.label ?? 'This question'}" will be permanently removed from this partner's P4 baseline.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { if (deleteTarget) onDelete(deleteTarget.id); setDeleteTarget(null) }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

// ── Custom baseline templates (Baseline Activities page) ────────────────────

interface CustomBaseline { id: string; label: string; activities: PartnerP4Question[] }

const CUSTOM_BASELINE_COLORS = ['#7C3AED', '#0D9488', '#DB2777', '#CA8A04', '#4F46E5', '#059669']

function NewBaselineSheet({
  open, onClose, onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (label: string) => void
}) {
  const [label, setLabel] = useState('')

  function handleSave() {
    if (!label.trim()) return
    onCreate(label.trim())
    setLabel('')
    onClose()
  }

  return (
    <SheetTemplate
      open={open}
      onClose={() => { setLabel(''); onClose() }}
      title="New Baseline"
      size="md"
      footer={
        <>
          <ButtonTemplate variant="outline" label="Cancel" onClick={() => { setLabel(''); onClose() }} />
          <ButtonTemplate variant="primary" label="Save" onClick={handleSave} isDisabled={!label.trim()} />
        </>
      }
    >
      <div className="px-6 py-5 flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Baseline name</label>
        <input
          autoFocus
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          placeholder="e.g. Climate Resilience Baseline"
          className="h-10 w-full border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark)"
        />
      </div>
    </SheetTemplate>
  )
}

function BaselineActivityCard({
  label, color, activities, onRename, onRemove, onAddActivity, onEditActivity, onDeleteActivity, onToggleActivity,
}: {
  label:     string
  color:     string
  activities: PartnerP4Question[]
  /** Omit to make the label read-only (used for the fixed P1-P4 pillars) */
  onRename?: (label: string) => void
  /** Omit to hide the delete-baseline control (used for the fixed P1-P4 pillars) */
  onRemove?: () => void
  onAddActivity:    (label: string, desc: string) => void
  onEditActivity:   (activityId: string, label: string, desc: string) => void
  onDeleteActivity: (activityId: string) => void
  onToggleActivity: (activityId: string) => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(label)
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<PartnerP4Question | null>(null)
  const [deletingBaseline, setDeletingBaseline] = useState(false)

  function submitRename() {
    if (!nameDraft.trim() || !onRename) return
    onRename(nameDraft.trim())
    setRenaming(false)
  }

  function submitAdd() {
    if (!newLabel.trim()) return
    onAddActivity(newLabel.trim(), newDesc.trim())
    setNewLabel(''); setNewDesc(''); setAdding(false)
  }

  function startEdit(a: PartnerP4Question) {
    setEditingId(a.id); setEditLabel(a.label); setEditDesc(a.desc)
  }

  function submitEdit() {
    if (!editingId || !editLabel.trim()) return
    onEditActivity(editingId, editLabel.trim(), editDesc.trim())
    setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 px-1 group/header">
        {renaming ? (
          <div className="flex items-center gap-1.5 flex-1">
            <input
              autoFocus
              type="text"
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRenaming(false) }}
              className="flex-1 h-7 px-2 text-xs font-semibold uppercase tracking-wider border border-gray-200 rounded focus:outline-none focus:border-(--brand-green)"
              style={{ color }}
            />
            <button onClick={submitRename} className="text-green-600 hover:text-green-800 shrink-0"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setRenaming(false)} className="text-gray-400 hover:text-gray-600 shrink-0"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>{label}</p>
            {(onRename || onRemove) && (
              <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                {onRename && (
                  <button onClick={() => { setNameDraft(label); setRenaming(true) }}
                    className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-gray-600" title="Rename baseline">
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                {onRemove && (
                  <button onClick={() => setDeletingBaseline(true)}
                    className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500" title="Delete baseline">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
        {activities.length === 0 && !adding && (
          <p className="text-sm text-gray-400 py-6 text-center">No activities yet.</p>
        )}

        {activities.map(a => (
          editingId === a.id ? (
            <div key={a.id} className="px-4 py-3 border-b border-gray-100 last:border-b-0 bg-gray-50/50 flex flex-col gap-2">
              <input
                autoFocus
                type="text"
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                placeholder="Activity name…"
                className="w-full h-8 px-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
              />
              <input
                type="text"
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="Description"
                className="w-full h-8 px-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
              />
              <div className="flex items-center gap-2">
                <button onClick={submitEdit} className="flex items-center gap-1.5 h-7 px-2.5 text-xs font-semibold text-white rounded-lg" style={{ background: '#4b5563' }}>
                  <Check className="w-3 h-3" /> Save
                </button>
                <button onClick={() => setEditingId(null)} className="flex items-center gap-1 h-7 px-2.5 text-xs font-medium text-gray-500 hover:text-gray-700">
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 group">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-tight ${a.active ? 'text-gray-800' : 'text-gray-400'}`}>{a.label}</p>
                {a.desc && <p className="text-xs text-gray-400 mt-0.5">{a.desc}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Toggle checked={a.active} onChange={() => onToggleActivity(a.id)} />
                <button onClick={() => startEdit(a)}
                  className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Edit">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => setDeleteTarget(a)}
                  className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )
        ))}

        {adding ? (
          <div className="px-4 py-3 border-t border-gray-100 flex flex-col gap-2">
            <input
              autoFocus
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Activity name…"
              className="w-full h-8 px-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
            />
            <input
              type="text"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Description"
              className="w-full h-8 px-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
            />
            <div className="flex items-center gap-2">
              <button onClick={submitAdd} className="flex items-center gap-1.5 h-7 px-2.5 text-xs font-semibold text-white rounded-lg hover:opacity-90" style={{ background: 'var(--brand-forest)' }}>
                <Check className="w-3 h-3" /> Save
              </button>
              <button onClick={() => setAdding(false)} className="flex items-center gap-1 h-7 px-2.5 text-xs text-gray-500 hover:text-gray-700">
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setAdding(true); setNewLabel(''); setNewDesc('') }}
            className="w-full flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold hover:bg-gray-50 transition-colors border-t border-gray-100"
            style={{ color: 'var(--brand-forest)' }}
          >
            <Plus className="w-3.5 h-3.5" /> Add activity
          </button>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete activity?"
        message={`"${deleteTarget?.label ?? 'This activity'}" will be permanently removed.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { if (deleteTarget) onDeleteActivity(deleteTarget.id); setDeleteTarget(null) }}
        onCancel={() => setDeleteTarget(null)}
      />

      {onRemove && (
        <ConfirmModal
          open={deletingBaseline}
          title="Delete baseline?"
          message={`"${label}" will be removed from all cohort schedules that use it.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => { onRemove(); setDeletingBaseline(false) }}
          onCancel={() => setDeletingBaseline(false)}
        />
      )}
    </div>
  )
}

export function Main() {
  const [section, setSection]        = useState<Section>('weekly')
  const [crop, setCrop]              = useState<string>('maize')
  const [expandedWeeks, setExpanded] = useState<Set<number>>(new Set([1]))
  const org                           = ORGS[0].id
  const [crops, setCrops]            = useState<CropDef[]>(BUILT_IN_CROPS)

  const [orgConfigs, setOrgConfigs] = useState<Record<string, OrgConfig>>(() =>
    Object.fromEntries(ORGS.map(o => [o.id, freshConfig(BUILT_IN_CROPS)]))
  )

  const cfg = orgConfigs[org]

  type WeekUpdater = Week[] | ((prev: Week[]) => Week[])

  function setWeeksForCrop(cropId: string, updater: WeekUpdater) {
    setOrgConfigs(prev => {
      const cur = prev[org].cropWeeks[cropId] ?? []
      const next = typeof updater === 'function' ? updater(cur) : updater
      return { ...prev, [org]: { ...prev[org], cropWeeks: { ...prev[org].cropWeeks, [cropId]: next } } }
    })
  }

  // ── Baseline Activities: per-partner P4 view ─────────────────────────────────
  const [baselinePartnerId, setBaselinePartnerId] = useState('')
  const [partnerP4Questions, setPartnerP4Questions] = useState<PartnerP4Question[]>([])

  function handleBaselinePartnerChange(id: string) {
    setBaselinePartnerId(id)
    setPartnerP4Questions(id ? (PARTNER_BASELINES[id]?.questions ?? createDefaultP4Questions()) : [])
  }

  function persistPartnerP4(questions: PartnerP4Question[]) {
    if (!baselinePartnerId) return
    PARTNER_BASELINES[baselinePartnerId] = { partnerId: baselinePartnerId, questions }
  }

  function addPartnerP4Question(label: string, desc: string) {
    setPartnerP4Questions(prev => {
      const next = [...prev, { id: `p4_${Date.now()}`, label, desc, active: true }]
      persistPartnerP4(next)
      return next
    })
  }

  function editPartnerP4Question(id: string, label: string, desc: string) {
    setPartnerP4Questions(prev => {
      const next = prev.map(q => q.id !== id ? q : { ...q, label, desc })
      persistPartnerP4(next)
      return next
    })
  }

  function deletePartnerP4Question(id: string) {
    setPartnerP4Questions(prev => {
      const next = prev.filter(q => q.id !== id)
      persistPartnerP4(next)
      return next
    })
  }

  function togglePartnerP4QuestionActive(id: string) {
    setPartnerP4Questions(prev => {
      const next = prev.map(q => q.id !== id ? q : { ...q, active: !q.active })
      persistPartnerP4(next)
      return next
    })
  }

  // ── crop management ──────────────────────────────────────────────────────────
  const [addingCrop,     setAddingCrop]     = useState(false)
  const [newCropName,    setNewCropName]    = useState('')
  const [editingCropId,  setEditingCropId]  = useState<string | null>(null)
  const [editingCropName,setEditingCropName]= useState('')
  function handleAddCrop() {
    const name = newCropName.trim()
    if (!name) return
    const id = `crop_${Date.now()}`
    const def: CropDef = { id, name }
    setCrops(prev => [...prev, def])
    setOrgConfigs(prev =>
      Object.fromEntries(Object.entries(prev).map(([oid, cfg]) => [
        oid, { ...cfg, cropWeeks: { ...cfg.cropWeeks, [id]: [] } }
      ]))
    )
    setNewCropName('')
    setAddingCrop(false)
  }

  function handleSaveCropName(cropId: string) {
    const name = editingCropName.trim()
    if (!name) return
    setCrops(prev => prev.map(c => c.id === cropId ? { ...c, name } : c))
    setEditingCropId(null)
  }

  function handleDeleteCrop(cropId: string) {
    setCrops(prev => prev.filter(c => c.id !== cropId))
    if (crop === cropId) setCrop(crops.find(c => c.id !== cropId)?.id ?? 'maize')
    setOrgConfigs(prev =>
      Object.fromEntries(Object.entries(prev).map(([oid, cfg]) => {
        const rest = Object.fromEntries(Object.entries(cfg.cropWeeks).filter(([k]) => k !== cropId))
        return [oid, { ...cfg, cropWeeks: rest }]
      }))
    )
  }

  // ── week/question state ──────────────────────────────────────────────────────
  const [deleteQTarget, setDeleteQTarget] = useState<{ weekNum: number; qId: string; qText: string } | null>(null)
  const [addingTo,   setAddingTo]   = useState<{ weekNum: number } | null>(null)
  const [newPillar,  setNewPillar]  = useState<Pillar>('agronomy')
  const [newLabel,   setNewLabel]   = useState('')
  const [newHint,    setNewHint]    = useState('')
  const [newActive,  setNewActive]  = useState(true)

  const [editingQ,     setEditingQ]     = useState<{ weekNum: number; qId: string } | null>(null)
  const [editPillar,    setEditPillar]  = useState<Pillar>('agronomy')
  const [editLabel,     setEditLabel]   = useState('')
  const [editHint,      setEditHint]    = useState('')
  const [editActive,    setEditActive]  = useState(true)

  const weeks    = cfg.cropWeeks[crop] ?? []
  const setWeeks = (u: WeekUpdater) => setWeeksForCrop(crop, u)

  const totalQ  = weeks.reduce((a, w) => a + w.questions.length, 0)
  const activeQ = weeks.reduce((a, w) => a + w.questions.filter(q2 => q2.active).length, 0)

  function toggleWeek(n: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n); else next.add(n)
      return next
    })
  }

  function toggleQuestion(weekNum: number, qId: string) {
    setWeeks(prev => prev.map(w =>
      w.week !== weekNum ? w : {
        ...w, questions: w.questions.map(q2 =>
          q2.id !== qId ? q2 : { ...q2, active: !q2.active }
        )
      }
    ))
  }

  function deleteQuestion(weekNum: number, qId: string) {
    setWeeks(prev => prev.map(w =>
      w.week !== weekNum ? w : { ...w, questions: w.questions.filter(q2 => q2.id !== qId) }
    ))
  }

  function startEditQuestion(weekNum: number, question: Question) {
    setEditingQ({ weekNum, qId: question.id })
    setEditPillar(question.pillar)
    setEditLabel(question.label)
    setEditHint(question.hint ?? '')
    setEditActive(question.active)
  }

  function handleSaveEdit() {
    if (!editingQ || !editLabel.trim()) return
    const { weekNum, qId } = editingQ
    setWeeks(prev => prev.map(w =>
      w.week !== weekNum ? w : {
        ...w, questions: w.questions.map(q2 =>
          q2.id !== qId ? q2 : { ...q2, pillar: editPillar, label: editLabel.trim(), hint: editHint.trim() || undefined, active: editActive }
        )
      }
    ))
    setEditingQ(null)
  }

  function handleAdd(weekNum: number) {
    if (!newLabel.trim()) return
    const id = `${crop[0]}${weekNum}q${Date.now()}`
    setWeeks(prev => prev.map(w =>
      w.week !== weekNum ? w : {
        ...w, questions: [
          ...w.questions,
          { id, pillar: newPillar, label: newLabel.trim(), hint: newHint.trim() || undefined, active: newActive }
        ]
      }
    ))
    setAddingTo(null)
    setNewLabel('')
    setNewHint('')
    setNewActive(true)
    setNewPillar('agronomy')
  }

  // ── cohort schedule state ────────────────────────────────────────────────────
  const MOCK_PROGRAMS = [
    { id: 'p1', name: 'Ashanti Maize 2025', cohorts: [
      { id: 'c1', name: 'Kumasi North A' }, { id: 'c2', name: 'Kumasi North B' }, { id: 'c3', name: 'Ejisu East' },
    ]},
    { id: 'p2', name: 'Brong Soy 2025', cohorts: [
      { id: 'c4', name: 'Sunyani Central' }, { id: 'c5', name: 'Techiman South' },
    ]},
    { id: 'p3', name: 'Eastern Rice 2025', cohorts: [
      { id: 'c6', name: 'Kwahu West' }, { id: 'c7', name: 'New Juaben' },
    ]},
  ]
  const [BASELINE_OPTIONS, setBaselineOptions] = useState<CustomBaseline[]>([])
  const [newBaselineSheetOpen, setNewBaselineSheetOpen] = useState(false)

  const [pillarActivities, setPillarActivities] = useState<Record<string, PartnerP4Question[]>>(() => {
    const byPillar: Record<string, PartnerP4Question[]> = {}
    for (const pillar of BASELINE_PILLARS) {
      byPillar[pillar.id] = BASELINE_SEED
        .filter(a => a.pillar === pillar.id)
        .map(a => ({ id: a.id, label: a.label, desc: a.desc, active: true }))
    }
    return byPillar
  })

  function addPillarActivity(pillarId: string, label: string, desc: string) {
    setPillarActivities(prev => ({
      ...prev,
      [pillarId]: [...(prev[pillarId] ?? []), { id: `pillar_act_${Date.now()}`, label, desc, active: true }],
    }))
  }

  function editPillarActivity(pillarId: string, activityId: string, label: string, desc: string) {
    setPillarActivities(prev => ({
      ...prev,
      [pillarId]: (prev[pillarId] ?? []).map(a => a.id !== activityId ? a : { ...a, label, desc }),
    }))
  }

  function deletePillarActivity(pillarId: string, activityId: string) {
    setPillarActivities(prev => ({
      ...prev,
      [pillarId]: (prev[pillarId] ?? []).filter(a => a.id !== activityId),
    }))
  }

  function togglePillarActivity(pillarId: string, activityId: string) {
    setPillarActivities(prev => ({
      ...prev,
      [pillarId]: (prev[pillarId] ?? []).map(a => a.id !== activityId ? a : { ...a, active: !a.active }),
    }))
  }

  function addBaselineOption(label: string) {
    const id = `baseline_${Date.now()}`
    setBaselineOptions(prev => [...prev, { id, label, activities: [] }])
    return id
  }

  function editBaselineOption(id: string, label: string) {
    setBaselineOptions(prev => prev.map(o => o.id !== id ? o : { ...o, label }))
  }

  function removeBaselineOption(id: string) {
    setBaselineOptions(prev => prev.filter(o => o.id !== id))
    setSchBaselineIds(prev => prev.filter(v => v !== id))
    setSchedules(prev => prev.map(s => ({ ...s, baselineIds: s.baselineIds.filter(v => v !== id) })))
  }

  function addBaselineActivity(baselineId: string, label: string, desc: string) {
    setBaselineOptions(prev => prev.map(o => o.id !== baselineId ? o : {
      ...o,
      activities: [...o.activities, { id: `act_${Date.now()}`, label, desc, active: true }],
    }))
  }

  function editBaselineActivity(baselineId: string, activityId: string, label: string, desc: string) {
    setBaselineOptions(prev => prev.map(o => o.id !== baselineId ? o : {
      ...o,
      activities: o.activities.map(a => a.id !== activityId ? a : { ...a, label, desc }),
    }))
  }

  function deleteBaselineActivity(baselineId: string, activityId: string) {
    setBaselineOptions(prev => prev.map(o => o.id !== baselineId ? o : {
      ...o,
      activities: o.activities.filter(a => a.id !== activityId),
    }))
  }

  function toggleBaselineActivity(baselineId: string, activityId: string) {
    setBaselineOptions(prev => prev.map(o => o.id !== baselineId ? o : {
      ...o,
      activities: o.activities.map(a => a.id !== activityId ? a : { ...a, active: !a.active }),
    }))
  }

  const checkInListOptions = crops.map(c => ({ id: c.id, label: c.season ? `${c.name} ${c.season}` : c.name }))

  const allBaselineOptions = [
    ...BASELINE_PILLARS.map(p => ({ id: p.id, label: p.label })),
    ...BASELINE_OPTIONS.map(o => ({ id: o.id, label: o.label })),
  ]

  function baselineLabel(id: string) {
    return allBaselineOptions.find(o => o.id === id)?.label ?? id
  }

  const [schedules,      setSchedules]      = useState<CohortSchedule[]>([])
  const [scheduleSheet,  setScheduleSheet]  = useState(false)
  const [viewSchedule,   setViewSchedule]   = useState<CohortSchedule | null>(null)
  const [editingSchId,   setEditingSchId]   = useState<string | null>(null)
  const [schMode,        setSchMode]        = useState<'start_now' | 'scheduled'>('start_now')
  const [schProgramId,   setSchProgramId]   = useState('')
  const [schCohortId,    setSchCohortId]    = useState('')
  const [schDate,        setSchDate]        = useState('')
  const [schEndDate,     setSchEndDate]     = useState('')
  const [schBaselineIds, setSchBaselineIds] = useState<string[]>([])
  const [schCheckInIds,  setSchCheckInIds]  = useState<string[]>(crops[0] ? [crops[0].id] : [])

  function openNewSchedule() {
    setEditingSchId(null)
    setSchMode('start_now'); setSchProgramId(''); setSchCohortId(''); setSchDate(''); setSchEndDate('')
    setSchBaselineIds([]); setSchCheckInIds(crops[0] ? [crops[0].id] : [])
    setScheduleSheet(true)
  }

  function openEditSchedule(s: CohortSchedule) {
    setEditingSchId(s.id)
    setSchMode(s.mode); setSchProgramId(s.programId); setSchCohortId(s.cohortId)
    setSchDate(s.scheduledDate ?? ''); setSchEndDate(s.endDate ?? '')
    setSchBaselineIds(s.baselineIds); setSchCheckInIds(s.checkInListIds)
    setScheduleSheet(true)
  }

  function handleSaveSchedule() {
    const prog = MOCK_PROGRAMS.find(p => p.id === schProgramId)
    const coh  = prog?.cohorts.find(c => c.id === schCohortId)
    if (!prog || !coh) return

    if (editingSchId) {
      setSchedules(prev => prev.map(s => s.id !== editingSchId ? s : {
        ...s,
        programId:      schProgramId,
        programName:    prog.name,
        cohortId:       schCohortId,
        cohortName:     coh.name,
        mode:           schMode,
        scheduledDate:  schMode === 'scheduled' ? schDate : undefined,
        endDate:        schEndDate || undefined,
        baselineIds:    schBaselineIds,
        checkInListIds: schCheckInIds,
      }))
    } else {
      const newSch: CohortSchedule = {
        id:            `sch-${Date.now()}`,
        programId:     schProgramId,
        programName:   prog.name,
        cohortId:      schCohortId,
        cohortName:    coh.name,
        mode:          schMode,
        scheduledDate: schMode === 'scheduled' ? schDate : undefined,
        endDate:       schEndDate || undefined,
        baselineIds:   schBaselineIds,
        checkInListIds: schCheckInIds,
        status:        schMode === 'start_now' ? 'active' : 'pending',
      }
      setSchedules(prev => [...prev, newSch])
    }
    setScheduleSheet(false)
    setEditingSchId(null)
  }

  const schProgCohorts = MOCK_PROGRAMS.find(p => p.id === schProgramId)?.cohorts ?? []

  const STATUS_BADGE: Record<CohortSchedule['status'], string> = {
    pending:   'bg-amber-100 text-amber-700',
    active:    'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-600',
  }

  const SCHEDULE_COLUMNS: DatagridColumn<CohortSchedule>[] = [
    { key: 'programName', label: 'Program', render: v => <span className="text-gray-800 font-medium">{String(v)}</span> },
    { key: 'cohortName', label: 'Cohort', render: v => <span className="text-gray-600">{String(v)}</span> },
    {
      key: 'baselineIds', label: 'Baselines',
      render: (v) => <span className="text-gray-600">{(v as string[]).map(baselineLabel).join(', ')}</span>,
    },
    {
      key: 'checkInListIds', label: 'Check-in List',
      render: (v) => <span className="text-gray-600">{(v as string[]).map(id => checkInListOptions.find(o => o.id === id)?.label ?? id).join(', ')}</span>,
    },
    {
      key: 'scheduledDate', label: 'Start',
      render: (_, s) => <span className="text-gray-500 text-xs">{s.mode === 'start_now' ? 'Immediate' : (s.scheduledDate ?? '—')}</span>,
    },
    { key: 'endDate', label: 'End', render: v => <span className="text-gray-500 text-xs">{v ? String(v) : '—'}</span> },
    {
      key: 'status', label: 'Status',
      render: v => <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[v as CohortSchedule['status']]}`}>{String(v)}</span>,
    },
    {
      key: 'id', id: 'actions', label: '',
      render: (_, s) => (
        <div className="flex items-center gap-1.5">
          <ButtonTemplate variant="outline" size="sm" isIcon tooltip="View"
            leftIcon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => setViewSchedule(s)} />
          <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit"
            leftIcon={<Pencil className="w-3.5 h-3.5" />}
            onClick={() => openEditSchedule(s)} />
        </div>
      ),
    },
  ]

  const SECTION_NAV = [
    { id: 'weekly'   as Section, Icon: ClipboardCheck, label: 'Weekly Check-ins',   sub: 'Crop-specific check-in questions per week' },
    { id: 'cohort'   as Section, Icon: Calendar,       label: 'Cohort Schedules',   sub: 'Configure timing windows per cohort'        },
    { id: 'baseline' as Section, Icon: Layers,         label: 'Baseline Activities',sub: 'Pillar activities for baseline assessment'  },
    { id: 'crops'    as Section, Icon: Sprout,         label: 'Crops',              sub: 'Add and manage crop types'                  },
  ]

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <ClipboardCheck className="w-5 h-5 shrink-0" style={{ color: 'var(--brand-forest)' }} />
            <h1 className="text-xl font-bold text-gray-900 truncate">Check-in Configuration</h1>
          </div>
          <p className="text-sm text-gray-500 ml-7 truncate">Configure weekly check-in questions, cohort schedules, and baseline activities</p>
        </div>
      </div>

      {/* body: sidebar + content */}
      <div className="flex flex-col md:flex-row gap-5 items-start">

        {/* left section nav */}
        <div className="w-full md:w-48 md:shrink-0 min-w-0">
          <div className="hidden md:flex md:flex-col gap-1">
            {SECTION_NAV.map(({ id, Icon, label, sub }) => {
              const active = section === id
              return (
                <button
                  key={id}
                  onClick={() => setSection(id)}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    active ? 'text-white' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                  style={active ? { background: 'var(--brand-forest)' } : {}}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
                  <div>
                    <p className={`text-xs font-semibold leading-tight ${active ? 'text-white' : 'text-gray-800'}`}>{label}</p>
                    <p className={`text-[10px] mt-0.5 leading-tight ${active ? 'text-white/70' : 'text-gray-400'}`}>{sub}</p>
                  </div>
                </button>
              )
            })}
          </div>
          <ScrollTabsTemplate className="md:hidden gap-1 pb-1" fadeColor="gray-50">
            {SECTION_NAV.map(({ id, Icon, label, sub }) => {
              const active = section === id
              return (
                <button
                  key={id}
                  onClick={() => setSection(id)}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors shrink-0 whitespace-nowrap ${
                    active ? 'text-white' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                  style={active ? { background: 'var(--brand-forest)' } : {}}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
                  <div>
                    <p className={`text-xs font-semibold leading-tight ${active ? 'text-white' : 'text-gray-800'}`}>{label}</p>
                    <p className={`text-[10px] mt-0.5 leading-tight ${active ? 'text-white/70' : 'text-gray-400'}`}>{sub}</p>
                  </div>
                </button>
              )
            })}
          </ScrollTabsTemplate>
        </div>

        {/* main content */}
        <div className="flex-1 min-w-0">

          {/* ── Weekly Check-in ── */}
          {section === 'weekly' && (
            <div className="flex flex-col gap-4">
              {/* section header */}
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
                <h2 className="text-base font-bold text-gray-900">Weekly Check-in</h2>
              </div>

              {/* crop tabs */}
              <MultiSelectTabsTemplate
                options={crops.map(c => ({ id: c.id, label: c.season ? `${c.name} ${c.season}` : c.name }))}
                value={crop}
                onChange={setCrop}
                visibleCount={4}
                storageKey="checkinConfig.weeklyCropTabs"
              />

              {/* stats */}
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">{totalQ} questions</span>
                {' · '}
                <span className="font-medium text-gray-700">{activeQ} active</span>
              </p>

              {/* week accordion */}
              <div className="flex flex-col gap-2">
                {weeks.map(w => {
                  const open = expandedWeeks.has(w.week)
                  const activeCount = w.questions.filter(q2 => q2.active).length

                  const grouped: Partial<Record<Pillar, Question[]>> = {}
                  for (const pll of PILLARS) {
                    const qs = w.questions.filter(q2 => q2.pillar === pll.id)
                    if (qs.length) grouped[pll.id] = qs
                  }

                  return (
                    <div key={w.week} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {/* week header */}
                      <button
                        onClick={() => toggleWeek(w.week)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: 'var(--brand-forest)' }}
                        >
                          W{w.week}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-gray-900">{w.title}</p>
                          <p className="text-xs text-gray-400">{w.questions.length} questions · {activeCount} active</p>
                        </div>
                        {open
                          ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                        }
                      </button>

                      {/* week body */}
                      {open && (
                        <div className="border-t border-gray-100">
                          {PILLARS.map(pll => {
                            const qs = grouped[pll.id]
                            if (!qs) return null
                            return (
                              <div key={pll.id}>
                                {/* pillar header */}
                                <div className={`px-4 py-1.5 ${pll.strip}`}>
                                  <p className={`text-[10px] font-bold tracking-widest uppercase ${pll.text}`}>
                                    {PILLAR_DISPLAY[pll.id]}
                                  </p>
                                </div>
                                {/* questions */}
                                {qs.map(question => (
                                  editingQ?.weekNum === w.week && editingQ.qId === question.id ? (
                                    <div key={question.id} className="px-4 py-4 border-b border-gray-100 last:border-b-0 bg-gray-50/50 flex flex-col gap-3">
                                      {/* pillar selector */}
                                      <div className="flex flex-wrap gap-2">
                                        {PILLARS.map(pll2 => (
                                          <button
                                            key={pll2.id}
                                            type="button"
                                            onClick={() => setEditPillar(pll2.id)}
                                            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                                              editPillar === pll2.id
                                                ? 'border-gray-400 bg-gray-100 text-gray-800'
                                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                          >
                                            {pll2.shortLabel}
                                          </button>
                                        ))}
                                      </div>
                                      {/* inputs */}
                                      <input
                                        type="text"
                                        value={editLabel}
                                        onChange={e => setEditLabel(e.target.value)}
                                        placeholder="Question statement..."
                                        className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300"
                                      />
                                      <input
                                        type="text"
                                        value={editHint}
                                        onChange={e => setEditHint(e.target.value)}
                                        placeholder="Optional hint for agent"
                                        className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300"
                                      />
                                      {/* active toggle row */}
                                      <div className="flex items-center gap-2">
                                        <Toggle checked={editActive} onChange={setEditActive} />
                                        <span className="text-sm text-gray-600">Active</span>
                                      </div>
                                      {/* actions */}
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={handleSaveEdit}
                                          className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white rounded-lg transition-colors hover:opacity-90"
                                          style={{ background: '#4b5563' }}
                                        >
                                          <span className="text-sm">⊙</span>
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingQ(null)}
                                          className="flex items-center gap-1 h-8 px-3 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                          <X className="w-3 h-3" />
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div key={question.id} className="flex items-start gap-3 px-4 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 group">
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${question.hint ? 'font-medium text-gray-800' : 'text-gray-700'}`}>{question.label}</p>
                                        {question.hint && (
                                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{question.hint}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0 mt-0.5">
                                        <Toggle
                                          checked={question.active}
                                          onChange={() => toggleQuestion(w.week, question.id)}
                                        />
                                        <button
                                          onClick={() => startEditQuestion(w.week, question)}
                                          className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-gray-500 transition-colors"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => setDeleteQTarget({ weekNum: w.week, qId: question.id, qText: question.label })}
                                          className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-400 transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  )
                                ))}
                              </div>
                            )
                          })}

                          {/* add question form / button */}
                          {addingTo?.weekNum === w.week ? (
                            <div className="px-4 py-4 border-t border-gray-100 flex flex-col gap-3">
                              {/* pillar selector */}
                              <div className="flex flex-wrap gap-2">
                                {PILLARS.map(pll => (
                                  <button
                                    key={pll.id}
                                    type="button"
                                    onClick={() => setNewPillar(pll.id)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                                      newPillar === pll.id
                                        ? 'border-gray-400 bg-gray-100 text-gray-800'
                                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                                  >
                                    {pll.shortLabel}
                                  </button>
                                ))}
                              </div>
                              {/* inputs */}
                              <input
                                type="text"
                                value={newLabel}
                                onChange={e => setNewLabel(e.target.value)}
                                placeholder="Question statement..."
                                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300"
                              />
                              <input
                                type="text"
                                value={newHint}
                                onChange={e => setNewHint(e.target.value)}
                                placeholder="Optional hint for agent"
                                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300"
                              />
                              {/* active toggle row */}
                              <div className="flex items-center gap-2">
                                <Toggle checked={newActive} onChange={setNewActive} />
                                <span className="text-sm text-gray-600">Active</span>
                              </div>
                              {/* actions */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleAdd(w.week)}
                                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white rounded-lg transition-colors hover:opacity-90"
                                  style={{ background: '#4b5563' }}
                                >
                                  <span className="text-sm">⊙</span>
                                  Save
                                </button>
                                <button
                                  onClick={() => { setAddingTo(null); setNewLabel(''); setNewHint('') }}
                                  className="flex items-center gap-1 h-8 px-3 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setAddingTo({ weekNum: w.week }); setNewLabel(''); setNewHint(''); setNewPillar('agronomy') }}
                              className="flex items-center gap-1.5 px-4 py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors border-t border-gray-100 w-full"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add question
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Crops ── */}
          {section === 'crops' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sprout className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
                  <h2 className="text-base font-bold text-gray-900">Crops</h2>
                </div>
                <button
                  onClick={() => { setAddingCrop(true); setNewCropName('') }}
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white rounded-lg transition-colors hover:opacity-90"
                  style={{ background: 'var(--brand-forest)' }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Crop
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {crops.map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 group">
                    {editingCropId === c.id ? (
                      <input
                        autoFocus
                        value={editingCropName}
                        onChange={e => setEditingCropName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveCropName(c.id); if (e.key === 'Escape') setEditingCropId(null) }}
                        className="flex-1 h-8 px-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-(--brand-green)"
                      />
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{c.name}</p>
                        {c.builtIn && <p className="text-[10px] text-gray-400 mt-0.5">Built-in</p>}
                      </div>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      {editingCropId === c.id ? (
                        <>
                          <button onClick={() => handleSaveCropName(c.id)}
                            className="w-7 h-7 flex items-center justify-center rounded text-green-600 hover:bg-green-50 transition-colors">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingCropId(null)}
                            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingCropId(c.id); setEditingCropName(c.name) }}
                            className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {!c.builtIn && (
                            <button onClick={() => handleDeleteCrop(c.id)}
                              className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add crop inline form */}
                {addingCrop && (
                  <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                    <input
                      autoFocus
                      value={newCropName}
                      onChange={e => setNewCropName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddCrop(); if (e.key === 'Escape') setAddingCrop(false) }}
                      placeholder="Crop name…"
                      className="flex-1 h-8 px-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-(--brand-green)"
                    />
                    <button onClick={handleAddCrop}
                      className="flex items-center gap-1 h-8 px-3 text-xs font-semibold text-white rounded-lg hover:opacity-90"
                      style={{ background: 'var(--brand-forest)' }}>
                      <Check className="w-3.5 h-3.5" /> Save
                    </button>
                    <button onClick={() => setAddingCrop(false)}
                      className="flex items-center gap-1 h-8 px-3 text-xs text-gray-500 hover:text-gray-700">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Cohort Schedules ── */}
          {section === 'cohort' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
                  <h2 className="text-base font-bold text-gray-900">Cohort Schedules</h2>
                </div>
                <ButtonTemplate
                  variant="primary"
                  label="New Schedule"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={openNewSchedule}
                />
              </div>

              {schedules.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center gap-2">
                  <CalendarDays className="w-8 h-8 text-gray-200" />
                  <p className="text-sm font-medium text-gray-400">No cohort schedules yet</p>
                  <p className="text-xs text-gray-300">Click "New Schedule" to assign a check-in list to a cohort.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <DatagridTemplate<CohortSchedule>
                    columns={SCHEDULE_COLUMNS}
                    data={schedules}
                    rowKey="id"
                    defaultPageSize={0}
                    pageSizeOptions={[0]}
                  />
                </div>
              )}

              <SheetTemplate
                open={scheduleSheet}
                onClose={() => setScheduleSheet(false)}
                title={editingSchId ? 'Edit Cohort Schedule' : 'New Cohort Schedule'}
                size="md"
                footer={
                  <>
                    <ButtonTemplate variant="outline" label="Cancel" onClick={() => setScheduleSheet(false)} />
                    <ButtonTemplate
                      variant="primary"
                      label={editingSchId ? 'Save Changes' : 'Save Schedule'}
                      onClick={handleSaveSchedule}
                      isDisabled={!schProgramId || !schCohortId || (schMode === 'scheduled' && !schDate) || schCheckInIds.length === 0 || schBaselineIds.length === 0}
                    />
                  </>
                }
              >
                <div className="flex flex-col gap-5 p-5">

                  {/* mode toggle */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Start type</p>
                    <div className="flex gap-2">
                      {(['start_now', 'scheduled'] as const).map(m => (
                        <button key={m} type="button"
                          onClick={() => setSchMode(m)}
                          className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors ${
                            schMode === m
                              ? 'text-white border-transparent'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                          style={schMode === m ? { backgroundColor: 'var(--brand-forest)' } : {}}
                        >
                          {m === 'start_now' ? 'Start now' : 'Schedule a date'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* program */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Program</label>
                    <select
                      value={schProgramId}
                      onChange={e => { setSchProgramId(e.target.value); setSchCohortId('') }}
                      className="h-10 w-full border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) bg-white"
                    >
                      <option value="">Select program…</option>
                      {MOCK_PROGRAMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  {/* cohort */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cohort</label>
                    <select
                      value={schCohortId}
                      onChange={e => setSchCohortId(e.target.value)}
                      disabled={!schProgramId}
                      className="h-10 w-full border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select cohort…</option>
                      {schProgCohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* date — only when scheduled */}
                  {schMode === 'scheduled' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Start date</label>
                      <input
                        type="date"
                        value={schDate}
                        onChange={e => setSchDate(e.target.value)}
                        className="h-10 w-full border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark)"
                      />
                    </div>
                  )}

                  {/* end date — optional, applies to any schedule */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">End date <span className="normal-case text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="date"
                      value={schEndDate}
                      min={schMode === 'scheduled' ? schDate || undefined : undefined}
                      onChange={e => setSchEndDate(e.target.value)}
                      className="h-10 w-full border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark)"
                    />
                  </div>

                  {/* baseline — multiselect */}
                  <MultiSelectTemplate
                    label="Assign baseline(s)"
                    isRequired
                    placeholder="Select baselines…"
                    options={allBaselineOptions.map(o => ({ value: o.id, label: o.label }))}
                    value={schBaselineIds}
                    onChange={setSchBaselineIds}
                  />

                  {/* check-in list — multiselect */}
                  <MultiSelectTemplate
                    label="Assign check-in list"
                    placeholder="Select check-in lists…"
                    options={checkInListOptions.map(o => ({ value: o.id, label: o.label }))}
                    value={schCheckInIds}
                    onChange={setSchCheckInIds}
                  />

                </div>
              </SheetTemplate>

              {/* View schedule sheet */}
              <SheetTemplate
                open={!!viewSchedule}
                onClose={() => setViewSchedule(null)}
                title={viewSchedule ? `${viewSchedule.cohortName} — Schedule` : ''}
                subtitle={viewSchedule?.programName ?? ''}
                size="md"
                footer={
                  viewSchedule && (
                    <ButtonTemplate
                      variant="primary"
                      label="Edit"
                      leftIcon={<Pencil className="w-3.5 h-3.5" />}
                      onClick={() => { openEditSchedule(viewSchedule); setViewSchedule(null) }}
                    />
                  )
                }
              >
                {viewSchedule && (
                  <div className="flex flex-col gap-3 p-5">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['Program', viewSchedule.programName],
                        ['Cohort', viewSchedule.cohortName],
                        ['Start type', viewSchedule.mode === 'start_now' ? 'Immediate' : 'Scheduled'],
                        ['Start date', viewSchedule.mode === 'start_now' ? 'Immediate' : (viewSchedule.scheduledDate ?? '—')],
                        ['End date', viewSchedule.endDate ?? '—'],
                        ['Status', <span key="st" className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[viewSchedule.status]}`}>{viewSchedule.status}</span>],
                      ].map(([label, val]) => (
                        <div key={String(label)} className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-1">{label}</p>
                          <div className="text-sm font-medium text-gray-800">{val}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-2">Baselines</p>
                      <div className="flex flex-wrap gap-1.5">
                        {viewSchedule.baselineIds.map(id => (
                          <span key={id} className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--brand-pale)', color: 'var(--brand-forest)' }}>
                            {baselineLabel(id)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-2">Check-in Lists</p>
                      <div className="flex flex-wrap gap-1.5">
                        {viewSchedule.checkInListIds.map(id => (
                          <span key={id} className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--brand-pale)', color: 'var(--brand-forest)' }}>
                            {checkInListOptions.find(o => o.id === id)?.label ?? id}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </SheetTemplate>
            </div>
          )}

          {/* ── Baseline Activities ── */}
          {section === 'baseline' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
                  <h2 className="text-base font-bold text-gray-900">Baseline Activities</h2>
                </div>
                <ButtonTemplate variant="primary" size="sm" label="New Baseline" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setNewBaselineSheetOpen(true)} />
              </div>

              <div className="flex flex-col gap-3">
                {BASELINE_PILLARS.map(pillar => (
                  <BaselineActivityCard
                    key={pillar.id}
                    label={pillar.label}
                    color={pillar.color}
                    activities={pillarActivities[pillar.id] ?? []}
                    onAddActivity={(label, desc) => addPillarActivity(pillar.id, label, desc)}
                    onEditActivity={(activityId, label, desc) => editPillarActivity(pillar.id, activityId, label, desc)}
                    onDeleteActivity={activityId => deletePillarActivity(pillar.id, activityId)}
                    onToggleActivity={activityId => togglePillarActivity(pillar.id, activityId)}
                  />
                ))}

                {BASELINE_OPTIONS.map((baseline, i) => (
                  <BaselineActivityCard
                    key={baseline.id}
                    label={baseline.label}
                    color={CUSTOM_BASELINE_COLORS[i % CUSTOM_BASELINE_COLORS.length]}
                    activities={baseline.activities}
                    onRename={label => editBaselineOption(baseline.id, label)}
                    onRemove={() => removeBaselineOption(baseline.id)}
                    onAddActivity={(label, desc) => addBaselineActivity(baseline.id, label, desc)}
                    onEditActivity={(activityId, label, desc) => editBaselineActivity(baseline.id, activityId, label, desc)}
                    onDeleteActivity={activityId => deleteBaselineActivity(baseline.id, activityId)}
                    onToggleActivity={activityId => toggleBaselineActivity(baseline.id, activityId)}
                  />
                ))}
              </div>

              <NewBaselineSheet
                open={newBaselineSheetOpen}
                onClose={() => setNewBaselineSheetOpen(false)}
                onCreate={addBaselineOption}
              />

              <div className="flex flex-col gap-1.5 max-w-xs pt-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Partner</label>
                <select
                  value={baselinePartnerId}
                  onChange={e => handleBaselinePartnerChange(e.target.value)}
                  className="h-10 w-full border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) bg-white"
                >
                  <option value="">Select a partner to view their P4 baseline…</option>
                  {PARTNERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {!baselinePartnerId ? (
                <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
                  <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Select a partner to view their baseline.</p>
                </div>
              ) : (
                <PartnerP4Panel
                  questions={partnerP4Questions}
                  onAdd={addPartnerP4Question}
                  onEdit={editPartnerP4Question}
                  onDelete={deletePartnerP4Question}
                  onToggleActive={togglePartnerP4QuestionActive}
                />
              )}
            </div>
          )}

        </div>
      </div>
      <ConfirmModal
        open={!!deleteQTarget}
        title="Delete question?"
        message={`"${deleteQTarget?.qText ?? 'This question'}" will be permanently removed.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { if (deleteQTarget) deleteQuestion(deleteQTarget.weekNum, deleteQTarget.qId); setDeleteQTarget(null) }}
        onCancel={() => setDeleteQTarget(null)}
      />
    </div>
  )
}
