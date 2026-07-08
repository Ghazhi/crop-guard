'use client'

import { useState } from 'react'
import { ClipboardCheck, Calendar, Layers, ChevronDown, ChevronUp, Pencil, Trash2, Plus, X, Sprout, Check } from 'lucide-react'
import { MultiSelectTabsTemplate } from '@/customComponents/MultiSelectTabsTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'

import type { Pillar, Section, CropDef, Org, Question, Week, BaselineActivity, OrgConfig } from '@/app/(admin)/dashboard/CheckinConfig/_logics/interface'
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

export function Main() {
  const [section, setSection]        = useState<Section>('weekly')
  const [crop, setCrop]              = useState<string>('maize')
  const [expandedWeeks, setExpanded] = useState<Set<number>>(new Set([1]))
  const org                           = ORGS[0].id
  const [crops, setCrops]            = useState<CropDef[]>(BUILT_IN_CROPS)

  const [orgConfigs, setOrgConfigs] = useState<Record<string, OrgConfig>>(() =>
    Object.fromEntries(ORGS.map(o => [o.id, freshConfig(BUILT_IN_CROPS)]))
  )

  const cfg            = orgConfigs[org]
  const baselineActive = cfg.baselineActive

  type WeekUpdater = Week[] | ((prev: Week[]) => Week[])

  function setWeeksForCrop(cropId: string, updater: WeekUpdater) {
    setOrgConfigs(prev => {
      const cur = prev[org].cropWeeks[cropId] ?? []
      const next = typeof updater === 'function' ? updater(cur) : updater
      return { ...prev, [org]: { ...prev[org], cropWeeks: { ...prev[org].cropWeeks, [cropId]: next } } }
    })
  }

  function setBaselineActive(updater: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) {
    setOrgConfigs(prev => ({ ...prev, [org]: { ...prev[org], baselineActive: typeof updater === 'function' ? updater(prev[org].baselineActive) : updater } }))
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

  const SECTION_NAV = [
    { id: 'weekly'   as Section, Icon: ClipboardCheck, label: 'Weekly Questions',   sub: 'Crop-specific check-in questions per week' },
    { id: 'cohort'   as Section, Icon: Calendar,       label: 'Cohort Schedules',   sub: 'Configure timing windows per cohort'        },
    { id: 'baseline' as Section, Icon: Layers,         label: 'Baseline Activities',sub: 'Pillar activities for baseline assessment'  },
    { id: 'crops'    as Section, Icon: Sprout,         label: 'Crops',              sub: 'Add and manage crop types'                  },
  ]

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ClipboardCheck className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
            <h1 className="text-xl font-bold text-gray-900">Check-in Configuration</h1>
          </div>
          <p className="text-sm text-gray-500 ml-7">Configure weekly check-in questions, cohort schedules, and baseline activities</p>
        </div>
      </div>

      {/* body: sidebar + content */}
      <div className="flex flex-col md:flex-row gap-5 items-start">

        {/* left section nav */}
        <div className="flex flex-row md:flex-col gap-1 w-full md:w-48 md:shrink-0 overflow-x-auto pb-1 md:pb-0">
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
                options={crops.map(c => ({ id: c.id, label: c.name }))}
                value={crop}
                onChange={setCrop}
                visibleCount={4}
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
                                        onClick={() => {}}
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
              <div className="flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
                <h2 className="text-base font-bold text-gray-900">Cohort Schedules</h2>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center gap-2">
                <Calendar className="w-8 h-8 text-gray-200" />
                <p className="text-sm text-gray-400">Cohort schedule configuration coming soon.</p>
              </div>
            </div>
          )}

          {/* ── Baseline Activities ── */}
          {section === 'baseline' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
                <h2 className="text-base font-bold text-gray-900">Baseline Activities</h2>
              </div>

              <div className="flex flex-col gap-3">
                {BASELINE_PILLARS.map(pillar => {
                  const activities = BASELINE_SEED.filter(a => a.pillar === pillar.id)
                  return (
                    <div key={pillar.id} className="flex flex-col gap-1.5">
                      {/* pillar label */}
                      <p className="text-xs font-semibold uppercase tracking-wider px-1" style={{ color: pillar.color }}>
                        {pillar.label}
                      </p>
                      {/* activity rows */}
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ borderLeftColor: pillar.color, borderLeftWidth: 3 }}>
                        {activities.map(activity => {
                          const active = baselineActive[activity.id] ?? true
                          return (
                            <div
                              key={activity.id}
                              className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50"
                            >
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium leading-tight ${active ? 'text-gray-800' : 'text-gray-400'}`}>
                                  {activity.label}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">{activity.desc}</p>
                              </div>
                              <Toggle
                                checked={active}
                                onChange={v => setBaselineActive(prev => ({ ...prev, [activity.id]: v }))}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
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
