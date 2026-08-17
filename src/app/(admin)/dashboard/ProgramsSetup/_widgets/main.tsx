'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePersistedState } from '@/lib/usePersistedState'
import { useCropOptions } from '@/dataCenter/useCropOptions'
import {
  ChevronDown, Plus, Pencil, PowerOff,
  ToggleRight, Trash2, Users, GitBranch, X, Eye, Calendar, Wheat,
  LayoutGrid, List, BarChart2, ChevronUp, Search, UserCog, Columns3,
  AlertTriangle, Award, CheckCircle2, Circle, XCircle,
} from 'lucide-react'
import { Main as AgentAssignmentTab } from '@/app/(admin)/dashboard/AgentAssignment/_widgets/main'
import { cn } from '@/lib/utils'
import { CardTemplate } from '@/customComponents/CardTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { useToast } from '@/customComponents/ToastTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { MultiSelectTemplate } from '@/customComponents/MultiSelectTemplate'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { getPrograms } from '../_logics/functions'
import { getFarmers } from '../../FarmersRegistry/_logics/functions'
import { PaginationBar } from '@/customComponents/PaginationBar'
import type { Program, Cohort } from '../_logics/interface'
import type { Farmer } from '../../FarmersRegistry/_logics/interface'
import { FARMERS_LIST } from '@/dataCenter/farmerManagement'
import { PARTNERS } from '@/dataCenter/partners'
import { PersonAvatar } from '@/customComponents/PersonAvatar'
import {
  ENROLMENT_COLUMNS, ZONE_COLORS, ZONE_RISK,
  enrolmentWorkflowDetail, communityDetail, useWorkflowStages,
} from '../../FarmersRegistry/_widgets/main'
import {
  DEFAULT_WORKFLOW_STAGES, DEFAULT_QUALIFYING_STAGE_ID,
  WORKFLOW_STAGES_KEY, WORKFLOW_QUALIFYING_STAGE_ID_KEY,
} from '../../Configuration/_logics/workflowConfig'

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

/* ── FormSheet shell ────────────────────────────────────────────────────────── */

function FormSheet({ title, open, onClose, onBack, children, footer }: {
  title: string
  open: boolean
  onClose: () => void
  onBack?: () => void
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="right" showCloseButton className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b border-gray-100">
          {onBack && (
            <button type="button" onClick={onBack}
              className="flex items-center gap-1 text-xs font-medium mb-1 -ml-0.5 transition-colors"
              style={{ color: 'var(--brand-green)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              Back
            </button>
          )}
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

function ProgramFormSheet({ open, mode, initial, onSave, onClose, onBack }: {
  open: boolean
  mode: 'create' | 'edit'
  initial?: Program
  onSave: (data: ProgramFormData) => void
  onClose: () => void
  onBack?: () => void
}) {
  const toast = useToast()
  const CROP_OPTIONS = useCropOptions()

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
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      name:             initial?.name        ?? '',
      description:      initial?.description ?? '',
      season:           initial?.season      ?? '',
      startDate:        initial?.startDate   ?? '',
      endDate:          initial?.endDate     ?? '',
      targetEnrollment: String(initial?.targetCount ?? 100),
      crops:            (initial?.crops ?? []).map(c => CROP_OPTIONS.find(o => o.label === c)?.value ?? c),
      regions:          [],
    })
  }, [open, initial, CROP_OPTIONS])

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
      crops:       form.crops.map(v => CROP_OPTIONS.find(o => o.value === v)?.label ?? v),
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
      onBack={mode === 'edit' ? onBack : undefined}
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
      <MultiSelectTemplate
        label="CROP TYPES"
        isRequired
        placeholder="Select crop types *"
        options={CROP_OPTIONS}
        value={form.crops}
        onChange={vals => setForm(f => ({ ...f, crops: vals }))}
      />
      <MultiSelectTemplate
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
  partnerId: string | null
  partnerName: string | null
}

function CohortFormSheet({ open, mode, programName, programs, initial, onSave, onClose, onBack }: {
  open: boolean
  mode: 'add' | 'edit'
  programName: string
  programs: Program[]
  initial?: Cohort
  onSave: (data: CohortFormData) => void
  onClose: () => void
  onBack?: () => void
}) {
  const toast = useToast()
  const [form, setForm] = useState({
    programId:   programs.find(p => p.name === programName)?.id ?? '',
    name:        initial?.name        ?? '',
    region:      initial?.region      ?? '',
    district:    initial?.district    ?? '',
    targetCount: String(initial?.targetCount ?? 50),
    agentName:   initial?.agentName   ?? '',
    partnerId:   initial?.partnerId   ?? '',
  })

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      programId:   programs.find(p => p.name === programName)?.id ?? '',
      name:        initial?.name        ?? '',
      region:      initial?.region      ?? '',
      district:    initial?.district    ?? '',
      targetCount: String(initial?.targetCount ?? 50),
      agentName:   initial?.agentName   ?? '',
      partnerId:   initial?.partnerId   ?? '',
    })
  }, [open, initial, programName, programs])

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleSubmit() {
    if (!form.name || !form.region || !form.district) {
      toast.error('Please fill in all required fields')
      return
    }
    const partner = PARTNERS.find(p => p.id === form.partnerId)
    onSave({
      name:        form.name,
      region:      form.region,
      district:    form.district,
      targetCount: Number(form.targetCount) || 50,
      agentName:   form.agentName,
      partnerId:   partner?.id ?? null,
      partnerName: partner?.name ?? null,
    })
    toast.success(mode === 'add' ? `Cohort "${form.name}" added` : `Cohort "${form.name}" updated`)
    onClose()
  }

  return (
    <FormSheet
      title={mode === 'add' ? 'Add Cohort' : 'Edit Cohort'}
      open={open}
      onClose={onClose}
      onBack={mode === 'edit' ? onBack : undefined}
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
      <SelectTemplate
        label="PARTNER"
        placeholder="Select a partner…"
        options={PARTNERS.map(p => ({ value: p.id, label: p.name }))}
        value={form.partnerId}
        onChange={e => set('partnerId', e.target.value)}
      />
    </FormSheet>
  )
}

