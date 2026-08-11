'use client'

import { useMemo, useState } from 'react'
import {
  Calendar, Plus, Pencil, Search, CheckCircle2, Send, Ban, Pause, Play,
} from 'lucide-react'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { PersonAvatar } from '@/customComponents/PersonAvatar'
import { usePersistedState } from '@/lib/usePersistedState'
import { FARMERS_LIST } from '@/dataCenter/farmerManagement'
import { TRAINING_BUNDLES, TRAINING_TEMPLATES } from '@/dataCenter/trainingMaterials'
import type { TrainingBundle, TrainingTemplate } from '@/app/(admin)/dashboard/TrainingMaterials/_logics/interface'
import {
  type CohortTrainingSchedule, type FarmerTrainingOverride, type TrainingOverrideStatus,
  SEED_COHORT_TRAINING_SCHEDULES, PROGRAM_LIST,
} from '../../_logics/trainingConfig'

type SubTab = 'cohorts' | 'overrides'

// ─── Cohort Schedules sub-tab ───────────────────────────────────────────────

function emptySchedule(): CohortTrainingSchedule {
  return {
    id: `cts-${Date.now()}`,
    programId: '', programName: '', cohortId: '', cohortName: '',
    trainingStartDate: null, windowDays: 7, graceDays: 2, durationWeeks: 12,
    isConfigured: false,
  }
}

function NewScheduleForm({
  onCancel, onCreate,
}: {
  onCancel: () => void
  onCreate: (s: CohortTrainingSchedule) => void
}) {
  const [draft, setDraft] = useState<CohortTrainingSchedule>(emptySchedule())
  const program = PROGRAM_LIST.find(p => p.id === draft.programId)
  const cohortOptions = program?.cohorts ?? []

  function setProgram(programId: string) {
    const p = PROGRAM_LIST.find(pr => pr.id === programId)
    setDraft({ ...draft, programId, programName: p?.name ?? '', cohortId: '', cohortName: '' })
  }
  function setCohort(cohortId: string) {
    const c = cohortOptions.find(co => co.id === cohortId)
    setDraft({ ...draft, cohortId, cohortName: c?.name ?? '' })
  }

  const canCreate = !!draft.programId && !!draft.cohortId

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-4">
      <p className="text-sm font-semibold text-gray-900">New Training Schedule</p>
      <SelectTemplate
        label="Program" isRequired
        placeholder="Select a program..."
        options={PROGRAM_LIST.map(p => ({ value: p.id, label: p.name }))}
        value={draft.programId}
        onChange={e => setProgram(e.target.value)}
      />
      <SelectTemplate
        label="Cohort" isRequired
        placeholder={draft.programId ? 'Select a cohort...' : 'Select a program first'}
        options={cohortOptions.map(c => ({ value: c.id, label: c.name }))}
        value={draft.cohortId}
        onChange={e => setCohort(e.target.value)}
        isDisabled={!draft.programId}
      />
      <InputTemplate
        label="Training Start Date" type="date"
        value={draft.trainingStartDate ?? ''}
        onChange={e => setDraft({ ...draft, trainingStartDate: e.target.value || null })}
      />
      <div className="grid grid-cols-3 gap-3">
        <InputTemplate
          label="Window Days" type="number" min={1}
          value={draft.windowDays}
          onChange={e => setDraft({ ...draft, windowDays: Number(e.target.value) })}
        />
        <InputTemplate
          label="Grace Days" type="number" min={0}
          value={draft.graceDays}
          onChange={e => setDraft({ ...draft, graceDays: Number(e.target.value) })}
        />
        <InputTemplate
          label="Duration (weeks)" type="number" min={1}
          value={draft.durationWeeks}
          onChange={e => setDraft({ ...draft, durationWeeks: Number(e.target.value) })}
        />
      </div>
      <div className="flex justify-end gap-2">
        <ButtonTemplate variant="outline" label="Cancel" onClick={onCancel} />
        <ButtonTemplate
          variant="primary" label="Create Schedule"
          isDisabled={!canCreate}
          onClick={() => onCreate({ ...draft, isConfigured: true })}
        />
      </div>
    </div>
  )
}

