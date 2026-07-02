'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, PauseCircle, Trash2, ChevronDown, ChevronUp, X, Package, AlertCircle, UserPlus, Layers, Users, TrendingUp, Search, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { SheetTemplate }    from '@/customComponents/SheetTemplate'
import { ButtonTemplate }   from '@/customComponents/ButtonTemplate'
import { InputTemplate }    from '@/customComponents/InputTemplate'
import { SelectTemplate }   from '@/customComponents/SelectTemplate'
import { TextareaTemplate } from '@/customComponents/TextareaTemplate'
import { BadgeTemplate }    from '@/customComponents/BadgeTemplate'
import { ConfirmModal }     from '@/customComponents/ConfirmModal'
import { getInterventions, getPrograms, getProgramsWithCohorts } from '../_logics/functions'
import { FARMERS_LIST } from '@/dataCenter/farmerManagement'
import type {
  Intervention, ProgramOption, ProgramWithCohorts, EnrolledCohort,
  InterventionStatus, InterventionType, ApprovalMode, EligibilityRule, ImprovementStep,
} from '../_logics/interface'
import type { Farmer } from '@/app/dashboard/FarmersRegistry/_logics/interface'

// ── Constants ──────────────────────────────────────────────────────────────────
const TYPES: InterventionType[]      = ['Input Loan', 'Cash Loan', 'Insurance', 'Advisory', 'Market Access']
const STATUSES: InterventionStatus[] = ['Active', 'Suspended', 'Draft']
const APPROVALS: ApprovalMode[]      = ['Auto', 'Manual']

const STATUS_VARIANT: Record<InterventionStatus, 'success' | 'warning' | 'neutral'> = {
  Active:    'success',
  Suspended: 'warning',
  Draft:     'neutral',
}

const TYPE_ICON_COLOR: Record<InterventionType, string> = {
  'Input Loan':    'var(--brand-forest)',
  'Cash Loan':     '#7c3aed',
  'Insurance':     '#0369a1',
  'Advisory':      '#b45309',
  'Market Access': '#065f46',
}

const RULE_FIELDS = [
  { value: 'fri_score',    label: 'FRI Score'    },
  { value: 'zone',         label: 'Zone'         },
  { value: 'crop',         label: 'Crop'         },
  { value: 'region',       label: 'Region'       },
  { value: 'gender',       label: 'Gender'       },
]

const RULE_OPS = [
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: '==', label: '==' },
  { value: '!=', label: '!=' },
  { value: 'in', label: 'in' },
]

// ── Form state ─────────────────────────────────────────────────────────────────
interface FormState {
  name:             string
  type:             InterventionType
  season:           string
  valueDescription: string
  description:      string
  minFri:           number
  capacity:         number
  status:           InterventionStatus
  approval:         ApprovalMode
  rules:            EligibilityRule[]
  steps:            ImprovementStep[]
}

const EMPTY_FORM: FormState = {
  name: '', type: 'Input Loan', season: '',
  valueDescription: '', description: '', minFri: 60, capacity: 5,
  status: 'Active', approval: 'Auto', rules: [], steps: [],
}

function toForm(i: Intervention): FormState {
  return {
    name: i.name, type: i.type, season: i.season,
    valueDescription: i.valueDescription, description: i.description,
    minFri: i.minFri, capacity: i.capacity, status: i.status, approval: i.approval,
    rules: i.rules, steps: i.steps,
  }
}

// ── InterventionSheet ──────────────────────────────────────────────────────────
interface SheetProps {
  open:     boolean
  mode:     'new' | 'edit'
  initial:  FormState
  onSave:   (f: FormState) => void
  onClose:  () => void
}

