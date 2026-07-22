'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, MapPin, Mail, Calendar, Building2,
  Users, Search, Layers, Zap, Plus, X, Check,
  ExternalLink, FileText, Wallet, Pencil, Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { PersonAvatar } from '@/customComponents/PersonAvatar'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { CardTemplate } from '@/customComponents/CardTemplate'
import { DatagridTemplate } from '@/customComponents/DatagridTemplate'
import type { DatagridColumn } from '@/customComponents/DatagridTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import { PARTNERS } from '@/dataCenter/partners'
import { INTERVENTIONS } from '@/dataCenter/interventions'
import { PROGRAMS } from '@/dataCenter/programs'
import { FARMERS_LIST } from '@/dataCenter/farmerManagement'
import { PARTNER_BASELINES, createDefaultP4Questions } from '@/dataCenter/partnerBaselines'
import { ScrollTabsTemplate } from '@/customComponents/ScrollTabsTemplate'
import type { PartnerP4Question } from '@/dataCenter/partnerBaselines'
import type { Intervention, EnrolledCohort } from '@/app/(admin)/dashboard/OpportunityPathways/_logics/interface'
import type { Farmer } from '@/app/(admin)/dashboard/FarmersRegistry/_logics/interface'
import type { Program } from '@/app/(admin)/dashboard/ProgramsSetup/_logics/interface'

// ─── Tab definition ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'programs',      label: 'Linked Programs',      icon: Layers    },
  { id: 'interventions', label: 'Linked Interventions', icon: Zap       },
  { id: 'p4baseline',    label: 'ECI',                  icon: Wallet    },
  { id: 'risk',          label: 'Risk & Performance',   icon: Users     },
  { id: 'reports',       label: 'Reports',               icon: FileText },
] as const
type Tab = typeof TABS[number]['id']

// ─── Types ────────────────────────────────────────────────────────────────────

interface Assignment {
  interventionId: string
  cohorts: EnrolledCohort[]
}

interface OppRow {
  id:          string
  name:        string
  description: string
  type:        string
  status:      string
  season:      string
  value:       string
  cohorts:     number
  farmers:     number
}

interface FarmerRow {
  id:          string
  fullName:    string
  community:   string
  district:    string
  primaryCrop: string
  farmSize:    string
  currentZone: string
  currentFri:  number
  programId:   string
  programName: string
  cohortId:    string
  cohortName:  string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  'Input Loan':    'bg-blue-50 text-blue-700 border-blue-100',
  'Cash Loan':     'bg-purple-50 text-purple-700 border-purple-100',
  'Insurance':     'bg-amber-50 text-amber-700 border-amber-100',
  'Advisory':      'bg-teal-50 text-teal-700 border-teal-100',
  'Market Access': 'bg-rose-50 text-rose-700 border-rose-100',
}

const TYPE_DOT: Record<string, string> = {
  'Input Loan':    'bg-blue-500',
  'Cash Loan':     'bg-purple-500',
  'Insurance':     'bg-amber-500',
  'Advisory':      'bg-teal-500',
  'Market Access': 'bg-rose-500',
}


function oppStatus(s: string): 'success' | 'warning' | 'neutral' {
  return s === 'Active' ? 'success' : s === 'Draft' ? 'warning' : 'neutral'
}

function progStatus(s: Program['status']): 'success' | 'info' | 'neutral' {
  return s === 'Active' ? 'success' : s === 'Completed' ? 'info' : 'neutral'
}

function zoneVariant(z: string): 'success' | 'info' | 'warning' | 'neutral' {
  return z === 'Resilience Leader'  ? 'success' :
         z === 'Resilience Builder' ? 'info'    :
         z === 'Resilience Learner' ? 'warning' : 'neutral'
}

function cohortFarmers(programId: string, cohortId: string): Farmer[] {
  return FARMERS_LIST.filter(f =>
    f.enrollment?.programId === programId && f.enrollment?.cohortId === cohortId
  )
}

function oppFarmerCount(cohorts: EnrolledCohort[]): number {
  return cohorts.reduce((n, ec) => n + cohortFarmers(ec.programId, ec.cohortId).length, 0)
}

function toFarmerRows(
  farmers: Farmer[],
  programId: string, programName: string,
  cohortId: string,  cohortName:  string,
): FarmerRow[] {
  return farmers.map(f => ({
    id:          f.id,
    fullName:    f.fullName,
    community:   f.community,
    district:    f.district,
    primaryCrop: f.primaryCrop,
    farmSize:    f.farmSize,
    currentZone: f.currentZone ?? '',
    currentFri:  f.currentFri ?? 0,
    programId,
    programName,
    cohortId,
    cohortName,
  }))
}