function EditScheduleForm({
  schedule, onCancel, onSave,
}: {
  schedule: CohortTrainingSchedule
  onCancel: () => void
  onSave: (s: CohortTrainingSchedule) => void
}) {
  const [draft, setDraft] = useState<CohortTrainingSchedule>(schedule)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-4">
      <p className="text-sm font-semibold text-gray-900">Edit Schedule — {schedule.cohortName}</p>
      <InputTemplate
        label="Training Start Date" type="date"
        value={draft.trainingStartDate ?? ''}
        onChange={e => setDraft({ ...draft, trainingStartDate: e.target.value || null })}
      />
      <div className="grid grid-cols-3 gap-3">
        <InputTemplate
          label="Window Days" type="number" min={1}
          value={draft.windowDays}
          onChange={e => setDraft({ ...draft, windowDays: Number(e.target.value) })}
        />
        <InputTemplate
          label="Grace Days" type="number" min={0}
          value={draft.graceDays}
          onChange={e => setDraft({ ...draft, graceDays: Number(e.target.value) })}
        />
        <InputTemplate
          label="Duration (weeks)" type="number" min={1}
          value={draft.durationWeeks}
          onChange={e => setDraft({ ...draft, durationWeeks: Number(e.target.value) })}
        />
      </div>
      <div className="flex justify-end gap-2">
        <ButtonTemplate variant="outline" label="Cancel" onClick={onCancel} />
        <ButtonTemplate variant="primary" label="Save" onClick={() => onSave({ ...draft, isConfigured: true })} />
      </div>
    </div>
  )
}

