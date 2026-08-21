'use client'

import { PersonAvatar } from '@/customComponents/PersonAvatar'
import { useState, useEffect, useMemo } from 'react'
import { usePersistedState } from '@/lib/usePersistedState'
import {
  Search, X, Download, Upload, RefreshCw, Plus, Pencil,
  UserMinus, UserCog, Users, Check, GitBranch, UserPlus,
  FileText, UserCheck, Clock, CreditCard, Truck, PackageCheck,
  MapPin, BarChart2, ChevronUp, ChevronDown, SlidersHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { FileUploadTemplate } from '@/customComponents/FileUploadTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { PaginationBar } from '@/customComponents/PaginationBar'
import { DynamicFormRenderer } from '@/customComponents/DynamicFormRenderer'
import { useFormConfig } from '@/lib/useFormConfig'
import { useDynamicFieldOptions } from '@/lib/useDynamicFieldOptions'
import {
  FARMER_REGISTRATION_FORM_ID, FARMER_ASSIGN_AGENT_FORM_ID,
  FARMER_ENROLL_FORM_ID, PM_FARMER_EDIT_FORM_ID,
} from '@/dataCenter/formEngine'

import { getFarmers, getProgramOptions } from '@/app/(admin)/dashboard/FarmersRegistry/_logics/functions'
import type { Farmer, FriZone, ProgramOption } from '@/app/(admin)/dashboard/FarmersRegistry/_logics/interface'
import { PM_PROGRAM_IDS, PM_PROGRAMS, isPmProgram } from '@/dataCenter/pmScope'
import { useCropOptions } from '@/dataCenter/useCropOptions'

// ── PM scoping ─────────────────────────────────────────────────────────────────
// Keep unassigned farmers (needed for enroll flows) plus farmers enrolled in one
// of this PM's programs.
function scopeFarmersToPm(farmers: Farmer[]): Farmer[] {
  return farmers.filter(f => f.enrollment == null || isPmProgram(f.enrollment.programId))
}

function scopeProgramsToPm(programs: ProgramOption[]): ProgramOption[] {
  return programs.filter(p => PM_PROGRAM_IDS.includes(p.id))
}

// ── Constants ──────────────────────────────────────────────────────────────────

const WORKFLOW_STAGES = [
  { stage: 1, name: 'Submitted',      icon: FileText    },
  { stage: 2, name: 'Consent',        icon: UserCheck   },
  { stage: 3, name: 'Under Review',   icon: Clock       },
  { stage: 4, name: 'Credit Review',  icon: CreditCard  },
  { stage: 5, name: 'Final Approval', icon: Check       },
  { stage: 6, name: 'Active',         icon: Check       },
  { stage: 7, name: 'Delivered',      icon: Truck       },
  { stage: 8, name: 'Repayment',      icon: PackageCheck },
]

const ZONE_COLORS: Record<FriZone, string> = {
  'Resilience Leader':  'bg-purple-100 text-purple-800',
  'Resilience Builder': 'bg-green-100 text-green-800',
  'Resilience Learner': 'bg-yellow-100 text-yellow-800',
  'Resilience Starter': 'bg-red-100 text-red-800',
}

const ZONE_RISK: Record<FriZone, string> = {
  'Resilience Leader':  'Low Risk',
  'Resilience Builder': 'Managed Risk',
  'Resilience Learner': 'Elevated Risk',
  'Resilience Starter': 'Critical Risk',
}

const ZONE_OPTIONS: FriZone[] = [
  'Resilience Leader', 'Resilience Builder', 'Resilience Learner', 'Resilience Starter',
]

const MOCK_AGENTS = ['Kwame Asante', 'Abdul Razak']

const REGION_OPTIONS = [
  { value: 'savannah',     label: 'Savannah'     },
  { value: 'northern',     label: 'Northern'     },
  { value: 'upper_east',   label: 'Upper East'   },
  { value: 'upper_west',   label: 'Upper West'   },
  { value: 'north_east',   label: 'North East'   },
  { value: 'ashanti',      label: 'Ashanti'      },
  { value: 'eastern',      label: 'Eastern'      },
  { value: 'western',      label: 'Western'      },
  { value: 'central',      label: 'Central'      },
  { value: 'volta',        label: 'Volta'        },
  { value: 'greater_accra',label: 'Greater Accra'},
  { value: 'oti',          label: 'Oti'          },
  { value: 'bono',         label: 'Bono'         },
  { value: 'bono_east',    label: 'Bono East'    },
  { value: 'ahafo',        label: 'Ahafo'        },
  { value: 'western_north',label: 'Western North'},
]


const CSV_FIELDS = 'full_name, phone, national_id, date_of_birth, gender, region_code, district, community, primary_crop, total_farm_size_ha'

// ── Shared filter select ───────────────────────────────────────────────────────

function FilterSelect({
  label, value, onChange, options, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; disabled?: boolean
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <select
        disabled={disabled} value={value} onChange={e => onChange(e.target.value)}
        className={cn(
          'w-full h-8 text-xs rounded-lg border border-gray-200 bg-white px-2.5 pr-7',
          'appearance-none focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark)',
          'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
          'cursor-pointer hover:border-gray-300 transition-colors',
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ── Add farmer — stepper types ────────────────────────────────────────────────

interface AddFarmerForm {
  fullName: string; phone: string; nationalId: string
  dateOfBirth: string; gender: string; region: string; district: string
  community: string; primaryCrop: string; farmSize: string; gpsLocation: string
  consentGiven: boolean
}

interface StepperForm {
  // Step 1
  firstName: string; lastName: string; gender: string; dob: string
  phone: string; community: string; group: string; programId: string; cohortId: string
  // Step 2
  idType: string; idNumber: string
  // Step 3
  yearsExp: string; acres: string; primaryCrop: string; bagsPrevSeason: string
  secondaryCrop: string; ownsTractor: '' | 'yes' | 'no'
  // Step 4
  ownsHouse: '' | 'yes' | 'no'; maritalStatus: string; numChildren: string
  otherBusiness: '' | 'yes' | 'no'; nativeCommunity: '' | 'yes' | 'no'
  communityPrefs: string[]
  // Step 5
  engagedAgric: '' | 'yes' | 'no'; desiredAssets: string[]
  inputCredit: '' | 'yes' | 'no'; engagedOrgs: '' | 'yes' | 'no'
  suggestions: string; gpsLocation: string; consentGiven: boolean
}

const EMPTY_STEPPER: StepperForm = {
  firstName: '', lastName: '', gender: '', dob: '', phone: '', community: '',
  group: '', programId: '', cohortId: '',
  idType: '', idNumber: '',
  yearsExp: '', acres: '', primaryCrop: '', bagsPrevSeason: '', secondaryCrop: '',
  ownsTractor: '',
  ownsHouse: '', maritalStatus: '', numChildren: '0', otherBusiness: '',
  nativeCommunity: '', communityPrefs: [],
  engagedAgric: '', desiredAssets: [], inputCredit: '', engagedOrgs: '',
  suggestions: '', gpsLocation: '', consentGiven: false,
}

// ── Stepper sub-components ────────────────────────────────────────────────────

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center w-full mb-5">
      {Array.from({ length: total }, (_, i) => {
        const n      = i + 1
        const done   = n < step
        const active = n === step
        return (
          <div key={n} className="flex items-center flex-1 last:flex-none">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
              style={{
                backgroundColor: done || active ? 'var(--brand-forest)' : '#e5e7eb',
                color:           done || active ? 'white' : '#9ca3af',
              }}
            >
              {done ? <Check className="w-3.5 h-3.5" /> : n}
            </div>
            {i < total - 1 && (
              <div className="flex-1 h-px mx-1" style={{ backgroundColor: done ? 'var(--brand-forest)' : '#d1d5db' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step titles ───────────────────────────────────────────────────────────────

const STEP_TITLES = ['Basic Details', 'Identity Details', 'Farm Details', 'Household Details', 'Support Details']

/** Steps of the shared farmer-registration form this portal collects (no Financial step). */
const PM_FARMER_STEP_IDS = ['personal', 'identity', 'farm', 'household', 'support']

// ── AddFarmerSheet ────────────────────────────────────────────────────────────

function AddFarmerSheet({ open, onClose, onSave, programs }: {
  open: boolean; onClose: () => void
  onSave: (form: AddFarmerForm) => void
  programs: ProgramOption[]
}) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<StepperForm>(EMPTY_STEPPER)
  const [saving, setSaving] = useState(false)

  // Field list, order, labels and required-ness all come from Configuration > Forms.
  // The shared farmer-registration form also carries a Financial step, which this
  // portal does not collect — render only the five steps the PM wizard uses.
  const config = useFormConfig(FARMER_REGISTRATION_FORM_ID)
  const steps = config.steps.filter(s => PM_FARMER_STEP_IDS.includes(s.id))
  const values = form as unknown as Record<string, unknown>
  const dynamicOptions = useDynamicFieldOptions({ programs, selectedProgramId: form.programId })

  const TOTAL = steps.length
  const currentStep = steps[step - 1]

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) { setStep(1); setForm(EMPTY_STEPPER) }
  }, [open])

  function set(k: string, v: unknown) {
    setForm(prev => ({ ...prev, [k]: v }) as StepperForm)
  }

  function validateStep(): boolean {
    if (!currentStep) return true
    const missing = config.missingLabels(currentStep.id, values)
    if (missing.length > 0) {
      toast.error(`${missing[0]} is required`)
      return false
    }
    return true
  }

  async function handleNext() {
    if (!validateStep()) return
    if (step < TOTAL) { setStep(s => s + 1); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    setSaving(false)
    onSave({
      fullName:     `${form.firstName} ${form.lastName}`.trim(),
      phone:        form.phone,
      nationalId:   form.idNumber,
      dateOfBirth:  form.dob,
      gender:       form.gender,
      region:       '',
      district:     '',
      community:    form.community,
      primaryCrop:  form.primaryCrop,
      farmSize:     form.acres,
      gpsLocation:  form.gpsLocation,
      consentGiven: form.consentGiven,
    })
    onClose()
  }

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title={STEP_TITLES[step - 1] ?? currentStep?.name ?? 'Register Farmer'}
      subtitle={`Step ${step} of ${TOTAL}`}
      size="lg"
      bodyClassName="px-6 py-4"
      footer={
        <>
          <ButtonTemplate
            variant="outline" fullWidth
            label={step === 1 ? 'Cancel' : '← Back'}
            onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
          />
          <ButtonTemplate
            fullWidth
            label={step === TOTAL ? (saving ? 'Saving…' : 'Register Farmer') : 'Next →'}
            leftIcon={step === TOTAL ? <UserPlus className="w-4 h-4" /> : undefined}
            isDisabled={saving}
            onClick={handleNext}
          />
        </>
      }
    >
      <StepIndicator step={step} total={TOTAL} />
      {currentStep && (
        <DynamicFormRenderer
          form={config.form}
          stepId={currentStep.id}
          values={values}
          onChange={set}
          optionsOverride={dynamicOptions}
          labelVariant="compact"
          className="gap-3"
        />
      )}
    </SheetTemplate>
  )
}

// ── Edit farmer form types ─────────────────────────────────────────────────────

interface EditFarmerForm {
  fullName: string; phone: string; nationalId: string
  dateOfBirth: string; gender: string; region: string; district: string
  community: string; primaryCrop: string; farmSize: string
  programId: string; cohortId: string; agentName: string
}
const EMPTY_EDIT: EditFarmerForm = {
  fullName: '', phone: '', nationalId: '', dateOfBirth: '', gender: '',
  region: '', district: '', community: '', primaryCrop: '', farmSize: '',
  programId: '', cohortId: '', agentName: '',
}

const DISTRICT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  savannah:      [{ value: 'north_gonja', label: 'North Gonja' }, { value: 'central_gonja', label: 'Central Gonja' }, { value: 'east_gonja', label: 'East Gonja' }, { value: 'west_gonja', label: 'West Gonja' }, { value: 'sawla_tuna_kalba', label: 'Sawla-Tuna-Kalba' }, { value: 'bole', label: 'Bole' }],
  northern:      [{ value: 'tamale_metro', label: 'Tamale Metro' }, { value: 'sagnarigu', label: 'Sagnarigu' }, { value: 'kumbungu', label: 'Kumbungu' }, { value: 'nanton', label: 'Nanton' }],
  upper_east:    [{ value: 'bolgatanga_muni', label: 'Bolgatanga Muni' }, { value: 'bawku_muni', label: 'Bawku Muni' }, { value: 'kassena_nankana', label: 'Kassena-Nankana' }],
  upper_west:    [{ value: 'wa_muni', label: 'Wa Muni' }, { value: 'jirapa', label: 'Jirapa' }, { value: 'lawra', label: 'Lawra' }],
  north_east:    [{ value: 'nalerigu_gambaga', label: 'Nalerigu-Gambaga' }, { value: 'chereponi', label: 'Chereponi' }],
  ashanti:       [{ value: 'kumasi_metro', label: 'Kumasi Metro' }, { value: 'oforikrom', label: 'Oforikrom' }, { value: 'asokwa', label: 'Asokwa' }],
  eastern:       [{ value: 'koforidua', label: 'Koforidua' }, { value: 'kwahu_west', label: 'Kwahu West' }],
  western:       [{ value: 'sekondi_takoradi', label: 'Sekondi-Takoradi' }, { value: 'ahanta_west', label: 'Ahanta West' }],
  central:       [{ value: 'cape_coast_metro', label: 'Cape Coast Metro' }, { value: 'komenda_edina', label: 'Komenda-Edina-Eguafo' }],
  volta:         [{ value: 'ho_muni', label: 'Ho Muni' }, { value: 'hohoe', label: 'Hohoe' }],
  greater_accra: [{ value: 'accra_metro', label: 'Accra Metro' }, { value: 'tema_metro', label: 'Tema Metro' }],
  oti:           [{ value: 'dambai', label: 'Dambai' }, { value: 'nkwanta_south', label: 'Nkwanta South' }],
  bono:          [{ value: 'sunyani_muni', label: 'Sunyani Muni' }, { value: 'berekum_east', label: 'Berekum East' }],
  bono_east:     [{ value: 'techiman_muni', label: 'Techiman Muni' }, { value: 'kintampo_north', label: 'Kintampo North' }],
  ahafo:         [{ value: 'goaso', label: 'Goaso' }, { value: 'asunafo_north', label: 'Asunafo North' }],
  western_north: [{ value: 'sefwi_wiawso', label: 'Sefwi Wiawso' }, { value: 'bibiani_anhwiaso', label: 'Bibiani-Anhwiaso-Bekwai' }],
}

// ── Assign Agent sheet ─────────────────────────────────────────────────────────

function AssignAgentSheet({ open, onClose, farmer, farmerCount }: {
  open: boolean; onClose: () => void
  farmer: Farmer | null; farmerCount: number
}) {
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  // Field list, order, labels and required-ness all come from Configuration > Forms.
  const config = useFormConfig(FARMER_ASSIGN_AGENT_FORM_ID)
  const step = config.steps[0]
  const dynamicOptions = useDynamicFieldOptions({
    agents: MOCK_AGENTS.map(a => ({ value: a, label: a })),
  })
  const agent = String(values.agent ?? '')

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues({ agent: farmer?.enrollment?.agentName ?? '' })
  }, [open, farmer])

  const isSingle = !!farmer
  const title = isSingle ? 'Assign Agent to Farmer' : `Assign Agent — ${farmerCount} Farmers`

  function setValue(k: string, v: unknown) {
    setValues(prev => ({ ...prev, [k]: v }))
  }

  async function handleSave() {
    if (!agent) { toast.error('Select an agent'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    setSaving(false)
    toast.success(isSingle ? `Agent assigned to ${farmer!.fullName}` : `Agent assigned to ${farmerCount} farmers`)
    onClose()
  }

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title={title}
      bodyClassName="px-6 py-5 space-y-4"
      footer={<><ButtonTemplate variant="outline" label="Cancel" fullWidth onClick={onClose} /><ButtonTemplate label={saving ? 'Saving…' : 'Save'} fullWidth isDisabled={saving || !agent} onClick={handleSave} /></>}
    >
      {isSingle && farmer && (
        <div className="rounded-xl px-4 py-3 space-y-0.5" style={{ background: 'var(--brand-gray)', border: '1px solid var(--brand-pale)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--brand-forest)' }}>{farmer.fullName}</p>
          <p className="text-xs text-gray-400">{farmer.phone}</p>
          {farmer.enrollment?.cohortName && (
            <p className="text-xs text-gray-400">· {farmer.enrollment.cohortName}</p>
          )}
        </div>
      )}
      {!isSingle && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#f0faf4', color: 'var(--brand-forest)' }}>
          {farmerCount} farmers will be updated.
        </div>
      )}
      {step && (
        <DynamicFormRenderer
          form={config.form}
          stepId={step.id}
          values={values}
          onChange={setValue}
          optionsOverride={dynamicOptions}
          labelVariant="compact"
          placeholders={{ agent: 'Select agent…' }}
        />
      )}
    </SheetTemplate>
  )
}

// ── Enroll Farmers sheet ───────────────────────────────────────────────────────

function EnrollSheet({ open, onClose, farmerCount, programs }: {
  open: boolean; onClose: () => void; farmerCount: number; programs: ProgramOption[]
}) {
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  // Field list, order, labels and required-ness all come from Configuration > Forms.
  const config = useFormConfig(FARMER_ENROLL_FORM_ID)
  const step = config.steps[0]
  const programId = String(values.programId ?? '')
  const dynamicOptions = useDynamicFieldOptions({ programs, selectedProgramId: programId })

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (open) setValues({}) }, [open])

  function setValue(k: string, v: unknown) {
    // changing the program invalidates the cohort chosen under the previous one
    setValues(prev => (k === 'programId' ? { ...prev, programId: v, cohortId: '' } : { ...prev, [k]: v }))
  }

  async function handleEnroll() {
    if (!programId) { toast.error('Select a program'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    setSaving(false)
    toast.success(`${farmerCount} farmer${farmerCount !== 1 ? 's' : ''} enrolled`)
    onClose()
  }

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title={`Enroll ${farmerCount} Farmer${farmerCount !== 1 ? 's' : ''}`}
      bodyClassName="px-6 py-5 space-y-4"
      footer={<><ButtonTemplate variant="outline" label="Cancel" fullWidth onClick={onClose} /><ButtonTemplate label={saving ? 'Enrolling…' : `Enroll ${farmerCount}`} fullWidth isDisabled={saving || !programId} onClick={handleEnroll} /></>}
    >
      <div className="rounded-lg px-4 py-3 text-sm text-green-700 bg-green-50">
        Farmers already enrolled in the selected program will have their cohort updated.
      </div>
      {step && (
        <DynamicFormRenderer
          form={config.form}
          stepId={step.id}
          values={values}
          onChange={setValue}
          optionsOverride={dynamicOptions}
          labelVariant="compact"
          placeholders={{ programId: 'Select program', cohortId: 'No cohort' }}
        />
      )}
    </SheetTemplate>
  )
}

// ── Bulk Upload sheet ──────────────────────────────────────────────────────────

function BulkUploadSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [csvFile,    setCsvFile]   = useState<File | null>(null)
  const [rows,       setRows]      = useState<string[][]>([])
  const [, setFileName]  = useState('')
  const [importing,  setImporting] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (open) { setCsvFile(null); setRows([]); setFileName('') } }, [open])

  useEffect(() => {
    if (!csvFile) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFileName(csvFile.name)
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const lines = text.split('\n').filter(Boolean)
      setRows(lines.slice(1).map(l => l.split(',')))
    }
    reader.readAsText(csvFile)
  }, [csvFile])

  function downloadTemplate() {
    const csv = [CSV_FIELDS, 'Ama Mensah,0241234567,GHA-XXXXXXXXX-X,1985-03-15,female,savannah,North Gonja,Gurubagu,soybean,2.5'].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'farmers_template.csv'
    a.click()
  }

  async function handleImport() {
    if (!rows.length) return
    setImporting(true)
    await new Promise(r => setTimeout(r, 600))
    setImporting(false)
    toast.success(`${rows.length} farmer${rows.length !== 1 ? 's' : ''} imported`)
    onClose()
  }

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title="Bulk Upload Farmers"
      bodyClassName="px-6 py-5 space-y-4"
      footer={<><ButtonTemplate variant="outline" label="Close" fullWidth onClick={onClose} /><ButtonTemplate label={importing ? 'Importing…' : `Import ${rows.length} Farmer${rows.length !== 1 ? 's' : ''}`} fullWidth leftIcon={<Upload className="w-3.5 h-3.5" />} isDisabled={importing || rows.length === 0} onClick={handleImport} /></>}
    >
      {/* CSV format hint */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--brand-gray)', border: '1px solid var(--brand-pale)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--brand-forest)' }}>CSV Format</p>
        <p className="text-[11px] text-gray-500 font-mono leading-relaxed break-all">{CSV_FIELDS}</p>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
          style={{ color: 'var(--brand-forest)' }}
        >
          <Download className="w-3.5 h-3.5" /> Download Template
        </button>
      </div>

      {/* Drop zone */}
      <FileUploadTemplate
        accept=".csv"
        placeholder="Click to select a CSV file"
        value={csvFile}
        onChange={setCsvFile}
      />
      {rows.length > 0 && (
        <p className="text-xs font-semibold" style={{ color: 'var(--brand-dark)' }}>
          {rows.length} row{rows.length !== 1 ? 's' : ''} ready to import
        </p>
      )}
    </SheetTemplate>
  )
}

