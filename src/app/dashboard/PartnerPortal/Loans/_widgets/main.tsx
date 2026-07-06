'use client'

import { useState, useEffect } from 'react'
import {
  ChevronDown, ChevronUp, Package, AlertCircle, UserPlus,
  Layers, Users, TrendingUp, Search, Clock, CheckCircle2, XCircle,
} from 'lucide-react'
import { SheetTemplate }  from '@/customComponents/SheetTemplate'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { BadgeTemplate }  from '@/customComponents/BadgeTemplate'
import { INTERVENTIONS }  from '@/dataCenter/interventions'
import { INTERVENTION_PROGRAM_OPTIONS } from '@/dataCenter/programOptions'
import { FARMERS_LIST }  from '@/dataCenter/farmerManagement'
import type { Intervention, EnrolledCohort, InterventionStatus, InterventionType } from '@/app/dashboard/OpportunityPathways/_logics/interface'
import type { Farmer }   from '@/app/dashboard/FarmersRegistry/_logics/interface'
import { PersonAvatar }  from '@/customComponents/PersonAvatar'
import { usePartnerId }  from '../../_logics/usePartnerId'
import { StatCard }      from '../../_components/StatCard'

// ── Constants ──────────────────────────────────────────────────────────────────
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

// ── Enrol sheet ────────────────────────────────────────────────────────────────
type EnrolTab = 'eligible' | 'applied' | 'approved' | 'rejected' | 'closed'

interface EnrolledEntry { farmerId: string; date: string }

const TAB_EMPTY: Record<EnrolTab, { icon: React.ReactNode; message: string }> = {
  eligible: { icon: <Users className="w-7 h-7 text-gray-300" />,        message: 'No eligible farmers.' },
  applied:  { icon: <Clock className="w-7 h-7 text-gray-300" />,        message: 'No pending applications.' },
  approved: { icon: <CheckCircle2 className="w-7 h-7 text-gray-300" />, message: 'No approved enrolments.' },
  rejected: { icon: <XCircle className="w-7 h-7 text-gray-300" />,      message: 'No rejected applications.' },
  closed:   { icon: <XCircle className="w-7 h-7 text-gray-300" />,      message: 'No closed applications.' },
}

