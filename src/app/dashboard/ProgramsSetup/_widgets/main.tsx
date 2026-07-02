'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ChevronDown, ChevronRight, Plus, Pencil, PowerOff,
  ToggleRight, Trash2, Users, GitBranch, Check, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CardTemplate } from '@/customComponents/CardTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { useToast } from '@/customComponents/ToastTemplate'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { getPrograms } from '../_logics/functions'
import type { Program, Cohort } from '../_logics/interface'

/* ── constants ──────────────────────────────────────────────────────────────── */

const REGION_OPTIONS = [
  { value: 'AA', label: 'Ahafo' },
  { value: 'AH', label: 'Ashanti' },
  { value: 'BA', label: 'Bono' },
  { value: 'BE', label: 'Bono East' },
  { value: 'CE', label: 'Central' },
  { value: 'EP', label: 'Eastern' },
  { value: 'NE', label: 'North East' },
  { value: 'NR', label: 'Northern' },
  { value: 'OT', label: 'Oti' },
  { value: 'SA', label: 'Savannah' },
  { value: 'UE', label: 'Upper East' },
  { value: 'UW', label: 'Upper West' },
  { value: 'VR', label: 'Volta' },
  { value: 'WN', label: 'Western North' },
  { value: 'WR', label: 'Western' },
]

const CROP_OPTIONS = [
  { value: 'maize',     label: 'Maize' },
  { value: 'rice',      label: 'Rice' },
  { value: 'cassava',   label: 'Cassava' },
  { value: 'yam',       label: 'Yam' },
  { value: 'groundnut', label: 'Groundnut' },
  { value: 'soybean',   label: 'Soybean' },
  { value: 'sorghum',   label: 'Sorghum' },
  { value: 'millet',    label: 'Millet' },
  { value: 'cocoa',     label: 'Cocoa' },
  { value: 'coffee',    label: 'Coffee' },
  { value: 'tomato',    label: 'Tomato' },
  { value: 'plantain',  label: 'Plantain' },
]

const AGENT_OPTIONS = [
  { value: '',        label: 'No agent'      },
  { value: 'agt-001', label: 'Abdul Razak'   },
  { value: 'agt-002', label: 'Kwame Asante'  },
  { value: 'agt-003', label: 'Abena Owusu'   },
  { value: 'agt-004', label: 'Kofi Mensah'   },
]

/* ── helpers ────────────────────────────────────────────────────────────────── */

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

function pct(value: number, max: number) {
  return max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
}

let _seq = 1
function uid(prefix: string) { return `${prefix}-${Date.now()}-${_seq++}` }

/* ── MultiSelect ────────────────────────────────────────────────────────────── */