function InterventionSheet({ open, mode, initial, onSave, onClose }: SheetProps) {
  const [form, setForm] = useState<FormState>(initial)
  const [simFri, setSimFri] = useState(65)

  useEffect(() => { if (open) setForm(initial) }, [open])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const eligible = form.rules.length > 0 && simFri >= form.minFri

  function addRule() {
    set('rules', [...form.rules, { id: `r-${Date.now()}`, field: 'fri_score', operator: '>=', value: String(form.minFri) }])
  }
  function removeRule(id: string) { set('rules', form.rules.filter(r => r.id !== id)) }

  function addStep() {
    set('steps', [...form.steps, { id: `s-${Date.now()}`, description: '', order: form.steps.length + 1 }])
  }
  function removeStep(id: string) { set('steps', form.steps.filter(s => s.id !== id)) }

  function updateRule<K extends keyof EligibilityRule>(id: string, key: K, val: EligibilityRule[K]) {
    set('rules', form.rules.map(r => r.id === id ? { ...r, [key]: val } : r))
  }
  function updateStep(id: string, description: string) {
    set('steps', form.steps.map(s => s.id === id ? { ...s, description } : s))
  }

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title={mode === 'new' ? 'New Opportunity' : 'Edit Opportunity'}
      subtitle="Opportunity Pathways"
      size="xl"
      bodyClassName="px-6 py-5"
      footer={
        <>
          <ButtonTemplate variant="outline" label="Cancel" fullWidth onClick={onClose} />
          <ButtonTemplate fullWidth
            label={mode === 'new' ? 'Create Opportunity' : 'Save Changes'}
            onClick={() => onSave(form)}
          />
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">

        {/* ── Left column ── */}
        <div className="space-y-4">
          <InputTemplate
            label="Opportunity Name"
            labelVariant="compact"
            isRequired
            size="sm"
            placeholder="e.g. Soybean Input Loan"
            value={form.name}
            onChange={e => set('name', e.currentTarget.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <SelectTemplate
              label="Type"
              labelVariant="compact"
              isRequired
              size="sm"
              options={TYPES.map(t => ({ value: t, label: t }))}
              value={form.type}
              onChange={e => set('type', e.currentTarget.value as InterventionType)}
            />
            <InputTemplate
              label="Season"
              labelVariant="compact"
              isRequired
              size="sm"
              placeholder="e.g. June-Sept 2026"
              value={form.season}
              onChange={e => set('season', e.currentTarget.value)}
            />
          </div>

          <InputTemplate
            label="Value Description"
            labelVariant="compact"
            size="sm"
            placeholder="e.g. GHS 1,400"
            value={form.valueDescription}
            onChange={e => set('valueDescription', e.currentTarget.value)}
          />

          <TextareaTemplate
            label="Description"
            labelVariant="compact"
            rows={2}
            placeholder="Short description of the opportunity"
            value={form.description}
            onChange={e => set('description', e.currentTarget.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <InputTemplate
              label="Min FRI"
              labelVariant="compact"
              size="sm"
              type="number"
              min={0} max={100}
              value={form.minFri}
              onChange={e => set('minFri', Number(e.currentTarget.value))}
            />
            <InputTemplate
              label="Capacity"
              labelVariant="compact"
              size="sm"
              type="number"
              min={1}
              value={form.capacity}
              onChange={e => set('capacity', Number(e.currentTarget.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SelectTemplate
              label="Status"
              labelVariant="compact"
              size="sm"
              options={STATUSES.map(s => ({ value: s, label: s }))}
              value={form.status}
              onChange={e => set('status', e.currentTarget.value as InterventionStatus)}
            />
            <SelectTemplate
              label="Approval"
              labelVariant="compact"
              size="sm"
              options={APPROVALS.map(a => ({ value: a, label: a }))}
              value={form.approval}
              onChange={e => set('approval', e.currentTarget.value as ApprovalMode)}
            />
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-5">

          {/* Eligibility rules */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Eligibility Rules</p>
            <div className="space-y-2">
              {form.rules.length > 0 && (
                <div className="grid grid-cols-[1fr_80px_80px_24px] gap-2 px-1">
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Field</p>
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Op</p>
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Value</p>
                  <span />
                </div>
              )}
              {form.rules.map(r => (
                <div key={r.id} className="grid grid-cols-[1fr_80px_80px_24px] gap-2 items-center">
                  <SelectTemplate
                    options={RULE_FIELDS}
                    size="sm"
                    value={r.field}
                    onChange={e => updateRule(r.id, 'field', e.currentTarget.value)}
                  />
                  <SelectTemplate
                    options={RULE_OPS}
                    size="sm"
                    value={r.operator}
                    onChange={e => updateRule(r.id, 'operator', e.currentTarget.value)}
                  />
                  <InputTemplate
                    size="sm"
                    value={r.value}
                    onChange={e => updateRule(r.id, 'value', e.currentTarget.value)}
                  />
                  <button
                    onClick={() => removeRule(r.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <ButtonTemplate
                variant="outline" size="sm" fullWidth
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                label="Add Rule" onClick={addRule}
              />
            </div>
          </div>

          {/* Live rule preview */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Live Rule Preview</p>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Simulated FRI Score</p>
                <BadgeTemplate
                  label={eligible ? 'Eligible' : 'Not Eligible'}
                  variant={eligible ? 'success' : 'danger'}
                  size="sm"
                />
              </div>
              <div className="space-y-1">
                <input
                  type="range" min={0} max={100} value={simFri}
                  onChange={e => setSimFri(Number(e.target.value))}
                  className="w-full accent-(--brand-dark) h-1.5 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>0</span>
                  <span className="font-semibold text-(--brand-slate)">{simFri}</span>
                  <span>100</span>
                </div>
              </div>
              {form.rules.length === 0 && (
                <p className="text-[11px] text-gray-400 text-center">Add rules to see live evaluation</p>
              )}
            </div>
          </div>

          {/* Improvement steps */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Improvement Steps</p>
            <div className="space-y-2">
              {form.steps.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-(--brand-mint) text-(--brand-forest) text-[11px] font-semibold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <InputTemplate
                    size="sm"
                    placeholder={`Step ${idx + 1}`}
                    value={s.description}
                    onChange={e => updateStep(s.id, e.currentTarget.value)}
                  />
                  <button
                    onClick={() => removeStep(s.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <ButtonTemplate
                variant="outline" size="sm" fullWidth
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                label="Add Step" onClick={addStep}
              />
            </div>
          </div>
        </div>
      </div>
    </SheetTemplate>
  )
}

// ── EnrollSheet helpers ────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: '#E6F4EC', fg: '#1A3D2B' },
  { bg: '#D1FAE5', fg: '#065f46' },
  { bg: '#E0F2FE', fg: '#0369a1' },
  { bg: '#EDE9FE', fg: '#5b21b6' },
  { bg: '#FEF3C7', fg: '#92400e' },
  { bg: '#FCE7F3', fg: '#9d174d' },
]
function avatarStyle(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] }

type EnrolTab = 'eligible' | 'applied' | 'approved' | 'rejected' | 'closed'

interface EnrolledEntry { farmerId: string; date: string }

const TAB_EMPTY: Record<EnrolTab, { icon: React.ReactNode; message: string }> = {
  eligible: { icon: <Users className="w-7 h-7 text-gray-300" />,        message: 'No eligible farmers.' },
  applied:  { icon: <Clock className="w-7 h-7 text-gray-300" />,        message: 'No pending applications.' },
  approved: { icon: <CheckCircle2 className="w-7 h-7 text-gray-300" />, message: 'No approved enrolments.' },
  rejected: { icon: <XCircle className="w-7 h-7 text-gray-300" />,      message: 'No rejected applications.' },
  closed:   { icon: <XCircle className="w-7 h-7 text-gray-300" />,      message: 'No closed applications.' },
}

// ── EnrollSheet ────────────────────────────────────────────────────────────────
function EnrollSheet({ open, onClose, intervention, onEdit, programsWithCohorts, onUpdateCohorts }: {
  open: boolean
  onClose: () => void
  intervention: Intervention | null
  onEdit: () => void
  programsWithCohorts: ProgramWithCohorts[]
  onUpdateCohorts: (cohorts: EnrolledCohort[]) => void
}) {
  const [tab,          setTab]         = useState<EnrolTab>('eligible')
  const [search,       setSearch]      = useState('')
  const [selected,     setSelected]    = useState<Set<string>>(new Set())
  const [entries,      setEntries]     = useState<EnrolledEntry[]>([{ farmerId: 'f-001', date: '6/21/2026' }])
  const [suspended,    setSuspended]   = useState<Set<string>>(new Set())
  const [saving,       setSaving]      = useState(false)
  const [filterProg,   setFilterProg]  = useState('')
  const [filterCohort, setFilterCohort] = useState('')
  const [addOpen,      setAddOpen]     = useState(false)
  const [pickProg,     setPickProg]    = useState('')
  const [pickCohort,   setPickCohort]  = useState('')

  useEffect(() => {
    if (open) {
      setTab('eligible'); setSearch(''); setSelected(new Set())
      setFilterProg(''); setFilterCohort(''); setAddOpen(false)
    }
  }, [open])

  if (!intervention) return null

  const enrolledCohorts = intervention.enrolledCohorts ?? []
  const enrolledIds     = new Set(entries.map(e => e.farmerId))
  const minFri          = intervention.minFri ?? 0
  const allFarmers      = FARMERS_LIST as Farmer[]

  // Cohorts visible after applying filters
  const visibleCohortIds = enrolledCohorts
    .filter(ec => (!filterProg || ec.programId === filterProg) && (!filterCohort || ec.cohortId === filterCohort))
    .map(ec => ec.cohortId)

  const cohortFarmers = enrolledCohorts.length === 0
    ? allFarmers
    : allFarmers.filter(f => f.enrollment?.cohortId && visibleCohortIds.includes(f.enrollment.cohortId))

  const eligible = cohortFarmers.filter(f => (f.currentFri ?? 0) >= minFri && !enrolledIds.has(f.id))
  const approved = allFarmers.filter(f => enrolledIds.has(f.id) && !suspended.has(f.id))
  const closed   = allFarmers.filter(f => suspended.has(f.id))

  const tabFarmers: Record<EnrolTab, Farmer[]> = { eligible, applied: [], approved, rejected: [], closed }

  const displayed = tabFarmers[tab].filter(f =>
    !search || f.fullName.toLowerCase().includes(search.toLowerCase()) || f.phone.includes(search)
  )

  // Programs with enrolled cohorts (for filter dropdowns)
  const enrolledPrograms = [...new Map(enrolledCohorts.map(ec => [ec.programId, { id: ec.programId, name: ec.programName }])).values()]
  const filterableCohorts = enrolledCohorts.filter(ec => !filterProg || ec.programId === filterProg)

  // Cohorts available to add (not already enrolled)
  const enrolledCohortIds = new Set(enrolledCohorts.map(ec => ec.cohortId))
  const pickableCohorts   = (programsWithCohorts.find(p => p.id === pickProg)?.cohorts ?? []).filter(c => !enrolledCohortIds.has(c.id))

  function addCohort() {
    const prog = programsWithCohorts.find(p => p.id === pickProg)
    const coh  = prog?.cohorts.find(c => c.id === pickCohort)
    if (!prog || !coh) return
    onUpdateCohorts([...enrolledCohorts, { programId: prog.id, programName: prog.name, cohortId: coh.id, cohortName: coh.name }])
    setPickProg(''); setPickCohort(''); setAddOpen(false)
  }

  function removeCohort(cohortId: string) {
    onUpdateCohorts(enrolledCohorts.filter(ec => ec.cohortId !== cohortId))
  }

  function toggleSelect(id: string) {
    if (enrolledIds.has(id)) return
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleEnrol() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    const today = new Date().toLocaleDateString('en-US')
    setEntries(prev => [...prev, ...[...selected].filter(id => !enrolledIds.has(id)).map(farmerId => ({ farmerId, date: today }))])
    setSelected(new Set())
    setTab('approved')
    setSaving(false)
  }

  function handleSuspend(id: string) { setSuspended(prev => new Set([...prev, id])) }
  function handleClose(id: string)   { setEntries(prev => prev.filter(e => e.farmerId !== id)) }

  const enrollableSelected = [...selected].filter(id => !enrolledIds.has(id))

  const TABS: { key: EnrolTab; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'eligible', label: 'Eligible',  count: eligible.length,  icon: <Users className="w-3.5 h-3.5" /> },
    { key: 'applied',  label: 'Applied',   count: 0,                icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'approved', label: 'Approved',  count: approved.length,  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { key: 'rejected', label: 'Rejected',  count: 0,                icon: <XCircle className="w-3.5 h-3.5" /> },
    { key: 'closed',   label: 'Closed',    count: closed.length,    icon: <XCircle className="w-3.5 h-3.5" /> },
  ]

  return (
    <SheetTemplate open={open} onClose={onClose} title={intervention.name} size="lg" bodyClassName="flex flex-col">

      {/* Edit row */}
      <div className="px-4 pt-3 shrink-0 flex justify-end">
        <ButtonTemplate variant="outline" size="sm" leftIcon={<Edit2 className="w-3.5 h-3.5" />} label="Edit"
          onClick={() => { onClose(); onEdit() }} />
      </div>

      {/* Enrolled cohorts */}
      <div className="px-4 pb-3 shrink-0 space-y-2 border-b border-gray-100">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Enrolled Cohorts</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {enrolledCohorts.map(ec => (
            <span key={ec.cohortId}
              className="group/chip inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              <span className="text-green-500 text-[10px] font-normal">{ec.programName.split(' ')[0]} ·</span>{' '}
              {ec.cohortName}
              <button onClick={() => removeCohort(ec.cohortId)}
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center opacity-0 group-hover/chip:opacity-100 hover:bg-green-100 transition-opacity">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {!addOpen && (
            <button onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors">
              <Plus className="w-3 h-3" /> Add Cohort
            </button>
          )}
        </div>

        {/* Inline cohort picker */}
        {addOpen && (
          <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-gray-50 border border-gray-200">
            <select value={pickProg} onChange={e => { setPickProg(e.target.value); setPickCohort('') }}
              className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white flex-1 min-w-32 focus:outline-none">
              <option value="">Select program</option>
              {programsWithCohorts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={pickCohort} onChange={e => setPickCohort(e.target.value)} disabled={!pickProg}
              className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white flex-1 min-w-32 focus:outline-none disabled:opacity-50">
              <option value="">Select cohort</option>
              {pickableCohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ButtonTemplate size="sm" label="Add" isDisabled={!pickProg || !pickCohort} onClick={addCohort} />
            <ButtonTemplate variant="ghost" size="sm" label="Cancel" onClick={() => { setAddOpen(false); setPickProg(''); setPickCohort('') }} />
          </div>
        )}
      </div>

      {/* Filters */}
      {enrolledCohorts.length > 0 && (
        <div className="px-4 py-2 shrink-0 flex items-center gap-2 border-b border-gray-100">
          <select value={filterProg} onChange={e => { setFilterProg(e.target.value); setFilterCohort('') }}
            className="h-7 px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none">
            <option value="">All programs</option>
            {enrolledPrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterCohort} onChange={e => setFilterCohort(e.target.value)}
            className="h-7 px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none">
            <option value="">All cohorts</option>
            {filterableCohorts.map(ec => <option key={ec.cohortId} value={ec.cohortId}>{ec.cohortName}</option>)}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 pt-3 pb-3 shrink-0">
        <div className="flex gap-1 rounded-xl p-1 bg-gray-100">
          {TABS.map(t => {
            const isActive = tab === t.key
            return (
              <button key={t.key} onClick={() => { setTab(t.key); setSelected(new Set()) }}
                className={['flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap',
                  isActive ? 'bg-white shadow-sm' : 'hover:bg-white/60'].join(' ')}
                style={{ color: isActive ? 'var(--brand-forest)' : '#6b7280' }}>
                {t.icon}
                {t.label}
                <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none"
                  style={isActive ? { background: 'var(--brand-forest)', color: '#fff' } : { background: '#e5e7eb', color: '#374151' }}>
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Search + Enrol */}
      {tab === 'eligible' && (
        <div className="px-4 pb-3 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search farmers..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 placeholder:text-gray-400" />
          </div>
          <ButtonTemplate size="sm" leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            label={saving ? 'Enrolling…' : 'Enrol'}
            isDisabled={saving || enrollableSelected.length === 0} onClick={handleEnrol} />
        </div>
      )}

      {/* Farmer list */}
      <div className="flex-1 overflow-y-auto">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            {TAB_EMPTY[tab].icon}
            <p className="text-sm text-gray-400">{TAB_EMPTY[tab].message}</p>
          </div>
        ) : tab === 'approved' ? (
          <div className="px-3 py-2 space-y-1">
            {displayed.map(f => {
              const entry = entries.find(e => e.farmerId === f.id)
              const av    = avatarStyle(f.fullName)
              return (
                <div key={f.id} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-all">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: av.bg, color: av.fg }}>
                    {f.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--brand-forest)' }}>{f.fullName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{f.phone}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-xs text-gray-400">{entry?.date}</p>
                    <button onClick={() => handleSuspend(f.id)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors hover:bg-amber-50"
                      style={{ borderColor: '#f59e0b', color: '#b45309' }}>Suspend</button>
                    <button onClick={() => handleClose(f.id)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-gray-300 text-gray-500 transition-colors hover:bg-gray-100">Close</button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-3 py-2 space-y-1">
            {displayed.map(f => {
              const isEnrolled = enrolledIds.has(f.id)
              const isSelected = selected.has(f.id)
              const av         = avatarStyle(f.fullName)
              return (
                <div key={f.id} onClick={() => toggleSelect(f.id)}
                  className={['flex items-center gap-3 px-3 py-3 rounded-xl border transition-all',
                    isEnrolled ? 'cursor-default border-transparent'
                      : isSelected ? 'cursor-pointer bg-white'
                      : 'cursor-pointer border-transparent hover:border-gray-200 hover:bg-gray-50'].join(' ')}
                  style={isSelected ? { borderColor: 'var(--brand-forest)' } : {}}>
                  <div className={['w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                    isEnrolled ? 'border-gray-200 bg-gray-100'
                      : isSelected ? 'bg-(--brand-dark) border-(--brand-dark)'
                      : 'border-gray-300 bg-white'].join(' ')}>
                    {isSelected && !isEnrolled && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: av.bg, color: av.fg }}>
                    {f.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--brand-forest)' }}>{f.fullName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{f.phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {f.currentFri !== null ? (
                      <>
                        <p className="text-sm font-bold" style={{ color: 'var(--brand-forest)' }}>{f.currentFri.toFixed(1)}</p>
                        <p className="text-[11px] font-medium" style={{ color: 'var(--brand-green)' }}>{f.currentZone}</p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">No FRI</p>
                    )}
                    {isEnrolled && <p className="text-[11px] text-gray-400 mt-0.5">Enrolled</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </SheetTemplate>
  )
}

// ── Card ───────────────────────────────────────────────────────────────────────
interface CardProps {
  intervention: Intervention
  onEdit:       () => void
  onSuspend:    () => void
  onEnroll:     () => void
  onDelete:     () => void
}

function InterventionCard({ intervention: iv, onEdit, onSuspend, onEnroll, onDelete }: CardProps) {
  const [expanded, setExpanded] = useState(false)
  const iconColor = TYPE_ICON_COLOR[iv.type] ?? 'var(--brand-forest)'

  return (
    <div className={[
      'rounded-xl border overflow-hidden transition-colors',
      iv.status === 'Suspended'
        ? 'bg-gray-50 border-gray-200 opacity-60 grayscale-40'
        : 'bg-white border-gray-200 hover:border-gray-300',
    ].join(' ')}>
      <div className="px-5 py-4 flex items-start gap-4 cursor-pointer" onClick={onEnroll}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: 'var(--brand-mint)' }}>
          <Package className="w-4 h-4" style={{ color: iconColor }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--brand-forest)' }}>{iv.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{iv.type} · {iv.season}</p>
            </div>
            <BadgeTemplate label={iv.status} variant={STATUS_VARIANT[iv.status]} size="md" />
          </div>

          <div className="flex items-center justify-between gap-3 mt-1.5">
            {iv.enrolledCohorts.length > 0 ? (
              <p className="text-[11px] font-medium" style={{ color: 'var(--brand-green)' }}>
                {iv.enrolledCohorts.length} cohort{iv.enrolledCohorts.length !== 1 ? 's' : ''}
              </p>
            ) : (
              <p className="text-[11px] text-gray-400">No cohorts enrolled</p>
            )}
            {iv.valueDescription && (
              <p className="text-sm font-bold" style={{ color: 'var(--brand-dark)' }}>{iv.valueDescription}</p>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span>Min FRI: <span className="font-semibold text-(--brand-slate)">{iv.minFri}</span></span>
            <span>Capacity: <span className="font-semibold text-(--brand-slate)">{iv.capacity}</span></span>
            <span className={iv.rules.length === 0 ? 'text-gray-400' : 'font-medium'} style={iv.rules.length > 0 ? { color: 'var(--brand-forest)' } : {}}>
              {iv.rules.length} {iv.rules.length === 1 ? 'rule' : 'rules'}
            </span>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
        <ButtonTemplate
          variant="ghost" size="sm"
          leftIcon={<PauseCircle className="w-3.5 h-3.5" />}
          label={iv.status === 'Suspended' ? 'Activate' : 'Suspend'}
          onClick={onSuspend}
        />
        <ButtonTemplate
          variant="primary" size="sm"
          leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          label="Enrol"
          onClick={onEnroll}
        />
        <div className="flex-1" />
        <ButtonTemplate variant="ghost" size="sm" isIcon leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={onDelete} />
        <ButtonTemplate
          variant="ghost" size="sm" isIcon
          leftIcon={expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          onClick={() => setExpanded(e => !e)}
        />
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-gray-100" style={{ background: 'var(--brand-mint)' }}>
          <div className="px-5 py-4 space-y-4">

            {/* Description */}
            {iv.description && (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--brand-forest)' }}>
                {iv.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Eligibility Rules */}
              <div className="bg-white rounded-xl px-3.5 py-3 space-y-2">
                <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Eligibility Rules</p>
                {iv.rules.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No rules configured</p>
                ) : (
                  <div className="space-y-1.5">
                    {iv.rules.map(r => (
                      <div key={r.id} className="flex items-center gap-1.5 text-xs">
                        <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold"
                              style={{ background: 'var(--brand-mint)', color: 'var(--brand-forest)' }}>
                          {r.field}
                        </span>
                        <span className="text-gray-400 font-mono text-[10px]">{r.operator}</span>
                        <span className="font-semibold" style={{ color: 'var(--brand-dark)' }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Improvement Steps */}
              <div className="bg-white rounded-xl px-3.5 py-3 space-y-2">
                <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Improvement Steps</p>
                {iv.steps.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No steps configured</p>
                ) : (
                  <div className="space-y-1.5">
                    {iv.steps.map((s, i) => (
                      <div key={s.id} className="flex items-start gap-2 text-xs" style={{ color: 'var(--brand-slate)' }}>
                        <span className="w-4 h-4 rounded-full shrink-0 text-[10px] font-bold flex items-center justify-center mt-0.5"
                              style={{ background: 'var(--brand-pale)', color: 'var(--brand-forest)' }}>
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">
                          {s.description || <span className="italic text-gray-400">No description</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--brand-green)' }}>
              <span>Approval: <span className="font-semibold">{iv.approval}</span></span>
              <span>Created: <span className="font-semibold">{iv.createdAt}</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
           style={{ background: 'var(--brand-mint)' }}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-gray-400 font-medium">{label}</p>
        <p className="text-lg font-bold leading-tight" style={{ color: 'var(--brand-forest)' }}>{value}</p>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function Main() {
  const [interventions,       setInterventions]       = useState<Intervention[]>([])
  const [programs,            setPrograms]            = useState<ProgramOption[]>([])
  const [programsWithCohorts, setProgramsWithCohorts] = useState<ProgramWithCohorts[]>([])
  const [loading,             setLoading]             = useState(true)
  const [filterProgram,       setFilterProgram]       = useState('')
  const [filterStatus,        setFilterStatus]        = useState('')
  const [modal,               setModal]               = useState<{ mode: 'new' | 'edit'; initial: FormState; id?: string } | null>(null)
  const [enrollTarget,        setEnrollTarget]        = useState<Intervention | null>(null)
  const [deleteTarget,        setDeleteTarget]        = useState<Intervention | null>(null)
  const [suspendTarget,       setSuspendTarget]       = useState<Intervention | null>(null)

  useEffect(() => {
    Promise.all([getInterventions(), getPrograms(), getProgramsWithCohorts()]).then(([ivs, progs, pwc]) => {
      setInterventions(ivs)
      setPrograms(progs)
      setProgramsWithCohorts(pwc)
      setLoading(false)
    })
  }, [])

  const filtered = interventions.filter(iv => {
    if (filterProgram && !iv.enrolledCohorts.some(ec => ec.programId === filterProgram)) return false
    if (filterStatus  && iv.status !== filterStatus) return false
    return true
  })

  function openNew()                  { setModal({ mode: 'new', initial: EMPTY_FORM }) }
  function openEdit(iv: Intervention) { setModal({ mode: 'edit', initial: toForm(iv), id: iv.id }) }

  function handleSave(form: FormState) {
    if (modal?.mode === 'new') {
      const next: Intervention = {
        id: `int-${Date.now()}`,
        name: form.name, type: form.type, season: form.season,
        valueDescription: form.valueDescription, description: form.description,
        minFri: form.minFri, capacity: form.capacity,
        status: form.status, approval: form.approval,
        rules: form.rules, steps: form.steps,
        enrolledCohorts: [],
        createdAt: new Date().toISOString().slice(0, 10),
      }
      setInterventions(prev => [next, ...prev])
    } else if (modal?.id) {
      setInterventions(prev => prev.map(iv => iv.id !== modal.id ? iv : {
        ...iv,
        name: form.name, type: form.type, season: form.season,
        valueDescription: form.valueDescription, description: form.description,
        minFri: form.minFri, capacity: form.capacity,
        status: form.status, approval: form.approval,
        rules: form.rules, steps: form.steps,
      }))
    }
    setModal(null)
  }

  function handleUpdateCohorts(id: string, cohorts: EnrolledCohort[]) {
    setInterventions(prev => prev.map(iv => iv.id !== id ? iv : { ...iv, enrolledCohorts: cohorts }))
    if (enrollTarget?.id === id) setEnrollTarget(prev => prev ? { ...prev, enrolledCohorts: cohorts } : prev)
  }

  function handleSuspend(id: string) {
    setInterventions(prev => prev.map(iv =>
      iv.id !== id ? iv : { ...iv, status: iv.status === 'Suspended' ? 'Active' : 'Suspended' }
    ))
  }
  function handleDelete(id: string) {
    setInterventions(prev => prev.filter(iv => iv.id !== id))
  }

  const activeCount   = interventions.filter(iv => iv.status === 'Active').length
  const totalCapacity = interventions.reduce((sum, iv) => sum + iv.capacity, 0)
  const cohortCount   = interventions.reduce((sum, iv) => sum + iv.enrolledCohorts.length, 0)

  return (
    <div className="min-h-screen bg-(--brand-gray) p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--brand-forest)' }}>Opportunity Pathways</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--brand-dark)' }}>
            {loading ? 'Loading…' : `${interventions.length} opportunit${interventions.length === 1 ? 'y' : 'ies'} configured`}
          </p>
        </div>
        <ButtonTemplate
          variant="primary" size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          label="New Opportunity"
          onClick={openNew}
        />
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<Layers className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />} label="Total" value={interventions.length} />
          <StatCard icon={<TrendingUp className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />} label="Active" value={activeCount} />
          <StatCard icon={<Users className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />} label="Total Capacity" value={totalCapacity.toLocaleString()} />
          <StatCard icon={<Package className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />} label="Cohorts" value={cohortCount} />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <SelectTemplate
          options={[{ value: '', label: 'All programs' }, ...programs.map(p => ({ value: p.id, label: p.name }))]}
          value={filterProgram} size="sm"
          onChange={e => setFilterProgram(e.currentTarget.value)}
        />
        <SelectTemplate
          options={[{ value: '', label: 'All statuses' }, ...STATUSES.map(s => ({ value: s, label: s }))]}
          value={filterStatus} size="sm"
          onChange={e => setFilterStatus(e.currentTarget.value)}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-36 rounded-xl bg-white/60 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-gray-300" />
          <p className="text-sm text-gray-400">No opportunities found</p>
          <ButtonTemplate variant="outline" size="sm" label="Create one" onClick={openNew} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {filtered.map(iv => (
            <InterventionCard
              key={iv.id}
              intervention={iv}
              onEdit={() => openEdit(iv)}
              onSuspend={() => setSuspendTarget(iv)}
              onEnroll={() => setEnrollTarget(iv)}
              onDelete={() => setDeleteTarget(iv)}
            />
          ))}
        </div>
      )}

      {/* Sheets */}
      <InterventionSheet
        open={modal !== null}
        mode={modal?.mode ?? 'new'}
        initial={modal?.initial ?? EMPTY_FORM}
        onSave={handleSave}
        onClose={() => setModal(null)}
      />

      <EnrollSheet
        open={enrollTarget !== null}
        onClose={() => setEnrollTarget(null)}
        intervention={enrollTarget}
        onEdit={() => { setEnrollTarget(null); openEdit(enrollTarget!) }}
        programsWithCohorts={programsWithCohorts}
        onUpdateCohorts={cohorts => enrollTarget && handleUpdateCohorts(enrollTarget.id, cohorts)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete opportunity?"
        message={`"${deleteTarget?.name}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget.id); setDeleteTarget(null) }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        open={suspendTarget !== null}
        title={suspendTarget?.status === 'Suspended' ? 'Activate opportunity?' : 'Suspend opportunity?'}
        message={suspendTarget?.status === 'Suspended'
          ? `"${suspendTarget?.name}" will be made active again and visible to eligible farmers.`
          : `"${suspendTarget?.name}" will be suspended. Farmers will no longer be able to apply.`
        }
        confirmLabel={suspendTarget?.status === 'Suspended' ? 'Activate' : 'Suspend'}
        variant={suspendTarget?.status === 'Suspended' ? 'success' : 'warning'}
        onConfirm={() => { if (suspendTarget) handleSuspend(suspendTarget.id); setSuspendTarget(null) }}
        onCancel={() => setSuspendTarget(null)}
      />
    </div>
  )
}
