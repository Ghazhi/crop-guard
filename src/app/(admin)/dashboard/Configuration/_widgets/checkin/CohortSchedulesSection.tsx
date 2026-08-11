'use client'

import { useState } from 'react'
import { Calendar, Plus, Pencil, Pause, Play } from 'lucide-react'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { usePersistedState } from '@/lib/usePersistedState'
import { PARTNERS } from '@/dataCenter/partners'
import {
  type CohortCheckinSchedule, type BaselineTemplate, type CheckinTemplate,
  SEED_COHORT_SCHEDULES, SEED_BASELINE_TEMPLATES, SEED_CHECKIN_TEMPLATES, PROGRAM_LIST,
} from '../../_logics/checkinConfig'

function emptySchedule(): CohortCheckinSchedule {
  return {
    id: `cs-${Date.now()}`,
    programId: '', programName: '', cohortId: '', cohortName: '',
    startMode: 'immediate', startDate: null,
    windowDays: 7, graceDays: 2, totalWeeks: 12,
    baselineTemplateId: null, checkinTemplateId: null,
    isPaused: false, isConfigured: false,
    partnerId: null, partnerName: null,
  }
}

function ScheduleFormSheet({
  open, schedule, onClose, onSave,
  baselineTemplates, checkinTemplates,
}: {
  open: boolean
  schedule: CohortCheckinSchedule | null
  onClose: () => void
  onSave: (s: CohortCheckinSchedule) => void
  baselineTemplates: BaselineTemplate[]
  checkinTemplates: CheckinTemplate[]
}) {
  const [draft, setDraft] = useState<CohortCheckinSchedule>(schedule ?? emptySchedule())

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

  const canSave = !!draft.programId && !!draft.cohortId && (draft.startMode === 'immediate' || !!draft.startDate)

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title={schedule ? 'Edit Cohort Schedule' : 'New Cohort Schedule'}
      size="md"
      footer={
        <>
          <ButtonTemplate variant="outline" label="Cancel" onClick={onClose} />
          <ButtonTemplate
            variant="primary" label="Save"
            isDisabled={!canSave}
            onClick={() => onSave({ ...draft, isConfigured: true })}
          />
        </>
      }
    >
      <div className="px-6 py-5 flex flex-col gap-4">
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
        <SelectTemplate
          label="Partner"
          placeholder="Select a partner…"
          options={PARTNERS.map(p => ({ value: p.id, label: p.name }))}
          value={draft.partnerId ?? ''}
          onChange={e => {
            const partner = PARTNERS.find(p => p.id === e.target.value)
            setDraft({ ...draft, partnerId: partner?.id ?? null, partnerName: partner?.name ?? null })
          }}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>Start Mode</label>
          <div className="flex gap-2">
            {(['immediate', 'scheduled'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setDraft({ ...draft, startMode: mode })}
                className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-colors capitalize ${
                  draft.startMode === mode ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                style={draft.startMode === mode ? { backgroundColor: 'var(--brand-forest)' } : {}}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {draft.startMode === 'scheduled' && (
          <InputTemplate
            label="Start Date" type="date" isRequired
            value={draft.startDate ?? ''}
            onChange={e => setDraft({ ...draft, startDate: e.target.value })}
          />
        )}

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
            label="Total Weeks" type="number" min={1}
            value={draft.totalWeeks}
            onChange={e => setDraft({ ...draft, totalWeeks: Number(e.target.value) })}
          />
        </div>

        <SelectTemplate
          label="Baseline Template"
          options={[{ value: '', label: '— None —' }, ...baselineTemplates.map(b => ({ value: b.id, label: b.title }))]}
          value={draft.baselineTemplateId ?? ''}
          onChange={e => setDraft({ ...draft, baselineTemplateId: e.target.value || null })}
        />
        <SelectTemplate
          label="Check-in Template"
          options={[{ value: '', label: '— None —' }, ...checkinTemplates.map(c => ({ value: c.id, label: c.title }))]}
          value={draft.checkinTemplateId ?? ''}
          onChange={e => setDraft({ ...draft, checkinTemplateId: e.target.value || null })}
        />
      </div>
    </SheetTemplate>
  )
}

export function CohortSchedulesSection() {
  const [schedules, setSchedules] = usePersistedState<CohortCheckinSchedule[]>('checkinConfigV2.cohortSchedules', SEED_COHORT_SCHEDULES)
  const [baselineTemplates] = usePersistedState<BaselineTemplate[]>('checkinConfigV2.baselineTemplates', SEED_BASELINE_TEMPLATES)
  const [checkinTemplates] = usePersistedState<CheckinTemplate[]>('checkinConfigV2.checkinTemplates', SEED_CHECKIN_TEMPLATES)

  const [programFilter, setProgramFilter] = useState<string>('all')
  const [cohortFilter, setCohortFilter] = useState<string>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<CohortCheckinSchedule | null>(null)
  const [formKey, setFormKey] = useState(0)

  function baselineTitle(id: string | null) {
    return id ? baselineTemplates.find(b => b.id === id)?.title ?? 'Unknown baseline' : null
  }
  function checkinTitle(id: string | null) {
    return id ? checkinTemplates.find(c => c.id === id)?.title ?? 'Unknown template' : null
  }

  const programsWithSchedules = PROGRAM_LIST.filter(p => schedules.some(s => s.programId === p.id))
  const schedulesInProgram = programFilter === 'all' ? schedules : schedules.filter(s => s.programId === programFilter)
  const cohortsWithSchedules = [...new Map(schedulesInProgram.map(s => [s.cohortId, { id: s.cohortId, name: s.cohortName }])).values()]
  const filtered = cohortFilter === 'all' ? schedulesInProgram : schedulesInProgram.filter(s => s.cohortId === cohortFilter)

  function setProgramFilterAndResetCohort(id: string) {
    setProgramFilter(id)
    setCohortFilter('all')
  }
  function openNew() {
    setEditing(null)
    setFormKey(k => k + 1)
    setSheetOpen(true)
  }
  function openEdit(s: CohortCheckinSchedule) {
    setEditing(s)
    setFormKey(k => k + 1)
    setSheetOpen(true)
  }
  function handleSave(s: CohortCheckinSchedule) {
    setSchedules(prev => {
      const exists = prev.some(p => p.id === s.id)
      return exists ? prev.map(p => p.id === s.id ? s : p) : [...prev, s]
    })
    setSheetOpen(false)
  }
  function togglePause(id: string) {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, isPaused: !s.isPaused } : s))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Check-in Schedule</h3>
          <p className="text-xs text-gray-400">Set start mode, link templates, pause schedules</p>
        </div>
        <ButtonTemplate variant="primary" size="sm" label="New Schedule" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openNew} />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setProgramFilterAndResetCohort('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            programFilter === 'all' ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
          style={programFilter === 'all' ? { backgroundColor: 'var(--brand-forest)' } : {}}
        >
          All
        </button>
        {programsWithSchedules.map(p => (
          <button
            key={p.id}
            onClick={() => setProgramFilterAndResetCohort(p.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              programFilter === p.id ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
            style={programFilter === p.id ? { backgroundColor: 'var(--brand-forest)' } : {}}
          >
            {p.name}
          </button>
        ))}
      </div>

      {cohortsWithSchedules.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setCohortFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              cohortFilter === 'all' ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
            style={cohortFilter === 'all' ? { backgroundColor: 'var(--brand-mid)' } : {}}
          >
            All Cohorts
          </button>
          {cohortsWithSchedules.map(c => (
            <button
              key={c.id}
              onClick={() => setCohortFilter(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                cohortFilter === c.id ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              style={cohortFilter === c.id ? { backgroundColor: 'var(--brand-mid)' } : {}}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center gap-2">
          <Calendar className="w-8 h-8 text-gray-200" />
          <p className="text-sm font-medium text-gray-400 text-center">No cohort schedules for this filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(s => {
            const baseline = baselineTitle(s.baselineTemplateId)
            const checkin = checkinTitle(s.checkinTemplateId)
            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-gray-900">{s.cohortName}</p>
                      <BadgeTemplate label={s.isConfigured ? 'Configured' : 'Not configured'} variant={s.isConfigured ? 'success' : 'warning'} size="sm" />
                      {s.isPaused && <BadgeTemplate label="Paused" variant="danger" size="sm" />}
                      <BadgeTemplate label={s.startMode} variant="neutral" size="sm" className="capitalize" />
                    </div>
                    <p className="text-xs text-gray-400 mb-0.5">{s.programName}</p>
                    {s.isConfigured ? (
                      <p className="text-xs text-gray-500">
                        {s.startMode === 'scheduled' && s.startDate ? `Starts ${s.startDate} · ` : 'Starts immediately · '}
                        Window {s.windowDays}d · Grace {s.graceDays}d · {s.totalWeeks} weeks
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600">No schedule set — farmers cannot check in until configured.</p>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${baseline ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                        {baseline ?? 'No baseline'}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${checkin ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                        {checkin ?? 'No check-in template'}
                      </span>
                      {s.partnerName && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-100">
                          {s.partnerName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <ButtonTemplate
                      variant="outline" size="sm" isIcon
                      tooltip={s.isPaused ? 'Resume' : 'Pause'}
                      leftIcon={s.isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5 text-red-500" />}
                      onClick={() => togglePause(s.id)}
                    />
                    <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openEdit(s)} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <button
        onClick={openNew}
        className="text-sm font-semibold text-left hover:opacity-80 transition-opacity w-fit"
        style={{ color: 'var(--brand-forest)' }}
      >
        + Create new cohort schedule
      </button>

      <ScheduleFormSheet
        key={formKey}
        open={sheetOpen}
        schedule={editing}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        baselineTemplates={baselineTemplates}
        checkinTemplates={checkinTemplates}
      />
    </div>
  )
}