function EnrolSheet({ open, onClose, intervention, partnerCohorts }: {
  open:           boolean
  onClose:        () => void
  intervention:   Intervention | null
  partnerCohorts: EnrolledCohort[]
}) {
  const [tab,         setTab]        = useState<EnrolTab>('eligible')
  const [search,      setSearch]     = useState('')
  const [selected,    setSelected]   = useState<Set<string>>(new Set())
  const [entries,     setEntries]    = useState<EnrolledEntry[]>([])
  const [appliedIds,  setAppliedIds] = useState<Set<string>>(new Set())
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set())
  const [suspended,   setSuspended]  = useState<Set<string>>(new Set())
  const [saving,      setSaving]     = useState(false)
  const [filterProg,  setFilterProg] = useState('')
  const [filterCohort, setFilterCohort] = useState('')

  useEffect(() => {
    if (open) {
      setTab('eligible'); setSearch(''); setSelected(new Set())
      setFilterProg(''); setFilterCohort('')
    }
  }, [open])

  if (!intervention) return null

  const approvedIds   = new Set(entries.map(e => e.farmerId))
  const enrolledIds   = new Set([...approvedIds, ...appliedIds, ...rejectedIds, ...suspended])
  const minFri        = intervention.minFri ?? 0
  const allFarmers    = FARMERS_LIST as Farmer[]

  const visibleCohortIds = partnerCohorts
    .filter(ec => (!filterProg || ec.programId === filterProg) && (!filterCohort || ec.cohortId === filterCohort))
    .map(ec => ec.cohortId)

  const cohortFarmers = partnerCohorts.length === 0
    ? allFarmers
    : allFarmers.filter(f => f.enrollment?.cohortId && visibleCohortIds.includes(f.enrollment.cohortId))

  const eligible = cohortFarmers.filter(f => (f.currentFri ?? 0) >= minFri && !enrolledIds.has(f.id))
  const applied  = allFarmers.filter(f => appliedIds.has(f.id))
  const approved = allFarmers.filter(f => approvedIds.has(f.id) && !suspended.has(f.id))
  const rejected = allFarmers.filter(f => rejectedIds.has(f.id))
  const closed   = allFarmers.filter(f => suspended.has(f.id))

  const tabFarmers: Record<EnrolTab, Farmer[]> = { eligible, applied, approved, rejected, closed }

  const displayed = tabFarmers[tab].filter(f =>
    !search || f.fullName.toLowerCase().includes(search.toLowerCase()) || f.phone.includes(search)
  )

  const enrolledPrograms  = [...new Map(partnerCohorts.map(ec => [ec.programId, { id: ec.programId, name: ec.programName }])).values()]
  const filterableCohorts = partnerCohorts.filter(ec => !filterProg || ec.programId === filterProg)

  function toggleSelect(id: string) {
    if (enrolledIds.has(id)) return
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleEnrol() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    const fresh = [...selected].filter(id => !enrolledIds.has(id))
    setAppliedIds(prev => new Set([...prev, ...fresh]))
    setSelected(new Set())
    setTab('applied')
    setSaving(false)
  }

  function handleApprove(id: string) {
    const today = new Date().toLocaleDateString('en-US')
    setAppliedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    setEntries(prev => [...prev, { farmerId: id, date: today }])
  }

  function handleReject(id: string) {
    setAppliedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    setRejectedIds(prev => new Set([...prev, id]))
  }

  function handleSuspend(id: string) { setSuspended(prev => new Set([...prev, id])) }
  function handleClose(id: string) {
    setEntries(prev => prev.filter(e => e.farmerId !== id))
    setSuspended(prev => new Set([...prev, id]))
  }

  const enrollableSelected = [...selected].filter(id => !enrolledIds.has(id))

  const TABS: { key: EnrolTab; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'eligible', label: 'Eligible',  count: eligible.length,  icon: <Users className="w-3.5 h-3.5" /> },
    { key: 'applied',  label: 'Applied',   count: applied.length,   icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'approved', label: 'Approved',  count: approved.length,  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { key: 'rejected', label: 'Rejected',  count: rejected.length,  icon: <XCircle className="w-3.5 h-3.5" /> },
    { key: 'closed',   label: 'Closed',    count: closed.length,    icon: <XCircle className="w-3.5 h-3.5" /> },
  ]

  return (
    <SheetTemplate open={open} onClose={onClose} title={intervention.name} size="lg" bodyClassName="flex flex-col">

      {/* Enrolled cohorts (read-only for partner) */}
      <div className="px-4 pt-4 pb-3 shrink-0 space-y-2 border-b border-gray-100">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Assigned Cohorts</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {partnerCohorts.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No cohorts assigned</p>
          ) : partnerCohorts.map(ec => (
            <span key={ec.cohortId}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              <span className="text-green-500 text-[10px] font-normal">{ec.programName.split(' ')[0]} ·</span>{' '}
              {ec.cohortName}
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      {partnerCohorts.length > 0 && (
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
            <input type="text" placeholder="Search farmers…" value={search} onChange={e => setSearch(e.target.value)}
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
        ) : tab === 'applied' ? (
          <div className="px-3 py-2 space-y-1">
            {displayed.map(f => (
              <div key={f.id} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-all">
                <PersonAvatar name={f.fullName} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--brand-forest)' }}>{f.fullName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{f.phone}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleApprove(f.id)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors hover:bg-green-50"
                    style={{ borderColor: '#16a34a', color: '#15803d' }}>Approve</button>
                  <button onClick={() => handleReject(f.id)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-red-200 text-red-500 transition-colors hover:bg-red-50">Reject</button>
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'approved' ? (
          <div className="px-3 py-2 space-y-1">
            {displayed.map(f => {
              const entry = entries.find(e => e.farmerId === f.id)
              return (
                <div key={f.id} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-all">
                  <PersonAvatar name={f.fullName} size={32} />
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
                  <PersonAvatar name={f.fullName} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--brand-forest)' }}>{f.fullName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{f.phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {f.currentFri !== null ? (
                      <>
                        <p className="text-sm font-bold" style={{ color: 'var(--brand-forest)' }}>{f.currentFri?.toFixed(1)}</p>
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

// ── Intervention card (partner view) ──────────────────────────────────────────
function InterventionCard({ intervention: iv, partnerCohorts, onEnrol }: {
  intervention:   Intervention
  partnerCohorts: EnrolledCohort[]
  onEnrol:        () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const iconColor = TYPE_ICON_COLOR[iv.type] ?? 'var(--brand-forest)'

  return (
    <div className={[
      'rounded-xl border overflow-hidden transition-colors',
      iv.status === 'Suspended'
        ? 'bg-gray-50 border-gray-200 opacity-60 grayscale-40'
        : 'bg-white border-gray-200 hover:border-gray-300',
    ].join(' ')}>
      <div className="px-5 py-4 flex items-start gap-4 cursor-pointer" onClick={onEnrol}>
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
            {partnerCohorts.length > 0 ? (
              <p className="text-[11px] font-medium" style={{ color: 'var(--brand-green)' }}>
                {partnerCohorts.length} cohort{partnerCohorts.length !== 1 ? 's' : ''}
              </p>
            ) : (
              <p className="text-[11px] text-gray-400">No cohorts assigned</p>
            )}
            {iv.valueDescription && (
              <p className="text-sm font-bold" style={{ color: 'var(--brand-dark)' }}>{iv.valueDescription}</p>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span>Min FRI: <span className="font-semibold text-(--brand-slate)">{iv.minFri}</span></span>
            <span>Capacity: <span className="font-semibold text-(--brand-slate)">{iv.capacity}</span></span>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
        <ButtonTemplate
          variant="primary" size="sm"
          leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          label="Enrol"
          onClick={onEnrol}
        />
        <div className="flex-1" />
        <ButtonTemplate
          variant="ghost" size="sm" isIcon
          leftIcon={expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          onClick={() => setExpanded(e => !e)}
        />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100" style={{ background: 'var(--brand-mint)' }}>
          <div className="px-5 py-4 space-y-4">
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

// ── Main ───────────────────────────────────────────────────────────────────────
const STATUSES = ['Active', 'Suspended', 'Draft'] as const

export function Main() {
  const partnerId                        = usePartnerId()
  const [filterProg,   setFilterProg]    = useState('')
  const [filterStatus, setFilterStatus]  = useState('')
  const [enrollTarget, setEnrollTarget]  = useState<Intervention | null>(null)

  const myInterventions = INTERVENTIONS.filter(iv =>
    iv.partnerAssignments?.some(pa => pa.partnerId === partnerId)
  )

  const filtered = myInterventions.filter(iv => {
    const pa = iv.partnerAssignments?.find(a => a.partnerId === partnerId)
    if (filterProg && !pa?.cohorts.some(c => c.programId === filterProg)) return false
    if (filterStatus && iv.status !== filterStatus) return false
    return true
  })

  function getPartnerCohorts(iv: Intervention): EnrolledCohort[] {
    return iv.partnerAssignments?.find(pa => pa.partnerId === partnerId)?.cohorts ?? []
  }

  const activeCount   = myInterventions.filter(iv => iv.status === 'Active').length
  const cohortCount   = myInterventions.reduce((sum, iv) => sum + getPartnerCohorts(iv).length, 0)
  const totalCapacity = myInterventions.reduce((sum, iv) => sum + iv.capacity, 0)

  const enrollTargetCohorts = enrollTarget ? getPartnerCohorts(enrollTarget) : []

  return (
    <div className="min-h-screen bg-(--brand-gray) p-6 space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--brand-forest)' }}>Linked Interventions</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--brand-dark)' }}>
          {myInterventions.length} opportunit{myInterventions.length === 1 ? 'y' : 'ies'} assigned to your organisation
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={<Layers className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />}    label="Total"    value={myInterventions.length} />
        <StatCard icon={<TrendingUp className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />} label="Active"   value={activeCount} />
        <StatCard icon={<Users className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />}      label="Cohorts"  value={cohortCount} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <SelectTemplate
          options={[
            { value: '', label: 'All programs' },
            ...INTERVENTION_PROGRAM_OPTIONS.map(p => ({ value: p.id, label: p.name })),
          ]}
          value={filterProg} size="sm"
          onChange={e => setFilterProg(e.currentTarget.value)}
        />
        <SelectTemplate
          options={[{ value: '', label: 'All statuses' }, ...STATUSES.map(s => ({ value: s, label: s }))]}
          value={filterStatus} size="sm"
          onChange={e => setFilterStatus(e.currentTarget.value)}
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-gray-300" />
          <p className="text-sm text-gray-400">No interventions found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {filtered.map(iv => (
            <InterventionCard
              key={iv.id}
              intervention={iv}
              partnerCohorts={getPartnerCohorts(iv)}
              onEnrol={() => setEnrollTarget(iv)}
            />
          ))}
        </div>
      )}

      <EnrolSheet
        open={enrollTarget !== null}
        onClose={() => setEnrollTarget(null)}
        intervention={enrollTarget}
        partnerCohorts={enrollTargetCohorts}
      />
    </div>
  )
}
