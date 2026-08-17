'use client'

import { useState } from 'react'
import { Calendar, Plus, Pencil, Pause, Play } from 'lucide-react'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { usePersistedState } from '@/lib/usePersistedState'
import {
  type AdvisorySchedule, type AdvisoryTemplate,
  SEED_ADVISORY_SCHEDULES, SEED_ADVISORY_TEMPLATES, PROGRAM_LIST,
} from '../../_logics/advisoryConfig'

function emptySchedule(): AdvisorySchedule {
  return {
    id: `as-${Date.now()}`,
    programId: '', programName: '', cohortId: '', cohortName: '',
    advisoryTemplateId: null,
    startMode: 'immediate', startDate: null,
    isPaused: false, isConfigured: false,
  }
}

function ScheduleFormSheet({
  open, schedule, onClose, onSave, advisoryTemplates,
}: {
  open: boolean
  schedule: AdvisorySchedule | null
  onClose: () => void
  onSave: (s: AdvisorySchedule) => void
  advisoryTemplates: AdvisoryTemplate[]
}) {
  const [draft, setDraft] = useState<AdvisorySchedule>(schedule ?? emptySchedule())

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
      title={schedule ? 'Edit Advisory Schedule' : 'New Advisory Schedule'}
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

        <SelectTemplate
          label="Advisory Template"
          options={[{ value: '', label: '— None —' }, ...advisoryTemplates.map(t => ({ value: t.id, label: t.title }))]}
          value={draft.advisoryTemplateId ?? ''}
          onChange={e => setDraft({ ...draft, advisoryTemplateId: e.target.value || null })}
        />
      </div>
    </SheetTemplate>
  )
}

export function AdvisoryScheduleSection() {
  const [schedules, setSchedules] = usePersistedState<AdvisorySchedule[]>('advisoryConfig.schedules', SEED_ADVISORY_SCHEDULES)
  const [advisoryTemplates] = usePersistedState<AdvisoryTemplate[]>('advisoryConfig.templates', SEED_ADVISORY_TEMPLATES)

  const [programFilter, setProgramFilter] = useState<string>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<AdvisorySchedule | null>(null)
  const [formKey, setFormKey] = useState(0)

  function templateTitle(id: string | null) {
    return id ? advisoryTemplates.find(t => t.id === id)?.title ?? 'Unknown template' : null
  }

  const programsWithSchedules = PROGRAM_LIST.filter(p => schedules.some(s => s.programId === p.id))
  const filtered = programFilter === 'all' ? schedules : schedules.filter(s => s.programId === programFilter)

  function openNew() {
    setEditing(null)
    setFormKey(k => k + 1)
    setSheetOpen(true)
  }
  function openEdit(s: AdvisorySchedule) {
    setEditing(s)
    setFormKey(k => k + 1)
    setSheetOpen(true)
  }
  function handleSave(s: AdvisorySchedule) {
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
          <h3 className="text-sm font-bold text-gray-900">Advisory Schedule</h3>
          <p className="text-xs text-gray-400">Schedule an advisory template against a cohort</p>
        </div>
        <ButtonTemplate variant="primary" size="sm" label="New Schedule" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openNew} />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setProgramFilter('all')}
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
            onClick={() => setProgramFilter(p.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              programFilter === p.id ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
            style={programFilter === p.id ? { backgroundColor: 'var(--brand-forest)' } : {}}
          >
            {p.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-12 flex flex-col items-center gap-2">
          <Calendar className="w-8 h-8 text-gray-200" />
          <p className="text-sm font-medium text-gray-400 text-center">No advisory schedules for this filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(s => {
            const template = templateTitle(s.advisoryTemplateId)
            return (
              <div key={s.id} className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-4 flex flex-col gap-3">
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
                        {s.startMode === 'scheduled' && s.startDate ? `Starts ${s.startDate}` : 'Starts immediately'}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600">No schedule set — farmers will not receive advisories until configured.</p>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${template ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                        {template ?? 'No advisory template'}
                      </span>
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

      <ScheduleFormSheet
        key={formKey}
        open={sheetOpen}
        schedule={editing}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        advisoryTemplates={advisoryTemplates}
      />
    </div>
  )
}
