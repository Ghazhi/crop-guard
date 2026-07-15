'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Plus, MapPin, Mail, Building2, ChevronRight, ChevronDown, ChevronUp, Eye, Trash2, Calendar, Layers, Pencil, CheckCircle2, Clock, X, SlidersHorizontal, Users, Wallet, Check, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import { PersonAvatar } from '@/customComponents/PersonAvatar'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { CardTemplate } from '@/customComponents/CardTemplate'
import { PaginationBar } from '@/customComponents/PaginationBar'
import { DatagridTemplate } from '@/customComponents/DatagridTemplate'
import type { DatagridColumn } from '@/customComponents/DatagridTemplate'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet'
import { PARTNERS } from '@/dataCenter/partners'
import type { PartnerStatus } from '@/dataCenter/partners'
import { PARTNER_BASELINES, createDefaultP4Questions } from '@/dataCenter/partnerBaselines'
import type { PartnerP4Question } from '@/dataCenter/partnerBaselines'
import { cn } from '@/lib/utils'
import { usePersistedState } from '@/lib/usePersistedState'

interface Partner {
  id: string; name: string; type: string; region: string
  contact: string; email: string; status: PartnerStatus
  since: string; programs: number
}

const INITIAL_PARTNERS: Partner[] = PARTNERS.map(p => ({
  ...p,
  programs: 0,
}))

const PARTNER_TYPES = ['Commercial Bank', 'Development Bank', 'Rural Bank', 'MFI', 'NGO / Donor']
const REGIONS       = ['Greater Accra', 'Ashanti', 'Northern', 'Upper East', 'Upper West', 'Brong Ahafo', 'Kumasi', 'National']

const STEPS = ['Organisation', 'Primary Contact', 'Review']

interface AddForm {
  name: string; type: string; region: string; website: string
  contact: string; email: string; phone: string; role: string
}

const EMPTY_FORM: AddForm = { name: '', type: '', region: '', website: '', contact: '', email: '', phone: '', role: '' }