/* ── CohortFarmersSheet ─────────────────────────────────────────────────────── */

function CohortFarmersSheet({ open, onClose, cohort }: {
  open: boolean
  onClose: () => void
  cohort: Cohort | null
}) {
  if (!cohort) return null

  const farmers = FARMERS_LIST.filter(f => f.enrollment?.cohortId === cohort.id)

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="right" showCloseButton className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b border-gray-100">
          <SheetTitle style={{ color: 'var(--brand-forest)' }}>
            {cohort.name} — Farmers
          </SheetTitle>
          <p className="text-xs text-gray-400 mt-0.5">
            {cohort.region} · {cohort.district} ·{' '}
            <span style={{ color: 'var(--brand-green)' }}>
              {farmers.length}/{cohort.targetCount} enrolled
            </span>
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {farmers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8 py-20">
              <Users className="w-10 h-10 text-gray-300" />
              <p className="text-sm font-semibold text-gray-500">No farmers enrolled yet</p>
              <p className="text-xs text-gray-400">
                Enroll farmers from the{' '}
                <span style={{ color: 'var(--brand-green)' }}>Farmers page</span>.
              </p>
            </div>
          ) : (
            <div className="px-4 py-3 space-y-1">
              {farmers.map(f => {
                return (
                  <div key={f.id} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <PersonAvatar name={f.fullName} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--brand-forest)' }}>
                        {f.fullName}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {f.phone}{f.region ? ` · ${REGION_OPTIONS.find(r => r.value.toLowerCase() === f.region.toLowerCase())?.label ?? f.region}` : ''}
                      </p>
                    </div>
                    {f.currentFri != null && (
                      <span className="text-xs font-bold shrink-0" style={{ color: 'var(--brand-forest)' }}>
                        FRI {f.currentFri}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ── CohortSheet (combined view + edit) ─────────────────────────────────────── */

function CohortSheet({
  mode, cohort, programName, programs, onClose, onModeChange, onSave,
}: {
  mode: 'view' | 'edit' | null
  cohort: Cohort
  programName: string
  programs: Program[]
  onClose: () => void
  onModeChange: (m: 'view' | 'edit') => void
  onSave: (data: CohortFormData) => void
}) {
  const toast = useToast()
  const open = mode !== null
  const isEdit = mode === 'edit'
  const filled = pct(cohort.enrolledCount, cohort.targetCount)

  const [form, setForm] = useState({
    programId:   '',
    name:        '',
    region:      '',
    district:    '',
    targetCount: '50',
    agentName:   '',
    partnerId:   '',
  })

  useEffect(() => {
    if (mode !== 'edit') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      programId:   programs.find(p => p.name === programName)?.id ?? '',
      name:        cohort.name ?? '',
      region:      cohort.region ?? '',
      district:    cohort.district ?? '',
      targetCount: String(cohort.targetCount ?? 50),
      agentName:   cohort.agentName ?? '',
      partnerId:   cohort.partnerId ?? '',
    })
  }, [mode, cohort, programName, programs])

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  function handleSubmit() {
    if (!form.name || !form.region || !form.district) {
      toast.error('Please fill in all required fields'); return
    }
    const partner = PARTNERS.find(p => p.id === form.partnerId)
    onSave({
      name: form.name, region: form.region, district: form.district,
      targetCount: Number(form.targetCount) || 50, agentName: form.agentName,
      partnerId: partner?.id ?? null, partnerName: partner?.name ?? null,
    })
    toast.success(`Cohort "${form.name}" updated`)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="right" showCloseButton className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b border-gray-100">
          {isEdit && (
            <button type="button" onClick={() => onModeChange('view')}
              className="flex items-center gap-1 text-xs font-medium mb-1 -ml-0.5 transition-colors"
              style={{ color: 'var(--brand-green)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              Back
            </button>
          )}
          <div className="flex items-start justify-between pr-6">
            <div className="flex-1 min-w-0">
              <SheetTitle style={{ color: 'var(--brand-forest)' }}>{isEdit ? 'Edit Cohort' : cohort.name}</SheetTitle>
              <p className="text-xs text-gray-400 mt-0.5">{programName}</p>
            </div>
            {!isEdit && (
              <div className="flex items-center gap-2">
                <BadgeTemplate label={cohort.status} variant={cohort.status === 'Active' ? 'success' : 'neutral'} size="sm" />
                <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit"
                  leftIcon={<Pencil className="w-3.5 h-3.5" />}
                  onClick={() => onModeChange('edit')} />
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {!isEdit ? (
            <>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Region</span>
                  <span className="font-medium" style={{ color: 'var(--brand-forest)' }}>{cohort.region}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">District</span>
                  <span className="font-medium" style={{ color: 'var(--brand-forest)' }}>{cohort.district}</span>
                </div>
                {cohort.agentName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Agent</span>
                    <span className="font-medium" style={{ color: 'var(--brand-forest)' }}>{cohort.agentName}</span>
                  </div>
                )}
                {cohort.partnerName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Partner</span>
                    <span className="font-medium" style={{ color: 'var(--brand-forest)' }}>{cohort.partnerName}</span>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-gray-100 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium" style={{ color: 'var(--brand-forest)' }}>Enrollment</span>
                  <span className="text-gray-400 tabular-nums">{cohort.enrolledCount} / {cohort.targetCount}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${filled}%`, backgroundColor: 'var(--brand-green)' }} />
                </div>
                <p className="text-xs text-gray-400">{filled}% of target reached</p>
              </div>
            </>
          ) : (
            <>
              <SelectTemplate label="PROGRAM"
                options={programs.map(p => ({ value: p.id, label: p.name }))}
                value={form.programId} onChange={e => set('programId', e.target.value)} />
              <InputTemplate label="COHORT NAME" isRequired placeholder="e.g. Ashanti Batch A"
                value={form.name} onChange={e => set('name', e.target.value)} />
              <SelectTemplate label="REGION" isRequired placeholder="Select region"
                options={REGION_OPTIONS}
                value={REGION_OPTIONS.find(r => r.label === form.region)?.value ?? ''}
                onChange={e => set('region', REGION_OPTIONS.find(r => r.value === e.target.value)?.label ?? '')} />
              <InputTemplate label="DISTRICT" isRequired placeholder="e.g. Kumasi Metro"
                value={form.district} onChange={e => set('district', e.target.value)} />
              <InputTemplate label="TARGET COUNT" type="number"
                value={form.targetCount} onChange={e => set('targetCount', e.target.value)} />
              <SelectTemplate label="ASSIGNED AGENT"
                options={AGENT_OPTIONS}
                value={AGENT_OPTIONS.find(a => a.label === form.agentName)?.value ?? ''}
                onChange={e => set('agentName', AGENT_OPTIONS.find(a => a.value === e.target.value)?.label ?? '')} />
              <SelectTemplate label="PARTNER" placeholder="Select a partner…"
                options={PARTNERS.map(p => ({ value: p.id, label: p.name }))}
                value={form.partnerId} onChange={e => set('partnerId', e.target.value)} />
            </>
          )}
        </div>

        {isEdit && (
          <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white grid grid-cols-2 gap-2">
            <ButtonTemplate variant="outline" size="md" label="Cancel" fullWidth onClick={onClose} />
            <ButtonTemplate variant="primary" size="md" fullWidth label="Save Changes" onClick={handleSubmit} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

/* ── CohortRow ──────────────────────────────────────────────────────────────── */

function CohortRow({ cohort, programs, programName, onUpdateCohort, onDeleteCohort, onRequestUnassignAgent }: {
  cohort: Cohort
  programs: Program[]
  programName: string
  onUpdateCohort: (updated: Cohort) => void
  onDeleteCohort: (id: string) => void
  onRequestUnassignAgent: (cohortId: string, agentName: string) => void
}) {
  const toast    = useToast()
  const filled   = pct(cohort.enrolledCount, cohort.targetCount)
  const isActive = cohort.status === 'Active'
  const [cohortMode,  setCohortMode]  = useState<'view' | 'edit' | null>(null)
  const [farmersOpen, setFarmersOpen] = useState(false)

  function handleToggle() {
    const next: Cohort['status'] = isActive ? 'Inactive' : 'Active'
    onUpdateCohort({ ...cohort, status: next })
    toast.success(`${cohort.name} ${next === 'Active' ? 'activated' : 'deactivated'}`)
  }

  return (
    <>
      <div
        className={cn('border-t cursor-pointer transition-colors hover:bg-gray-50', !isActive && 'opacity-50')}
        style={{ borderColor: '#e5e7eb' }}
        onClick={() => setCohortMode('view')}
      >
        {/* Row 1: icon · name · actions */}
        <div className="flex items-center gap-2.5 px-5 pt-3 pb-1">
          <GitBranch className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
          <p className="flex-1 text-sm font-bold min-w-0 truncate text-gray-800">
            {cohort.name}
          </p>
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <ButtonTemplate
              variant="ghost" size="sm" isIcon
              leftIcon={<Users className="w-3.5 h-3.5" />}
              className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200"
              title="View farmers"
              onClick={() => setFarmersOpen(true)}
            />
            <ButtonTemplate
              variant="ghost" size="sm" isIcon
              leftIcon={<ToggleRight className="w-4 h-4" />}
              className={isActive ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50' : 'text-green-500 hover:text-green-600 hover:bg-green-50'}
              title={isActive ? 'Deactivate cohort' : 'Activate cohort'}
              onClick={handleToggle}
            />
            <ButtonTemplate
              variant="ghost" size="sm" isIcon
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              className="text-red-400 hover:text-red-500 hover:bg-red-50"
              title="Delete cohort"
              onClick={() => onDeleteCohort(cohort.id)}
            />
          </div>
        </div>
        {/* Row 2: location + agent chip */}
        <div className="px-5 pl-7.5 pb-2 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-600">{cohort.region} · {cohort.district}</span>
          {cohort.agentName ? (
            <span className="group/chip inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: 'var(--brand-forest)' }}>
              {cohort.agentName}
              <button
                onClick={e => { e.stopPropagation(); onRequestUnassignAgent(cohort.id, cohort.agentName) }}
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center opacity-0 group-hover/chip:opacity-100 hover:bg-white/20 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ) : (
            <span className="text-xs text-gray-400 italic">No agent</span>
          )}
        </div>
        {/* Row 3: progress */}
        <div className="flex items-center gap-3 px-5 pl-7.5 pb-3">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${filled}%`, backgroundColor: 'var(--brand-green)' }} />
          </div>
          <span className="text-xs font-semibold text-gray-700 tabular-nums shrink-0">
            {cohort.enrolledCount} / {cohort.targetCount}
          </span>
        </div>
      </div>

      <CohortSheet
        mode={cohortMode}
        cohort={cohort}
        programName={programName}
        programs={programs}
        onClose={() => setCohortMode(null)}
        onModeChange={setCohortMode}
        onSave={data => onUpdateCohort({ ...cohort, ...data })}
      />
      <CohortFarmersSheet
        open={farmersOpen}
        onClose={() => setFarmersOpen(false)}
        cohort={cohort}
      />
    </>
  )
}

/* ── ProgramSheet (combined view + edit) ────────────────────────────────────── */

function ProgramSheet({
  mode, program, onClose, onModeChange, onSave,
}: {
  mode: 'view' | 'edit' | null
  program: Program | null
  onClose: () => void
  onModeChange: (m: 'view' | 'edit') => void
  onSave: (data: ProgramFormData) => void
}) {
  const toast = useToast()
  const CROP_OPTIONS = useCropOptions()
  const open = mode !== null && program !== null
  const isEdit = mode === 'edit'

  const totalEnrolled = program ? program.cohorts.reduce((s, c) => s + c.enrolledCount, program.enrolledCount) : 0
  const filled        = program ? pct(totalEnrolled, program.targetCount) : 0
  const statusVariant = program?.status === 'Active' ? 'success' : program?.status === 'Completed' ? 'info' : 'neutral'

  const [form, setForm] = useState({
    name: '', description: '', season: '', startDate: '', endDate: '',
    targetEnrollment: '100', crops: [] as string[], regions: [] as string[],
  })

  useEffect(() => {
    if (mode !== 'edit' || !program) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      name:             program.name        ?? '',
      description:      program.description ?? '',
      season:           program.season      ?? '',
      startDate:        program.startDate   ?? '',
      endDate:          program.endDate     ?? '',
      targetEnrollment: String(program.targetCount ?? 100),
      crops:            (program.crops ?? []).map(c => CROP_OPTIONS.find(o => o.label === c)?.value ?? c),
      regions:          [],
    })
  }, [mode, program, CROP_OPTIONS])

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  function handleSubmit() {
    if (!form.name || !form.season || !form.startDate || !form.endDate || !form.crops.length) {
      toast.error('Please fill in all required fields'); return
    }
    onSave({ name: form.name, description: form.description, season: form.season, startDate: form.startDate, endDate: form.endDate, targetCount: Number(form.targetEnrollment) || 100, crops: form.crops.map(v => CROP_OPTIONS.find(o => o.value === v)?.label ?? v), status: program?.status ?? 'Active' })
    toast.success(`Program "${form.name}" updated`)
    onClose()
  }

  if (!program) return null

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="right" showCloseButton className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b border-gray-100">
          {isEdit && (
            <button type="button" onClick={() => onModeChange('view')}
              className="flex items-center gap-1 text-xs font-medium mb-1 -ml-0.5 transition-colors"
              style={{ color: 'var(--brand-green)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              Back
            </button>
          )}
          <div className="flex items-start justify-between pr-6">
            <div className="flex-1 min-w-0">
              <SheetTitle style={{ color: 'var(--brand-forest)' }}>{isEdit ? 'Edit Program' : program.name}</SheetTitle>
              <p className="text-xs text-gray-400 mt-0.5">{program.season}</p>
            </div>
            {!isEdit && (
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                <BadgeTemplate label={program.status} variant={statusVariant} size="sm" />
                <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit"
                  leftIcon={<Pencil className="w-3.5 h-3.5" />}
                  onClick={() => onModeChange('edit')} />
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {!isEdit ? (
            <>
              {program.description && <p className="text-sm text-gray-600 leading-relaxed">{program.description}</p>}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-mid)' }} />
                <span>{fmtDate(program.startDate)} – {fmtDate(program.endDate)}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wheat className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-mid)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Crops</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {program.crops.map(c => <BadgeTemplate key={c} label={c} variant="success" size="sm" />)}
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium" style={{ color: 'var(--brand-forest)' }}>Enrollment</span>
                  <span className="text-gray-400 tabular-nums">{totalEnrolled} / {program.targetCount}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${filled}%`, backgroundColor: 'var(--brand-green)' }} />
                </div>
                <p className="text-xs text-gray-400">{filled}% of target reached</p>
              </div>
              {program.cohorts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Cohorts ({program.cohorts.length})</p>
                  <div className="space-y-2">
                    {program.cohorts.map(c => (
                      <div key={c.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50">
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>{c.name}</p>
                          <p className="text-xs text-gray-400">{c.region} · {c.district}</p>
                        </div>
                        <span className="text-xs text-gray-400 tabular-nums">{c.enrolledCount}/{c.targetCount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <InputTemplate label="PROGRAM NAME" isRequired placeholder="e.g. Savannah Season 2026"
                value={form.name} onChange={e => set('name', e.target.value)} />
              <InputTemplate label="DESCRIPTION" placeholder="Brief description"
                value={form.description} onChange={e => set('description', e.target.value)} />
              <InputTemplate label="SEASON" isRequired placeholder="e.g. 2025/26 Season"
                value={form.season} onChange={e => set('season', e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <InputTemplate label="START DATE" isRequired type="date"
                  value={form.startDate} onChange={e => set('startDate', e.target.value)} />
                <InputTemplate label="END DATE" isRequired type="date"
                  value={form.endDate} onChange={e => set('endDate', e.target.value)} />
              </div>
              <InputTemplate label="TARGET ENROLLMENT" type="number"
                value={form.targetEnrollment} onChange={e => set('targetEnrollment', e.target.value)} />
              <MultiSelectTemplate label="CROPS" isRequired placeholder="Select crops"
                options={CROP_OPTIONS} value={form.crops}
                onChange={vals => setForm(f => ({ ...f, crops: vals }))} />
            </>
          )}
        </div>

        {isEdit && (
          <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white grid grid-cols-2 gap-2">
            <ButtonTemplate variant="outline" size="md" label="Cancel" fullWidth onClick={onClose} />
            <ButtonTemplate variant="primary" size="md" fullWidth label="Save Changes" onClick={handleSubmit} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

/* ── ProgramRow ─────────────────────────────────────────────────────────────── */

function ProgramRow({ program, allPrograms, onUpdate }: {
  program: Program
  allPrograms: Program[]
  onUpdate: (updated: Program) => void
}) {
  const [programMode,  setProgramMode]  = useState<'view' | 'edit' | null>(null)
  const [cohortsOpen,  setCohortsOpen]  = useState(false)
  const [addCohortOpen,   setAddCohortOpen]   = useState(false)
  const [deleteCohortTarget,  setDeleteCohortTarget]  = useState<{ id: string; name: string } | null>(null)
  const [unassignAgentTarget, setUnassignAgentTarget] = useState<{ cohortId: string; agentName: string } | null>(null)
  const [statusTarget, setStatusTarget] = useState<Program | null>(null)
  const toast = useToast()

  const totalEnrolled = program.cohorts.reduce((s, c) => s + c.enrolledCount, program.enrolledCount)
  const filled        = pct(totalEnrolled, program.targetCount)
  const isActive      = program.status === 'Active'
  const statusVariant = program.status === 'Active' ? 'success' : program.status === 'Completed' ? 'info' : 'neutral'

  function handleUpdateCohort(updated: Cohort) {
    onUpdate({ ...program, cohorts: program.cohorts.map(c => c.id === updated.id ? updated : c) })
  }

  function handleDeleteCohort(id: string) {
    const cohort = program.cohorts.find(c => c.id === id)
    if (cohort) setDeleteCohortTarget({ id, name: cohort.name })
  }

  function handleRequestUnassignAgent(cohortId: string, agentName: string) {
    setUnassignAgentTarget({ cohortId, agentName })
  }

  function handleToggleStatus() {
    setStatusTarget(program)
  }

  return (
    <>
      <CardTemplate noPadding className="overflow-hidden bg-(--surface-card) border border-(--brand-pale)/40">
        {/* Program body */}
        <div className={cn('px-6 pt-4 pb-3', !isActive && 'opacity-50 pointer-events-none')}>
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-2 min-w-0">
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
        <div className="flex items-center justify-between gap-2 flex-wrap px-6 py-2.5 border-t border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <ButtonTemplate
              variant="outline" size="sm" isIcon tooltip="View"
              leftIcon={<Eye className="w-3.5 h-3.5" />}
              onClick={() => setProgramMode('view')}
            />
            <ButtonTemplate
              variant="outline" size="sm" isIcon tooltip={isActive ? 'Deactivate' : 'Activate'}
              leftIcon={<PowerOff className="w-3.5 h-3.5" />}
              onClick={handleToggleStatus}
            />
          </div>
          <div className={cn('flex items-center gap-2 flex-wrap', !isActive && 'opacity-50 pointer-events-none')}>
            <ButtonTemplate variant="outline" size="sm" isIcon={false}
              leftIcon={cohortsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              label={`Cohorts (${program.cohorts.length})`}
              onClick={() => setCohortsOpen(v => !v)} />
            <ButtonTemplate
              variant="primary" size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              label="Add Cohort"
              onClick={() => setAddCohortOpen(true)}
            />
          </div>
        </div>

        {/* Inline cohort list */}
        {cohortsOpen && (
          <div className="border-t border-gray-100">
            {program.cohorts.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">No cohorts yet.</div>
            ) : (
              program.cohorts.map(cohort => (
                <CohortRow
                  key={cohort.id}
                  cohort={cohort}
                  programs={allPrograms}
                  programName={program.name}
                  onUpdateCohort={handleUpdateCohort}
                  onDeleteCohort={handleDeleteCohort}
                  onRequestUnassignAgent={handleRequestUnassignAgent}
                />
              ))
            )}
          </div>
        )}
      </CardTemplate>

      <ProgramSheet
        mode={programMode}
        program={program}
        onClose={() => setProgramMode(null)}
        onModeChange={setProgramMode}
        onSave={data => onUpdate({ ...program, ...data })}
      />


      <CohortFormSheet
        open={addCohortOpen}
        mode="add"
        programName={program.name}
        programs={allPrograms}
        onSave={data => {
          const newCohort: Cohort = { id: uid('coh'), enrolledCount: 0, status: 'Active', ...data }
          onUpdate({ ...program, cohorts: [...program.cohorts, newCohort] })
        }}
        onClose={() => setAddCohortOpen(false)}
      />

      <ConfirmModal
        open={deleteCohortTarget !== null}
        title="Delete Cohort"
        message={`Are you sure you want to delete "${deleteCohortTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteCohortTarget) {
            onUpdate({ ...program, cohorts: program.cohorts.filter(c => c.id !== deleteCohortTarget.id) })
            toast.success(`${deleteCohortTarget.name} removed`)
          }
          setDeleteCohortTarget(null)
        }}
        onCancel={() => setDeleteCohortTarget(null)}
      />

      <ConfirmModal
        open={unassignAgentTarget !== null}
        title="Unassign Agent"
        message={`Remove ${unassignAgentTarget?.agentName} from this cohort?`}
        confirmLabel="Unassign"
        variant="warning"
        onConfirm={() => {
          if (unassignAgentTarget) {
            const cohort = program.cohorts.find(c => c.id === unassignAgentTarget.cohortId)
            if (cohort) handleUpdateCohort({ ...cohort, agentName: '' })
            toast.success(`${unassignAgentTarget.agentName} unassigned`)
          }
          setUnassignAgentTarget(null)
        }}
        onCancel={() => setUnassignAgentTarget(null)}
      />

      <ConfirmModal
        open={statusTarget !== null}
        title={statusTarget?.status === 'Active' ? 'Deactivate Program' : 'Activate Program'}
        message={`Are you sure you want to ${statusTarget?.status === 'Active' ? 'deactivate' : 'activate'} "${statusTarget?.name}"?`}
        confirmLabel={statusTarget?.status === 'Active' ? 'Deactivate' : 'Activate'}
        variant="warning"
        onConfirm={() => {
          if (statusTarget) {
            const next: Program['status'] = statusTarget.status === 'Active' ? 'Inactive' : 'Active'
            onUpdate({ ...statusTarget, status: next })
            toast.success(`${statusTarget.name} ${next === 'Active' ? 'activated' : 'deactivated'}`)
          }
          setStatusTarget(null)
        }}
        onCancel={() => setStatusTarget(null)}
      />
    </>
  )
}

/* ── OverviewCard ───────────────────────────────────────────────────────────── */

function OverviewCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 px-5 py-4">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-2">{label}</p>
      <p className="text-3xl font-bold" style={{ color: 'var(--brand-forest)' }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

/* ── ProgramListRow ─────────────────────────────────────────────────────────── */

function ProgramListRow({ program, onUpdate }: {
  program: Program
  onUpdate: (updated: Program) => void
}) {
  const [programMode, setProgramMode] = useState<'view' | 'edit' | null>(null)
  const [statusTarget, setStatusTarget] = useState<Program | null>(null)
  const toast = useToast()

  const totalEnrolled = program.cohorts.reduce((s, c) => s + c.enrolledCount, program.enrolledCount)
  const filled        = pct(totalEnrolled, program.targetCount)
  const isActive      = program.status === 'Active'
  const statusVariant = program.status === 'Active' ? 'success' : program.status === 'Completed' ? 'info' : 'neutral'

  function handleToggleStatus() {
    setStatusTarget(program)
  }

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-4 px-5 py-4 border-b border-gray-100 hover:bg-gray-50/60 transition-colors',
          !isActive && 'opacity-60'
        )}
      >
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setProgramMode('view')}>
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--brand-forest)' }}>{program.name}</p>
            <BadgeTemplate label={program.status} variant={statusVariant} size="sm" />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{program.season}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 tabular-nums">{program.cohorts.length} cohort{program.cohorts.length !== 1 ? 's' : ''}</span>
          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${filled}%`, backgroundColor: 'var(--brand-green)' }} />
          </div>
          <span className="text-xs text-gray-500 tabular-nums shrink-0">{totalEnrolled}/{program.targetCount}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ButtonTemplate variant="outline" size="sm" isIcon tooltip="View"
            leftIcon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => setProgramMode('view')} />
          <ButtonTemplate variant="outline" size="sm" isIcon tooltip={isActive ? 'Deactivate' : 'Activate'}
            leftIcon={<PowerOff className="w-3.5 h-3.5" />}
            onClick={handleToggleStatus} />
        </div>
      </div>
      <ProgramSheet
        mode={programMode}
        program={program}
        onClose={() => setProgramMode(null)}
        onModeChange={setProgramMode}
        onSave={data => onUpdate({ ...program, ...data })}
      />

      <ConfirmModal
        open={statusTarget !== null}
        title={statusTarget?.status === 'Active' ? 'Deactivate Program' : 'Activate Program'}
        message={`Are you sure you want to ${statusTarget?.status === 'Active' ? 'deactivate' : 'activate'} "${statusTarget?.name}"?`}
        confirmLabel={statusTarget?.status === 'Active' ? 'Deactivate' : 'Activate'}
        variant="warning"
        onConfirm={() => {
          if (statusTarget) {
            const next: Program['status'] = statusTarget.status === 'Active' ? 'Inactive' : 'Active'
            onUpdate({ ...statusTarget, status: next })
            toast.success(`${statusTarget.name} ${next === 'Active' ? 'activated' : 'deactivated'}`)
          }
          setStatusTarget(null)
        }}
        onCancel={() => setStatusTarget(null)}
      />
    </>
  )
}

/* ── Main ───────────────────────────────────────────────────────────────────── */

function ProgramsCohortsTab() {
  const [programs,   setPrograms]   = usePersistedState<Program[]>('ps-programs', [])
  const [loading,    setLoading]    = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [viewMode,   setViewMode]   = usePersistedState<'card' | 'list'>('ps-view', 'card')
  const [search,     setSearch]     = usePersistedState('ps-search', '')
  const [statsOpen,  setStatsOpen]  = usePersistedState('ps-stats', false)

  useEffect(() => {
    // only seed from the mock fetch if nothing is already persisted, so
    // CRUD edits made in a previous visit this session aren't clobbered
    getPrograms().then(data => {
      setPrograms(prev => prev.length ? prev : data)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const totalCohorts   = programs.reduce((s, p) => s + p.cohorts.length, 0)
  const totalEnrolled  = programs.reduce((s, p) => s + p.cohorts.reduce((cs, c) => cs + c.enrolledCount, p.enrolledCount), 0)
  const activePrograms = programs.filter(p => p.status === 'Active').length

  const filtered = useMemo(() =>
    programs.filter(p => !search.trim() || p.name.toLowerCase().includes(search.toLowerCase())),
    [programs, search]
  )

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = usePersistedState('ps-page-size', 10)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1) }, [filtered])
  const paginated = pageSize === 0 ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
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
          <div className="flex items-center gap-2 flex-wrap">
            <ButtonTemplate
              variant="secondary" size="md"
              leftIcon={<BarChart2 className="w-3.5 h-3.5" />}
              rightIcon={<ChevronUp className={cn('w-3.5 h-3.5 transition-transform', !statsOpen && 'rotate-180')} />}
              label="Overview"
              onClick={() => setStatsOpen(v => !v)}
            />
            <ButtonTemplate
              variant="primary" size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              label="New Program"
              onClick={() => setCreateOpen(true)}
            />
            <div className="flex gap-0.5 p-1 rounded-lg border border-gray-200 bg-gray-50">
              <button onClick={() => setViewMode('card')} title="Card view"
                className="p-1.5 rounded-md transition-colors"
                style={viewMode === 'card' ? { backgroundColor: 'white', color: 'var(--brand-forest)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : { color: '#9ca3af' }}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('list')} title="List view"
                className="p-1.5 rounded-md transition-colors"
                style={viewMode === 'list' ? { backgroundColor: 'white', color: 'var(--brand-forest)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : { color: '#9ca3af' }}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Overview stats */}
        {statsOpen && !loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <OverviewCard label="Total Programs" value={programs.length} />
            <OverviewCard label="Active Programs" value={activePrograms} />
            <OverviewCard label="Total Cohorts"   value={totalCohorts} />
            <OverviewCard label="Total Enrollment" value={totalEnrolled} />
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full border border-gray-200 rounded-xl pl-10 pr-9 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) transition-colors bg-white"
            placeholder="Search programs…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            className="mb-3"
          />
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-48 rounded-xl bg-gray-200 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <CardTemplate className="bg-(--surface-card) border border-(--brand-pale)/40">
            <p className="text-sm text-center text-gray-400 py-8">
              {search ? 'No programs match your search.' : 'No programs yet.'}
            </p>
          </CardTemplate>
        ) : viewMode === 'card' ? (
          <div className="space-y-4">
            {paginated.map(program => (
              <ProgramRow
                key={program.id}
                program={program}
                allPrograms={programs}
                onUpdate={handleUpdateProgram}
              />
            ))}
          </div>
        ) : (
          <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 overflow-hidden">
            {paginated.map(program => (
              <ProgramListRow
                key={program.id}
                program={program}
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

/* ── Beneficiary tab ───────────────────────────────────────────────────────────
 * Recreates the old FarmersRegistry "Enrolment" table, renamed Beneficiary and
 * filtered to farmers whose workflow progress has reached (or passed) the
 * admin-configured qualifying stage — see Configuration > Workflow Stages.
 */

function BeneficiaryTab() {
  const [farmers, setFarmers] = usePersistedState<Farmer[]>('fr-farmers', [])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = usePersistedState('bene-search', '')
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = usePersistedState<Record<string, boolean>>('bene-columns', {
    farmerDetails: true, programInformation: true, communityDetails: true,
    enrolmentWorkflow: true, friScore: true,
  })

  const [allStages] = usePersistedState(WORKFLOW_STAGES_KEY, DEFAULT_WORKFLOW_STAGES)
  const [qualifyingStageId] = usePersistedState(WORKFLOW_QUALIFYING_STAGE_ID_KEY, DEFAULT_QUALIFYING_STAGE_ID)
  const WORKFLOW_STAGES = useWorkflowStages()
  const qualifyingStageNumber = allStages.find(s => s.id === qualifyingStageId)?.stage
    ?? DEFAULT_WORKFLOW_STAGES.find(s => s.id === DEFAULT_QUALIFYING_STAGE_ID)!.stage

  useEffect(() => {
    getFarmers().then(f => {
      setFarmers(prev => prev.length > 0 ? prev : f)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const beneficiaries = useMemo(() => farmers.filter(f => {
    const stage = f.enrollment?.currentStage
    if (stage === undefined || stage === null) return false
    if (stage < qualifyingStageNumber) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!f.fullName.toLowerCase().includes(q) && !f.phone.includes(q)) return false
    }
    return true
  }), [farmers, qualifyingStageNumber, search])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = usePersistedState('bene-page-size', 25)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1) }, [beneficiaries])
  const paginated = pageSize === 0 ? beneficiaries : beneficiaries.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>Beneficiary</h1>
          {!loading && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--brand-slate)' }}>
              {beneficiaries.length} farmer{beneficiaries.length !== 1 ? 's' : ''} at or beyond &quot;{WORKFLOW_STAGES.find(s => s.stage === qualifyingStageNumber)?.name ?? 'Active'}&quot;
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full border border-gray-200 rounded-lg pl-10 pr-9 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) transition-colors"
            placeholder="Search by name or phone..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        <div className="relative ml-auto">
          <button
            onClick={() => setColumnsOpen(v => !v)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-gray-300 transition-colors"
          >
            <Columns3 className="w-3.5 h-3.5" /> Columns
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', columnsOpen && 'rotate-180')} />
          </button>
          {columnsOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setColumnsOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 z-20 w-56 rounded-xl border border-gray-100 bg-white shadow-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Toggle Columns</p>
                  <button
                    className="text-[11px] font-medium"
                    style={{ color: 'var(--brand-green)' }}
                    onClick={() => setVisibleColumns(Object.fromEntries(Object.keys(visibleColumns).map(k => [k, true])))}
                  >
                    Show all
                  </button>
                </div>
                <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
                  {ENROLMENT_COLUMNS.map(col => (
                    <label key={col.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns[col.key] ?? true}
                        onChange={() => setVisibleColumns(prev => ({ ...prev, [col.key]: !prev[col.key] }))}
                        className="w-3.5 h-3.5 rounded border-gray-300 accent-(--brand-forest)"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {!loading && beneficiaries.length > 0 && (
        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={beneficiaries.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-gray-200 animate-pulse" />)}
        </div>
      ) : beneficiaries.length === 0 ? (
        <div className="text-center py-20 bg-(--surface-card) rounded-xl border border-(--brand-pale)/40">
          <Award className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--brand-slate)' }} />
          <p className="font-medium" style={{ color: 'var(--brand-forest)' }}>No beneficiaries yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--brand-slate)' }}>
            Farmers appear here once their enrollment reaches the qualifying workflow stage.
          </p>
        </div>
      ) : (
        <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 shadow-sm overflow-x-auto">
          {/* Column header */}
          <div className="flex items-center px-4 py-2.5 border-b border-gray-100 bg-gray-50/80 min-w-max">
            {(visibleColumns.farmerDetails ?? true) && (
              <p className="w-56 shrink-0 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Farmer Details</p>
            )}
            {(visibleColumns.programInformation ?? true) && (
              <p className="flex-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5">Program Information</p>
            )}
            {(visibleColumns.communityDetails ?? true) && (
              <p className="w-44 shrink-0 text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5">Community Details</p>
            )}
            {(visibleColumns.enrolmentWorkflow ?? true) && (
              <p className="w-56 shrink-0 text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5">Enrolment Workflow</p>
            )}
            {(visibleColumns.friScore ?? true) && (
              <p className="w-40 shrink-0 text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5">FRI Score</p>
            )}
          </div>

          <div className="divide-y divide-gray-100 min-w-max">
            {paginated.map((f, i) => {
              const enr = f.enrollment
              const stageDef = WORKFLOW_STAGES.find(s => s.stage === (enr?.currentStage ?? 0))

              return (
                <div key={f.id} className={cn(
                  'flex items-stretch transition-colors',
                  i % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-50',
                )}>
                  {(visibleColumns.farmerDetails ?? true) && (
                    <div className="flex items-center gap-3 py-4 pl-4 pr-5 w-56 shrink-0 border-r border-gray-100">
                      <PersonAvatar name={f.fullName} size={40} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--brand-forest)' }}>
                            {f.fullName}
                          </p>
                          {f.duplicateFlag && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] text-gray-400 font-mono">
                            <span className="text-[9px] text-gray-300 uppercase tracking-wide mr-0.5">Ph</span>{f.phone}
                          </span>
                          <span className="text-gray-200 text-[10px]">·</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none bg-emerald-100 text-emerald-700">Beneficiary</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {(visibleColumns.programInformation ?? true) && (
                    <div className="flex flex-col justify-center py-4 px-5 flex-1 min-w-0 border-r border-gray-100">
                      {enr ? (
                        <>
                          <p className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--brand-forest)' }}>
                            {enr.programName}
                          </p>
                          <div className="flex items-center gap-2 mt-1 min-w-0">
                            {enr.cohortName && <span className="text-[11px] text-gray-500 truncate">{enr.cohortName}</span>}
                            {enr.cohortName && enr.agentName && <span className="text-gray-300 text-[10px] shrink-0">·</span>}
                            {enr.agentName && (
                              <span className="flex items-center gap-1 text-[11px] text-gray-500 min-w-0">
                                <UserCog className="w-3 h-3 text-gray-300 shrink-0" />
                                <span className="truncate">{enr.agentName}</span>
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <span className="text-[11px] text-gray-300">—</span>
                      )}
                    </div>
                  )}

                  {(visibleColumns.communityDetails ?? true) && (() => {
                    const cd = communityDetail(f)
                    return (
                      <div className="flex flex-col justify-center py-4 px-5 shrink-0 w-44 border-r border-gray-100">
                        <p className="text-xs font-medium leading-tight truncate" style={{ color: 'var(--brand-forest)' }}>{cd.communityName || '—'}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">{cd.cooperativeName ?? 'No cooperative'}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{cd.region || '—'}</p>
                      </div>
                    )
                  })()}

                  {(visibleColumns.enrolmentWorkflow ?? true) && (
                    <div className="flex flex-col justify-center py-4 px-5 shrink-0 w-56 border-r border-gray-100">
                      {enr && (enr.currentStage ?? 0) > 0 ? (
                        <>
                          <div className="flex gap-px mb-2">
                            {WORKFLOW_STAGES.map(s => (
                              <div key={s.stage} className={cn(
                                'h-1 rounded-sm flex-1',
                                s.stage < (enr.currentStage ?? 0)   ? 'bg-emerald-400' :
                                s.stage === (enr.currentStage ?? 0) ? 'bg-(--brand-dark)' : 'bg-gray-200'
                              )} />
                            ))}
                          </div>
                          {(() => {
                            const wf = enrolmentWorkflowDetail(f.id, enr)
                            return (
                              <div className="flex flex-col gap-1">
                                <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
                                  <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                                  Reg: {new Date(wf.registeredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                {wf.baselineDone ? (
                                  <span className="flex items-center gap-1.5 text-[11px] text-emerald-600">
                                    <CheckCircle2 className="w-3 h-3 shrink-0" /> Baseline done
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                    <Circle className="w-3 h-3 shrink-0" /> Baseline pending
                                  </span>
                                )}
                                {wf.checkinOnTrack === true ? (
                                  <span className="flex items-center gap-1.5 text-[11px] text-emerald-600">
                                    <CheckCircle2 className="w-3 h-3 shrink-0" /> Check-in: On track
                                  </span>
                                ) : wf.checkinOnTrack === false ? (
                                  <span className="flex items-center gap-1.5 text-[11px] text-red-500">
                                    <XCircle className="w-3 h-3 shrink-0" /> Check-in: Missed
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                    <Circle className="w-3 h-3 shrink-0" /> No schedule
                                  </span>
                                )}
                              </div>
                            )
                          })()}
                          <span className="text-[11px] font-medium flex items-center gap-1 mt-1.5" style={{ color: 'var(--brand-forest)' }}>
                            <GitBranch className="w-2.5 h-2.5 shrink-0 text-gray-400" />
                            {stageDef?.name ?? `Stage ${enr.currentStage}`}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-0.5">Stage {enr.currentStage} of {WORKFLOW_STAGES.length}</span>
                        </>
                      ) : (
                        <span className="text-[11px] text-gray-300">—</span>
                      )}
                    </div>
                  )}

                  {(visibleColumns.friScore ?? true) && (
                    <div className="flex flex-col justify-center py-4 px-5 shrink-0 w-40">
                      {f.currentFri !== null ? (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-base font-bold leading-none tabular-nums" style={{ color: 'var(--brand-forest)' }}>{f.currentFri}</span>
                            <span className="text-[10px] text-gray-400">/ 100</span>
                          </div>
                          {f.currentZone && (
                            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full self-start mt-1.5 leading-none', ZONE_COLORS[f.currentZone])}>
                              {f.currentZone.replace('Resilience ', '')} · {ZONE_RISK[f.currentZone]}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-300">No score</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Top-level page shell (Programs & Cohorts / Agent Assignment / Beneficiary) ─ */

type ProgramsPageTab = 'cohorts' | 'agents' | 'beneficiary'

const PROGRAMS_PAGE_TABS: { id: ProgramsPageTab; Icon: React.ElementType; label: string }[] = [
  { id: 'cohorts',     Icon: GitBranch, label: 'Programs & Cohorts' },
  { id: 'agents',      Icon: UserCog,   label: 'Agent Assignment'   },
  { id: 'beneficiary', Icon: Award,     label: 'Beneficiary'        },
]

export function Main() {
  const [pageTab, setPageTab] = usePersistedState<ProgramsPageTab>('ps-page-tab', 'cohorts')

  return (
    <div className="flex flex-col gap-4" style={{ background: 'var(--surface-page)', minHeight: '100vh' }}>
      <div className="p-6 pb-0">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
          {PROGRAMS_PAGE_TABS.map(({ id, Icon, label }) => {
            const active = pageTab === id
            return (
              <button
                key={id}
                onClick={() => setPageTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                  active ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700',
                )}
                style={active ? { color: 'var(--brand-forest)' } : {}}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {pageTab === 'cohorts' && <div className="-mt-4"><ProgramsCohortsTab /></div>}
      {pageTab === 'agents' && <div className="-mt-4"><AgentAssignmentTab /></div>}
      {pageTab === 'beneficiary' && <div className="-mt-4"><BeneficiaryTab /></div>}
    </div>
  )
}