// ─── Farmer columns ───────────────────────────────────────────────────────────

const FARMER_COLUMNS: DatagridColumn<FarmerRow>[] = [
  {
    key: 'fullName',
    label: 'Farmer',
    width: '220px',
    render: (val, row) => (
      <Link href={`/dashboard/FarmerDetail/${row.id}`}
        className="flex items-center gap-2.5 group/link"
        onClick={e => e.stopPropagation()}>
        <PersonAvatar name={String(val)} size={30} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 group-hover/link:text-green-700 transition-colors truncate">
            {String(val)}
          </p>
          <p className="text-[11px] text-gray-400">{row.id}</p>
        </div>
      </Link>
    ),
  },
  { key: 'programName', label: 'Programme' },
  { key: 'cohortName',  label: 'Cohort'    },
  { key: 'community',   label: 'Community' },
  { key: 'district',    label: 'District'  },
  {
    key: 'primaryCrop',
    label: 'Crop',
    render: val => (
      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 font-medium capitalize">
        {String(val)}
      </span>
    ),
  },
  { key: 'farmSize', label: 'Farm Size' },
  {
    key: 'currentFri',
    label: 'FRI',
    render: val => {
      const n = Number(val)
      const color = n >= 70 ? 'text-green-600' : n >= 40 ? 'text-amber-600' : 'text-red-500'
      return <span className={`text-sm font-bold tabular-nums ${color}`}>{n > 0 ? n : '—'}</span>
    },
  },
  {
    key: 'currentZone',
    label: 'Zone',
    render: val => {
      const z = String(val)
      return z ? (
        <BadgeTemplate label={z.replace('Resilience ', '')} variant={zoneVariant(z)} size="sm" />
      ) : <span className="text-gray-300">—</span>
    },
  },
]

// ─── Opportunity Detail Modal ─────────────────────────────────────────────────

