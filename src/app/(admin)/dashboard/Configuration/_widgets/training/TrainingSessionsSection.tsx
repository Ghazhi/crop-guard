'use client'

import { useState } from 'react'
import {
  Video, Plus, Pencil, Trash2, CheckCircle2, Calendar, Clock,
  MapPin, Link as LinkIcon,
} from 'lucide-react'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { TextareaTemplate } from '@/customComponents/TextareaTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { usePersistedState } from '@/lib/usePersistedState'
import {
  type TrainingSession, type TrainingSessionType,
  SEED_TRAINING_SESSIONS, PROGRAM_LIST,
} from '../../_logics/trainingConfig'

const CROP_OPTIONS: { value: string; label: string }[] = [
  { value: 'maize',   label: 'Maize'   },
  { value: 'soybean', label: 'Soybean' },
  { value: 'cocoa',   label: 'Cocoa'   },
]

const TYPE_OPTIONS: { value: TrainingSessionType; label: string }[] = [
  { value: 'in_person', label: 'In-Person' },
  { value: 'online',    label: 'Online'    },
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function emptySession(): TrainingSession {
  return {
    id: `tsn-${Date.now()}`,
    title: '', description: '',
    sessionType: 'in_person',
    cropType: null, cohortId: null, cohortName: null, programName: null,
    scheduledDate: '', startTime: '', endTime: '',
    location: '', meetingLink: null,
    status: 'scheduled',
  }
}

function SessionFormSheet({
  open, session, onClose, onSave,
}: {
  open: boolean
  session: TrainingSession | null
  onClose: () => void
  onSave: (s: TrainingSession) => void
}) {
  const [draft, setDraft] = useState<TrainingSession>(session ?? emptySession())

  const [programName, setProgramName] = useState<string>(draft.programName ?? '')
  const program = PROGRAM_LIST.find(p => p.name === programName) ?? null
  const cohortOptions = program?.cohorts ?? []

  function setProgram(name: string) {
    setProgramName(name)
    setDraft({ ...draft, programName: name || null, cohortId: null, cohortName: null })
  }
  function setCohort(cohortId: string) {
    const c = cohortOptions.find(co => co.id === cohortId)
    setDraft({ ...draft, cohortId: cohortId || null, cohortName: c?.name ?? null })
  }

  const canSave = !!draft.title.trim() && !!draft.scheduledDate && !!draft.startTime && !!draft.endTime
    && (draft.sessionType === 'in_person' ? !!draft.location?.trim() : !!draft.meetingLink?.trim())

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title={session ? 'Edit Training Session' : 'New Training Session'}
      size="md"
      footer={
        <>
          <ButtonTemplate variant="outline" label="Cancel" onClick={onClose} />
          <ButtonTemplate
            variant="primary"
            label={session ? 'Update' : 'Create'}
            isDisabled={!canSave}
            onClick={() => onSave(draft)}
          />
        </>
      }
    >
      <div className="px-6 py-5 flex flex-col gap-4">
        <InputTemplate
          label="Title" isRequired
          value={draft.title}
          onChange={e => setDraft({ ...draft, title: e.target.value })}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>Session Type</label>
          <div className="flex gap-2">
            {TYPE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setDraft({ ...draft, sessionType: value, location: value === 'in_person' ? (draft.location ?? '') : null, meetingLink: value === 'online' ? (draft.meetingLink ?? '') : null })}
                className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-colors ${
                  draft.sessionType === value ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                style={draft.sessionType === value ? { backgroundColor: 'var(--brand-forest)' } : {}}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <SelectTemplate
          label="Crop"
          options={[{ value: '', label: 'All Crops' }, ...CROP_OPTIONS]}
          value={draft.cropType ?? ''}
          onChange={e => setDraft({ ...draft, cropType: e.target.value || null })}
        />

        <SelectTemplate
          label="Program"
          placeholder="Select a program..."
          options={[{ value: '', label: '— None —' }, ...PROGRAM_LIST.map(p => ({ value: p.name, label: p.name }))]}
          value={programName}
          onChange={e => setProgram(e.target.value)}
        />
        <SelectTemplate
          label="Cohort"
          placeholder={program ? 'Select a cohort...' : 'Select a program first'}
          options={[{ value: '', label: '— None —' }, ...cohortOptions.map(c => ({ value: c.id, label: c.name }))]}
          value={draft.cohortId ?? ''}
          onChange={e => setCohort(e.target.value)}
          isDisabled={!program}
        />

        <InputTemplate
          label="Date" type="date" isRequired
          value={draft.scheduledDate}
          onChange={e => setDraft({ ...draft, scheduledDate: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <InputTemplate
            label="Start Time" type="time" isRequired
            value={draft.startTime}
            onChange={e => setDraft({ ...draft, startTime: e.target.value })}
          />
          <InputTemplate
            label="End Time" type="time" isRequired
            value={draft.endTime}
            onChange={e => setDraft({ ...draft, endTime: e.target.value })}
          />
        </div>

        {draft.sessionType === 'in_person' ? (
          <InputTemplate
            label="Location" isRequired
            placeholder="e.g. Kumasi Demonstration Farm"
            value={draft.location ?? ''}
            onChange={e => setDraft({ ...draft, location: e.target.value })}
          />
        ) : (
          <InputTemplate
            label="Meeting Link" isRequired
            placeholder="e.g. https://meet.google.com/abc-defg-hij"
            value={draft.meetingLink ?? ''}
            onChange={e => setDraft({ ...draft, meetingLink: e.target.value })}
          />
        )}

        <TextareaTemplate
          label="Description"
          rows={3}
          value={draft.description}
          onChange={e => setDraft({ ...draft, description: e.target.value })}
        />
      </div>
    </SheetTemplate>
  )
}

function SessionTypeBadge({ type }: { type: TrainingSessionType }) {
  if (type === 'online') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-100">
        <LinkIcon className="w-3 h-3" /> Online
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-100">
      <MapPin className="w-3 h-3" /> In-Person
    </span>
  )
}

function SessionCard({
  session, onEdit, onDelete, onMarkComplete,
}: {
  session: TrainingSession
  onEdit: () => void
  onDelete: () => void
  onMarkComplete: () => void
}) {
  const cropLabel = CROP_OPTIONS.find(c => c.value === session.cropType)?.label

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <SessionTypeBadge type={session.sessionType} />
          {cropLabel && <BadgeTemplate label={cropLabel} variant="neutral" size="sm" />}
          {session.programName && <BadgeTemplate label={session.programName} variant="info" size="sm" className="bg-purple-50 text-purple-700 border border-purple-100" />}
          {session.cohortName && <BadgeTemplate label={session.cohortName} variant="warning" size="sm" />}
          {session.status === 'completed' && <BadgeTemplate label="Completed" variant="success" size="sm" />}
          {session.status === 'cancelled' && <BadgeTemplate label="Cancelled" variant="danger" size="sm" />}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={onEdit} />
          {session.status === 'scheduled' && (
            <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Mark complete" leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />} onClick={onMarkComplete} />
          )}
          <ButtonTemplate variant="danger" size="sm" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={onDelete} />
        </div>
      </div>

      <p className="text-sm font-semibold text-gray-900">{session.title}</p>

      <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-gray-400" /> {session.scheduledDate}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-400" /> {session.startTime}–{session.endTime}
        </span>
      </div>

      {session.sessionType === 'online' ? (
        session.meetingLink && (
          <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600 hover:underline w-fit">
            {session.meetingLink}
          </a>
        )
      ) : (
        session.location && <p className="text-xs text-gray-500">{session.location}</p>
      )}

      {session.description && <p className="text-xs text-gray-400">{session.description}</p>}
    </div>
  )
}

export function TrainingSessionsSection() {
  const [sessions, setSessions] = usePersistedState<TrainingSession[]>('training-sessions', SEED_TRAINING_SESSIONS)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<TrainingSession | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [deleting, setDeleting] = useState<TrainingSession | null>(null)

  const today = todayStr()
  const upcoming = sessions
    .filter(s => s.status !== 'completed' && (s.status === 'cancelled' || s.scheduledDate >= today))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
  const past = sessions
    .filter(s => s.status === 'completed' || (s.status !== 'cancelled' && s.scheduledDate < today))
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))

  function openNew() {
    setEditing(null)
    setFormKey(k => k + 1)
    setSheetOpen(true)
  }
  function openEdit(s: TrainingSession) {
    setEditing(s)
    setFormKey(k => k + 1)
    setSheetOpen(true)
  }
  function handleSave(s: TrainingSession) {
    setSessions(prev => {
      const exists = prev.some(p => p.id === s.id)
      return exists ? prev.map(p => p.id === s.id ? s : p) : [...prev, s]
    })
    setSheetOpen(false)
  }
  function confirmDelete() {
    if (!deleting) return
    setSessions(prev => prev.filter(p => p.id !== deleting.id))
    setDeleting(null)
  }
  function markComplete(id: string) {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'completed' } : s))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Training Sessions</h3>
          <p className="text-xs text-gray-400">In-person & online event scheduling</p>
        </div>
        <ButtonTemplate variant="primary" size="sm" label="New Session" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openNew} />
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center gap-2">
          <Video className="w-8 h-8 text-gray-200" />
          <p className="text-sm font-medium text-gray-400 text-center">No training sessions yet. Create one to get started.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Upcoming</p>
            {upcoming.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No upcoming sessions.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {upcoming.map(s => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    onEdit={() => openEdit(s)}
                    onDelete={() => setDeleting(s)}
                    onMarkComplete={() => markComplete(s.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Past &amp; Completed</p>
            {past.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No past sessions.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {past.map(s => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    onEdit={() => openEdit(s)}
                    onDelete={() => setDeleting(s)}
                    onMarkComplete={() => markComplete(s.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <SessionFormSheet
        key={formKey}
        open={sheetOpen}
        session={editing}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
      />

      <ConfirmModal
        open={!!deleting}
        title="Delete Session"
        message={`Delete "${deleting?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