function statusCls(s: PartnerStatus) {
  if (s === 'Active')  return 'bg-green-50 text-green-700 border-green-200'
  if (s === 'Pending') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', error }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; error?: string
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full h-9 px-3 text-sm border rounded-lg bg-white focus:outline-none focus:ring-1 placeholder:text-gray-400 ${
        error ? 'border-red-300 focus:ring-red-300' : 'border-gray-200 focus:ring-green-300'
      }`} />
  )
}

function Select({ value, onChange, options, placeholder, error }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; error?: string
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`w-full h-9 px-3 text-sm border rounded-lg bg-white focus:outline-none focus:ring-1 text-gray-700 ${
        error ? 'border-red-300 focus:ring-red-300' : 'border-gray-200 focus:ring-green-300'
      }`}>
      <option value="">{placeholder ?? 'Select…'}</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  )
}

// ── Add Partner Sheet ──────────────────────────────────────────────────────────

function AddPartnerSheet({ open, onOpenChange, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void; onSave: (p: Partner) => void
}) {
  const [step,   setStep]   = useState(0)
  const [form,   setForm]   = useState<AddForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof AddForm, string>>>({})

  function set(k: keyof AddForm) {
    return (v: string) => {
      setForm(f => ({ ...f, [k]: v }))
      setErrors(e => ({ ...e, [k]: undefined }))
    }
  }

  function validate(): boolean {
    const next: typeof errors = {}
    if (step === 0) {
      if (!form.name)   next.name   = 'Organisation name is required'
      if (!form.type)   next.type   = 'Please select a partner type'
      if (!form.region) next.region = 'Please select a region'
    } else if (step === 1) {
      if (!form.contact) next.contact = 'Contact name is required'
      if (!form.email)   next.email   = 'Email address is required'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleNext() { if (validate()) setStep(s => s + 1) }

  function handleSave() {
    const now = new Date().toISOString().slice(0, 7)
    onSave({
      id:       `p-${Date.now()}`,
      name:     form.name,
      type:     form.type,
      region:   form.region,
      contact:  form.contact,
      email:    form.email,
      status:   'Pending',
      since:    now,
      programs: 0,
    })
    setForm(EMPTY_FORM)
    setErrors({})
    setStep(0)
    onOpenChange(false)
  }

  function handleClose(v: boolean) {
    if (!v) { setForm(EMPTY_FORM); setErrors({}); setStep(0) }
    onOpenChange(v)
  }


  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <SheetTitle>Add Partner</SheetTitle>
          <SheetDescription>Register a new partner organisation</SheetDescription>

          {/* Step indicator */}
          <div className="flex items-center gap-2 pt-3">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step  ? 'bg-green-600 text-white' :
                  i === step ? 'text-white' : 'bg-gray-100 text-gray-400'
                }`} style={i === step ? { backgroundColor: 'var(--brand-forest)' } : {}}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium ${i === step ? 'text-gray-800' : 'text-gray-400'}`}>{s}</span>
                {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 mx-1" />}
              </div>
            ))}
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {step === 0 && (
            <>
              <Field label="Organisation Name" error={errors.name}>
                <Input value={form.name} onChange={set('name')} placeholder="e.g. Fidelity Bank Ghana" error={errors.name} />
              </Field>
              <Field label="Partner Type" error={errors.type}>
                <Select value={form.type} onChange={set('type')} options={PARTNER_TYPES} placeholder="Select type…" error={errors.type} />
              </Field>
              <Field label="Region" error={errors.region}>
                <Select value={form.region} onChange={set('region')} options={REGIONS} placeholder="Select region…" error={errors.region} />
              </Field>
              <Field label="Website (optional)">
                <Input value={form.website} onChange={set('website')} placeholder="https://example.com" type="url" />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Full Name" error={errors.contact}>
                <Input value={form.contact} onChange={set('contact')} placeholder="e.g. Kwame Mensah" error={errors.contact} />
              </Field>
              <Field label="Email Address" error={errors.email}>
                <Input value={form.email} onChange={set('email')} placeholder="kwame@partner.org" type="email" error={errors.email} />
              </Field>
              <Field label="Phone Number (optional)">
                <Input value={form.phone} onChange={set('phone')} placeholder="+233 20 000 0000" />
              </Field>
              <Field label="Job Title (optional)">
                <Input value={form.role} onChange={set('role')} placeholder="e.g. Head of Credit" />
              </Field>
            </>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Organisation</p>
                </div>
                <div className="px-4 py-3 space-y-2 text-sm">
                  <Row label="Name"   value={form.name} />
                  <Row label="Type"   value={form.type} />
                  <Row label="Region" value={form.region} />
                  {form.website && <Row label="Website" value={form.website} />}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Primary Contact</p>
                </div>
                <div className="px-4 py-3 space-y-2 text-sm">
                  <Row label="Name"  value={form.contact} />
                  <Row label="Email" value={form.email} />
                  {form.phone && <Row label="Phone" value={form.phone} />}
                  {form.role  && <Row label="Title" value={form.role} />}
                </div>
              </div>
              <p className="text-xs text-gray-400">The partner will be added with a <strong>Pending</strong> status until activated.</p>
            </div>
          )}
        </div>

        <SheetFooter className="px-6 pb-6 pt-4 border-t border-gray-100 flex-row gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Back
            </button>
          )}
          {step < 2 ? (
            <button onClick={handleNext}
              className="flex-1 h-10 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--brand-forest)' }}>
              Next
            </button>
          ) : (
            <button onClick={handleSave}
              className="flex-1 h-10 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--brand-forest)' }}>
              Save Partner
            </button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium text-right">{value}</span>
    </div>
  )
}

// ── View Partner Sheet ────────────────────────────────────────────────────────

const MOCK_LINKED_PROGRAMS = [
  { id: 'lp1', name: 'Ashanti Maize 2025', season: '2025A', cohorts: [
      { id: 'lc1', name: 'Kumasi North A', enrolled: 48, target: 50, compliance: 92 },
      { id: 'lc2', name: 'Kumasi North B', enrolled: 43, target: 50, compliance: 87 },
    ], totalFarmers: 91, status: 'Active' },
  { id: 'lp2', name: 'Brong Soy 2025', season: '2025A', cohorts: [
      { id: 'lc3', name: 'Sunyani Central', enrolled: 62, target: 70, compliance: 78 },
    ], totalFarmers: 62, status: 'Active' },
  { id: 'lp3', name: 'Eastern Rice 2024', season: '2024B', cohorts: [
      { id: 'lc4', name: 'Kwahu West', enrolled: 55, target: 55, compliance: 95 },
    ], totalFarmers: 55, status: 'Completed' },
]

const MOCK_INTERVENTIONS = [
  { id: 'int1', name: 'Input Credit 2025', type: 'Credit', beneficiaries: 91, disbursed: 'GHS 45,600', repaymentRate: 88, status: 'Active' },
  { id: 'int2', name: 'Fertiliser Subsidy', type: 'Input Support', beneficiaries: 62, disbursed: 'GHS 18,200', repaymentRate: null, status: 'Active' },
  { id: 'int3', name: 'Rice Loan 2024', type: 'Credit', beneficiaries: 55, disbursed: 'GHS 27,500', repaymentRate: 94, status: 'Completed' },
]

// farmers spread across cohorts so filter actually reduces the list
const MOCK_FARMERS = [
  ...Array.from({ length: 5 }, (_, i) => ({ id: `f${i+1}`,    name: ['Kofi Mensah','Ama Owusu','Kwame Asante','Abena Boateng','Yaw Darko'][i],       community: 'Atwima',  friScore: 62+(i*6)%35, programId:'lp1', cohortId:'lc1' })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `f${i+6}`,    name: ['Efua Agyei','Samuel Kusi','Grace Owusu','Daniel Mensah'][i],                    community: 'Kwabre',  friScore: 68+(i*5)%30, programId:'lp1', cohortId:'lc2' })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `f${i+10}`,   name: ['Akua Darko','Fiifi Asante','Nana Osei','Abena Kusi'][i],                        community: 'Sunyani', friScore: 71+(i*4)%28, programId:'lp2', cohortId:'lc3' })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `f${i+14}`,   name: ['Kwesi Boateng','Mavis Mensah','Eric Asante','Comfort Darko'][i],                community: 'Kwahu',   friScore: 74+(i*3)%25, programId:'lp3', cohortId:'lc4' })),
]

const FARMERS_MODAL_COLUMNS: DatagridColumn<typeof MOCK_FARMERS[number]>[] = [
  { key: 'name', label: 'Farmer', render: v => <span className="font-medium text-gray-800">{String(v)}</span> },
  { key: 'community', label: 'Community', render: v => <span className="text-gray-500">{String(v)}</span> },
  {
    key: 'friScore', label: 'FRI Score',
    render: v => {
      const score = Number(v)
      return (
        <span className={`block text-right px-2 py-0.5 rounded-full text-xs font-medium ${score >= 75 ? 'bg-green-100 text-green-700' : score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
          {score}
        </span>
      )
    },
  },
]

