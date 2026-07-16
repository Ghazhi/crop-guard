'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePersistedState } from '@/lib/usePersistedState'
import {
  Download, RefreshCw, Search, Clock, CheckCircle2,
  ArrowUp, ArrowDown, Minus, X, Phone, Hash,
  BarChart2, Layers, CheckSquare, Zap,
  User, CalendarDays, MapPin, Map, Home, Leaf, Ruler, BadgeCheck,
  BookOpen, Users, ChevronRight, Cpu, LayoutGrid,
} from 'lucide-react'
import type { CheckinRecord, BaselineItem } from '@/app/(admin)/dashboard/FRIDashboard/_logics/interface'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { DatagridTemplate } from '@/customComponents/DatagridTemplate'
import type { DatagridColumn } from '@/customComponents/DatagridTemplate'
import { getFRIFarmers, getFRIPrograms } from '@/app/(admin)/dashboard/FRIDashboard/_logics/functions'
import type { FRIFarmer, FRISummary, ProgramOption, FriZone, CreditRisk, PillarScore } from '@/app/(admin)/dashboard/FRIDashboard/_logics/interface'
import { PM_PROGRAM_IDS, isPmProgram, PM_PROGRAM_NAMES, isPmProgramName } from '@/dataCenter/pmScope'

// ── PM scoping helpers ────────────────────────────────────────────────────────
function isPmFarmer(f: FRIFarmer): boolean {
  return isPmProgram(f.programId) || isPmProgramName(f.programName)
}

function isPmProgramOption(p: ProgramOption): boolean {
  return PM_PROGRAM_IDS.includes(p.id) || PM_PROGRAM_NAMES.includes(p.name)
}

// Recompute the summary from the PM-scoped farmer list so every number
// matches exactly what the PM can see (never the global admin summary).
function computePmSummary(list: FRIFarmer[]): FRISummary {
  const scored = list.filter(f => f.currentFri !== null)
  const avgFri = scored.length ? Math.round(scored.reduce((s, f) => s + f.currentFri!, 0) / scored.length) : null
  return {
    totalFarmers:     list.length,
    scored:           scored.length,
    avgFri,
    baselinesDone:    list.filter(f => f.baselineDone).length,
    baselinesPending: list.filter(f => !f.baselineDone).length,
    totalCheckins:    list.reduce((s, f) => s + f.checkinCount, 0),
    verifiedCheckins: list.reduce((s, f) => s + f.verifiedCheckins, 0),
    helpRequested:    list.filter(f => f.helpRequested).length,
    leaderCount:      list.filter(f => f.currentZone === 'Resilience Leader').length,
    builderCount:     list.filter(f => f.currentZone === 'Resilience Builder').length,
    learnerCount:     list.filter(f => f.currentZone === 'Resilience Learner').length,
    starterCount:     list.filter(f => f.currentZone === 'Resilience Starter').length,
  }
}

// ── Select style ─────────────────────────────────────────────────────────────
const SELECT_STYLE: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234A5568' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
  backgroundSize: '12px',
}
const SELECT_CLS = 'h-8 pl-2.5 pr-7 text-sm border border-gray-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-1 focus:ring-(--brand-dark)/30 cursor-pointer text-(--brand-slate)'

// ── Zone config ───────────────────────────────────────────────────────────────
const ZONE_CFG: Record<FriZone, { label: string; badgeBg: string; badgeColor: string; pillBg: string; pillColor: string }> = {
  'Resilience Leader':  { label: 'Leader',  badgeBg: '#F3F0FF', badgeColor: '#5B21B6', pillBg: '#EDE9FE', pillColor: '#5B21B6' },
  'Resilience Builder': { label: 'Builder', badgeBg: '#DCFCE7', badgeColor: '#15803D', pillBg: '#DCFCE7', pillColor: '#15803D' },
  'Resilience Learner': { label: 'Learner', badgeBg: '#FEF3C7', badgeColor: '#B45309', pillBg: '#FEF3C7', pillColor: '#B45309' },
  'Resilience Starter': { label: 'Starter', badgeBg: '#FEE2E2', badgeColor: '#B91C1C', pillBg: '#FEE2E2', pillColor: '#B91C1C' },
}

const RISK_COLOR: Record<CreditRisk, string> = {
  'Low Risk':    '#15803D',
  'Medium Risk': '#B45309',
  'High Risk':   '#B91C1C',
}