function CohortSchedulesSubTab() {
  const [schedules, setSchedules] = usePersistedState<CohortTrainingSchedule[]>('training-cohort-schedules', SEED_COHORT_TRAINING_SCHEDULES)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  function handleCreate(s: CohortTrainingSchedule) {
    setSchedules(prev => [...prev, s])
    setCreating(false)
  }
  function handleSave(s: CohortTrainingSchedule) {
    setSchedules(prev => prev.map(p => p.id === s.id ? s : p))
    setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500 max-w-md">
          Set the training start date and release window for each cohort. Materials become visible to farmers when their week&apos;s window opens.
        </p>
        <ButtonTemplate variant="primary" size="sm" label="New Schedule" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setCreating(true)} />
      </div>

      {creating && (
        <NewScheduleForm onCancel={() => setCreating(false)} onCreate={handleCreate} />
      )}

      {schedules.length === 0 && !creating ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center gap-2">
          <Calendar className="w-8 h-8 text-gray-200" />
          <p className="text-sm font-medium text-gray-400 text-center">No cohort schedules yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {schedules.map(s => (
            editingId === s.id ? (
              <EditScheduleForm key={s.id} schedule={s} onCancel={() => setEditingId(null)} onSave={handleSave} />
            ) : (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-gray-900">{s.cohortName}</p>
                    <BadgeTemplate label={s.isConfigured ? 'Configured' : 'Not configured'} variant={s.isConfigured ? 'success' : 'warning'} size="sm" />
                  </div>
                  <p className="text-xs text-gray-400 mb-0.5">{s.programName}</p>
                  {s.isConfigured ? (
                    <p className="text-xs text-gray-500">
                      Starts {s.trainingStartDate ?? '—'} · Window {s.windowDays}d · Grace {s.graceDays}d · {s.durationWeeks} weeks
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600">No training schedule set — farmers will not see weekly materials until configured.</p>
                  )}
                </div>
                <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setEditingId(s.id)} />
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Per-Farmer Overrides sub-tab ───────────────────────────────────────────

const OVERRIDE_META: Record<TrainingOverrideStatus, { label: string; color: string; icon: React.ElementType }> = {
  normal:   { label: 'Normal',      color: 'emerald', icon: CheckCircle2 },
  send:     { label: 'Force Send',  color: 'blue',    icon: Send         },
  withhold: { label: 'Withhold',    color: 'red',     icon: Ban          },
}

const STATUS_BTN_CLASS: Record<TrainingOverrideStatus, string> = {
  normal:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  send:     'bg-blue-50 text-blue-700 border-blue-200',
  withhold: 'bg-red-50 text-red-700 border-red-200',
}

function bundleForCrop(bundles: TrainingBundle[], crop: string): TrainingBundle | null {
  return bundles.find(b => b.cropType === crop) ?? null
}

function weeksForBundle(bundle: TrainingBundle, templates: TrainingTemplate[]): TrainingTemplate[] {
  const existing = templates.filter(t => t.bundleId === bundle.id)
  const byWeek = new Map(existing.map(t => [t.weekNumber, t]))
  return Array.from({ length: bundle.totalWeeks }, (_, i) => {
    const week = i + 1
    return byWeek.get(week) ?? {
      id: `tpl-${bundle.id}-${week}`, bundleId: bundle.id, weekNumber: week,
      weekTitle: 'Set title', topic: '', description: '', notes: '',
    }
  })
}

function PerFarmerOverridesSubTab() {
  const [overrides, setOverrides] = usePersistedState<FarmerTrainingOverride[]>('training-farmer-overrides', [])
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(null)

  const results = useMemo(() => {
    if (!searchTerm.trim()) return []
    const q = searchTerm.trim().toLowerCase()
    return FARMERS_LIST.filter(f => f.fullName.toLowerCase().includes(q)).slice(0, 8)
  }, [searchTerm])

  const selectedFarmer = FARMERS_LIST.find(f => f.id === selectedFarmerId) ?? null
  const bundle = selectedFarmer ? bundleForCrop(TRAINING_BUNDLES, selectedFarmer.primaryCrop) : null
  const weeks = bundle ? weeksForBundle(bundle, TRAINING_TEMPLATES) : []

  function statusFor(farmerId: string, weekNumber: number): TrainingOverrideStatus {
    return overrides.find(o => o.farmerId === farmerId && o.weekNumber === weekNumber)?.status ?? 'normal'
  }
  function setStatus(farmerId: string, weekNumber: number, status: TrainingOverrideStatus) {
    setOverrides(prev => {
      const exists = prev.some(o => o.farmerId === farmerId && o.weekNumber === weekNumber)
      if (status === 'normal') {
        return prev.filter(o => !(o.farmerId === farmerId && o.weekNumber === weekNumber))
      }
      if (exists) {
        return prev.map(o => o.farmerId === farmerId && o.weekNumber === weekNumber ? { ...o, status } : o)
      }
      return [...prev, { farmerId, weekNumber, status }]
    })
  }
  function pauseAll() {
    if (!selectedFarmer) return
    setOverrides(prev => {
      const others = prev.filter(o => o.farmerId !== selectedFarmer.id)
      const withheld = weeks.map(w => ({ farmerId: selectedFarmer.id, weekNumber: w.weekNumber, status: 'withhold' as const }))
      return [...others, ...withheld]
    })
  }
  function resumeAll() {
    if (!selectedFarmer) return
    setOverrides(prev => prev.filter(o => o.farmerId !== selectedFarmer.id))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 max-w-sm">
          <InputTemplate
            placeholder="Search farmer by name…"
            leftIcon={<Search className="w-3.5 h-3.5 text-gray-400" />}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') setSearchTerm(query) }}
          />
        </div>
        <ButtonTemplate variant="outline" size="md" label="Search" onClick={() => setSearchTerm(query)} />
      </div>

      {searchTerm && !selectedFarmer && (
        results.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No farmers found for &quot;{searchTerm}&quot;.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {results.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFarmerId(f.id)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 text-left"
              >
                <PersonAvatar name={f.fullName} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{f.fullName}</p>
                  <p className="text-xs text-gray-400 truncate">{f.primaryCrop} · {f.community || 'No community'}</p>
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {selectedFarmer && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <PersonAvatar name={selectedFarmer.fullName} size={36} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{selectedFarmer.fullName}</p>
                <p className="text-xs text-gray-400 truncate capitalize">{selectedFarmer.primaryCrop}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ButtonTemplate variant="outline" size="sm" label="Pause All" leftIcon={<Pause className="w-3.5 h-3.5" />} onClick={pauseAll} />
              <ButtonTemplate variant="outline" size="sm" label="Resume All" leftIcon={<Play className="w-3.5 h-3.5" />} onClick={resumeAll} />
              <ButtonTemplate
                variant="ghost" size="sm" label="Change farmer"
                onClick={() => { setSelectedFarmerId(null); setSearchTerm(''); setQuery('') }}
              />
            </div>
          </div>

          {!bundle ? (
            <p className="text-xs text-gray-400 italic">No training bundle found for this farmer&apos;s crop.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {weeks.map(w => {
                const status = statusFor(selectedFarmer.id, w.weekNumber)
                return (
                  <div key={w.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 text-xs font-bold text-gray-500">
                      W{w.weekNumber}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{w.weekTitle}</p>
                      {w.topic && <p className="text-xs text-gray-400 truncate">{w.topic}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {(Object.keys(OVERRIDE_META) as TrainingOverrideStatus[]).map(key => {
                        const meta = OVERRIDE_META[key]
                        const Icon = meta.icon
                        const active = status === key
                        return (
                          <button
                            key={key}
                            onClick={() => setStatus(selectedFarmer.id, w.weekNumber, key)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              active ? STATUS_BTN_CLASS[key] : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" /> {meta.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Shell for the two pill sub-tabs ────────────────────────────────────────

export function TrainingScheduleSection() {
  const [subTab, setSubTab] = usePersistedState<SubTab>('trainingConfig.scheduleSubTab', 'cohorts')

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-bold text-gray-900">Training Schedule</h3>
        <p className="text-xs text-gray-400">Cohort schedules &amp; per-farmer overrides</p>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { key: 'cohorts', label: 'Cohort Schedules' },
          { key: 'overrides', label: 'Training Override' },
        ] as const).map(({ key, label }) => {
          const active = subTab === key
          return (
            <button
              key={key}
              onClick={() => setSubTab(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                active ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={active ? { color: 'var(--brand-forest)' } : {}}
            >
              {label}
            </button>
          )
        })}
      </div>

      {subTab === 'cohorts' ? <CohortSchedulesSubTab /> : <PerFarmerOverridesSubTab />}
    </div>
  )
}