type ViewTab = 'overview' | 'programs' | 'interventions'

interface FarmersModal {
  programName: string
  cohortName?: string
  fromIntervention?: boolean
}

function ViewPartnerSheet({ partner, onClose, onRemove, onEdit, onManageBaseline }: {
  partner: Partner | null; onClose: () => void; onRemove: (p: Partner) => void; onEdit: (p: Partner) => void
  onManageBaseline: (p: Partner) => void
}) {
  const [tab, setTab] = useState<ViewTab>('overview')
  const [programFilter, setProgramFilter] = useState('')
  const [cohortFilter, setCohortFilter] = useState('')
  const [farmersModal, setFarmersModal] = useState<FarmersModal | null>(null)
  // farmers modal internal filters — pre-populated from the clicked cohort/program
  const [fmProgram, setFmProgram] = useState('')
  const [fmCohort,  setFmCohort]  = useState('')

  // reset all state whenever a different partner is selected
  const prevPartnerId = useRef<string | null>(null)
  useEffect(() => {
    if (partner && partner.id !== prevPartnerId.current) {
      prevPartnerId.current = partner.id
      setTab('overview')
      setProgramFilter('')
      setCohortFilter('')
      setFarmersModal(null)
      setFmProgram('')
      setFmCohort('')
    }
  }, [partner])

  if (!partner) return null
  const p = partner

  // Overview quick stats
  const totalFarmers = MOCK_LINKED_PROGRAMS.reduce((sum, prog) => sum + prog.totalFarmers, 0)
  const activePrograms = MOCK_LINKED_PROGRAMS.filter(prog => prog.status === 'Active').length
  const repaymentRates = MOCK_INTERVENTIONS.map(i => i.repaymentRate).filter((r): r is number => r !== null)
  const avgRepayment = repaymentRates.length > 0
    ? Math.round(repaymentRates.reduce((a, b) => a + b, 0) / repaymentRates.length)
    : 0

  // Programs tab filtering
  const filteredPrograms = MOCK_LINKED_PROGRAMS
    .filter(prog => !programFilter || prog.name === programFilter)
    .map(prog => ({
      ...prog,
      cohorts: prog.cohorts.filter(c => !cohortFilter || c.name === cohortFilter),
    }))
    .filter(prog => prog.cohorts.length > 0)

  // Cohort options for filter
  const cohortOptions = programFilter
    ? (MOCK_LINKED_PROGRAMS.find(prog => prog.name === programFilter)?.cohorts ?? [])
    : MOCK_LINKED_PROGRAMS.flatMap(prog => prog.cohorts)

  return (
    <Sheet open={!!partner} onOpenChange={open => { if (!open) { onClose(); setTab('overview'); setProgramFilter(''); setCohortFilter(''); setFarmersModal(null) } }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <PersonAvatar name={p.name} size={40} shape="square" />
              <div>
                <SheetTitle className="text-base">{p.name}</SheetTitle>
                <SheetDescription>{p.type}</SheetDescription>
              </div>
            </div>
            <ButtonTemplate
              variant="outline"
              size="sm"
              isIcon
              tooltip="Edit"
              leftIcon={<Pencil className="w-3.5 h-3.5" />}
              onClick={() => { onClose(); onEdit(p) }}
            />
          </div>
        </SheetHeader>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mx-6 mt-4 mb-2">
          {(['overview', 'programs', 'interventions'] as ViewTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={cn('flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize', tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
              {t === 'programs' ? 'Linked Programs' : t === 'interventions' ? 'Linked Interventions' : 'Overview'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-5">

          {/* ── OVERVIEW TAB ── */}
          {tab === 'overview' && (
            <div className="space-y-5 pt-3">
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{totalFarmers}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Total Farmers</p>
                </div>
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{activePrograms}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Active Programs</p>
                </div>
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{avgRepayment}%</p>
                  <p className="text-xs text-gray-400 mt-0.5">Avg Repayment</p>
                </div>
              </div>

              {/* Status badge */}
              <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border ${statusCls(p.status)}`}>{p.status}</span>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: MapPin,    label: 'Region',        value: p.region },
                  { icon: Calendar,  label: 'Partner since', value: p.since },
                  { icon: Layers,    label: 'Programs',      value: String(p.programs) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
                    <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />{value}
                    </p>
                  </div>
                ))}
              </div>

              {/* P4 Baseline */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">P4: Farm Enterprise Discipline</p>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Wallet className="w-4 h-4 text-gray-400 shrink-0" />
                    {PARTNER_BASELINES[p.id] ? (
                      <div>
                        <p className="text-sm font-medium text-gray-800">Baseline assigned</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {PARTNER_BASELINES[p.id].questions.length} question{PARTNER_BASELINES[p.id].questions.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Not assigned yet</p>
                    )}
                  </div>
                  <button onClick={() => onManageBaseline(p)}
                    className="shrink-0 h-8 px-3 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-white transition-colors">
                    {PARTNER_BASELINES[p.id] ? 'Manage' : 'Create'}
                  </button>
                </div>
              </div>

              {/* Primary contact */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Primary Contact</p>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <PersonAvatar name={p.contact} size={36} />
                    <p className="font-semibold text-gray-900">{p.contact}</p>
                  </div>
                  <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                    <Mail className="w-3.5 h-3.5 shrink-0 text-gray-400" />{p.email}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ── LINKED PROGRAMS TAB ── */}
          {tab === 'programs' && (
            <div className="pt-3 space-y-3">
              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={programFilter}
                  onChange={e => { setProgramFilter(e.target.value); setCohortFilter('') }}
                  className="h-8 flex-1 border border-gray-200 rounded-lg px-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-300"
                >
                  <option value="">All Programs</option>
                  {MOCK_LINKED_PROGRAMS.map(prog => <option key={prog.id}>{prog.name}</option>)}
                </select>
                <select
                  value={cohortFilter}
                  onChange={e => setCohortFilter(e.target.value)}
                  className="h-8 flex-1 border border-gray-200 rounded-lg px-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-300"
                >
                  <option value="">All Cohorts</option>
                  {cohortOptions.map(c => <option key={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Program cards — matches admin ProgramsSetup card language */}
              {filteredPrograms.map(prog => {
                const totalEnrolled = prog.cohorts.reduce((s, c) => s + c.enrolled, 0)
                const totalTarget   = prog.cohorts.reduce((s, c) => s + c.target, 0)
                const filled = totalTarget > 0 ? Math.min(100, Math.round((totalEnrolled / totalTarget) * 100)) : 0
                const statusVariant = prog.status === 'Active' ? 'success' : 'neutral'
                return (
                  <CardTemplate key={prog.id} noPadding className="overflow-hidden">
                    <div className="px-6 pt-4 pb-3">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="text-base font-bold truncate" style={{ color: 'var(--brand-forest)' }}>{prog.name}</h3>
                        <BadgeTemplate label={prog.status} variant={statusVariant} size="sm" />
                      </div>
                      <p className="pl-0 text-xs text-gray-400 mb-3">{prog.season}</p>

                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: 'var(--brand-dark)' }}>
                          <Users className="w-3.5 h-3.5" />
                          {totalEnrolled} / {totalTarget}
                        </span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${filled}%`, backgroundColor: 'var(--brand-green)' }} />
                        </div>
                        <span className="text-xs text-gray-400 tabular-nums shrink-0">{filled}%</span>
                      </div>
                    </div>

                    <div className="border-t border-gray-100">
                      {prog.cohorts.map(cohort => (
                        <div key={cohort.id} className="flex items-center justify-between px-6 py-2.5 border-b border-gray-50 last:border-b-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">{cohort.name}</span>
                            <button
                              onClick={() => {
                                setFmProgram(prog.id)
                                setFmCohort(cohort.id)
                                setFarmersModal({ programName: prog.name, cohortName: cohort.name, fromIntervention: false })
                              }}
                              className="text-xs text-green-700 underline cursor-pointer font-medium hover:text-green-900 transition-colors"
                            >
                              {cohort.enrolled} farmers
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <BadgeTemplate
                              label={`${cohort.compliance}%`}
                              variant={cohort.compliance >= 90 ? 'success' : cohort.compliance >= 75 ? 'warning' : 'danger'}
                              size="sm"
                            />
                            <span className="text-xs text-gray-400 tabular-nums">{cohort.enrolled}/{cohort.target}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardTemplate>
                )
              })}

              {filteredPrograms.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm">No programs match the selected filters</div>
              )}
            </div>
          )}

          {/* ── LINKED INTERVENTIONS TAB ── */}
          {tab === 'interventions' && (
            <div className="pt-3 space-y-3">
              {MOCK_INTERVENTIONS.map(intervention => (
                <div key={intervention.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{intervention.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">{intervention.type}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${intervention.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {intervention.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span><span className="font-semibold text-gray-800">{intervention.beneficiaries}</span> Beneficiaries</span>
                    <span><span className="font-semibold text-gray-800">{intervention.disbursed}</span> Disbursed</span>
                    <span>
                      Repayment: <span className="font-semibold text-gray-800">{intervention.repaymentRate !== null ? `${intervention.repaymentRate}%` : 'N/A'}</span>
                    </span>
                  </div>
                  <ButtonTemplate
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFmProgram('')
                      setFmCohort('')
                      setFarmersModal({ programName: intervention.name, fromIntervention: true })
                    }}
                  >
                    View Farmers
                  </ButtonTemplate>
                </div>
              ))}
            </div>
          )}
        </div>

        <SheetFooter className="px-6 pb-6 pt-4 border-t border-gray-100 flex-row gap-3">
          <button
            onClick={() => { onClose(); onRemove(p) }}
            className="flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Remove
          </button>
          <button onClick={onClose}
            className="flex-1 h-9 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--brand-forest)' }}>
            Close
          </button>
        </SheetFooter>

        {/* Farmers Modal */}
        {farmersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setFarmersModal(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="font-semibold text-gray-900">{farmersModal.programName}</p>
                  {farmersModal.cohortName && <p className="text-xs text-gray-400 mt-0.5">{farmersModal.cohortName}</p>}
                </div>
                <button onClick={() => setFarmersModal(null)}><X className="w-4 h-4 text-gray-400 hover:text-gray-700" /></button>
              </div>

              {/* Only show program/cohort filters when NOT fromIntervention */}
              {!farmersModal.fromIntervention && (
                <div className="flex gap-2 px-5 py-3 border-b border-gray-100">
                  <select
                    value={fmProgram}
                    onChange={e => { setFmProgram(e.target.value); setFmCohort('') }}
                    className="h-8 flex-1 border border-gray-200 rounded-lg px-2 text-xs bg-white"
                  >
                    <option value="">All Programs</option>
                    {MOCK_LINKED_PROGRAMS.map(prog => <option key={prog.id} value={prog.id}>{prog.name}</option>)}
                  </select>
                  <select
                    value={fmCohort}
                    onChange={e => setFmCohort(e.target.value)}
                    className="h-8 flex-1 border border-gray-200 rounded-lg px-2 text-xs bg-white"
                  >
                    <option value="">All Cohorts</option>
                    {(fmProgram
                      ? MOCK_LINKED_PROGRAMS.find(p => p.id === fmProgram)?.cohorts ?? []
                      : MOCK_LINKED_PROGRAMS.flatMap(p => p.cohorts)
                    ).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-5 py-3">
                <DatagridTemplate<typeof MOCK_FARMERS[number]>
                  columns={FARMERS_MODAL_COLUMNS}
                  data={MOCK_FARMERS.filter(f =>
                    (!fmProgram || f.programId === fmProgram) &&
                    (!fmCohort  || f.cohortId  === fmCohort)
                  )}
                  rowKey="id"
                  defaultPageSize={0}
                  pageSizeOptions={[0]}
                />
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ── Edit Partner Sheet ────────────────────────────────────────────────────────

function EditPartnerSheet({ partner, open, onOpenChange, onSave }: {
  partner: Partner | null; open: boolean; onOpenChange: (v: boolean) => void; onSave: (p: Partner) => void
}) {
  const [name,    setName]    = useState('')
  const [type,    setType]    = useState('')
  const [region,  setRegion]  = useState('')
  const [contact, setContact] = useState('')
  const [email,   setEmail]   = useState('')
  const [status,  setStatus]  = useState<PartnerStatus>('Active')

  useEffect(() => {
    if (open && partner) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setName(partner.name)
      setType(partner.type)
      setRegion(partner.region)
      setContact(partner.contact)
      setEmail(partner.email)
      setStatus(partner.status)
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, partner])

  function handleSave() {
    if (!partner || !name.trim()) return
    onSave({ ...partner, name: name.trim(), type, region, contact, email, status })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <SheetTitle>Edit Partner</SheetTitle>
          <SheetDescription>{partner?.name}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="Organisation Name">
            <Input value={name} onChange={setName} placeholder="Organisation name" />
          </Field>
          <Field label="Partner Type">
            <Select value={type} onChange={setType} options={PARTNER_TYPES} placeholder="Select type…" />
          </Field>
          <Field label="Region">
            <Select value={region} onChange={setRegion} options={REGIONS} placeholder="Select region…" />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={v => setStatus(v as PartnerStatus)} options={['Active', 'Inactive', 'Pending']} />
          </Field>
          <Field label="Primary Contact Name">
            <Input value={contact} onChange={setContact} placeholder="Full name" />
          </Field>
          <Field label="Contact Email">
            <Input value={email} onChange={setEmail} placeholder="email@example.com" type="email" />
          </Field>
        </div>

        <SheetFooter className="px-6 pb-6 pt-4 border-t border-gray-100 flex-row gap-3">
          <button onClick={() => onOpenChange(false)}
            className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!name.trim()}
            className="flex-1 h-10 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: 'var(--brand-forest)' }}>
            Save Changes
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ── Create Baseline Sheet ──────────────────────────────────────────────────────

function CreateBaselineSheet({ open, onOpenChange, partners, initialPartnerId, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; partners: Partner[]
  initialPartnerId?: string; onSaved: (partnerId: string) => void
}) {
  const [partnerId,  setPartnerId]  = useState('')
  const [questions,  setQuestions]  = useState<PartnerP4Question[]>([])
  const [adding,     setAdding]     = useState(false)
  const [newLabel,   setNewLabel]   = useState('')
  const [newDesc,    setNewDesc]    = useState('')

  useEffect(() => {
    if (!open) return
    /* eslint-disable react-hooks/set-state-in-effect */
    const pid = initialPartnerId ?? ''
    setPartnerId(pid)
    setQuestions(pid ? (PARTNER_BASELINES[pid]?.questions ?? createDefaultP4Questions()) : [])
    setAdding(false); setNewLabel(''); setNewDesc('')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initialPartnerId])

  function handlePartnerChange(id: string) {
    setPartnerId(id)
    setQuestions(id ? (PARTNER_BASELINES[id]?.questions ?? createDefaultP4Questions()) : [])
  }

  function submitAdd() {
    if (!newLabel.trim()) return
    setQuestions(prev => [...prev, { id: `p4_${Date.now()}`, label: newLabel.trim(), desc: newDesc.trim(), active: true }])
    setNewLabel(''); setNewDesc(''); setAdding(false)
  }

  function removeQuestion(id: string) {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  function handleSave() {
    if (!partnerId) return
    PARTNER_BASELINES[partnerId] = { partnerId, questions }
    onSaved(partnerId)
    onOpenChange(false)
  }

  const selectedPartner = partners.find(p => p.id === partnerId)
  const alreadyHasBaseline = !!(partnerId && PARTNER_BASELINES[partnerId])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <SheetTitle>Create P4 Baseline</SheetTitle>
          <SheetDescription>Assign a Farm Enterprise Discipline baseline to a single partner.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="Partner">
            <select value={partnerId} onChange={e => handlePartnerChange(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-green-300 text-gray-700">
              <option value="">Select a partner…</option>
              {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>

          {partnerId && (
            <>
              {alreadyHasBaseline && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  {selectedPartner?.name} already has a P4 baseline — saving will update it.
                </p>
              )}

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    Questions ({questions.length})
                  </p>
                  <button
                    onClick={() => { setAdding(true); setNewLabel(''); setNewDesc('') }}
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white rounded-lg transition-colors hover:opacity-90"
                    style={{ background: 'var(--brand-forest)' }}>
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {questions.map(q => (
                  <div key={q.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 leading-tight">{q.label}</p>
                      {q.desc && <p className="text-xs text-gray-400 mt-0.5">{q.desc}</p>}
                    </div>
                    <button onClick={() => removeQuestion(q.id)}
                      className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {adding && (
                  <div className="px-4 py-4 border-t border-gray-100 flex flex-col gap-2.5">
                    <input autoFocus type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                      placeholder="Question statement..."
                      className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300" />
                    <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)}
                      placeholder="Description"
                      className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300" />
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
              </div>
            </>
          )}
        </div>

        <SheetFooter className="px-6 pb-6 pt-4 border-t border-gray-100 flex-row gap-3">
          <button onClick={() => onOpenChange(false)}
            className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!partnerId}
            className="flex-1 h-10 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: 'var(--brand-forest)' }}>
            Save Baseline
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function Main() {
  const [partners,       setPartners]       = useState<Partner[]>(INITIAL_PARTNERS)
  const [search,         setSearch]         = useState('')
  const [filtersOpen,    setFiltersOpen]    = useState(false)
  const [typeFilter,     setTypeFilter]     = useState('')
  const [statusFilter,   setStatusFilter]   = useState('')
  const [page,           setPage]           = useState(1)
  const [pageSize,       setPageSize]       = useState(25)
  const [sheetOpen,      setSheetOpen]      = useState(false)
  const [viewPartner,    setViewPartner]    = useState<Partner | null>(null)
  const [editPartner,    setEditPartner]    = useState<Partner | null>(null)
  const [editOpen,       setEditOpen]       = useState(false)
  const [removeTarget,   setRemoveTarget]   = useState<Partner | null>(null)
  const [baselinePartnerFilter, setBaselinePartnerFilter] = useState('')
  const [baselineSheetOpen,     setBaselineSheetOpen]     = useState(false)
  const [baselineSheetPartnerId, setBaselineSheetPartnerId] = useState<string | undefined>(undefined)
  const [statsOpen, setStatsOpen] = usePersistedState('partners-stats', false)
  // bumped whenever a baseline is saved, to force a re-render of rows/badges reading the module-level store
  const [, setBaselineVersion] = useState(0)

  const activeFilterCount = [typeFilter, statusFilter, baselinePartnerFilter].filter(Boolean).length
  const types     = [...new Set(partners.map(p => p.type))]
  const filtered = partners.filter(p =>
    (!search       || p.name.toLowerCase().includes(search.toLowerCase()) ||
                      p.contact.toLowerCase().includes(search.toLowerCase())) &&
    (!typeFilter   || p.type === typeFilter) &&
    (!statusFilter || p.status === statusFilter) &&
    (!baselinePartnerFilter || p.id === baselinePartnerFilter)
  )
  const displayed = pageSize > 0
    ? filtered.slice((page - 1) * pageSize, page * pageSize)
    : filtered

  // Overview stats
  const totalPartners  = partners.length
  const activeCount    = partners.filter(p => p.status === 'Active').length
  const pendingCount   = partners.filter(p => p.status === 'Pending').length
  const totalPrograms  = partners.reduce((sum, p) => sum + p.programs, 0)

  function handleAdd(p: Partner) { setPartners(prev => [p, ...prev]) }

  const PARTNER_COLUMNS: DatagridColumn<Partner>[] = [
    {
      key: 'name', label: 'Organisation',
      render: (v, p) => (
        <button onClick={() => setViewPartner(p)} className="flex items-center gap-3 group/link text-left">
          <PersonAvatar name={p.name} size={32} shape="square" />
          <span className="font-medium text-gray-900 group-hover/link:text-green-700 transition-colors">{String(v)}</span>
        </button>
      ),
    },
    {
      key: 'type', label: 'Type',
      render: v => <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{String(v)}</span>,
    },
    {
      key: 'contact', label: 'Primary Contact',
      render: (v, p) => (
        <>
          <p className="font-medium text-gray-800">{String(v)}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <Mail className="w-3 h-3" />{p.email}
          </p>
        </>
      ),
    },
    {
      key: 'region', label: 'Region',
      render: v => (
        <span className="text-xs text-gray-600 flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" />{String(v)}
        </span>
      ),
    },
    {
      key: 'programs', label: 'Programs',
      render: v => <span className="block text-center text-sm font-bold text-gray-700">{String(v)}</span>,
    },
    {
      key: 'status', label: 'Status',
      render: v => <span className={`block text-center text-xs font-semibold px-2 py-0.5 rounded-full border ${statusCls(v as PartnerStatus)}`}>{String(v)}</span>,
    },
    {
      key: 'id', id: 'p4baseline', label: 'P4 Baseline',
      render: (_, p) => (
        <div className="text-center">
          {PARTNER_BASELINES[p.id] ? (
            <BadgeTemplate label="Assigned" variant="success" size="sm" />
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'since', label: 'Since',
      render: v => <span className="block text-center text-xs text-gray-400">{String(v)}</span>,
    },
    {
      key: 'id', id: 'actions', label: '',
      render: (_, p) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => { setBaselineSheetPartnerId(p.id); setBaselineSheetOpen(true) }}
            title="Create / edit P4 baseline"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100">
            <Wallet className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewPartner(p)}
            title="View"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100">
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Partners</h1>
          <p className="text-sm text-gray-500 mt-0.5">{partners.length} registered partner organisations</p>
        </div>
        <div className="flex items-center gap-2">
          <ButtonTemplate
            variant="secondary" size="md"
            leftIcon={<BarChart2 className="w-3.5 h-3.5" />}
            rightIcon={<ChevronUp className={cn('w-3.5 h-3.5 transition-transform', !statsOpen && 'rotate-180')} />}
            label="Overview"
            onClick={() => setStatsOpen(v => !v)}
          />
          <button onClick={() => { setBaselineSheetPartnerId(undefined); setBaselineSheetOpen(true) }}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
            <Wallet className="w-4 h-4" /> Create Baseline
          </button>
          <button onClick={() => setSheetOpen(true)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--brand-forest)' }}>
            <Plus className="w-4 h-4" /> Add Partner
          </button>
        </div>
      </div>

      {/* Overview stats bar */}
      {statsOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
          {[
            { icon: Building2,    bg: 'bg-blue-50',   color: 'text-blue-600',   value: totalPartners, label: 'Total Partners' },
            { icon: CheckCircle2, bg: 'bg-green-50',  color: 'text-green-600',  value: activeCount,   label: 'Active' },
            { icon: Clock,        bg: 'bg-amber-50',  color: 'text-amber-600',  value: pendingCount,  label: 'Pending' },
            { icon: Layers,       bg: 'bg-purple-50', color: 'text-purple-600', value: totalPrograms, label: 'Total Programs' },
          ].map(({ icon: Icon, bg, color, value, label }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {/* Filters + Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        {/* Search + filter toggle */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full border border-gray-200 rounded-lg pl-10 pr-9 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) transition-colors"
                placeholder="Search partners or contacts…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(v => !v)}
              className={cn(
                'flex items-center gap-1.5 h-10 px-3 rounded-lg border text-sm font-medium transition-colors shrink-0',
                filtersOpen || activeFilterCount > 0
                  ? 'border-(--brand-green) text-(--brand-green) bg-green-50'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700',
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: 'var(--brand-green)' }}>
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', filtersOpen && 'rotate-180')} />
            </button>
          </div>

          {filtersOpen && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-1 border-t border-gray-100">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Type</p>
                <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
                  className="h-8 w-full border border-gray-200 rounded-lg px-2.5 text-xs focus:outline-none bg-white">
                  <option value="">All types</option>
                  {types.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Status</p>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                  className="h-8 w-full border border-gray-200 rounded-lg px-2.5 text-xs focus:outline-none bg-white">
                  <option value="">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Partner</p>
                <select value={baselinePartnerFilter} onChange={e => { setBaselinePartnerFilter(e.target.value); setPage(1) }}
                  className="h-8 w-full border border-gray-200 rounded-lg px-2.5 text-xs focus:outline-none bg-white">
                  <option value="">All partners</option>
                  {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Pagination row */}
        <div className="px-5 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <p className="text-xs text-gray-400">{filtered.length} partner{filtered.length !== 1 ? 's' : ''}</p>
          <PaginationBar page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={ps => { setPageSize(ps); setPage(1) }} />
        </div>

        {displayed.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
            <Building2 className="w-8 h-8 opacity-30" />
            <p className="text-sm">No partners found</p>
          </div>
        ) : (
          <div className="px-5 py-4">
            <DatagridTemplate<Partner>
              columns={PARTNER_COLUMNS}
              data={displayed}
              rowKey="id"
              defaultPageSize={0}
              pageSizeOptions={[0]}
            />
          </div>
        )}
      </div>

      <AddPartnerSheet open={sheetOpen} onOpenChange={setSheetOpen} onSave={handleAdd} />

      <CreateBaselineSheet
        open={baselineSheetOpen}
        onOpenChange={setBaselineSheetOpen}
        partners={partners}
        initialPartnerId={baselineSheetPartnerId}
        onSaved={() => setBaselineVersion(v => v + 1)}
      />

      <ViewPartnerSheet
        partner={viewPartner}
        onClose={() => setViewPartner(null)}
        onRemove={p => setRemoveTarget(p)}
        onEdit={p => { setEditPartner(p); setEditOpen(true) }}
        onManageBaseline={p => { setViewPartner(null); setBaselineSheetPartnerId(p.id); setBaselineSheetOpen(true) }}
      />

      <EditPartnerSheet
        partner={editPartner}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={saved => setPartners(prev => prev.map(p => p.id === saved.id ? saved : p))}
      />

      <ConfirmModal
        open={!!removeTarget}
        title="Remove partner?"
        message={`"${removeTarget?.name}" will be permanently removed from the directory.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => {
          setPartners(prev => prev.filter(p => p.id !== removeTarget?.id))
          setRemoveTarget(null)
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}