const PILLAR_CFG: Record<string, { text: string; bg: string; bar: string }> = {
  P1:  { text: '#2C5F3F', bg: '#DCFCE7', bar: '#2C5F3F' },
  P2:  { text: '#2B7BB9', bg: '#DBEAFE', bar: '#2B7BB9' },
  P3:  { text: '#B45309', bg: '#FEF3C7', bar: '#E8963A' },
  P4:  { text: '#B91C1C', bg: '#FEE2E2', bar: '#D94F3D' },
  ECI: { text: '#2B7BB9', bg: '#DBEAFE', bar: '#2B7BB9' },
}

function friColor(score: number) {
  if (score >= 70) return 'var(--brand-green)'
  if (score >= 50) return 'var(--brand-amber)'
  return 'var(--brand-red)'
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Shared badge ──────────────────────────────────────────────────────────────
function ZoneBadge({ zone, size = 'sm' }: { zone: FriZone; size?: 'sm' | 'md' }) {
  const c = ZONE_CFG[zone]
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'}`}
          style={{ background: c.badgeBg, color: c.badgeColor }}>
      {c.label}
    </span>
  )
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' | null }) {
  if (!trend) return <span className="text-gray-300">—</span>
  if (trend === 'up')   return <ArrowUp   className="w-4 h-4 text-green-600" />
  if (trend === 'down') return <ArrowDown className="w-4 h-4 text-red-500"   />
  return <Minus className="w-4 h-4 text-gray-400" />
}

const FRI_FARMER_COLUMNS: DatagridColumn<FRIFarmer>[] = [
  {
    key: 'fullName', label: 'Farmer', width: '224px',
    render: (v, f) => (
      <>
        <p className="font-semibold text-sm" style={{ color: 'var(--brand-forest)' }}>{String(v)}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--brand-mid)' }}>{f.region} · {f.district}</p>
        <p className="text-[11px] mt-0.5 text-gray-400">
          {f.primaryCrop}{f.farmSize && f.farmSize !== '0' ? ` · ${f.farmSize}ha` : ''}
        </p>
      </>
    ),
  },
  {
    key: 'currentFri', label: 'FRI Score',
    render: (v, f) => f.currentFri !== null
      ? <span className="text-xl font-bold" style={{ color: friColor(f.currentFri) }}>{String(v)}</span>
      : <span className="text-gray-300">—</span>,
  },
  {
    key: 'creditRisk', label: 'Credit Risk',
    render: (v, f) => f.creditRisk
      ? <span className="text-sm font-medium" style={{ color: RISK_COLOR[f.creditRisk] }}>{String(v)}</span>
      : <span className="text-gray-300">—</span>,
  },
  {
    key: 'currentZone', label: 'Zone',
    render: (_, f) => f.currentZone ? <ZoneBadge zone={f.currentZone} /> : <span className="text-gray-300">—</span>,
  },
  {
    key: 'baselineDone', label: 'Baseline',
    render: (v) => v
      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
      : <Clock className="w-4 h-4 text-gray-300" />,
  },
  {
    key: 'checkinCount', label: 'Check-ins',
    render: (v, f) => f.checkinCount > 0 ? (
      <span className="flex flex-col leading-tight" style={{ color: 'var(--brand-forest)' }}>
        <span className="font-semibold">{String(v)}</span>
        <span className="text-[11px] text-gray-400">{f.verifiedCheckins}v</span>
      </span>
    ) : (
      <span className="text-sm" style={{ color: 'var(--brand-forest)' }}>0</span>
    ),
  },
  {
    key: 'friTrend', label: 'Trend',
    render: (_, f) => <TrendIcon trend={f.friTrend} />,
  },
]

// ── Page-level stat card ──────────────────────────────────────────────────────
function StatCard({ label, value, valueColor, sub }: {
  label: string; value: string | number; valueColor?: string; sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-col gap-1 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-3xl font-bold leading-none" style={{ color: valueColor ?? 'var(--brand-forest)' }}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function ZoneCard({ zone, count, selected, onClick }: {
  zone: FriZone; count: number; selected?: boolean; onClick?: () => void
}) {
  const c = ZONE_CFG[zone]
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border px-4 py-3 flex flex-col items-start gap-2 transition-all ${
        selected
          ? 'bg-white border-2'
          : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
      style={selected ? { borderColor: c.pillColor } : undefined}
    >
      <p className="text-3xl font-bold" style={{ color: selected ? c.pillColor : 'var(--brand-forest)' }}>{count}</p>
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: c.pillBg, color: c.pillColor }}>
        {c.label}
      </span>
    </button>
  )
}