// ── Farmer sheet (view + edit combined) ───────────────────────────────────────

function FarmerSheet({
  mode, farmer, onClose, onModeChange, onSave, onUnenroll,
}: {
  mode: 'view' | 'edit' | null
  farmer: Farmer | null
  onClose: () => void
  onModeChange: (m: 'view' | 'edit') => void
  onSave: (f: EditFarmerForm) => void
  onUnenroll: () => void
}) {
  const CROP_OPTIONS = useCropOptions()
  const [form, setForm] = useState<EditFarmerForm>(EMPTY_EDIT)
  const [saving, setSaving] = useState(false)

  // Field list, order, labels and required-ness all come from Configuration > Forms.
  const config = useFormConfig(PM_FARMER_EDIT_FORM_ID)
  const editStep = config.steps[0]
  const values = form as unknown as Record<string, unknown>

  useEffect(() => {
    if (mode === 'edit' && farmer) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        fullName:    farmer.fullName    ?? '',
        phone:       farmer.phone       ?? '',
        nationalId:  farmer.nationalId  ?? '',
        dateOfBirth: farmer.dateOfBirth ?? '',
        gender:      farmer.gender      ?? '',
        region:      farmer.region      ?? '',
        district:    farmer.district    ?? '',
        community:   farmer.community   ?? '',
        primaryCrop: farmer.primaryCrop ?? '',
        farmSize:    farmer.farmSize    ?? '',
        programId:   farmer.enrollment?.programId ?? '',
        cohortId:    farmer.enrollment?.cohortId  ?? '',
        agentName:   farmer.enrollment?.agentName ?? '',
      })
    }
  }, [mode, farmer])

  const region = form.region

  // Region/district/crop lists are this screen's own, so they override the
  // generic runtime sources rather than coming from useDynamicFieldOptions.
  const editOptions = useMemo(() => ({
    region:      REGION_OPTIONS,
    district:    region ? (DISTRICT_OPTIONS[region] ?? []) : [],
    primaryCrop: CROP_OPTIONS,
  }), [region, CROP_OPTIONS])

  function setField<K extends keyof EditFarmerForm>(k: K, v: string) {
    setForm(prev => {
      const n = { ...prev, [k]: v }
      if (k === 'programId') n.cohortId = ''
      if (k === 'region') n.district = ''
      return n
    })
  }

  function setValue(k: string, v: unknown) {
    setField(k as keyof EditFarmerForm, String(v))
  }

  async function handleSave() {
    if (!form.fullName.trim()) { toast.error('Full name is required'); return }
    if (!form.phone.trim())    { toast.error('Phone is required'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    setSaving(false)
    onSave(form)
    onClose()
  }

  const open = mode !== null && farmer !== null
  const isEdit = mode === 'edit'
  const enr = farmer?.enrollment

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      onBack={isEdit ? () => onModeChange('view') : undefined}
      title={isEdit ? `Edit — ${farmer?.fullName ?? ''}` : (farmer?.fullName ?? '')}
      size="lg"
      bodyClassName={isEdit ? 'px-6 py-5 space-y-4' : 'px-6 py-5 space-y-5'}
      footer={isEdit ? (
        <>
          <ButtonTemplate variant="outline" label="Cancel" fullWidth onClick={onClose} />
          <ButtonTemplate label={saving ? 'Saving…' : 'Save Changes'} fullWidth isDisabled={saving} onClick={handleSave} />
        </>
      ) : undefined}
    >
      {!farmer ? null : isEdit ? (
        <>
          {farmer && (
            <div className="rounded-xl p-3 space-y-1.5 -mt-1" style={{ background: 'var(--brand-gray)', border: '1px solid var(--brand-pale)' }}>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="text-gray-400">📞</span> {farmer.phone}
                </span>
                {form.district && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    {DISTRICT_OPTIONS[form.region]?.find(d => d.value === form.district)?.label ?? form.district}
                  </span>
                )}
              </div>
              {form.primaryCrop && (
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>🌾</span> {CROP_OPTIONS.find(c => c.value === form.primaryCrop)?.label ?? form.primaryCrop}
                </span>
              )}
              {enr && (
                <p className="text-xs font-medium" style={{ color: 'var(--brand-dark)' }}>
                  Enrolled: {enr.programName}
                </p>
              )}
            </div>
          )}

          {editStep && (
            <DynamicFormRenderer
              columns={2}
              form={config.form}
              stepId={editStep.id}
              values={values}
              onChange={setValue}
              optionsOverride={editOptions}
              labelVariant="compact"
              placeholders={{ district: form.region ? 'Select district' : 'Select region first' }}
            />
          )}
        </>
      ) : (
        <>
          <div className="flex justify-end">
            <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit"
              leftIcon={<Pencil className="w-3.5 h-3.5" />}
              onClick={() => onModeChange('edit')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {([
              ['Phone',     farmer.phone],
              ['Status',    enr ? 'Enrolled' : 'Not enrolled'],
              ['Program',   enr?.programName ?? '—'],
              ['Cohort',    enr?.cohortName  ?? '—'],
              ['Agent',     enr?.agentName   ?? '—'],
              ['FRI Score', farmer.currentFri !== null ? `${farmer.currentFri}/100` : 'No score'],
              ['Zone',      farmer.currentZone?.replace('Resilience ', '') ?? '—'],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{k}</p>
                <p className="font-medium text-xs" style={{ color: 'var(--brand-forest)' }}>{v}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap border-t pt-4">
            {enr && (
              <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Unenroll"
                leftIcon={<UserMinus className="w-3.5 h-3.5" />}
                className="text-red-600! border-red-200 hover:bg-red-50"
                onClick={onUnenroll} />
            )}
          </div>
          {enr && (enr.currentStage ?? 0) > 0 && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4" style={{ color: 'var(--brand-mid)' }} />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Enrollment Workflow</p>
              </div>
              <div className="flex gap-px">
                {WORKFLOW_STAGES.map(s => (
                  <div key={s.stage} className={cn(
                    'h-1.5 rounded-sm flex-1',
                    s.stage < enr.currentStage  ? 'bg-emerald-400' :
                    s.stage === enr.currentStage ? 'bg-(--brand-dark)' : 'bg-gray-200'
                  )} />
                ))}
              </div>
              <p className="text-xs font-medium" style={{ color: 'var(--brand-forest)' }}>
                Stage {enr.currentStage}: {WORKFLOW_STAGES.find(s => s.stage === enr.currentStage)?.name}
              </p>
              <p className="text-[11px] text-gray-400">Stage {enr.currentStage} of {WORKFLOW_STAGES.length}</p>
            </div>
          )}
        </>
      )}
    </SheetTemplate>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#1A3D2B', '#2C5F3F', '#52b788', '#95d5b2', '#c8e6c9']

function getAge(dob: string): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  const today = new Date('2026-06-26')
  let age = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--
  return isNaN(age) ? null : age
}

function countBy<T>(items: T[], key: (item: T) => string): { name: string; value: number }[] {
  const map: Record<string, number> = {}
  items.forEach(i => { const k = key(i); map[k] = (map[k] ?? 0) + 1 })
  return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-2">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--brand-forest)' }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ChartCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-3">{label}</p>
      {children}
    </div>
  )
}

function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const filled = total > 0 ? data : [{ name: 'No data', value: 1 }]
  const colors = total > 0 ? CHART_COLORS : ['#e5e7eb']
  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie data={filled} cx="50%" cy="45%" innerRadius="45%" outerRadius="65%"
          dataKey="value" paddingAngle={2}>
          {filled.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Pie>
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        {total > 0 && <Tooltip formatter={(v) => [`${v ?? ''}`, '']} />}
      </PieChart>
    </ResponsiveContainer>
  )
}

function MiniBarChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barSize={20} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
        <Tooltip formatter={(v) => [`${v ?? ''}`, '']} />
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function FarmerStatsPanel({ farmers }: { farmers: Farmer[] }) {
  const total   = farmers.length
  const male    = farmers.filter(f => f.gender === 'male').length
  const female  = farmers.filter(f => f.gender === 'female').length

  const ages    = farmers.map(f => getAge(f.dateOfBirth))
  const youth   = ages.filter(a => a !== null && a >= 18 && a <= 35).length

  // Gender donut
  const genderData = [
    ...(male   > 0 ? [{ name: 'Male',   value: male   }] : []),
    ...(female > 0 ? [{ name: 'Female', value: female }] : []),
    ...(male === 0 && female === 0 ? [{ name: 'Unknown', value: total }] : []),
  ]

  // Age ranges bar
  const ageRangeData = (() => {
    const buckets: Record<string, number> = { 'Under 18': 0, 'Youth (18-35)': 0, 'Adults (36-50)': 0, 'Seniors (50+)': 0, 'Unknown': 0 }
    ages.forEach(a => {
      if (a === null) buckets['Unknown']++
      else if (a < 18)  buckets['Under 18']++
      else if (a <= 35) buckets['Youth (18-35)']++
      else if (a <= 50) buckets['Adults (36-50)']++
      else              buckets['Seniors (50+)']++
    })
    return Object.entries(buckets).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
  })()

  // Marital status — no field, show unknown
  const maritalData = [{ name: 'Unknown', value: total }]

  // Acreage distribution bar
  const acreageData = countBy(farmers, f => {
    const n = parseFloat(f.farmSize)
    if (isNaN(n)) return 'Unknown'
    if (n < 1) return '<1 ha'; if (n <= 2) return '1–2 ha'; if (n <= 5) return '2–5 ha'; return '5+ ha'
  })

  // Major crops bar
  const cropData = countBy(farmers, f => f.primaryCrop
    ? f.primaryCrop.charAt(0).toUpperCase() + f.primaryCrop.slice(1)
    : 'Unknown')

  // Community distribution bar
  const commData = countBy(farmers, f => f.community || 'Unknown')

  // Group / cooperative donut (enrolled = in a group proxy)
  const inGroup = farmers.filter(f => f.enrollment !== null).length
  const groupData = [
    ...(inGroup > 0        ? [{ name: 'In a Group', value: inGroup }] : []),
    ...(total - inGroup > 0 ? [{ name: 'No Group',   value: total - inGroup }] : []),
  ]

  // Other agric companies — no field, all No
  const otherAgricData = [{ name: 'No', value: total }]

  // Desired assets — no field
  const desiredAssetsData = [{ name: 'Unknown', value: total }]

  // Input credit participation — no field
  const inputCreditData = [{ name: 'Unknown', value: total }]

  // Active org engagement — no field
  const orgEngagementData = [{ name: 'Not Engaged', value: total }]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total Farmers" value={total} />
        <StatCard label="Male"          value={male}   sub={total > 0 ? `${Math.round(male/total*100)}% of total` : '0% of total'} />
        <StatCard label="Female"        value={female} sub={total > 0 ? `${Math.round(female/total*100)}% of total` : '0% of total'} />
        <StatCard label="Youth (18-35)" value={youth}  sub={total > 0 ? `${Math.round(youth/total*100)}% of total` : '0% of total'} />
        <StatCard label="Other Agric Co." value={0}    sub="0% engaged" />
      </div>

      {/* Row 1: 4 charts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ChartCard label="Gender Distribution">    <DonutChart  data={genderData}    /></ChartCard>
        <ChartCard label="Age Ranges">             <MiniBarChart data={ageRangeData} /></ChartCard>
        <ChartCard label="Marital Status">         <DonutChart  data={maritalData}   /></ChartCard>
        <ChartCard label="Acreage Distribution">   <MiniBarChart data={acreageData}  /></ChartCard>
      </div>

      {/* Row 2: 3 charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartCard label="Major Crops Cultivated">  <MiniBarChart data={cropData}  /></ChartCard>
        <ChartCard label="Community Distribution">  <MiniBarChart data={commData}  /></ChartCard>
        <ChartCard label="Group / Cooperative">     <DonutChart  data={groupData}  /></ChartCard>
      </div>

      {/* Row 3: 4 charts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ChartCard label="Other Agric Companies">     <DonutChart   data={otherAgricData}    /></ChartCard>
        <ChartCard label="Desired Assets">            <MiniBarChart data={desiredAssetsData} /></ChartCard>
        <ChartCard label="Input Credit Participation"><DonutChart   data={inputCreditData}   /></ChartCard>
        <ChartCard label="Active Org Engagement">     <DonutChart   data={orgEngagementData} /></ChartCard>
      </div>
    </div>
  )
}

// ── Main widget ────────────────────────────────────────────────────────────────

export function Main() {
  const [farmers,  setFarmers]  = usePersistedState<Farmer[]>('pm-farmers', [])
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [loading,  setLoading]  = useState(true)

  // Filters
  const [search,         setSearch]         = usePersistedState('pm-fr-search', '')
  const [filterProgram,  setFilterProgram]  = usePersistedState('pm-fr-program', '')
  const [filterCohort,   setFilterCohort]   = usePersistedState('pm-fr-cohort', '')
  const [filterEnrolled, setFilterEnrolled] = usePersistedState('pm-fr-enrolled', '')
  const [filterZone,     setFilterZone]     = usePersistedState('pm-fr-zone', '')
  const [filterAgent,    setFilterAgent]    = usePersistedState('pm-fr-agent', '')
  const [filterFriMin,   setFilterFriMin]   = usePersistedState('pm-fr-fri-min', '')
  const [filterFriMax,   setFilterFriMax]   = usePersistedState('pm-fr-fri-max', '')

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Sheets
  const [addOpen,          setAddOpen]          = useState(false)
  const [farmerMode, setFarmerMode] = useState<'view' | 'edit' | null>(null)
  const [assignAgentOpen,  setAssignAgentOpen]  = useState(false)
  const [enrollOpen,       setEnrollOpen]       = useState(false)
  const [bulkUploadOpen,   setBulkUploadOpen]   = useState(false)
  const [focusFarmer,      setFocusFarmer]      = useState<Farmer | null>(null)
  const [statsOpen,        setStatsOpen]        = useState(false)
  const [filtersOpen,      setFiltersOpen]      = useState(false)
  const [unenrollTarget,   setUnenrollTarget]   = useState<Farmer | null>(null)

  useEffect(() => {
    Promise.all([getFarmers(), getProgramOptions()]).then(([f, p]) => {
      // don't clobber farmers already restored from sessionStorage (edits/adds from this session)
      setFarmers(prev => prev.length > 0 ? prev : scopeFarmersToPm(f))
      setPrograms(scopeProgramsToPm(p)); setLoading(false)
    })
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!filterProgram) setFilterCohort('') }, [filterProgram])

  const filteredCohorts = programs.find(p => p.id === filterProgram)?.cohorts ?? []

  const displayed = useMemo(() => farmers.filter(f => {
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!f.fullName.toLowerCase().includes(q) && !f.phone.includes(q)) return false
    }
    if (filterProgram  && f.enrollment?.programId !== filterProgram)   return false
    if (filterCohort   && f.enrollment?.cohortId  !== filterCohort)    return false
    if (filterEnrolled === 'enrolled'   && !f.enrollment)  return false
    if (filterEnrolled === 'unenrolled' && !!f.enrollment) return false
    if (filterZone  && f.currentZone           !== filterZone)  return false
    if (filterAgent && f.enrollment?.agentName !== filterAgent) return false
    const mn = parseFloat(filterFriMin), mx = parseFloat(filterFriMax)
    if (!isNaN(mn) && (f.currentFri === null || f.currentFri < mn)) return false
    if (!isNaN(mx) && (f.currentFri === null || f.currentFri > mx)) return false
    return true
  }), [farmers, search, filterProgram, filterCohort, filterEnrolled, filterZone, filterAgent, filterFriMin, filterFriMax])

  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = usePersistedState('pm-fr-page-size', 25)

  // reset to page 1 whenever filters change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1) }, [displayed])

  const paginated  = pageSize === 0 ? displayed : displayed.slice((page - 1) * pageSize, page * pageSize)

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id) } else { n.add(id) } return n })
  const selectAll = () => setSelected(new Set(displayed.map(f => f.id)))
  const clearAll  = () => setSelected(new Set())

  const activeFilterCount = [filterProgram, filterCohort, filterEnrolled, filterZone, filterAgent, filterFriMin, filterFriMax].filter(Boolean).length

  function clearFilters() {
    setFilterProgram(''); setFilterCohort(''); setFilterEnrolled('')
    setFilterZone(''); setFilterAgent(''); setFilterFriMin(''); setFilterFriMax('')
  }

  function handleAddSave(form: AddFarmerForm) {
    setFarmers(prev => [...prev, {
      id: `f-${Date.now()}`,
      fullName: form.fullName, phone: form.phone,
      nationalId: form.nationalId, dateOfBirth: form.dateOfBirth,
      gender: form.gender, region: form.region, district: form.district,
      community: form.community, primaryCrop: form.primaryCrop, farmSize: form.farmSize,
      enrollment: null, currentFri: null, currentZone: null, duplicateFlag: false,
    }])
    toast.success(`${form.fullName} added`)
  }

  function handleEditSave(form: EditFarmerForm) {
    if (!focusFarmer) return
    const prog = programs.find(p => p.id === form.programId)
    const coh  = prog?.cohorts.find(c => c.id === form.cohortId)
    setFarmers(prev => prev.map(f => f.id !== focusFarmer.id ? f : {
      ...f,
      fullName: form.fullName, phone: form.phone,
      nationalId: form.nationalId, dateOfBirth: form.dateOfBirth,
      gender: form.gender, region: form.region, district: form.district,
      community: form.community, primaryCrop: form.primaryCrop, farmSize: form.farmSize,
      enrollment: form.programId ? {
        programId: form.programId, programName: prog!.name,
        cohortId: form.cohortId || null, cohortName: coh?.name ?? null,
        agentName: form.agentName || null,
        status: focusFarmer.enrollment?.status ?? 'active',
        currentStage: focusFarmer.enrollment?.currentStage ?? 1,
      } : focusFarmer.enrollment,
    }))
    toast.success(`${form.fullName} updated`)
  }

  function unenrollFarmer(f: Farmer) {
    setFarmers(prev => prev.map(x => x.id === f.id ? { ...x, enrollment: null } : x))
    toast.success(`${f.fullName} unenrolled`)
    setFocusFarmer(null)
  }


  return (
    <div className="p-6 space-y-5" style={{ background: 'var(--brand-gray)', minHeight: '100vh' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>Farmer Management</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--brand-slate)' }}>
            {loading ? '…' : `${farmers.length} farmers`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ButtonTemplate
            variant="secondary" size="sm"
            label="Overview"
            leftIcon={<BarChart2 className="w-3.5 h-3.5" />}
            rightIcon={<ChevronUp className={cn('w-3.5 h-3.5 transition-transform', !statsOpen && 'rotate-180')} />}
            onClick={() => setStatsOpen(v => !v)}
          />
          <ButtonTemplate label="Add Farmer" size="sm" leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setAddOpen(true)} />
        </div>
      </div>

      {/* ── Statistics ──────────────────────────────────────────────────────── */}
      {statsOpen && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--brand-forest)' }}>Farmer Statistics</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--brand-green)' }}>
                Based on {farmers.length} farmer{farmers.length !== 1 ? 's' : ''} currently loaded
              </p>
            </div>
            <button onClick={() => setStatsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">
            <FarmerStatsPanel farmers={farmers} />
          </div>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full border border-gray-200 rounded-lg pl-10 pr-9 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) transition-colors"
              placeholder="Search by name, phone or national ID..."
              value={search} onChange={e => setSearch(e.target.value)}
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
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 pt-1 border-t border-gray-100">
              <FilterSelect label="Program" value={filterProgram} onChange={setFilterProgram}
                options={[{ value: '', label: 'All programs' }, ...programs.map(p => ({ value: p.id, label: p.name }))]} />
              <FilterSelect label="Cohort" value={filterCohort} onChange={setFilterCohort} disabled={!filterProgram}
                options={[{ value: '', label: 'All cohorts' }, ...filteredCohorts.map(c => ({ value: c.id, label: c.name }))]} />
              <FilterSelect label="Enrollment" value={filterEnrolled} onChange={setFilterEnrolled}
                options={[{ value: '', label: 'All' }, { value: 'enrolled', label: 'Enrolled' }, { value: 'unenrolled', label: 'Not enrolled' }]} />
              <FilterSelect label="Zone" value={filterZone} onChange={setFilterZone}
                options={[{ value: '', label: 'All zones' }, ...ZONE_OPTIONS.map(z => ({ value: z, label: z.replace('Resilience ', '') }))]} />
              <FilterSelect label="Agent" value={filterAgent} onChange={setFilterAgent}
                options={[{ value: '', label: 'All agents' }, ...MOCK_AGENTS.map(a => ({ value: a, label: a }))]} />
              <div className="col-span-2 sm:col-span-1 lg:col-span-2 space-y-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">FRI Score</p>
                <div className="flex items-center gap-1.5">
                  <input type="number" min="0" max="100" placeholder="Min" value={filterFriMin}
                    onChange={e => setFilterFriMin(e.target.value)}
                    className="w-full h-8 border border-gray-200 rounded-lg px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark)" />
                  <span className="text-gray-400 text-xs shrink-0">—</span>
                  <input type="number" min="0" max="100" placeholder="Max" value={filterFriMax}
                    onChange={e => setFilterFriMax(e.target.value)}
                    className="w-full h-8 border border-gray-200 rounded-lg px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark)" />
                </div>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-50">
                {filterProgram && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--brand-pale)', color: 'var(--brand-dark)' }}>
                    {programs.find(p => p.id === filterProgram)?.name}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterProgram('')} />
                  </span>
                )}
                {filterZone && (
                  <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                    {filterZone.replace('Resilience ', '')}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterZone('')} />
                  </span>
                )}
                {filterAgent && (
                  <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                    {filterAgent}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterAgent('')} />
                  </span>
                )}
                <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 ml-auto">
                  <X className="w-3 h-3" /> Clear all
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Select-all bar ───────────────────────────────────────────────────── */}
      {!loading && displayed.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => selected.size === displayed.length ? clearAll() : selectAll()}
                className="flex items-center gap-2 text-sm font-medium hover:opacity-80"
                style={{ color: 'var(--brand-dark)' }}
              >
                <div className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                  selected.size === displayed.length
                    ? 'border-(--brand-dark) bg-(--brand-dark)'
                    : 'border-gray-300 bg-white'
                )}>
                  {selected.size === displayed.length && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                Select all
              </button>
              <p className="text-[10px] text-gray-400 pl-6">click toggle to enroll</p>
            </div>
            {selected.size > 0 && (
              <>
                <span className="text-xs" style={{ color: 'var(--brand-slate)' }}>
                  {selected.size} of {displayed.length} selected
                </span>
                <ButtonTemplate variant="outline" size="sm" label="Clear" onClick={clearAll} />
                <ButtonTemplate
                  variant="outline" size="sm" label="Assign Agent"
                  leftIcon={<UserCog className="w-3.5 h-3.5" />}
                  onClick={() => setAssignAgentOpen(true)}
                />
                <ButtonTemplate
                  size="sm" label={`Enroll ${selected.size}`}
                  leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                  onClick={() => setEnrollOpen(true)}
                />
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ButtonTemplate variant="outline" size="sm" label="Export"
              leftIcon={<Download className="w-3.5 h-3.5" />} />
            <ButtonTemplate variant="outline" size="sm" label="Bulk Upload"
              leftIcon={<Upload className="w-3.5 h-3.5" />}
              onClick={() => setBulkUploadOpen(true)} />
            <ButtonTemplate variant="outline" size="sm" label="Refresh"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => { setLoading(true); getFarmers().then(f => { setFarmers(scopeFarmersToPm(f)); setLoading(false) }) }} />
          </div>
        </div>
      )}

      {/* ── Farmer list ──────────────────────────────────────────────────────── */}
      {!loading && displayed.length > 0 && (
        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={displayed.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          className="px-1"
        />
      )}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-20 rounded-xl bg-gray-200 animate-pulse" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--brand-slate)' }} />
          <p className="font-medium" style={{ color: 'var(--brand-forest)' }}>No farmers found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--brand-slate)' }}>Adjust your filters or add a new farmer.</p>
          <div className="mt-4 flex justify-center">
            <ButtonTemplate label="Add Farmer" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)} />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          {/* Column header */}
          <div className="flex items-center px-4 py-2.5 border-b border-gray-100 bg-gray-50/80 min-w-max">
            <div className="w-20 shrink-0" />
            <p className="w-50 shrink-0 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Farmer Details</p>
            <p className="flex-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5">Program Information</p>
            <p className="w-40 shrink-0 text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5">Enrolment Workflow</p>
            <p className="w-40 shrink-0 text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5">FRI Score</p>
            <p className="w-28 shrink-0 text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4">Actions</p>
          </div>

          <div className="divide-y divide-gray-100 min-w-max">
            {paginated.map(f => {
              const isSelected = selected.has(f.id)
              const enr = f.enrollment
              const stageDef = WORKFLOW_STAGES.find(s => s.stage === (enr?.currentStage ?? 0))

              return (
                <div key={f.id} className={cn(
                  'flex items-stretch transition-colors',
                  isSelected ? 'bg-green-50' : 'hover:bg-gray-50/60'
                )}>
                  {/* Checkbox + Avatar */}
                  <div className="flex items-center gap-3 py-4 pl-4 pr-2 w-20 shrink-0">
                    <div
                      className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors shrink-0',
                        isSelected ? 'bg-(--brand-dark) border-(--brand-dark)' : 'border-gray-200 hover:border-(--brand-mid)'
                      )}
                      onClick={() => toggleSelect(f.id)}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <PersonAvatar name={f.fullName} size={32} />
                  </div>

                  {/* Farmer Details */}
                  <div className="flex flex-col justify-center py-4 pr-5 w-50 shrink-0 cursor-pointer border-r border-gray-100"
                    onClick={() => { setFocusFarmer(f); setFarmerMode('view') }}>
                    <p className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--brand-forest)' }}>
                      {f.fullName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-gray-400 font-mono">{f.phone}</span>
                      <span className="text-gray-200">·</span>
                      {enr ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none bg-emerald-100 text-emerald-700">Active</span>
                      ) : (
                        <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full leading-none">Not enrolled</span>
                      )}
                    </div>
                  </div>

                  {/* Program Information */}
                  <div className="flex flex-col justify-center py-4 px-5 flex-1 min-w-0 cursor-pointer border-r border-gray-100"
                    onClick={() => { setFocusFarmer(f); setFarmerMode('view') }}>
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

                  {/* Enrolment Workflow */}
                  <div className="flex flex-col justify-center py-4 px-5 shrink-0 w-40 cursor-pointer border-r border-gray-100"
                    onClick={() => { setFocusFarmer(f); setFarmerMode('view') }}>
                    {enr && (enr.currentStage ?? 0) > 0 ? (
                      <>
                        <div className="flex gap-px mb-1.5">
                          {WORKFLOW_STAGES.map(s => (
                            <div key={s.stage} className={cn(
                              'h-1 rounded-sm flex-1',
                              s.stage < (enr.currentStage ?? 0)   ? 'bg-emerald-400' :
                              s.stage === (enr.currentStage ?? 0) ? 'bg-(--brand-dark)' : 'bg-gray-200'
                            )} />
                          ))}
                        </div>
                        <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: 'var(--brand-forest)' }}>
                          <GitBranch className="w-2.5 h-2.5 shrink-0 text-gray-400" />
                          {stageDef?.name ?? `Stage ${enr.currentStage}`}
                        </span>
                        <span className="text-[10px] text-gray-400 mt-0.5">Stage {enr.currentStage} of {WORKFLOW_STAGES.length}</span>
                      </>
                    ) : (
                      <span className="text-[11px] text-gray-300">—</span>
                    )}
                  </div>

                  {/* FRI Score */}
                  <div className="flex flex-col justify-center py-4 px-5 shrink-0 w-40 cursor-pointer border-r border-gray-100"
                    onClick={() => { setFocusFarmer(f); setFarmerMode('view') }}>
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

                  {/* Actions */}
                  <div className="flex items-center py-4 px-3 shrink-0 gap-1.5">
                    <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Enrol"
                      leftIcon={<UserPlus className="w-3 h-3" />}
                      onClick={() => { setFocusFarmer(f); setEnrollOpen(true) }} />
                    <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Assign Agent"
                      leftIcon={<UserCog className="w-3 h-3" />}
                      isDisabled={!enr}
                      onClick={enr ? () => { setFocusFarmer(f); setAssignAgentOpen(true) } : undefined} />
                    <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Remove"
                      leftIcon={<UserMinus className="w-3 h-3" />}
                      isDisabled={!enr}
                      onClick={enr ? () => setUnenrollTarget(f) : undefined} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── All sheets ───────────────────────────────────────────────────────── */}
      <AddFarmerSheet open={addOpen} onClose={() => setAddOpen(false)} onSave={handleAddSave} programs={programs} />
      <FarmerSheet
        mode={farmerMode}
        farmer={focusFarmer}
        onClose={() => { setFarmerMode(null); setFocusFarmer(null) }}
        onModeChange={setFarmerMode}
        onSave={handleEditSave}
        onUnenroll={() => { setUnenrollTarget(focusFarmer); setFarmerMode(null); setFocusFarmer(null) }}
      />
      <AssignAgentSheet open={assignAgentOpen} onClose={() => setAssignAgentOpen(false)}
        farmer={focusFarmer} farmerCount={selected.size} />
      <EnrollSheet open={enrollOpen} onClose={() => setEnrollOpen(false)}
        farmerCount={selected.size} programs={programs} />
      <BulkUploadSheet open={bulkUploadOpen} onClose={() => setBulkUploadOpen(false)} />
      <ConfirmModal
        open={!!unenrollTarget}
        title="Remove from programme?"
        message={`${unenrollTarget?.fullName ?? 'This farmer'} will be unenrolled. This cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => { if (unenrollTarget) unenrollFarmer(unenrollTarget); setUnenrollTarget(null) }}
        onCancel={() => setUnenrollTarget(null)}
      />
    </div>
  )
}
