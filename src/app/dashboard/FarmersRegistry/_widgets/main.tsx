'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Search, X, Download, Upload, RefreshCw, Plus, Edit2,
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
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { FileUploadTemplate } from '@/customComponents/FileUploadTemplate'

import { getFarmers, getProgramOptions } from '../_logics/functions'
import type { Farmer, FriZone, ProgramOption } from '../_logics/interface'

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

const CROP_OPTIONS = [
  { value: 'maize',     label: 'Maize'     },
  { value: 'soybean',   label: 'Soybean'   },
  { value: 'cassava',   label: 'Cassava'   },
  { value: 'rice',      label: 'Rice'      },
  { value: 'groundnut', label: 'Groundnut' },
  { value: 'yam',       label: 'Yam'       },
  { value: 'sorghum',   label: 'Sorghum'   },
  { value: 'millet',    label: 'Millet'    },
]

const GENDER_OPTIONS = [
  { value: 'male',             label: 'Male'             },
  { value: 'female',           label: 'Female'           },
  { value: 'prefer_not_to_say',label: 'Prefer not to say'},
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

const EMPTY_ADD: AddFarmerForm = {
  fullName: '', phone: '', nationalId: '', dateOfBirth: '', gender: '',
  region: '', district: '', community: '', primaryCrop: '', farmSize: '2.5',
  gpsLocation: '', consentGiven: false,
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

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[11px] font-bold tracking-widest uppercase pt-1" style={{ color: 'var(--brand-forest)' }}>
      {label}
    </p>
  )
}

function YesNo({ value, onChange }: { value: '' | 'yes' | 'no'; onChange: (v: 'yes' | 'no') => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(['yes', 'no'] as const).map(v => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            'h-10 rounded-lg border text-sm font-medium transition-colors capitalize',
            value === v
              ? 'border-(--brand-forest) text-(--brand-forest) bg-green-50'
              : 'border-gray-200 text-gray-500 hover:border-gray-300',
          )}
        >
          {v === 'yes' ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  )
}