// ── Pillar bar ────────────────────────────────────────────────────────────────
function PillarBar({ p }: { p: PillarScore }) {
  const pct = Math.round((p.score / p.max) * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--brand-forest)' }}>
          {p.code} {p.name}
        </span>
        <span className="text-xs font-semibold" style={{ color: 'var(--brand-forest)' }}>
          {p.score}/{p.max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.color }} />
      </div>
      <p className="text-xs text-gray-400">{pct}%</p>
    </div>
  )
}

// ── Detail sheet ──────────────────────────────────────────────────────────────
type DetailTab = 'overview' | 'baseline' | 'checkins' | 'norvi'

const TABS: { id: DetailTab; label: string; Icon: React.ElementType }[] = [
  { id: 'overview',  label: 'Overview',  Icon: BarChart2    },
  { id: 'baseline',  label: 'Baseline',  Icon: Layers       },
  { id: 'checkins',  label: 'Check-ins', Icon: CheckSquare  },
  { id: 'norvi',     label: 'Norvi AI',  Icon: Zap          },
]

function FarmerDetailSheet({ farmer, open, onClose }: {
  farmer: FRIFarmer | null; open: boolean; onClose: () => void
}) {
  const [tab,           setTab]           = useState<DetailTab>('overview')
  const [showAllScores, setShowAllScores] = useState(false)
  const [expandedWeek,  setExpandedWeek]  = useState<number | null>(null)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab('overview'); setShowAllScores(false); setExpandedWeek(null)
    }
  }, [open])

  const [now] = useState(() => Date.now())
  const farmerAge = farmer?.dateOfBirth
    ? Math.floor((now - new Date(farmer.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  if (!farmer) return null

  const verifyRate = farmer.checkinCount > 0
    ? Math.round((farmer.verifiedCheckins / farmer.checkinCount) * 100)
    : null

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent showCloseButton={false} side="right" className="w-full sm:w-135 sm:max-w-135 p-0 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--brand-forest)' }}>{farmer.fullName}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 shrink-0">
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-xs font-medium transition-colors ${
                        tab === t.id
                          ? 'bg-white shadow-sm text-(--brand-forest)'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}>
                <t.Icon className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {tab === 'overview' && (
            <>
              {/* FRI hero */}
              {farmer.currentFri !== null && farmer.currentZone ? (
                <div className="rounded-xl px-4 py-4" style={{ background: 'var(--brand-mint)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <ZoneBadge zone={farmer.currentZone} size="md" />
                      {farmer.recommendation && (
                        <p className="text-xs" style={{ color: 'var(--brand-slate)' }}>{farmer.recommendation}</p>
                      )}
                      <p className="text-xs text-gray-400">Final score · Week {farmer.scoreWeek}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-4xl font-bold leading-none" style={{ color: friColor(farmer.currentFri) }}>
                        {farmer.currentFri}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">FRI / 100</p>
                      {farmer.creditRisk && (
                        <>
                          <p className="text-xs font-semibold mt-1" style={{ color: RISK_COLOR[farmer.creditRisk] }}>
                            {farmer.creditRisk}
                          </p>
                          <p className="text-[11px] text-gray-400">Credit risk</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl px-4 py-4 bg-gray-50 text-center">
                  <p className="text-sm text-gray-400">No FRI score yet</p>
                </div>
              )}

              {/* Pillar breakdown */}
              {farmer.currentFri !== null && farmer.pillars.some(p => p.score > 0) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Pillar Breakdown
                  </p>
                  <div className="space-y-3">
                    {farmer.pillars.map(p => <PillarBar key={p.code} p={p} />)}
                  </div>
                </div>
              )}

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Check-ins</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--brand-forest)' }}>{farmer.checkinCount}</p>
                  <p className="text-xs text-gray-400">{farmer.verifiedCheckins} verified</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Verify Rate</p>
                  <p className="text-xl font-bold" style={{ color: verifyRate !== null && verifyRate >= 50 ? 'var(--brand-amber)' : 'var(--brand-forest)' }}>
                    {verifyRate !== null ? `${verifyRate}%` : '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Baseline</p>
                  {farmer.baselineDone ? (
                    <>
                      <p className="text-xl font-bold" style={{ color: 'var(--brand-green)' }}>Done</p>
                      {farmer.baselineDate && (
                        <p className="text-xs text-gray-400">{fmtDate(farmer.baselineDate)}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-gray-300">—</p>
                  )}
                </div>
              </div>

              {/* Farmer details */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Farmer Details
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {[
                    { Icon: Phone,      label: 'Phone',       value: farmer.phone },
                    { Icon: Hash,       label: 'National ID', value: farmer.nationalId },
                    { Icon: User,       label: 'Gender',      value: farmer.gender || '—' },
                    { Icon: CalendarDays, label: 'Age',       value: farmerAge !== null ? `${farmerAge} yrs` : '—' },
                    { Icon: MapPin,     label: 'Region',      value: farmer.region },
                    { Icon: Map,        label: 'District',    value: farmer.district },
                    { Icon: Home,       label: 'Community',   value: farmer.community || '—' },
                    { Icon: Leaf,       label: 'Crop',        value: farmer.primaryCrop },
                    { Icon: Ruler,      label: 'Farm Size',   value: farmer.farmSize && farmer.farmSize !== '0' ? `${farmer.farmSize} ha` : '—' },
                    { Icon: BadgeCheck, label: 'Verified',    value: farmer.verified ? 'Yes' : 'No' },
                  ].map(({ Icon, label, value }) => (
                    <div key={label}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <Icon className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="text-[11px] text-gray-400">{label}</span>
                      </div>
                      <p className="text-xs font-medium pl-4" style={{ color: 'var(--brand-forest)' }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enrollment */}
              {farmer.programId && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--brand-dark)' }}>
                    Enrollment
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {[
                      { Icon: BookOpen, label: 'Program',        value: farmer.programName ?? '—' },
                      { Icon: Users,    label: 'Cohort',         value: farmer.cohortName  ?? '—' },
                      { Icon: CheckCircle2, label: 'Status',     value: farmer.enrollStatus ? farmer.enrollStatus.charAt(0).toUpperCase() + farmer.enrollStatus.slice(1) : '—' },
                      { Icon: CalendarDays, label: 'Enrolled',   value: farmer.enrolledDate ? fmtDate(farmer.enrolledDate) : '—' },
                    ].map(({ Icon, label, value }) => (
                      <div key={label}>
                        <div className="flex items-center gap-1 mb-0.5">
                          <Icon className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="text-[11px] text-gray-400">{label}</span>
                        </div>
                        <p className="text-xs font-medium pl-4" style={{ color: 'var(--brand-forest)' }}>{value}</p>
                      </div>
                    ))}
                    {farmer.agentName && (
                      <div className="col-span-2">
                        <div className="flex items-center gap-1 mb-0.5">
                          <User className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="text-[11px] text-gray-400">Assigned Agent</span>
                        </div>
                        <p className="text-xs font-medium pl-4" style={{ color: 'var(--brand-forest)' }}>{farmer.agentName}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Baseline tab ── */}
          {tab === 'baseline' && (
            <>
              {/* Hero */}
              {farmer.currentFri !== null && farmer.currentZone ? (
                <div className="rounded-xl px-4 py-4" style={{ background: 'var(--brand-mint)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <ZoneBadge zone={farmer.currentZone} size="md" />
                      {farmer.baselineDate && (
                        <p className="text-xs" style={{ color: 'var(--brand-slate)' }}>
                          Assessed {fmtDate(farmer.baselineDate)}
                        </p>
                      )}
                      {farmer.agentName && (
                        <p className="text-xs" style={{ color: 'var(--brand-slate)' }}>
                          Agent: {farmer.agentName}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-4xl font-bold leading-none" style={{ color: friColor(farmer.currentFri) }}>
                        {farmer.currentFri}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">FRI / 100</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl px-4 py-4 bg-gray-50 text-center">
                  <p className="text-sm text-gray-400">No baseline recorded yet</p>
                </div>
              )}

              {/* 2-column pillar grid */}
              {farmer.baselinePillars.some(p => p.score > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {farmer.baselinePillars.map(p => {
                    const pct = Math.round((p.score / p.max) * 100)
                    return (
                      <div key={p.code} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-bold uppercase tracking-wide truncate" style={{ color: p.color }}>
                            {p.code} — {p.name}
                          </span>
                          <span className="text-xs font-semibold shrink-0" style={{ color: p.color }}>
                            {p.score}/{p.max}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ECI card */}
              {farmer.eci && (
                <div className="rounded-xl px-4 py-3" style={{ background: '#EFF6FF' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--brand-blue)' }}>
                        ECI — Eligibility Index
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--brand-green)' }}>
                        {farmer.eci.criteria} eligibility criteria
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold leading-none" style={{ color: 'var(--brand-blue)' }}>
                        {farmer.eci.score}
                        <span className="text-sm font-normal text-gray-400">/{farmer.eci.max}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {Math.round((farmer.eci.score / farmer.eci.max) * 100)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* View all scores (expandable) */}
              {farmer.currentFri !== null && (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowAllScores(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                    style={{ color: 'var(--brand-slate)' }}>
                    <span>View all item scores</span>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showAllScores ? 'rotate-90' : ''}`} />
                  </button>

                  {showAllScores && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
                      {/* Items grouped by pillar */}
                      {(['P1','P2','P3','P4'] as const).map(code => {
                        const items = (farmer.baselineItems ?? []).filter(it => it.pillar === code)
                        const bp    = farmer.baselinePillars.find(p => p.code === code)
                        if (!items.length || !bp) return null
                        const cfg = PILLAR_CFG[code]
                        return (
                          <div key={code}>
                            <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: cfg.bar }}>
                              {code} — {bp.name}
                            </p>
                            <div className="space-y-2">
                              {items.map((it: BaselineItem) => {
                                const pct = Math.round((it.score / it.max) * 100)
                                return (
                                  <div key={it.name} className="flex items-center gap-3">
                                    <span className="flex-1 text-sm truncate" style={{ color: cfg.text }}>{it.name}</span>
                                    <div className="w-20 h-1.5 rounded-full bg-gray-100 shrink-0">
                                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.bar }} />
                                    </div>
                                    <span className="text-xs font-medium w-8 text-right shrink-0" style={{ color: 'var(--brand-forest)' }}>
                                      {it.score}/{it.max}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}

                      {/* ECI items */}
                      {(farmer.eciItems ?? []).length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: PILLAR_CFG.ECI.text }}>
                            ECI Items
                          </p>
                          <div className="space-y-2">
                            {(farmer.eciItems ?? []).map((it: BaselineItem) => {
                              const pct = Math.round((it.score / it.max) * 100)
                              return (
                                <div key={it.name} className="flex items-center gap-3">
                                  <span className="flex-1 text-sm truncate" style={{ color: PILLAR_CFG.ECI.text }}>{it.name}</span>
                                  <div className="w-20 h-1.5 rounded-full bg-gray-100 shrink-0">
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PILLAR_CFG.ECI.bar }} />
                                  </div>
                                  <span className="text-xs font-medium w-8 text-right shrink-0" style={{ color: 'var(--brand-forest)' }}>
                                    {it.score}/{it.max}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Check-ins tab ── */}
          {tab === 'checkins' && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Total</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--brand-forest)' }}>{farmer.checkinCount}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Verified</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--brand-green)' }}>{farmer.verifiedCheckins}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Help Req.</p>
                  <p className="text-xl font-bold" style={{ color: (farmer.checkins ?? []).filter(c => c.helpNeeded).length > 0 ? 'var(--brand-amber)' : 'var(--brand-forest)' }}>
                    {(farmer.checkins ?? []).filter(c => c.helpNeeded).length}
                  </p>
                </div>
              </div>

              {/* Checkin list */}
              {(farmer.checkins ?? []).length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400">No check-ins recorded yet.</p>
                </div>
              ) : (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  {(farmer.checkins ?? []).map((c: CheckinRecord, i: number) => {
                    const isOpen = expandedWeek === c.week
                    return (
                      <div key={c.week} className={i > 0 ? 'border-t border-gray-100' : ''}>
                        {/* Row header */}
                        <div
                          onClick={() => setExpandedWeek(isOpen ? null : c.week)}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                          <span className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                style={{ background: 'var(--brand-forest)' }}>
                            W{c.week}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold" style={{ color: 'var(--brand-forest)' }}>Week {c.week}</p>
                            <p className="text-xs text-gray-400">{fmtDate(c.date)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {c.helpNeeded && (
                              <span className="text-xs font-medium" style={{ color: 'var(--brand-amber)' }}>Help needed</span>
                            )}
                            {c.verified && (
                              <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                              </span>
                            )}
                          </div>
                          <ChevronRight className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                        </div>

                        {/* Expanded content */}
                        {isOpen && (
                          <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3 bg-gray-50/40">
                            {/* Verified by */}
                            {c.verified && c.verifiedBy && (
                              <p className="text-[11px] text-green-700 font-medium">
                                Verified by {c.verifiedBy} on {fmtDate(c.date)}
                              </p>
                            )}
                            {/* Pillar score cards */}
                            <div className="grid grid-cols-4 gap-2">
                              {([ ['P1', c.pillarScores?.p1 ?? 0, 30], ['P2', c.pillarScores?.p2 ?? 0, 30], ['P3', c.pillarScores?.p3 ?? 0, 20], ['P4', c.pillarScores?.p4 ?? 0, 20] ] as [string, number, number][]).map(([code, score, max]) => {
                                const cfg = PILLAR_CFG[code]
                                return (
                                  <div key={code} className="rounded-lg px-2 py-2 text-center" style={{ background: cfg.bg }}>
                                    <p className="text-[11px] font-bold" style={{ color: cfg.text }}>{code}</p>
                                    <p className="text-xs font-bold leading-none mt-0.5" style={{ color: cfg.text }}>
                                      {score}<span className="text-[11px] font-normal">/{max}</span>
                                    </p>
                                  </div>
                                )
                              })}
                            </div>

                            {/* Item list */}
                            <div className="space-y-1.5">
                              {(c.items ?? []).map((it, idx) => {
                                const cfg = PILLAR_CFG[it.pillar] ?? PILLAR_CFG.P1
                                return (
                                  <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-sm truncate" style={{ color: cfg.text }}>{it.name}</span>
                                      <span className="text-[10px] text-gray-400 shrink-0">{it.pillar}</span>
                                    </div>
                                    <span className="text-xs font-semibold shrink-0 ml-2"
                                          style={{ color: it.value ? '#15803D' : '#B91C1C' }}>
                                      {it.value ? 'Yes' : 'No'}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Norvi AI tab ── */}
          {tab === 'norvi' && (
            <>
              {/* Dark header */}
              <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'var(--brand-forest)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/10">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">Norvi AI · Credit Brief</p>
                  <p className="text-xs text-white/60">Week {farmer.scoreWeek}</p>
                </div>
                <button className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5 text-white" />
                </button>
              </div>

              {/* Empty state + generate */}
              <div className="flex flex-col items-center justify-center py-10 gap-4">
                <p className="text-sm text-gray-400">No interpretation generated yet.</p>
                <button className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ background: 'var(--brand-dark)' }}>
                  <Cpu className="w-4 h-4" />
                  Generate
                </button>
              </div>
            </>
          )}

        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function Main() {
  const [farmers,  setFarmers]  = useState<FRIFarmer[]>([])
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [loading,  setLoading]  = useState(true)

  const [search,        setSearch]        = usePersistedState('pm-fri-search', '')
  const [filterProgram, setFilterProgram] = usePersistedState('pm-fri-program', '')
  const [filterCohort,  setFilterCohort]  = usePersistedState('pm-fri-cohort', '')
  const [filterStatus,  setFilterStatus]  = usePersistedState('pm-fri-status', '')
  const [filterZone,    setFilterZone]    = usePersistedState<FriZone | ''>('pm-fri-zone', '')
  const [showCards,     setShowCards]     = usePersistedState('pm-fri-show-cards', false)

  const [focusFarmer, setFocusFarmer] = useState<FRIFarmer | null>(null)
  const [detailOpen,  setDetailOpen]  = useState(false)

  useEffect(() => {
    Promise.all([getFRIFarmers(), getFRIPrograms()]).then(([f, p]) => {
      setFarmers(f.filter(isPmFarmer))
      setPrograms(p.filter(isPmProgramOption))
      setLoading(false)
    })
  }, [])

  // PM-scoped summary recomputed from the filtered farmer list, so every
  // aggregate matches the rows the PM can actually see.
  const summary: FRISummary | null = useMemo(
    () => (loading ? null : computePmSummary(farmers)),
    [loading, farmers],
  )

  const cohortOptions = useMemo(() => {
    if (!filterProgram) return programs.flatMap(p => p.cohorts)
    return programs.find(p => p.id === filterProgram)?.cohorts ?? []
  }, [programs, filterProgram])

  const displayed = useMemo(() => {
    let list = farmers
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(f => f.fullName.toLowerCase().includes(q) || f.phone.includes(q))
    }
    if (filterProgram) list = list.filter(f => f.programId === filterProgram)
    if (filterCohort)  list = list.filter(f => f.cohortId  === filterCohort)
    if (filterStatus === 'scored')        list = list.filter(f => f.currentFri !== null)
    if (filterStatus === 'not_scored')    list = list.filter(f => f.currentFri === null)
    if (filterStatus === 'baseline_done') list = list.filter(f => f.baselineDone)
    if (filterStatus === 'help')          list = list.filter(f => f.helpRequested)
    if (filterZone) list = list.filter(f => f.currentZone === filterZone)
    return list
  }, [farmers, search, filterProgram, filterCohort, filterStatus, filterZone])

  function openDetail(f: FRIFarmer) {
    setFocusFarmer(f)
    setDetailOpen(true)
  }

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--brand-forest)' }}>FRI &amp; Performance</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--brand-slate)' }}>
            {loading ? '…' : `${summary?.totalFarmers ?? 0} farmers · ${summary?.scored ?? 0} scored`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowCards(s => !s)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-colors ${
              showCards
                ? 'border-transparent text-white'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
            style={showCards ? { background: 'var(--brand-forest)' } : undefined}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Overview
          </button>
          <ButtonTemplate variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />} label="Export CSV" />
          <ButtonTemplate variant="ghost" size="sm" isIcon><RefreshCw className="w-4 h-4" /></ButtonTemplate>
        </div>
      </div>

      {/* Stat + Zone cards (collapsible) */}
      {showCards && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)
            ) : summary && (
              <>
                <StatCard label="Total Farmers"   value={summary.totalFarmers} sub="enrolled" />
                <StatCard label="Avg FRI Score"   value={summary.avgFri ?? '—'} valueColor={summary.avgFri ? 'var(--brand-green)' : undefined} sub="all scored farmers" />
                <StatCard label="Baselines Done"  value={summary.baselinesDone} sub={`${summary.baselinesPending} pending`} />
                <StatCard label="Check-ins"       value={summary.totalCheckins} sub={`${summary.verifiedCheckins} verified`} />
                <StatCard label="Farmers w/ Help" value={summary.helpRequested} valueColor={summary.helpRequested > 0 ? 'var(--brand-amber)' : undefined} sub="help requested" />
              </>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)
            ) : summary && (
              <>
                {(['Resilience Leader', 'Resilience Builder', 'Resilience Learner', 'Resilience Starter'] as FriZone[]).map(zone => (
                  <ZoneCard
                    key={zone}
                    zone={zone}
                    count={zone === 'Resilience Leader' ? summary.leaderCount : zone === 'Resilience Builder' ? summary.builderCount : zone === 'Resilience Learner' ? summary.learnerCount : summary.starterCount}
                    selected={filterZone === zone}
                    onClick={() => setFilterZone(prev => prev === zone ? '' : zone)}
                  />
                ))}
              </>
            )}
          </div>
        </>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-(--brand-dark)/30"
            style={{ color: 'var(--brand-slate)' }}
          />
        </div>
        <select value={filterProgram} onChange={e => { setFilterProgram(e.target.value); setFilterCohort('') }}
                className={SELECT_CLS} style={SELECT_STYLE}>
          <option value="">All programs</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterCohort} onChange={e => setFilterCohort(e.target.value)}
                className={SELECT_CLS} style={SELECT_STYLE} disabled={!cohortOptions.length}>
          <option value="">All cohorts</option>
          {cohortOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className={SELECT_CLS} style={SELECT_STYLE}>
          <option value="">All statuses</option>
          <option value="scored">Scored</option>
          <option value="not_scored">Not Scored</option>
          <option value="baseline_done">Baseline Done</option>
          <option value="help">Help Requested</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4">
          <DatagridTemplate<FRIFarmer>
            columns={FRI_FARMER_COLUMNS}
            data={displayed}
            rowKey="id"
            isLoading={loading}
            onRowClick={openDetail}
            emptyLabel="No farmers match the current filters."
            defaultPageSize={0}
            pageSizeOptions={[0]}
          />
        </div>
      </div>

      {/* Detail sheet */}
      <FarmerDetailSheet
        farmer={focusFarmer}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

    </div>
  )
}