function OpportunityDetailModal({ intervention, cohorts, onClose }: {
  intervention: Intervention
  cohorts: EnrolledCohort[]
  onClose: () => void
}) {
  const allFarmerRows = useMemo(() =>
    cohorts.flatMap(ec =>
      toFarmerRows(cohortFarmers(ec.programId, ec.cohortId), ec.programId, ec.programName, ec.cohortId, ec.cohortName)
    ),
  [cohorts])

  const totalFarmers = allFarmerRows.length

  const programOptions = useMemo(() => {
    const seen = new Map<string, string>()
    cohorts.forEach((ec: EnrolledCohort) => { if (!seen.has(ec.programId)) seen.set(ec.programId, ec.programName) })
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [cohorts])

  const [filterProgram, setFilterProgram] = useState('')
  const [filterCohort,  setFilterCohort]  = useState('')

  const cohortOptions = useMemo(() => {
    const base = filterProgram ? cohorts.filter((ec: EnrolledCohort) => ec.programId === filterProgram) : cohorts
    const seen = new Map<string, string>()
    base.forEach((ec: EnrolledCohort) => { if (!seen.has(ec.cohortId)) seen.set(ec.cohortId, ec.cohortName) })
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [cohorts, filterProgram])

  function handleProgramChange(id: string) { setFilterProgram(id); setFilterCohort('') }

  const filteredRows = useMemo(() =>
    allFarmerRows.filter(r => {
      if (filterProgram && r.programId !== filterProgram) return false
      if (filterCohort  && r.cohortId  !== filterCohort)  return false
      return true
    }),
  [allFarmerRows, filterProgram, filterCohort])

  const anyFilter = filterProgram || filterCohort

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start gap-4 px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900">{intervention.name}</h2>
              <BadgeTemplate label={intervention.status} variant={oppStatus(intervention.status)} />
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold ${TYPE_COLOR[intervention.type] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                {intervention.type}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{intervention.description}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats strip */}
        <div className="flex flex-wrap divide-x divide-gray-100 border-b border-gray-100 bg-gray-50 shrink-0">
          {[
            { label: 'Season',   value: intervention.season           },
            { label: 'Value',    value: intervention.valueDescription },
            { label: 'Min FRI',  value: String(intervention.minFri)   },
            { label: 'Capacity', value: String(intervention.capacity) },
            { label: 'Approval', value: intervention.approval         },
            { label: 'Cohorts',  value: String(cohorts.length)        },
            { label: 'Farmers',  value: String(totalFarmers)          },
          ].map(({ label, value }) => (
            <div key={label} className="flex-1 min-w-20 px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-gray-100 bg-white shrink-0">
          <select value={filterProgram} onChange={e => handleProgramChange(e.target.value)}
            className="h-8 text-xs rounded-lg border border-gray-200 bg-white px-3 pr-7 appearance-none focus:outline-none focus:ring-2 focus:ring-green-200 cursor-pointer">
            <option value="">All Programmes</option>
            {programOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterCohort} onChange={e => setFilterCohort(e.target.value)}
            className="h-8 text-xs rounded-lg border border-gray-200 bg-white px-3 pr-7 appearance-none focus:outline-none focus:ring-2 focus:ring-green-200 cursor-pointer">
            <option value="">All Cohorts</option>
            {cohortOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {anyFilter && (
            <button onClick={() => { setFilterProgram(''); setFilterCohort('') }}
              className="h-8 px-3 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
              Clear
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {filteredRows.length} of {totalFarmers} farmer{totalFarmers !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <DatagridTemplate<FarmerRow>
            columns={FARMER_COLUMNS}
            data={filteredRows}
            rowKey="id"
            defaultPageSize={25}
            pageSizeOptions={[10, 25, 50]}
            emptyLabel={anyFilter ? 'No farmers match the selected filters.' : 'No farmers enrolled yet.'}
          />
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-white shrink-0 flex justify-end">
          <button onClick={onClose} className="h-9 px-5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Assign Opportunity Sheet ─────────────────────────────────────────────────

function AssignSheet({ open, onClose, assignedIds, onAssign }: {
  open: boolean
  onClose: () => void
  assignedIds: Set<string>
  onAssign: (interventionId: string, cohorts: EnrolledCohort[]) => void
}) {
  const [step, setStep] = useState<'pick-opportunity' | 'pick-cohorts'>('pick-opportunity')
  const [selectedOppId, setSelectedOppId] = useState('')
  const [selectedCohortKeys, setSelectedCohortKeys] = useState<Set<string>>(new Set())

  const available = INTERVENTIONS.filter(i => !assignedIds.has(i.id))
  const selectedOpp = INTERVENTIONS.find(i => i.id === selectedOppId)

  function reset() { setStep('pick-opportunity'); setSelectedOppId(''); setSelectedCohortKeys(new Set()) }
  function handleClose() { reset(); onClose() }

  function handleNext() {
    if (!selectedOppId || !selectedOpp) return
    setSelectedCohortKeys(new Set(selectedOpp.enrolledCohorts.map((ec: EnrolledCohort) => `${ec.programId}::${ec.cohortId}`)))
    setStep('pick-cohorts')
  }

  function toggleCohort(key: string) {
    setSelectedCohortKeys(prev => { const n = new Set(prev); if (n.has(key)) { n.delete(key) } else { n.add(key) }; return n })
  }

  function handleSave() {
    if (!selectedOpp) return
    const cohorts = selectedOpp.enrolledCohorts.filter((ec: EnrolledCohort) => selectedCohortKeys.has(`${ec.programId}::${ec.cohortId}`))
    onAssign(selectedOppId, cohorts)
    reset(); onClose()
  }

  const cohortsByProgram = useMemo(() => {
    if (!selectedOpp) return []
    const map = new Map<string, { programName: string; cohorts: EnrolledCohort[] }>()
    selectedOpp.enrolledCohorts.forEach((ec: EnrolledCohort) => {
      if (!map.has(ec.programId)) map.set(ec.programId, { programName: ec.programName, cohorts: [] })
      map.get(ec.programId)!.cohorts.push(ec)
    })
    return Array.from(map.values())
  }, [selectedOpp])

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-gray-100">
          <SheetTitle className="text-base font-bold">
            {step === 'pick-opportunity' ? 'Assign Opportunity' : `Select Cohorts — ${selectedOpp?.name}`}
          </SheetTitle>
          {step === 'pick-cohorts' && (
            <p className="text-xs text-gray-400 mt-0.5">Choose which cohorts this partner sees for this opportunity.</p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {step === 'pick-opportunity' ? (
            available.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Zap className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-sm">All opportunities are already assigned to this partner.</p>
              </div>
            ) : (
              available.map(i => (
                <button key={i.id} onClick={() => setSelectedOppId(i.id)}
                  className={['w-full text-left p-4 rounded-xl border transition-all',
                    selectedOppId === i.id ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300',
                  ].join(' ')}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{i.name}</p>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${TYPE_COLOR[i.type] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>{i.type}</span>
                    <BadgeTemplate label={i.status} variant={oppStatus(i.status)} size="sm" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{i.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{i.enrolledCohorts.length} cohort{i.enrolledCohorts.length !== 1 ? 's' : ''} · Min FRI {i.minFri} · {i.valueDescription}</p>
                  {selectedOppId === i.id && <div className="mt-2 flex justify-end"><Check className="w-4 h-4 text-green-600" /></div>}
                </button>
              ))
            )
          ) : (
            cohortsByProgram.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">This opportunity has no cohorts enrolled yet.</p>
            ) : (
              cohortsByProgram.map(({ programName, cohorts }) => (
                <div key={programName} className="space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{programName}</p>
                  {cohorts.map((ec: EnrolledCohort) => {
                    const key = `${ec.programId}::${ec.cohortId}`
                    const checked = selectedCohortKeys.has(key)
                    return (
                      <button key={key} onClick={() => toggleCohort(key)}
                        className={['w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all',
                          checked ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300',
                        ].join(' ')}>
                        <div className={['w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                          checked ? 'bg-green-600 border-green-600' : 'border-gray-300 bg-white'].join(' ')}>
                          {checked && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <p className="text-sm text-gray-800">{ec.cohortName}</p>
                      </button>
                    )
                  })}
                </div>
              ))
            )
          )}
        </div>

        <SheetFooter className="px-5 py-4 border-t border-gray-100 flex gap-2">
          {step === 'pick-opportunity' ? (
            <>
              <button onClick={handleClose} className="flex-1 h-10 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleNext} disabled={!selectedOppId}
                className="flex-1 h-10 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40"
                style={{ backgroundColor: 'var(--brand-forest)' }}>Next — Choose Cohorts</button>
            </>
          ) : (
            <>
              <button onClick={() => setStep('pick-opportunity')} className="flex-1 h-10 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Back</button>
              <button onClick={handleSave} disabled={selectedCohortKeys.size === 0}
                className="flex-1 h-10 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40"
                style={{ backgroundColor: 'var(--brand-forest)' }}>Assign Opportunity</button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Tab: Linked Programs ─────────────────────────────────────────────────────

function LinkedProgramsTab({ opportunities }: { opportunities: { intervention: Intervention; cohorts: EnrolledCohort[] }[] }) {
  interface ProgCard {
    id: string; name: string; status: Program['status']; crops: string[]
    period: string; cohortCount: number; enrolled: number; target: number
  }

  const cards = useMemo<ProgCard[]>(() => {
    const seen = new Map<string, { cohortIds: Set<string> }>()
    opportunities.forEach(({ cohorts }) =>
      cohorts.forEach((ec: EnrolledCohort) => {
        if (!seen.has(ec.programId)) seen.set(ec.programId, { cohortIds: new Set() })
        seen.get(ec.programId)!.cohortIds.add(ec.cohortId)
      })
    )
    return Array.from(seen.entries()).map(([programId, { cohortIds }]) => {
      const program = PROGRAMS.find(p => p.id === programId)
      const ec0 = opportunities.flatMap(o => o.cohorts).find((ec: EnrolledCohort) => ec.programId === programId)
      const farmers = FARMERS_LIST.filter(f =>
        f.enrollment?.programId === programId && cohortIds.has(f.enrollment?.cohortId ?? '')
      ).length
      return {
        id:          programId,
        name:        program?.name ?? (ec0?.programName ?? programId),
        status:      program?.status ?? 'Active',
        crops:       program?.crops ?? [],
        period:      program ? `${program.startDate} → ${program.endDate}` : '—',
        cohortCount: cohortIds.size,
        enrolled:    farmers,
        target:      program?.targetCount ?? farmers,
      }
    })
  }, [opportunities])

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
        Programmes ({cards.length})
      </p>

      {cards.length === 0 ? (
        <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No programmes linked yet.</p>
        </div>
      ) : (
        cards.map(prog => {
          const filled = prog.target > 0 ? Math.min(100, Math.round((prog.enrolled / prog.target) * 100)) : 0
          return (
            <CardTemplate key={prog.id} noPadding className="overflow-hidden">
              <div className="px-6 pt-4 pb-3">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="text-base font-bold truncate" style={{ color: 'var(--brand-forest)' }}>{prog.name}</h3>
                  <BadgeTemplate label={prog.status} variant={progStatus(prog.status)} size="sm" />
                </div>

                <p className="text-xs text-gray-400 mb-2">{prog.period}</p>

                {prog.crops.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {prog.crops.map(crop => (
                      <BadgeTemplate key={crop} label={crop} variant="success" size="sm" />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs shrink-0 text-gray-500">
                    <Layers className="w-3.5 h-3.5 text-gray-400" />{prog.cohortCount} cohort{prog.cohortCount !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: 'var(--brand-dark)' }}>
                    <Users className="w-3.5 h-3.5" />
                    {prog.enrolled} / {prog.target}
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${filled}%`, backgroundColor: 'var(--brand-green)' }} />
                  </div>
                  <span className="text-xs text-gray-400 tabular-nums shrink-0">{filled}%</span>
                </div>
              </div>
            </CardTemplate>
          )
        })
      )}
    </div>
  )
}

// ─── Tab: Linked Interventions ────────────────────────────────────────────────

function LinkedInterventionsTab({
  opportunities, onRemove, onAssign, onDetail,
}: {
  opportunities: { intervention: Intervention; cohorts: EnrolledCohort[] }[]
  onRemove:      (id: string) => void
  onAssign:      () => void
  onDetail:      (item: { intervention: Intervention; cohorts: EnrolledCohort[] }) => void
}) {
  const [search,        setSearch]        = useState('')
  const [filterType,    setFilterType]    = useState('')
  const [filterStatus,  setFilterStatus]  = useState('')
  const [filterProgram, setFilterProgram] = useState('')

  const programOptions = useMemo(() => {
    const seen = new Map<string, string>()
    opportunities.forEach(({ cohorts }) =>
      cohorts.forEach((ec: EnrolledCohort) => { if (!seen.has(ec.programId)) seen.set(ec.programId, ec.programName) })
    )
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [opportunities])

  const displayed = useMemo(() =>
    opportunities.filter(({ intervention: i, cohorts }) => {
      if (filterType   && i.type   !== filterType)   return false
      if (filterStatus && i.status !== filterStatus) return false
      if (filterProgram && !cohorts.some(ec => ec.programId === filterProgram)) return false
      if (search) {
        const q = search.toLowerCase()
        if (!i.name.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q)) return false
      }
      return true
    }),
  [opportunities, filterType, filterStatus, filterProgram, search])

  const anyFilter = search || filterType || filterStatus || filterProgram

  const oppRows: OppRow[] = useMemo(() =>
    displayed.map(({ intervention: i, cohorts }) => ({
      id: i.id, name: i.name, description: i.description,
      type: i.type, status: i.status, season: i.season,
      value: i.valueDescription,
      cohorts: cohorts.length,
      farmers: oppFarmerCount(cohorts),
    })),
  [displayed])

  const oppColumns: DatagridColumn<OppRow>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Opportunity',
      render: (val, row) => (
        <div className="flex items-start gap-2">
          <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[row.type] ?? 'bg-gray-400'}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{String(val)}</p>
            <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{row.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: val => (
        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${TYPE_COLOR[String(val)] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
          {String(val)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: val => <BadgeTemplate label={String(val)} variant={oppStatus(String(val))} size="sm" />,
    },
    { key: 'season', label: 'Season' },
    { key: 'value',  label: 'Value'  },
    {
      key: 'cohorts',
      label: 'Cohorts',
      render: val => <span className="flex items-center gap-1.5 text-gray-600"><Layers className="w-3.5 h-3.5 text-gray-400" />{String(val)}</span>,
    },
    {
      key: 'farmers',
      label: 'Farmers',
      render: val => <span className="flex items-center gap-1.5 text-gray-600"><Users className="w-3.5 h-3.5 text-gray-400" />{String(val)}</span>,
    },
    {
      key: 'id',
      label: '',
      width: '72px',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <ExternalLink className="w-3.5 h-3.5 text-gray-300" />
          <button
            onClick={e => { e.stopPropagation(); onRemove(row.id) }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
            title="Remove assignment">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [])

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-45">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search opportunities…"
            className="w-full h-9 pl-8 pr-3 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-200" />
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="h-9 text-xs rounded-lg border border-gray-200 bg-white px-3 pr-7 appearance-none focus:outline-none focus:ring-2 focus:ring-green-200 cursor-pointer">
            <option value="">All Types</option>
            {['Input Loan','Cash Loan','Insurance','Advisory','Market Access'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="h-9 text-xs rounded-lg border border-gray-200 bg-white px-3 pr-7 appearance-none focus:outline-none focus:ring-2 focus:ring-green-200 cursor-pointer">
            <option value="">All Statuses</option>
            {['Active','Draft','Suspended'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {programOptions.length > 0 && (
            <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)}
              className="h-9 text-xs rounded-lg border border-gray-200 bg-white px-3 pr-7 appearance-none focus:outline-none focus:ring-2 focus:ring-green-200 cursor-pointer">
              <option value="">All Programmes</option>
              {programOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>
        {anyFilter && (
          <button onClick={() => { setSearch(''); setFilterType(''); setFilterStatus(''); setFilterProgram('') }}
            className="h-9 px-3 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
            Clear
          </button>
        )}
        <button onClick={onAssign}
          className="h-9 px-3 flex items-center gap-1.5 text-xs font-semibold text-white rounded-lg transition-colors sm:ml-auto"
          style={{ backgroundColor: 'var(--brand-forest)' }}>
          <Plus className="w-3.5 h-3.5" /> Assign Opportunity
        </button>
      </div>

      {opportunities.length === 0 ? (
        <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
          <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No opportunities assigned yet.</p>
          <button onClick={onAssign}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white"
            style={{ backgroundColor: 'var(--brand-forest)' }}>
            <Plus className="w-3.5 h-3.5" /> Assign Opportunity
          </button>
        </div>
      ) : (
        <DatagridTemplate<OppRow>
          columns={oppColumns}
          data={oppRows}
          rowKey="id"
          defaultPageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyLabel="No opportunities match the current filters."
          onRowClick={row => {
            const opp = opportunities.find(o => o.intervention.id === row.id)
            if (opp) onDetail(opp)
          }}
        />
      )}
    </div>
  )
}

// ─── Tab: Risk & Performance ──────────────────────────────────────────────────

function RiskPerformanceTab({ opportunities }: { opportunities: { intervention: Intervention; cohorts: EnrolledCohort[] }[] }) {
  const allFarmerRows = useMemo(() =>
    opportunities.flatMap(({ cohorts }) =>
      cohorts.flatMap(ec =>
        toFarmerRows(cohortFarmers(ec.programId, ec.cohortId), ec.programId, ec.programName, ec.cohortId, ec.cohortName)
      )
    ).filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i),
  [opportunities])

  const riskColumns: DatagridColumn<FarmerRow>[] = [
    {
      key: 'fullName',
      label: 'Farmer',
      width: '200px',
      render: (val, row) => (
        <Link href={`/dashboard/FarmerDetail/${row.id}`} className="flex items-center gap-2.5 group/link" onClick={e => e.stopPropagation()}>
          <PersonAvatar name={String(val)} size={28} />
          <p className="text-sm font-semibold text-gray-900 group-hover/link:text-green-700 transition-colors truncate">{String(val)}</p>
        </Link>
      ),
    },
    { key: 'programName', label: 'Programme' },
    { key: 'cohortName',  label: 'Cohort'    },
    { key: 'district',    label: 'District'  },
    {
      key: 'primaryCrop',
      label: 'Crop',
      render: val => (
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 font-medium capitalize">{String(val)}</span>
      ),
    },
    {
      key: 'currentFri',
      label: 'FRI Score',
      render: val => {
        const n = Number(val)
        const color = n >= 70 ? 'text-green-600' : n >= 40 ? 'text-amber-600' : 'text-red-500'
        return <span className={`text-sm font-bold tabular-nums ${color}`}>{n > 0 ? n : '—'}</span>
      },
    },
    {
      key: 'currentZone',
      label: 'Zone',
      render: val => {
        const z = String(val)
        return z ? <BadgeTemplate label={z.replace('Resilience ', '')} variant={zoneVariant(z)} size="sm" /> : <span className="text-gray-300">—</span>
      },
    },
  ]

  return (
    <DatagridTemplate<FarmerRow>
      columns={riskColumns}
      data={allFarmerRows}
      rowKey="id"
      defaultPageSize={25}
      pageSizeOptions={[10, 25, 50]}
      emptyLabel="No farmers to display."
    />
  )
}

// ─── Tab: ECI ──────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${
        checked ? 'bg-(--brand-green)' : 'bg-gray-200'
      }`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

function P4BaselineTab({
  assigned, onToggleAssign, questions, onAdd, onEdit, onDelete, onToggleActive,
}: {
  assigned:       boolean
  onToggleAssign: (v: boolean) => void
  questions:      PartnerP4Question[]
  onAdd:          (label: string, desc: string) => void
  onEdit:         (id: string, label: string, desc: string) => void
  onDelete:       (id: string) => void
  onToggleActive: (id: string) => void
}) {
  const [adding,    setAdding]    = useState(false)
  const [newLabel,  setNewLabel]  = useState('')
  const [newDesc,   setNewDesc]   = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editDesc,  setEditDesc]  = useState('')
  const [deleteTarget, setDeleteTarget] = useState<PartnerP4Question | null>(null)

  function submitAdd() {
    if (!newLabel.trim()) return
    onAdd(newLabel.trim(), newDesc.trim())
    setNewLabel(''); setNewDesc(''); setAdding(false)
  }

  function startEdit(q: PartnerP4Question) {
    setEditingId(q.id); setEditLabel(q.label); setEditDesc(q.desc)
  }

  function submitEdit() {
    if (!editingId || !editLabel.trim()) return
    onEdit(editingId, editLabel.trim(), editDesc.trim())
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      {/* assignment toggle */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Assign ECI</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Once assigned, this partner gets its own set of ECI questions — independent of every other partner.
          </p>
        </div>
        <Toggle checked={assigned} onChange={onToggleAssign} />
      </div>

      {!assigned ? (
        <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
          <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Not assigned to ECI yet.</p>
          <p className="text-xs mt-1">Toggle it on above to give this partner its own ECI questions.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
              ECI ({questions.length})
            </p>
            <button
              onClick={() => { setAdding(true); setNewLabel(''); setNewDesc('') }}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white rounded-lg transition-colors hover:opacity-90"
              style={{ background: 'var(--brand-forest)' }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Question
            </button>
          </div>

          {questions.length === 0 && !adding && (
            <p className="text-sm text-gray-400 py-10 text-center">No P4 questions yet for this partner.</p>
          )}

          {questions.map(q => (
            editingId === q.id ? (
              <div key={q.id} className="px-4 py-4 border-b border-gray-100 last:border-b-0 bg-gray-50/50 flex flex-col gap-2.5">
                <input
                  type="text"
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  placeholder="Question statement..."
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300"
                />
                <input
                  type="text"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Description"
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300"
                />
                <div className="flex items-center gap-2">
                  <button onClick={submitEdit}
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white rounded-lg transition-colors hover:opacity-90"
                    style={{ background: '#4b5563' }}>
                    <Check className="w-3.5 h-3.5" /> Save
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="flex items-center gap-1 h-8 px-3 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={q.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 group">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-tight ${q.active ? 'text-gray-800' : 'text-gray-400'}`}>{q.label}</p>
                  {q.desc && <p className="text-xs text-gray-400 mt-0.5">{q.desc}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Toggle checked={q.active} onChange={() => onToggleActive(q.id)} />
                  <button onClick={() => startEdit(q)}
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:text-gray-500 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(q)}
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          ))}

          {adding && (
            <div className="px-4 py-4 border-t border-gray-100 flex flex-col gap-2.5">
              <input
                autoFocus
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Question statement..."
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300"
              />
              <input
                type="text"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Description"
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300"
              />
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
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete question?"
        message={`"${deleteTarget?.label ?? 'This question'}" will be permanently removed from this partner's ECI.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { if (deleteTarget) onDelete(deleteTarget.id); setDeleteTarget(null) }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

// ─── Tab: Reports ─────────────────────────────────────────────────────────────

function ReportsTab() {
  return (
    <div className="py-24 text-center text-gray-400">
      <FileText className="w-10 h-10 mx-auto mb-3 opacity-25" />
      <p className="text-base font-semibold text-gray-500">Reports coming soon</p>
      <p className="text-sm mt-1">Partner-level reports and exports will appear here.</p>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Main({ partnerId }: { partnerId: string }) {
  const router  = useRouter()
  const partner = PARTNERS.find(p => p.id === partnerId)

  const [activeTab,    setActiveTab]    = useState<Tab>('programs')
  const [assignOpen,   setAssignOpen]   = useState(false)
  const [detailTarget, setDetailTarget] = useState<{ intervention: Intervention; cohorts: EnrolledCohort[] } | null>(null)

  const [assignments, setAssignments] = useState<Assignment[]>(() =>
    INTERVENTIONS.flatMap(i => {
      const pa = i.partnerAssignments?.find((a: { partnerId: string; cohorts: EnrolledCohort[] }) => a.partnerId === partnerId)
      return pa ? [{ interventionId: i.id, cohorts: pa.cohorts }] : []
    })
  )

  // ── ECI — per-partner questions ─────────────────────────────────────────────
  const [p4Assigned,  setP4Assigned]  = useState(() => !!PARTNER_BASELINES[partnerId])
  const [p4Questions, setP4Questions] = useState<PartnerP4Question[]>(() =>
    PARTNER_BASELINES[partnerId]?.questions ?? createDefaultP4Questions()
  )

  function persistP4(questions: PartnerP4Question[]) {
    PARTNER_BASELINES[partnerId] = { partnerId, questions }
  }

  function handleToggleP4Assign(v: boolean) {
    setP4Assigned(v)
    if (v) { persistP4(p4Questions) }
    else { delete PARTNER_BASELINES[partnerId] }
  }

  function addP4Question(label: string, desc: string) {
    setP4Questions(prev => {
      const next = [...prev, { id: `p4_${Date.now()}`, label, desc, active: true }]
      persistP4(next)
      return next
    })
  }

  function editP4Question(id: string, label: string, desc: string) {
    setP4Questions(prev => {
      const next = prev.map(q => q.id !== id ? q : { ...q, label, desc })
      persistP4(next)
      return next
    })
  }

  function deleteP4Question(id: string) {
    setP4Questions(prev => {
      const next = prev.filter(q => q.id !== id)
      persistP4(next)
      return next
    })
  }

  function toggleP4QuestionActive(id: string) {
    setP4Questions(prev => {
      const next = prev.map(q => q.id !== id ? q : { ...q, active: !q.active })
      persistP4(next)
      return next
    })
  }

  const assignedIds = useMemo(() => new Set(assignments.map(a => a.interventionId)), [assignments])

  const opportunities = useMemo(() =>
    assignments
      .map(a => ({ intervention: INTERVENTIONS.find(i => i.id === a.interventionId)!, cohorts: a.cohorts }))
      .filter(x => x.intervention),
  [assignments])

  const allFarmers = useMemo(() => {
    const ids = new Set<string>()
    opportunities.forEach(({ cohorts }) =>
      cohorts.forEach(ec =>
        FARMERS_LIST.filter(f => f.enrollment?.programId === ec.programId && f.enrollment?.cohortId === ec.cohortId)
          .forEach(f => ids.add(f.id))
      )
    )
    return FARMERS_LIST.filter(f => ids.has(f.id))
  }, [opportunities])

  const uniqueCohorts = useMemo(() =>
    new Set(opportunities.flatMap(({ cohorts }) => cohorts.map((ec: EnrolledCohort) => ec.cohortId))).size,
  [opportunities])

  function handleAssign(interventionId: string, cohorts: EnrolledCohort[]) {
    setAssignments(prev => [...prev, { interventionId, cohorts }])
  }

  function handleRemove(interventionId: string) {
    setAssignments(prev => prev.filter(a => a.interventionId !== interventionId))
  }

  if (!partner) {
    return (
      <div className="p-6 text-center text-gray-400">
        <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>Partner not found.</p>
      </div>
    )
  }

  const headerVariant = partner.status === 'Active' ? 'success' : partner.status === 'Pending' ? 'warning' : 'neutral'

  return (
    <div className="p-6 space-y-6">

      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Partners
      </button>

      {/* Partner header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-wrap items-start gap-5">
        <PersonAvatar name={partner.name} size={56} shape="square" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{partner.name}</h1>
            <BadgeTemplate label={partner.status} variant={headerVariant} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{partner.type}</p>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{partner.region}</span>
            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{partner.email}</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Since {partner.since}</span>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Opportunities', value: opportunities.length },
            { label: 'Cohorts',       value: uniqueCohorts        },
            { label: 'Farmers',       value: allFarmers.length    },
          ].map(({ label, value }) => (
            <div key={label} className="text-center px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-100 min-w-18">
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact row */}
      <div className="flex items-center gap-3 px-1">
        <PersonAvatar name={partner.contact} size={36} />
        <div>
          <p className="text-sm font-semibold text-gray-800">{partner.contact}</p>
          <p className="text-xs text-gray-400">Primary Contact · {partner.email}</p>
        </div>
      </div>

      {/* Tab bar */}
      <ScrollTabsTemplate className="gap-1 border-b border-gray-200" fadeColor="white">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={[
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px shrink-0 whitespace-nowrap',
              activeTab === id
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300',
            ].join(' ')}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </ScrollTabsTemplate>

      {/* Tab content */}
      {activeTab === 'programs' && (
        <LinkedProgramsTab opportunities={opportunities} />
      )}
      {activeTab === 'interventions' && (
        <LinkedInterventionsTab
          opportunities={opportunities}
          onRemove={handleRemove}
          onAssign={() => setAssignOpen(true)}
          onDetail={setDetailTarget}
        />
      )}
      {activeTab === 'p4baseline' && (
        <P4BaselineTab
          assigned={p4Assigned}
          onToggleAssign={handleToggleP4Assign}
          questions={p4Questions}
          onAdd={addP4Question}
          onEdit={editP4Question}
          onDelete={deleteP4Question}
          onToggleActive={toggleP4QuestionActive}
        />
      )}
      {activeTab === 'risk' && (
        <RiskPerformanceTab opportunities={opportunities} />
      )}
      {activeTab === 'reports' && (
        <ReportsTab />
      )}

      <AssignSheet
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        assignedIds={assignedIds}
        onAssign={handleAssign}
      />

      {detailTarget && (
        <OpportunityDetailModal
          intervention={detailTarget.intervention}
          cohorts={detailTarget.cohorts}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  )
}