function ChipSelect({ options, value, onChange }: {
  options: string[]; value: string[]; onChange: (v: string[]) => void
}) {
  function toggle(opt: string) {
    onChange(value.includes(opt) ? value.filter(x => x !== opt) : [...value, opt])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const on = value.includes(opt)
        return (
          <button
            key={opt} type="button" onClick={() => toggle(opt)}
            className={cn(
              'px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
              on ? 'border-(--brand-forest) text-(--brand-forest) bg-green-50'
                 : 'border-gray-200 text-gray-600 hover:border-gray-300',
            )}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function PhotoArea({ label, wide }: { label: string; wide?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-1', wide && 'col-span-2')}>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <div className="flex items-center justify-center gap-2 h-20 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-xs cursor-pointer hover:border-gray-300 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Take photo or upload
      </div>
    </div>
  )
}

// ── Step pages ─────────────────────────────────────────────────────────────────

function Step1({ f, set, programs }: {
  f: StepperForm
  set: (k: keyof StepperForm, v: StepperForm[keyof StepperForm]) => void
  programs: ProgramOption[]
}) {
  const cohorts = programs.find(p => p.id === f.programId)?.cohorts ?? []
  return (
    <div className="space-y-3">
      <SectionHeader label="Name & Contact" />
      <div className="grid grid-cols-2 gap-3">
        <InputTemplate label="FIRST NAME" isRequired placeholder="Ama"
          value={f.firstName} onChange={e => set('firstName', e.target.value)} />
        <InputTemplate label="LAST NAME" isRequired placeholder="Mensah"
          value={f.lastName} onChange={e => set('lastName', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectTemplate label="GENDER"
          options={[{ value: '', label: 'Select' }, ...GENDER_OPTIONS]}
          value={f.gender} onChange={e => set('gender', e.target.value)} />
        <InputTemplate label="DATE OF BIRTH" type="date"
          value={f.dob} onChange={e => set('dob', e.target.value)} />
      </div>
      <InputTemplate label="PHONE NUMBER" isRequired placeholder="0241 234 567"
        value={f.phone} onChange={e => set('phone', e.target.value)} />

      <SectionHeader label="Community & Program" />
      <SelectTemplate label="COMMUNITY"
        options={[{ value: '', label: 'Select community' }]}
        value={f.community} onChange={e => set('community', e.target.value)} />
      <SelectTemplate label="GROUP / COOPERATIVE"
        options={[{ value: '', label: 'Select group' }]}
        value={f.group} onChange={e => set('group', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <SelectTemplate label="PROGRAM (OPTIONAL)"
          options={[{ value: '', label: 'None' }, ...programs.map(p => ({ value: p.id, label: p.name }))]}
          value={f.programId} onChange={e => set('programId', e.target.value)} />
        <SelectTemplate label="COHORT (OPTIONAL)"
          options={[{ value: '', label: 'None' }, ...cohorts.map(c => ({ value: c.id, label: c.name }))]}
          value={f.cohortId} onChange={e => set('cohortId', e.target.value)} />
      </div>
    </div>
  )
}

function Step2({ f, set }: { f: StepperForm; set: (k: keyof StepperForm, v: StepperForm[keyof StepperForm]) => void }) {
  return (
    <div className="space-y-3">
      <SectionHeader label="ID Document" />
      <SelectTemplate label="ID TYPE" isRequired
        options={[
          { value: '', label: 'Select ID type' },
          { value: 'ghana_card', label: 'Ghana Card' },
          { value: 'passport', label: 'Passport' },
          { value: 'voter_id', label: "Voter's ID" },
          { value: 'nhis', label: 'NHIS Card' },
          { value: 'drivers', label: "Driver's Licence" },
        ]}
        value={f.idType} onChange={e => set('idType', e.target.value)} />
      <InputTemplate label="ID NUMBER" isRequired placeholder="GHA-XXXXXXXXX-X"
        value={f.idNumber} onChange={e => set('idNumber', e.target.value)} />

      <SectionHeader label="Photos" />
      <div className="space-y-3">
        <PhotoArea label="Passport / Profile Photo" wide />
        <div className="grid grid-cols-2 gap-3">
          <PhotoArea label="ID Front" />
          <PhotoArea label="ID Back" />
        </div>
      </div>

      <SectionHeader label="Voice Consent" />
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Voice Consent Recording</p>
        <button type="button" className="flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-300 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Record
        </button>
      </div>
    </div>
  )
}

function Step3({ f, set }: { f: StepperForm; set: (k: keyof StepperForm, v: StepperForm[keyof StepperForm]) => void }) {
  return (
    <div className="space-y-3">
      <SectionHeader label="Farm Experience" />
      <div className="grid grid-cols-2 gap-3">
        <InputTemplate label="YEARS OF EXPERIENCE" type="number" placeholder="e.g. 5"
          value={f.yearsExp} onChange={e => set('yearsExp', e.target.value)} />
        <InputTemplate label="ACRES CULTIVATED" type="number" placeholder="e.g. 3.5"
          value={f.acres} onChange={e => set('acres', e.target.value)} />
      </div>

      <SectionHeader label="Crops" />
      <SelectTemplate label="PRIMARY CROP" isRequired
        options={[{ value: '', label: 'Select crop' }, ...CROP_OPTIONS]}
        value={f.primaryCrop} onChange={e => set('primaryCrop', e.target.value)} />
      <InputTemplate label="BAGS (100KG) — PRIMARY CROP, PREV SEASON" type="number" placeholder="e.g. 20"
        value={f.bagsPrevSeason} onChange={e => set('bagsPrevSeason', e.target.value)} />
      <SelectTemplate label="SECONDARY CROP"
        options={[{ value: '', label: 'None' }, ...CROP_OPTIONS]}
        value={f.secondaryCrop} onChange={e => set('secondaryCrop', e.target.value)} />

      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">OWNS A TRACTOR?</p>
        <YesNo value={f.ownsTractor} onChange={v => set('ownsTractor', v)} />
      </div>
    </div>
  )
}

function Step4({ f, set }: { f: StepperForm; set: (k: keyof StepperForm, v: StepperForm[keyof StepperForm]) => void }) {
  const MARITAL = [
    { value: '', label: 'Select' },
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed', label: 'Widowed' },
  ]
  const PREFS = ['School', 'Roads', 'Water', 'Hospital', 'Police station', 'Banks']
  return (
    <div className="space-y-3">
      <SectionHeader label="Household" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">OWNS A HOUSE?</p>
          <YesNo value={f.ownsHouse} onChange={v => set('ownsHouse', v)} />
        </div>
        <SelectTemplate label="MARITAL STATUS"
          options={MARITAL} value={f.maritalStatus}
          onChange={e => set('maritalStatus', e.target.value)} />
      </div>
      <InputTemplate label="NUMBER OF CHILDREN" type="number" placeholder="0"
        value={f.numChildren} onChange={e => set('numChildren', e.target.value)} />

      <SectionHeader label="Other Business" />
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">ANY OTHER BUSINESS?</p>
        <YesNo value={f.otherBusiness} onChange={v => set('otherBusiness', v)} />
      </div>

      <SectionHeader label="Community Background" />
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">NATIVE OF THIS COMMUNITY?</p>
        <YesNo value={f.nativeCommunity} onChange={v => set('nativeCommunity', v)} />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">COMMUNITY PREFERENCES (SELECT ALL THAT APPLY)</p>
        <ChipSelect options={PREFS} value={f.communityPrefs}
          onChange={v => set('communityPrefs', v)} />
      </div>
    </div>
  )
}

function GpsField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [capturing, setCapturing] = useState(false)
  const [manual,    setManual]    = useState(false)
  const [lat,       setLat]       = useState('')
  const [lng,       setLng]       = useState('')
  const [error,     setError]     = useState('')

  function capture() {
    if (!navigator.geolocation) { setError('Geolocation not supported by this browser'); return }
    setCapturing(true); setError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const la = pos.coords.latitude.toFixed(6)
        const lo = pos.coords.longitude.toFixed(6)
        setLat(la); setLng(lo)
        onChange(`${la}, ${lo}`)
        setCapturing(false)
      },
      err => {
        setError(err.code === 1 ? 'Location permission denied' : 'Unable to retrieve location')
        setCapturing(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function applyManual() {
    const la = parseFloat(lat); const lo = parseFloat(lng)
    if (isNaN(la) || la < -90  || la > 90)  { setError('Latitude must be between -90 and 90');  return }
    if (isNaN(lo) || lo < -180 || lo > 180) { setError('Longitude must be between -180 and 180'); return }
    setError('')
    onChange(`${la.toFixed(6)}, ${lo.toFixed(6)}`)
  }

  const captured = value && !manual

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">GPS LOCATION</p>
        <button
          type="button"
          onClick={() => { setManual(v => !v); setError('') }}
          className="text-[10px] font-medium transition-colors"
          style={{ color: 'var(--brand-green)' }}
        >
          {manual ? 'Use auto-capture' : 'Enter manually'}
        </button>
      </div>

      {!manual ? (
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex-1 flex items-center gap-2 border rounded-xl px-3 h-10 transition-colors',
            captured ? 'border-green-300 bg-green-50' : 'border-gray-200',
          )}>
            <input
              readOnly
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
              style={{ color: captured ? 'var(--brand-forest)' : '#9ca3af' }}
              placeholder="Tap to capture location"
              value={value}
            />
            {captured && <Check className="w-3.5 h-3.5 shrink-0 text-green-500" />}
          </div>
          <button
            type="button"
            onClick={capture}
            disabled={capturing}
            className="shrink-0 w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:border-gray-300 transition-colors disabled:opacity-50"
            style={{ color: 'var(--brand-mid)' }}
            title="Capture GPS"
          >
            {capturing
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <MapPin className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">LATITUDE</p>
              <input
                type="number" step="any" placeholder="e.g. 9.408293"
                value={lat} onChange={e => setLat(e.target.value)}
                className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark)"
              />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">LONGITUDE</p>
              <input
                type="number" step="any" placeholder="e.g. -0.851492"
                value={lng} onChange={e => setLng(e.target.value)}
                className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark)"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={applyManual}
            className="w-full h-9 rounded-xl border text-sm font-medium transition-colors"
            style={{ borderColor: 'var(--brand-green)', color: 'var(--brand-green)' }}
          >
            Apply Coordinates
          </button>
          {value && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check className="w-3 h-3" /> Saved: {value}
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 flex items-center gap-1"><X className="w-3 h-3" />{error}</p>}
    </div>
  )
}

function Step5({ f, set }: { f: StepperForm; set: (k: keyof StepperForm, v: StepperForm[keyof StepperForm]) => void }) {
  const ASSETS = ['Tractor', 'Irrigation system', 'Storage facility', 'Processing equipment', 'Solar pump', 'Drone sprayer', 'Motorbike', 'Other']
  return (
    <div className="space-y-3">
      <SectionHeader label="Other Agric Engagements" />
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">ENGAGED WITH OTHER AGRIC COMPANIES?</p>
        <YesNo value={f.engagedAgric} onChange={v => set('engagedAgric', v)} />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">DESIRED ASSETS (SELECT ALL THAT APPLY)</p>
        <ChipSelect options={ASSETS} value={f.desiredAssets} onChange={v => set('desiredAssets', v)} />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">WILLING TO PARTICIPATE IN INPUT CREDIT?</p>
        <YesNo value={f.inputCredit} onChange={v => set('inputCredit', v)} />
      </div>

      <SectionHeader label="Organisation Engagement" />
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">ENGAGED WITH OTHER ORGANISATIONS?</p>
        <YesNo value={f.engagedOrgs} onChange={v => set('engagedOrgs', v)} />
      </div>

      <SectionHeader label="Feedback" />
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">WHAT DO YOU WANT ASINYO TO IMPROVE?</p>
        <textarea
          rows={3}
          placeholder="Farmer's suggestions..."
          value={f.suggestions}
          onChange={e => set('suggestions', e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) resize-none"
        />
      </div>

      <SectionHeader label="GPS & Consent" />
      <GpsField
        value={f.gpsLocation}
        onChange={v => set('gpsLocation', v)}
      />

      <div className="rounded-xl border p-4 space-y-2.5" style={{ borderColor: 'var(--brand-pale)', background: 'var(--brand-gray)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--brand-forest)' }}>Consent</p>
        <p className="text-xs leading-relaxed text-gray-500">
          I confirm that the farmer has consented to their personal data being collected and
          stored by ASINYO CropGuard for agricultural program management, insurance, and credit facilitation services.
        </p>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <div
            className={cn(
              'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
              f.consentGiven ? 'bg-(--brand-dark) border-(--brand-dark)' : 'border-gray-300 bg-white'
            )}
            onClick={() => set('consentGiven', !f.consentGiven)}
          >
            {f.consentGiven && <Check className="w-2.5 h-2.5 text-white" />}
          </div>
          <span className="text-xs" style={{ color: 'var(--brand-forest)' }}>
            Farmer has given informed consent <span className="text-red-500">*</span>
          </span>
        </label>
      </div>
    </div>
  )
}

// ── Step titles ───────────────────────────────────────────────────────────────

const STEP_TITLES = ['Basic Details', 'Identity Details', 'Farm Details', 'Household Details', 'Support Details']

// ── AddFarmerSheet ────────────────────────────────────────────────────────────

function AddFarmerSheet({ open, onClose, onSave, programs }: {
  open: boolean; onClose: () => void
  onSave: (form: AddFarmerForm) => void
  programs: ProgramOption[]
}) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<StepperForm>(EMPTY_STEPPER)
  const [saving, setSaving] = useState(false)
  const TOTAL = 5

  useEffect(() => {
    if (open) { setStep(1); setForm(EMPTY_STEPPER) }
  }, [open])

  function set(k: keyof StepperForm, v: StepperForm[keyof StepperForm]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function validateStep(): boolean {
    if (step === 1) {
      if (!form.firstName.trim()) { toast.error('First name is required'); return false }
      if (!form.lastName.trim())  { toast.error('Last name is required'); return false }
      if (!form.phone.trim())     { toast.error('Phone number is required'); return false }
    }
    if (step === 2) {
      if (!form.idType)           { toast.error('ID type is required'); return false }
      if (!form.idNumber.trim())  { toast.error('ID number is required'); return false }
    }
    if (step === 3) {
      if (!form.primaryCrop)      { toast.error('Primary crop is required'); return false }
    }
    if (step === 5) {
      if (!form.consentGiven)     { toast.error('Farmer consent is required'); return false }
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

  const stepContent: Record<number, React.ReactNode> = {
    1: <Step1 f={form} set={set} programs={programs} />,
    2: <Step2 f={form} set={set} />,
    3: <Step3 f={form} set={set} />,
    4: <Step4 f={form} set={set} />,
    5: <Step5 f={form} set={set} />,
  }

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title={STEP_TITLES[step - 1]}
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
      {stepContent[step]}
    </SheetTemplate>
  )
}

// ── Edit farmer sheet ─────────────────────────────────────────────────────────

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

function EditFarmerSheet({ open, onClose, farmer, programs, onSave }: {
  open: boolean; onClose: () => void; farmer: Farmer | null
  programs: ProgramOption[]; onSave: (f: EditFarmerForm) => void
}) {
  const [form, setForm] = useState<EditFarmerForm>(EMPTY_EDIT)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({
      fullName:    farmer?.fullName    ?? '',
      phone:       farmer?.phone       ?? '',
      nationalId:  farmer?.nationalId  ?? '',
      dateOfBirth: farmer?.dateOfBirth ?? '',
      gender:      farmer?.gender      ?? '',
      region:      farmer?.region      ?? '',
      district:    farmer?.district    ?? '',
      community:   farmer?.community   ?? '',
      primaryCrop: farmer?.primaryCrop ?? '',
      farmSize:    farmer?.farmSize    ?? '',
      programId:   farmer?.enrollment?.programId ?? '',
      cohortId:    farmer?.enrollment?.cohortId  ?? '',
      agentName:   farmer?.enrollment?.agentName ?? '',
    })
  }, [open, farmer])

  const cohorts  = programs.find(p => p.id === form.programId)?.cohorts ?? []
  const districts = form.region ? (DISTRICT_OPTIONS[form.region] ?? []) : []

  function set<K extends keyof EditFarmerForm>(k: K, v: string) {
    setForm(prev => {
      const n = { ...prev, [k]: v }
      if (k === 'programId') n.cohortId = ''
      if (k === 'region') n.district = ''
      return n
    })
  }

  async function handleSave() {
    if (!form.fullName.trim()) { toast.error('Full name is required'); return }
    if (!form.phone.trim())    { toast.error('Phone is required'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    setSaving(false); onSave(form); onClose()
  }

  const enr = farmer?.enrollment

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title={farmer ? `Edit — ${farmer.fullName}` : 'Edit Farmer'}
      bodyClassName="px-6 py-5 space-y-4"
      footer={<><ButtonTemplate variant="outline" label="Cancel" fullWidth onClick={onClose} /><ButtonTemplate label={saving ? 'Saving…' : 'Save Changes'} fullWidth isDisabled={saving} onClick={handleSave} /></>}
    >
      {/* Farmer summary */}
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

      <InputTemplate label="FULL NAME" isRequired placeholder="Ama Mensah"
        value={form.fullName} onChange={e => set('fullName', e.target.value)} />

      <div className="grid grid-cols-2 gap-3">
        <InputTemplate label="PHONE" isRequired placeholder="0221234567"
          value={form.phone} onChange={e => set('phone', e.target.value)} />
        <InputTemplate label="NATIONAL ID" isRequired placeholder="GHA-XXXXXXXXX-X"
          value={form.nationalId} onChange={e => set('nationalId', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InputTemplate label="DATE OF BIRTH" type="date"
          value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
        <SelectTemplate label="GENDER"
          options={[{ value: '', label: 'Select gender' }, ...GENDER_OPTIONS]}
          value={form.gender} onChange={e => set('gender', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SelectTemplate label="REGION" isRequired
          options={[{ value: '', label: 'Select region' }, ...REGION_OPTIONS]}
          value={form.region} onChange={e => set('region', e.target.value)} />
        <SelectTemplate label="DISTRICT" isRequired
          options={[{ value: '', label: form.region ? 'Select district' : 'Select region first' }, ...districts]}
          value={form.district} onChange={e => set('district', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InputTemplate label="COMMUNITY" placeholder="Community"
          value={form.community} onChange={e => set('community', e.target.value)} />
        <SelectTemplate label="PRIMARY CROP" isRequired
          options={[{ value: '', label: 'Select crop' }, ...CROP_OPTIONS]}
          value={form.primaryCrop} onChange={e => set('primaryCrop', e.target.value)} />
      </div>

      <InputTemplate label="FARM SIZE (HA)" type="number" placeholder="2.5"
        value={form.farmSize} onChange={e => set('farmSize', e.target.value)} />
    </SheetTemplate>
  )
}

// ── Assign Agent sheet ─────────────────────────────────────────────────────────

const SELECT_STYLE = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat' as const,
  backgroundPosition: 'right 10px center',
}

const SELECT_CLS = 'w-full h-10 text-sm rounded-lg border border-gray-200 bg-white px-3 pr-9 appearance-none focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed'

function AssignAgentSheet({ open, onClose, farmer, farmerCount }: {
  open: boolean; onClose: () => void
  farmer: Farmer | null; farmerCount: number
}) {
  const [agent, setAgent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setAgent(farmer?.enrollment?.agentName ?? '')
  }, [open, farmer])

  const isSingle = !!farmer
  const title = isSingle ? 'Assign Agent to Farmer' : `Assign Agent — ${farmerCount} Farmers`

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
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Field Agent</p>
        <select value={agent} onChange={e => setAgent(e.target.value)} className={SELECT_CLS} style={SELECT_STYLE}>
          <option value="">Select agent…</option>
          {MOCK_AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
    </SheetTemplate>
  )
}

// ── Enroll Farmers sheet ───────────────────────────────────────────────────────

function EnrollSheet({ open, onClose, farmerCount, programs }: {
  open: boolean; onClose: () => void; farmerCount: number; programs: ProgramOption[]
}) {
  const [programId, setProgramId] = useState('')
  const [cohortId,  setCohortId]  = useState('')
  const [saving,    setSaving]    = useState(false)

  useEffect(() => { if (open) { setProgramId(''); setCohortId('') } }, [open])
  useEffect(() => { setCohortId('') }, [programId])

  const cohorts = programs.find(p => p.id === programId)?.cohorts ?? []

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
      <div className="rounded-lg px-4 py-3 text-sm text-blue-700 bg-blue-50">
        Farmers already enrolled in the selected program will have their cohort updated.
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
          Program <span className="text-red-500">*</span>
        </p>
        <select
          value={programId} onChange={e => setProgramId(e.target.value)}
          className="w-full h-10 text-sm rounded-lg border border-gray-200 bg-white px-3 pr-9 appearance-none focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
          }}
        >
          <option value="">Select program</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cohort (Optional)</p>
        <select
          value={cohortId} onChange={e => setCohortId(e.target.value)} disabled={!programId}
          className="w-full h-10 text-sm rounded-lg border border-gray-200 bg-white px-3 pr-9 appearance-none focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
          }}
        >
          <option value="">No cohort</option>
          {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
    </SheetTemplate>
  )
}

// ── Bulk Upload sheet ──────────────────────────────────────────────────────────

function BulkUploadSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [csvFile,   setCsvFile]   = useState<File | null>(null)
  const [rows,     setRows]     = useState<string[][]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => { if (open) { setCsvFile(null); setRows([]); setFileName('') } }, [open])

  useEffect(() => {
    if (!csvFile) return
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

// ── Detail sheet ───────────────────────────────────────────────────────────────

function DetailSheet({ open, onClose, farmer, onEdit, onUnenroll }: {
  open: boolean; onClose: () => void; farmer: Farmer | null
  onEdit: () => void; onUnenroll: () => void
}) {
  if (!farmer) return null
  const enr = farmer.enrollment
  return (
    <SheetTemplate open={open} onClose={onClose} title={farmer.fullName} bodyClassName="px-6 py-5 space-y-5">
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
        <ButtonTemplate variant="outline" size="sm" label="Edit Details"
          leftIcon={<Edit2 className="w-3.5 h-3.5" />}
          onClick={() => { onClose(); onEdit() }} />
        {enr && (
          <ButtonTemplate variant="outline" size="sm" label="Unenroll"
            leftIcon={<UserMinus className="w-3.5 h-3.5" />}
            className="text-red-600! border-red-200 hover:bg-red-50"
            onClick={() => { onClose(); onUnenroll() }} />
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
      <p className="text-3xl font-bold" style={{ color: 'var(--brand-forest)' }}>{value}</p>
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
        <Pie data={filled} cx="50%" cy="45%" innerRadius={45} outerRadius={65}
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
  const [farmers,  setFarmers]  = useState<Farmer[]>([])
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [loading,  setLoading]  = useState(true)

  // Filters
  const [search,         setSearch]         = useState('')
  const [filterProgram,  setFilterProgram]  = useState('')
  const [filterCohort,   setFilterCohort]   = useState('')
  const [filterEnrolled, setFilterEnrolled] = useState('')
  const [filterZone,     setFilterZone]     = useState('')
  const [filterAgent,    setFilterAgent]    = useState('')
  const [filterFriMin,   setFilterFriMin]   = useState('')
  const [filterFriMax,   setFilterFriMax]   = useState('')

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Sheets
  const [addOpen,          setAddOpen]          = useState(false)
  const [editOpen,         setEditOpen]         = useState(false)
  const [detailOpen,       setDetailOpen]       = useState(false)
  const [assignAgentOpen,  setAssignAgentOpen]  = useState(false)
  const [enrollOpen,       setEnrollOpen]       = useState(false)
  const [bulkUploadOpen,   setBulkUploadOpen]   = useState(false)
  const [focusFarmer,      setFocusFarmer]      = useState<Farmer | null>(null)
  const [statsOpen,        setStatsOpen]        = useState(false)
  const [filtersOpen,      setFiltersOpen]      = useState(false)

  useEffect(() => {
    Promise.all([getFarmers(), getProgramOptions()]).then(([f, p]) => {
      setFarmers(f); setPrograms(p); setLoading(false)
    })
  }, [])

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

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
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
          <ButtonTemplate label="Add Farmer" size="sm" leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setAddOpen(true)} />
          <ButtonTemplate
            variant="secondary" size="sm"
            label="Statistics"
            leftIcon={<BarChart2 className="w-3.5 h-3.5" />}
            rightIcon={<ChevronUp className={cn('w-3.5 h-3.5 transition-transform', !statsOpen && 'rotate-180')} />}
            onClick={() => setStatsOpen(v => !v)}
          />
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
                  <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {filterZone.replace('Resilience ', '')}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterZone('')} />
                  </span>
                )}
                {filterAgent && (
                  <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
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
              onClick={() => { setLoading(true); getFarmers().then(f => { setFarmers(f); setLoading(false) }) }} />
          </div>
        </div>
      )}

      {/* ── Farmer list ──────────────────────────────────────────────────────── */}
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
            {displayed.map(f => {
              const isSelected = selected.has(f.id)
              const enr = f.enrollment
              const stageDef = WORKFLOW_STAGES.find(s => s.stage === (enr?.currentStage ?? 0))

              return (
                <div key={f.id} className={cn(
                  'flex items-stretch transition-colors',
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50/60'
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
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                      enr ? 'text-(--brand-dark)' : 'bg-gray-100 text-gray-500'
                    )} style={enr ? { background: 'var(--brand-pale)' } : {}}>
                      {f.fullName.charAt(0)}
                    </div>
                  </div>

                  {/* Farmer Details */}
                  <div className="flex flex-col justify-center py-4 pr-5 w-50 shrink-0 cursor-pointer border-r border-gray-100"
                    onClick={() => { setFocusFarmer(f); setDetailOpen(true) }}>
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
                    onClick={() => { setFocusFarmer(f); setDetailOpen(true) }}>
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
                    onClick={() => { setFocusFarmer(f); setDetailOpen(true) }}>
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
                    onClick={() => { setFocusFarmer(f); setDetailOpen(true) }}>
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
                    <ButtonTemplate variant="outline" size="sm" label="Enrol"
                      leftIcon={<UserPlus className="w-3 h-3" />}
                      onClick={() => { setFocusFarmer(f); setEnrollOpen(true) }} />
                    <ButtonTemplate variant="outline" size="sm" label="Agent"
                      leftIcon={<UserCog className="w-3 h-3" />}
                      isDisabled={!enr}
                      onClick={enr ? () => { setFocusFarmer(f); setAssignAgentOpen(true) } : undefined} />
                    <ButtonTemplate variant="outline" size="sm" label="Remove"
                      leftIcon={<UserMinus className="w-3 h-3" />}
                      isDisabled={!enr}
                      onClick={enr ? () => unenrollFarmer(f) : undefined} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── All sheets ───────────────────────────────────────────────────────── */}
      <AddFarmerSheet open={addOpen} onClose={() => setAddOpen(false)} onSave={handleAddSave} programs={programs} />
      <EditFarmerSheet open={editOpen} onClose={() => { setEditOpen(false); setFocusFarmer(null) }}
        farmer={focusFarmer} programs={programs} onSave={handleEditSave} />
      <AssignAgentSheet open={assignAgentOpen} onClose={() => setAssignAgentOpen(false)}
        farmer={focusFarmer} farmerCount={selected.size} />
      <EnrollSheet open={enrollOpen} onClose={() => setEnrollOpen(false)}
        farmerCount={selected.size} programs={programs} />
      <BulkUploadSheet open={bulkUploadOpen} onClose={() => setBulkUploadOpen(false)} />
      <DetailSheet open={detailOpen} onClose={() => { setDetailOpen(false); setFocusFarmer(null) }}
        farmer={focusFarmer} onEdit={() => setEditOpen(true)}
        onUnenroll={() => focusFarmer && unenrollFarmer(focusFarmer)} />
    </div>
  )
}