function MultiSelect({ label, options, value, onChange, isRequired, placeholder }: {
  label: string
  options: { value: string; label: string }[]
  value: string[]
  onChange: (vals: string[]) => void
  isRequired?: boolean
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggle(val: string) {
    onChange(value.includes(val) ? value.filter(v => v !== val) : [...value, val])
  }

  const selected = options.filter(o => value.includes(o.value))

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>
        {label}
        {isRequired && <span className="ml-0.5" style={{ color: 'var(--brand-red)' }}>*</span>}
      </label>

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={cn(
            'w-full h-10 text-sm px-3 rounded-lg border bg-white flex items-center justify-between transition-all',
            'hover:border-gray-300 focus:outline-none',
            open
              ? 'border-(--brand-green) ring-2 ring-(--brand-green)/20'
              : 'border-gray-200',
          )}
        >
          <span className={value.length === 0 ? 'text-gray-400' : 'text-gray-700'}>
            {value.length === 0 ? (placeholder ?? 'Select…') : `${value.length} selected`}
          </span>
          <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {options.map(opt => {
              const checked = value.includes(opt.value)
              return (
                <div
                  key={opt.value}
                  onClick={() => toggle(opt.value)}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer select-none"
                >
                  <div className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                    checked ? 'border-(--brand-green) bg-(--brand-green)' : 'border-gray-300',
                  )}>
                    {checked && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {selected.map(opt => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full border bg-green-50 border-green-200 text-green-700"
            >
              {opt.label}
              <button
                type="button"
                onClick={() => toggle(opt.value)}
                className="hover:text-green-900 leading-none"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── FormSheet shell ────────────────────────────────────────────────────────── */

function FormSheet({ title, open, onClose, children, footer }: {
  title: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="right" showCloseButton className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b border-gray-100">
          <SheetTitle style={{ color: 'var(--brand-forest)' }}>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {children}
        </div>
        <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white grid grid-cols-2 gap-2">
          {footer}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ── Program Form Sheet (Create + Edit) ─────────────────────────────────────── */

type ProgramFormData = {
  name: string
  description: string
  season: string
  startDate: string
  endDate: string
  targetCount: number
  crops: string[]
  status: Program['status']
}

function ProgramFormSheet({ open, mode, initial, onSave, onClose }: {
  open: boolean
  mode: 'create' | 'edit'
  initial?: Program
  onSave: (data: ProgramFormData) => void
  onClose: () => void
}) {
  const toast = useToast()

  const blank = {
    name:             '',
    description:      '',
    season:           '',
    startDate:        '',
    endDate:          '',
    targetEnrollment: '100',
    crops:            [] as string[],
    regions:          [] as string[],
  }

  const [form, setForm] = useState(blank)

  useEffect(() => {
    if (open) {
      setForm({
        name:             initial?.name        ?? '',
        description:      initial?.description ?? '',
        season:           initial?.season      ?? '',
        startDate:        initial?.startDate   ?? '',
        endDate:          initial?.endDate     ?? '',
        targetEnrollment: String(initial?.targetCount ?? 100),
        crops:            initial?.crops       ?? [],
        regions:          [],
      })
    }
  }, [open])

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleSubmit() {
    if (!form.name || !form.season || !form.startDate || !form.endDate || !form.crops.length) {
      toast.error('Please fill in all required fields')
      return
    }
    onSave({
      name:        form.name,
      description: form.description,
      season:      form.season,
      startDate:   form.startDate,
      endDate:     form.endDate,
      targetCount: Number(form.targetEnrollment) || 100,
      crops:       form.crops,
      status:      initial?.status ?? 'Active',
    })
    toast.success(mode === 'create' ? `Program "${form.name}" created` : `Program "${form.name}" updated`)
    onClose()
  }

  return (
    <FormSheet
      title={mode === 'create' ? 'Create Program' : 'Edit Program'}
      open={open}
      onClose={onClose}
      footer={
        <>
          <ButtonTemplate variant="outline" size="md" label="Cancel" fullWidth onClick={onClose} />
          <ButtonTemplate
            variant="primary" size="md" fullWidth
            label={mode === 'create' ? 'Create Program' : 'Save Changes'}
            onClick={handleSubmit}
          />
        </>
      }
    >
      <InputTemplate
        label="PROGRAM NAME"
        isRequired
        placeholder="e.g. 2024 Maize Outgrower Scheme"
        value={form.name}
        onChange={e => set('name', e.target.value)}
      />
      <InputTemplate
        label="DESCRIPTION"
        placeholder="Brief description"
        value={form.description}
        onChange={e => set('description', e.target.value)}
      />
      <InputTemplate
        label="CROP SEASON"
        isRequired
        placeholder="e.g. 2024A"
        value={form.season}
        onChange={e => set('season', e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <InputTemplate
          label="START DATE"
          isRequired
          type="date"
          value={form.startDate}
          onChange={e => set('startDate', e.target.value)}
        />
        <InputTemplate
          label="END DATE"
          isRequired
          type="date"
          value={form.endDate}
          onChange={e => set('endDate', e.target.value)}
        />
      </div>
      <InputTemplate
        label="TARGET ENROLLMENT"
        type="number"
        value={form.targetEnrollment}
        onChange={e => set('targetEnrollment', e.target.value)}
      />
      <MultiSelect
        label="CROP TYPES"
        isRequired
        placeholder="Select crop types *"
        options={CROP_OPTIONS}
        value={form.crops}
        onChange={vals => setForm(f => ({ ...f, crops: vals }))}
      />
      <MultiSelect
        label="REGIONS"
        isRequired
        placeholder="Select regions *"
        options={REGION_OPTIONS}
        value={form.regions}
        onChange={vals => setForm(f => ({ ...f, regions: vals }))}
      />
    </FormSheet>
  )
}

/* ── Cohort Form Sheet (Add + Edit) ─────────────────────────────────────────── */

type CohortFormData = {
  name: string
  region: string
  district: string
  targetCount: number
  agentName: string
}

function CohortFormSheet({ open, mode, programName, programs, initial, onSave, onClose }: {
  open: boolean
  mode: 'add' | 'edit'
  programName: string
  programs: Program[]
  initial?: Cohort
  onSave: (data: CohortFormData) => void
  onClose: () => void
}) {
  const toast = useToast()
  const [form, setForm] = useState({
    programId:   programs.find(p => p.name === programName)?.id ?? '',
    name:        initial?.name        ?? '',
    region:      initial?.region      ?? '',
    district:    initial?.district    ?? '',
    targetCount: String(initial?.targetCount ?? 50),
    agentName:   initial?.agentName   ?? '',
  })

  useEffect(() => {
    if (open) {
      setForm({
        programId:   programs.find(p => p.name === programName)?.id ?? '',
        name:        initial?.name        ?? '',
        region:      initial?.region      ?? '',
        district:    initial?.district    ?? '',
        targetCount: String(initial?.targetCount ?? 50),
        agentName:   initial?.agentName   ?? '',
      })
    }
  }, [open])

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleSubmit() {
    if (!form.name || !form.region || !form.district) {
      toast.error('Please fill in all required fields')
      return
    }
    onSave({
      name:        form.name,
      region:      form.region,
      district:    form.district,
      targetCount: Number(form.targetCount) || 50,
      agentName:   form.agentName,
    })
    toast.success(mode === 'add' ? `Cohort "${form.name}" added` : `Cohort "${form.name}" updated`)
    onClose()
  }

  return (
    <FormSheet
      title={mode === 'add' ? 'Add Cohort' : 'Edit Cohort'}
      open={open}
      onClose={onClose}
      footer={
        <>
          <ButtonTemplate variant="outline" size="md" label="Cancel" fullWidth onClick={onClose} />
          <ButtonTemplate
            variant="primary" size="md" fullWidth
            label={mode === 'add' ? 'Add Cohort' : 'Save Changes'}
            onClick={handleSubmit}
          />
        </>
      }
    >
      <SelectTemplate
        label="PROGRAM"
        options={programs.map(p => ({ value: p.id, label: p.name }))}
        value={form.programId}
        onChange={e => set('programId', e.target.value)}
      />
      <InputTemplate
        label="COHORT NAME"
        isRequired
        placeholder="e.g. Ashanti Batch A"
        value={form.name}
        onChange={e => set('name', e.target.value)}
      />
      <SelectTemplate
        label="REGION"
        isRequired
        placeholder="Select region"
        options={REGION_OPTIONS}
        value={REGION_OPTIONS.find(r => r.label === form.region)?.value ?? ''}
        onChange={e => set('region', REGION_OPTIONS.find(r => r.value === e.target.value)?.label ?? '')}
      />
      <InputTemplate
        label="DISTRICT"
        isRequired
        placeholder="e.g. Kumasi Metro"
        value={form.district}
        onChange={e => set('district', e.target.value)}
      />
      <InputTemplate
        label="TARGET COUNT"
        type="number"
        value={form.targetCount}
        onChange={e => set('targetCount', e.target.value)}
      />
      <SelectTemplate
        label="ASSIGNED AGENT"
        options={AGENT_OPTIONS}
        value={AGENT_OPTIONS.find(a => a.label === form.agentName)?.value ?? ''}
        onChange={e => set('agentName', AGENT_OPTIONS.find(a => a.value === e.target.value)?.label ?? '')}
      />
    </FormSheet>
  )
}

/* ── CohortRow ──────────────────────────────────────────────────────────────── */

function CohortRow({ cohort, programs, onUpdateCohort, onDeleteCohort }: {
  cohort: Cohort
  programs: Program[]
  onUpdateCohort: (updated: Cohort) => void
  onDeleteCohort: (id: string) => void
}) {
  const toast    = useToast()
  const filled   = pct(cohort.enrolledCount, cohort.targetCount)
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <div className="border-t hover:bg-white/50 transition-colors" style={{ borderColor: 'var(--brand-pale)' }}>
        {/* Row 1: icon · name · actions */}
        <div className="flex items-center gap-2.5 px-5 pt-3 pb-1">
          <GitBranch className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--brand-mid)' }} />
          <p className="flex-1 text-sm font-semibold min-w-0 truncate" style={{ color: 'var(--brand-forest)' }}>
            {cohort.name}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <ButtonTemplate
              variant="ghost" size="sm" isIcon
              leftIcon={<Users className="w-3.5 h-3.5" />}
              className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200"
              onClick={() => toast.info(`View farmers in ${cohort.name}`)}
            />
            <ButtonTemplate
              variant="outline" size="sm"
              leftIcon={<Pencil className="w-3 h-3" />}
              label="Edit"
              onClick={() => setEditOpen(true)}
            />
            <ButtonTemplate
              variant="ghost" size="sm" isIcon
              leftIcon={<ToggleRight className="w-4 h-4" />}
              className="text-amber-500 hover:text-amber-600 hover:bg-amber-50"
              onClick={() => toast.info(`Toggle ${cohort.name}`)}
            />
            <ButtonTemplate
              variant="ghost" size="sm" isIcon
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              className="text-red-400 hover:text-red-500 hover:bg-red-50"
              onClick={() => {
                onDeleteCohort(cohort.id)
                toast.success(`${cohort.name} removed`)
              }}
            />
          </div>
        </div>
        {/* Row 2: location */}
        <p className="px-5 pl-7.5 text-xs text-gray-400 pb-2">
          {cohort.region} · {cohort.district} ·{' '}
          <span style={{ color: 'var(--brand-forest)' }}>{cohort.agentName}</span>
        </p>
        {/* Row 3: progress */}
        <div className="flex items-center gap-3 px-5 pl-7.5 pb-3">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${filled}%`, backgroundColor: 'var(--brand-green)' }} />
          </div>
          <span className="text-xs text-gray-400 tabular-nums shrink-0">
            {cohort.enrolledCount} / {cohort.targetCount}
          </span>
        </div>
      </div>

      <CohortFormSheet
        open={editOpen}
        mode="edit"
        programName={programs[0]?.name ?? ''}
        programs={programs}
        initial={cohort}
        onSave={data => onUpdateCohort({ ...cohort, ...data })}
        onClose={() => setEditOpen(false)}
      />
    </>
  )
}

/* ── ProgramRow ─────────────────────────────────────────────────────────────── */

function ProgramRow({ program, allPrograms, onUpdate }: {
  program: Program
  allPrograms: Program[]
  onUpdate: (updated: Program) => void
}) {
  const [expanded,        setExpanded]        = useState(true)
  const [editProgramOpen, setEditProgramOpen] = useState(false)
  const [addCohortOpen,   setAddCohortOpen]   = useState(false)
  const toast = useToast()

  const totalEnrolled = program.cohorts.reduce((s, c) => s + c.enrolledCount, program.enrolledCount)
  const filled        = pct(totalEnrolled, program.targetCount)
  const isActive      = program.status === 'Active'
  const statusVariant = program.status === 'Active' ? 'success' : program.status === 'Completed' ? 'info' : 'neutral'

  function handleUpdateCohort(updated: Cohort) {
    onUpdate({ ...program, cohorts: program.cohorts.map(c => c.id === updated.id ? updated : c) })
  }

  function handleDeleteCohort(id: string) {
    onUpdate({ ...program, cohorts: program.cohorts.filter(c => c.id !== id) })
  }

  function handleToggleStatus() {
    const next: Program['status'] = isActive ? 'Inactive' : 'Active'
    const updated = { ...program, status: next }
    onUpdate(updated)
    toast.success(`${program.name} ${next === 'Active' ? 'activated' : 'deactivated'}`)
  }

  return (
    <>
      <CardTemplate noPadding className="overflow-hidden">
        {/* Program body */}
        <div className={cn('px-6 pt-4 pb-3', !isActive && 'opacity-50 pointer-events-none')}>
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => setExpanded(v => !v)} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              <h3 className="text-base font-bold truncate" style={{ color: 'var(--brand-forest)' }}>
                {program.name}
              </h3>
            </div>
            <BadgeTemplate label={program.status} variant={statusVariant} size="sm" />
          </div>

          <p className="pl-6 text-xs text-gray-400 mb-1">{program.season}</p>
          <p className="pl-6 text-sm text-gray-500 mb-2 leading-snug">{program.description}</p>

          <div className="pl-6 flex flex-wrap gap-1.5 mb-3">
            {program.crops.map(crop => (
              <BadgeTemplate key={crop} label={crop} variant="success" size="sm" />
            ))}
          </div>

          <div className="pl-6 flex items-center gap-3">
            <span className="text-xs text-gray-400 shrink-0">
              {fmtDate(program.startDate)} – {fmtDate(program.endDate)}
            </span>
            <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: 'var(--brand-dark)' }}>
              <Users className="w-3.5 h-3.5" />
              {totalEnrolled} / {program.targetCount}
            </span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${filled}%`, backgroundColor: 'var(--brand-green)' }} />
            </div>
            <span className="text-xs text-gray-400 tabular-nums shrink-0">{filled}%</span>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between px-6 py-2.5 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <ButtonTemplate
              variant="outline" size="sm"
              leftIcon={<Pencil className="w-3.5 h-3.5" />}
              label="Edit"
              onClick={() => setEditProgramOpen(true)}
            />
            <ButtonTemplate
              variant="outline" size="sm"
              leftIcon={<PowerOff className="w-3.5 h-3.5" />}
              label={isActive ? 'Deactivate' : 'Activate'}
              onClick={handleToggleStatus}
            />
          </div>
          <div className={cn(!isActive && 'opacity-50 pointer-events-none')}>
            <ButtonTemplate
              variant="primary" size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              label="Add Cohort"
              onClick={() => setAddCohortOpen(true)}
            />
          </div>
        </div>

        {/* Cohorts */}
        {expanded && program.cohorts.length > 0 && (
          <div className={cn('rounded-b-xl overflow-hidden', !isActive && 'opacity-50 pointer-events-none')}
            style={{ backgroundColor: 'var(--brand-mint)' }}>
            {program.cohorts.map(cohort => (
              <CohortRow
                key={cohort.id}
                cohort={cohort}
                programs={allPrograms}
                onUpdateCohort={handleUpdateCohort}
                onDeleteCohort={handleDeleteCohort}
              />
            ))}
          </div>
        )}
      </CardTemplate>

      <ProgramFormSheet
        open={editProgramOpen}
        mode="edit"
        initial={program}
        onSave={data => onUpdate({ ...program, ...data })}
        onClose={() => setEditProgramOpen(false)}
      />
      <CohortFormSheet
        open={addCohortOpen}
        mode="add"
        programName={program.name}
        programs={allPrograms}
        onSave={data => {
          const newCohort: Cohort = { id: uid('coh'), enrolledCount: 0, ...data }
          onUpdate({ ...program, cohorts: [...program.cohorts, newCohort] })
        }}
        onClose={() => setAddCohortOpen(false)}
      />
    </>
  )
}

/* ── Main ───────────────────────────────────────────────────────────────────── */

export function Main() {
  const [programs,   setPrograms]   = useState<Program[]>([])
  const [loading,    setLoading]    = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const toast = useToast()

  useEffect(() => {
    getPrograms().then(data => { setPrograms(data); setLoading(false) })
  }, [])

  function handleCreateProgram(data: ProgramFormData) {
    const newProgram: Program = {
      id:            uid('pgm'),
      enrolledCount: 0,
      cohorts:       [],
      ...data,
    }
    setPrograms(prev => [...prev, newProgram])
  }

  function handleUpdateProgram(updated: Program) {
    setPrograms(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  const totalCohorts = programs.reduce((s, p) => s + p.cohorts.length, 0)

  return (
    <>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>
              Programs &amp; Cohorts
            </h1>
            {!loading && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--brand-slate)' }}>
                {programs.length} {programs.length === 1 ? 'program' : 'programs'} · {totalCohorts} {totalCohorts === 1 ? 'cohort' : 'cohorts'}
              </p>
            )}
          </div>
          <ButtonTemplate
            variant="primary" size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            label="New Program"
            onClick={() => setCreateOpen(true)}
          />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-48 rounded-xl bg-gray-200 animate-pulse" />)}
          </div>
        ) : programs.length === 0 ? (
          <CardTemplate>
            <p className="text-sm text-center text-gray-400 py-8">No programs yet.</p>
          </CardTemplate>
        ) : (
          <div className="space-y-4">
            {programs.map(program => (
              <ProgramRow
                key={program.id}
                program={program}
                allPrograms={programs}
                onUpdate={handleUpdateProgram}
              />
            ))}
          </div>
        )}
      </div>

      <ProgramFormSheet
        open={createOpen}
        mode="create"
        onSave={data => { handleCreateProgram(data); setCreateOpen(false) }}
        onClose={() => setCreateOpen(false)}
      />
    </>
  )
}
