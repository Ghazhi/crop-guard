'use client'

import { useState, useEffect, useMemo } from 'react'
import { Users, ClipboardList, UserCheck, TrendingUp, Zap, ArrowUp, ArrowDown, Minus, Phone, MapPin, Search } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { CardTemplate }  from '@/customComponents/CardTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { FARMERS_LIST }  from '@/dataCenter/farmerManagement'
import { INTERVENTIONS } from '@/dataCenter/interventions'
import { AGENTS }        from '@/dataCenter/agents'
import { getStats, getCropBreakdown, getZoneBreakdown } from '../_logics/functions'
import type { Stats, CropBreakdown, ZoneBreakdown } from '../_logics/interface'
import type { Farmer } from '@/app/(admin)/dashboard/FarmersRegistry/_logics/interface'
import type { AgentSummary } from '@/app/(admin)/dashboard/AgentAssignment/_logics/interface'
import type { Intervention } from '@/app/(admin)/dashboard/OpportunityPathways/_logics/interface'
import { cn } from '@/lib/utils'

// ── Zone colors ────────────────────────────────────────────────────────────────
const ZONE_COLORS: Record<string, string> = {
  'Resilience Leader':  '#7C3AED',
  'Resilience Builder': '#16a34a',
  'Resilience Learner': '#ca8a04',
  'Resilience Starter': '#dc2626',
}

// ── Farmer card list ───────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

function FarmerCard({ farmer }: { farmer: Farmer }) {
  const enroll  = farmer.enrollment
  const variant = enroll?.status === 'active' ? 'success' : enroll?.status === 'graduated' ? 'info' : 'neutral'

  return (
    <div className="px-4 py-4 border-b border-gray-100 last:border-0">
      <p className="text-base font-semibold text-gray-900 mb-1">{farmer.fullName}</p>
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
        <span className="flex items-center gap-1">
          <Phone className="w-3 h-3" />{farmer.phone}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />{farmer.community}
        </span>
      </div>
      {enroll ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BadgeTemplate label={enroll.status} variant={variant} size="sm" />
            <span className="text-xs text-gray-500">{enroll.cohortName ?? enroll.programName}</span>
          </div>
          <span className="text-xs text-gray-400">{fmtDate(enroll.status === 'active' ? '2026-06-01' : '2026-01-01')}</span>
        </div>
      ) : (
        <span className="text-xs text-gray-400 italic">No enrollment</span>
      )}
    </div>
  )
}

function FarmerList({ farmers }: { farmers: Farmer[] }) {
  if (farmers.length === 0)
    return <p className="text-sm text-gray-400 text-center py-10">No farmers match this filter</p>
  return (
    <div>
      {farmers.map(f => <FarmerCard key={f.id} farmer={f} />)}
    </div>
  )
}

// ── FRI trajectory ─────────────────────────────────────────────────────────────
// No historical FRI is tracked in the mock data, so the "previous" score is
// derived deterministically from the farmer id (not Math.random()) so the
// same farmer always shows the same delta across renders/sheets.
function seededDelta(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return (Math.abs(hash) % 21) - 10 // -10..+10
}

function friTrend(farmer: Farmer): { previous: number; delta: number } | null {
  if (farmer.currentFri === null) return null
  const delta = seededDelta(farmer.id)
  return { previous: farmer.currentFri - delta, delta }
}

function TrajectoryCard({ farmer }: { farmer: Farmer }) {
  const trend = friTrend(farmer)
  const delta = trend?.delta ?? 0
  const Icon  = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus
  const cls   = delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-gray-500'

  return (
    <div className="px-4 py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <p className="text-base font-semibold text-gray-900">{farmer.fullName}</p>
        <div className={cn('flex items-center gap-1 text-xs font-semibold', cls)}>
          <span>{farmer.currentFri}</span>
          <Icon className="w-3.5 h-3.5" />
          <span>{delta > 0 ? `+${delta}` : delta}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Phone className="w-3 h-3" />{farmer.phone}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />{farmer.community}
        </span>
      </div>
    </div>
  )
}

function TrajectoryList({ farmers }: { farmers: Farmer[] }) {
  if (farmers.length === 0)
    return <p className="text-sm text-gray-400 text-center py-10">No farmers match this filter</p>
  return (
    <div>
      {farmers.map(f => <TrajectoryCard key={f.id} farmer={f} />)}
    </div>
  )
}

// ── Opportunity enrollment ──────────────────────────────────────────────────────
type OpportunityGroup = {
  intervention: Intervention
  farmers:      Farmer[]
}

function OpportunitySheet({ groups }: { groups: OpportunityGroup[] }) {
  const [opportunityFilter, setOpportunityFilter] = useState('all')
  const [farmerQuery,       setFarmerQuery]        = useState('')

  const visibleGroups = groups
    .filter(g => opportunityFilter === 'all' || g.intervention.id === opportunityFilter)
    .map(g => ({
      ...g,
      farmers: g.farmers.filter(f => f.fullName.toLowerCase().includes(farmerQuery.trim().toLowerCase())),
    }))
    .filter(g => g.farmers.length > 0)

  return (
    <div>
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 space-y-2 sticky top-0 bg-white z-10">
        <select
          value={opportunityFilter}
          onChange={e => setOpportunityFilter(e.target.value)}
          className="w-full text-xs rounded-lg border border-gray-200 px-3 py-2 text-gray-700 focus:outline-none focus:ring-1"
          style={{ '--tw-ring-color': 'var(--brand-green)' } as React.CSSProperties}
        >
          <option value="all">All opportunities</option>
          {groups.map(g => (
            <option key={g.intervention.id} value={g.intervention.id}>{g.intervention.name}</option>
          ))}
        </select>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={farmerQuery}
            onChange={e => setFarmerQuery(e.target.value)}
            placeholder="Search farmers…"
            className="w-full text-xs rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-gray-700 focus:outline-none focus:ring-1"
            style={{ '--tw-ring-color': 'var(--brand-green)' } as React.CSSProperties}
          />
        </div>
      </div>

      {visibleGroups.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No opportunities match this filter</p>
      ) : (
        visibleGroups.map(({ intervention, farmers }) => (
          <div key={intervention.id} className="border-b border-gray-100 last:border-0">
            <div className="px-4 py-3 bg-gray-50 flex items-center gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--brand-forest)' }}>{intervention.name}</p>
              <BadgeTemplate label={intervention.type} variant="info" size="sm" />
              <BadgeTemplate label={intervention.status} variant={intervention.status === 'Active' ? 'success' : 'neutral'} size="sm" />
              <span className="text-xs text-gray-400 ml-auto">{farmers.length} farmers</span>
            </div>
            {farmers.map(f => <FarmerCard key={f.id} farmer={f} />)}
          </div>
        ))
      )}
    </div>
  )
}

// ── Agent card list ────────────────────────────────────────────────────────────
function AgentCard({ agent }: { agent: AgentSummary }) {
  return (
    <div className="mx-3 mb-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--brand-forest)' }}>{agent.name}</p>
        <BadgeTemplate label="Agent" variant="success" size="sm" />
      </div>
      <span className="flex items-center gap-1.5 text-xs text-gray-500">
        <Phone className="w-3 h-3" />{agent.phone}
      </span>
    </div>
  )
}

// Cohort IDs enrolled in any intervention
const OPPORTUNITY_COHORT_IDS = new Set(
  INTERVENTIONS.flatMap(iv => iv.enrolledCohorts.map((ec: { cohortId: string }) => ec.cohortId))
)

type SheetFilter = {
  title:    string
  subtitle: string
  farmers:  Farmer[]
  kind?:    'trajectory' | 'opportunity'
}

function buildOpportunityGroups(all: Farmer[]): OpportunityGroup[] {
  return INTERVENTIONS
    .map(iv => {
      const cohortKeys = new Set(iv.enrolledCohorts.map(ec => `${ec.programId}::${ec.cohortId}`))
      const farmers = all.filter(f =>
        f.enrollment?.cohortId && cohortKeys.has(`${f.enrollment.programId}::${f.enrollment.cohortId}`)
      )
      return { intervention: iv, farmers }
    })
    .filter(g => g.farmers.length > 0)
}

function buildFilter(key: string, stats: Stats): SheetFilter | null {
  const all = FARMERS_LIST as Farmer[]
  switch (key) {
    case 'totalFarmers':
      return { title: 'All Farmers', subtitle: `${stats.totalFarmers} registered farmers`, farmers: all }
    case 'activeEnrollments':
      return {
        title: 'Active Enrollments',
        subtitle: `${stats.activeEnrollments} farmers currently enrolled`,
        farmers: all.filter(f => f.enrollment?.status === 'active'),
      }
    case 'verifiedFarmers':
      return {
        title: 'Verified Farmers',
        subtitle: `${stats.verifiedFarmers} farmers without duplicate flags`,
        farmers: all.filter(f => !f.duplicateFlag),
      }
    case 'avgFRI':
      return {
        title: 'Scored Farmers',
        subtitle: `Average FRI: ${stats.avgFRI}/100`,
        farmers: all.filter(f => f.currentFri !== null).sort((a, b) => (b.currentFri ?? 0) - (a.currentFri ?? 0)),
      }
    case 'verificationRate':
      return {
        title: 'Verified Farmers',
        subtitle: `${stats.verificationRate}% verification rate`,
        farmers: all.filter(f => !f.duplicateFlag),
      }
    case 'opportunityCount': {
      const farmers = all.filter(f => f.enrollment?.cohortId && OPPORTUNITY_COHORT_IDS.has(f.enrollment.cohortId))
      return {
        title: 'Opportunity-Enrolled Farmers',
        subtitle: `${farmers.length} farmers in active interventions`,
        farmers,
        kind: 'opportunity',
      }
    }
    case 'trajectoryUp': {
      const farmers = all.filter(f => (friTrend(f)?.delta ?? 0) > 0).sort((a, b) => (b.currentFri ?? 0) - (a.currentFri ?? 0))
      return {
        title: 'Improving Farmers',
        subtitle: `${farmers.length} farmers with improving FRI`,
        farmers,
        kind: 'trajectory',
      }
    }
    case 'trajectoryFlat': {
      const farmers = all.filter(f => friTrend(f)?.delta === 0).sort((a, b) => (b.currentFri ?? 0) - (a.currentFri ?? 0))
      return {
        title: 'Stable Farmers',
        subtitle: `${farmers.length} farmers with stable FRI`,
        farmers,
        kind: 'trajectory',
      }
    }
    case 'trajectoryDown': {
      const farmers = all.filter(f => (friTrend(f)?.delta ?? 0) < 0).sort((a, b) => (b.currentFri ?? 0) - (a.currentFri ?? 0))
      return {
        title: 'Declining Farmers',
        subtitle: `${farmers.length} farmers with declining FRI`,
        farmers,
        kind: 'trajectory',
      }
    }
    default:
      return null
  }
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub, onClick }: {
  icon: React.ElementType; label: string; value: number | string
  color: string; sub?: string; onClick?: () => void
}) {
  return (
    <CardTemplate
      className={['h-full transition-shadow border border-transparent', onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-200' : ''].join(' ')}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--brand-slate)' }}>{label}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </CardTemplate>
  )
}

function SkeletonCard() {
  return <div className="h-24 rounded-xl bg-gray-200 animate-pulse" />
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function Main() {
  const [stats,      setStats]      = useState<Stats | null>(null)
  const [cropData,   setCropData]   = useState<CropBreakdown[]>([])
  const [zoneData,   setZoneData]   = useState<ZoneBreakdown[]>([])
  const [loading,    setLoading]    = useState(true)
  const [sheetFilter,  setSheetFilter]  = useState<SheetFilter | null>(null)
  const [agentsOpen,   setAgentsOpen]   = useState(false)

  // stats.trajectoryUp/Flat/Down are static mock placeholders (dataCenter/stats.ts) —
  // compute the real counts from the same friTrend() the sheets use, so the pill
  // numbers always match what clicking through actually shows.
  const trajectoryCounts = useMemo(() => {
    const all = FARMERS_LIST as Farmer[]
    let up = 0, flat = 0, down = 0
    for (const f of all) {
      const trend = friTrend(f)
      if (!trend) continue // unscored farmers (currentFri === null) aren't in any trajectory bucket
      if (trend.delta > 0) up++
      else if (trend.delta < 0) down++
      else flat++
    }
    return { up, flat, down }
  }, [])

  useEffect(() => {
    Promise.all([getStats(), getCropBreakdown(), getZoneBreakdown()]).then(
      ([s, c, z]) => { setStats(s); setCropData(c); setZoneData(z); setLoading(false) }
    )
  }, [])

  function open(key: string) {
    if (!stats) return
    const f = buildFilter(key, stats)
    if (f) setSheetFilter(f)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--brand-slate)' }}>Program overview and key metrics</p>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
          </div>
        </>
      ) : stats && (
        <>
          {/* Primary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            <StatCard icon={Users}         label="Total Farmers"      value={stats.totalFarmers}      color="bg-(--brand-dark)"  onClick={() => open('totalFarmers')} />
            <StatCard icon={ClipboardList} label="Active Enrollments" value={stats.activeEnrollments} color="bg-(--brand-green)" onClick={() => open('activeEnrollments')} />
            <StatCard icon={UserCheck}     label="Verified Farmers"   value={stats.verifiedFarmers}   color="bg-(--brand-mid)"   onClick={() => open('verifiedFarmers')} />
            <StatCard icon={TrendingUp}    label="Field Agents"       value={stats.totalAgents}       color="bg-(--brand-amber)" onClick={() => setAgentsOpen(true)} />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            <StatCard icon={TrendingUp} label="Average FRI Score"    value={stats.avgFRI !== null ? `${stats.avgFRI}/100` : '—'} color="bg-emerald-600" sub="across all scored farmers"        onClick={() => open('avgFRI')} />
            <StatCard icon={UserCheck}  label="Verification Rate"    value={`${stats.verificationRate}%`}                        color="bg-sky-600"     sub="of registered farmers"             onClick={() => open('verificationRate')} />
            <StatCard icon={Zap}        label="Opportunity Enrolled" value={stats.opportunityCount}                               color="bg-orange-500"  sub="active intervention enrollments"   onClick={() => open('opportunityCount')} />

            {/* FRI Trajectory */}
            <CardTemplate>
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--brand-slate)' }}>FRI Trajectory</p>
              <div className="flex flex-col gap-1.5">
                {[
                  { label: 'Improving', key: 'trajectoryUp',   count: trajectoryCounts.up,   icon: ArrowUp,   cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
                  { label: 'Stable',    key: 'trajectoryFlat', count: trajectoryCounts.flat, icon: Minus,     cls: 'border-gray-200 bg-gray-50 text-gray-600' },
                  { label: 'Declining', key: 'trajectoryDown', count: trajectoryCounts.down, icon: ArrowDown, cls: 'border-red-200 bg-red-50 text-red-700' },
                ].map(({ label, key, count, icon: Icon, cls }) => (
                  <button key={label} type="button" onClick={() => open(key)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-opacity hover:opacity-70 ${cls}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">{count}</span>
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </CardTemplate>
          </div>
        </>
      )}

      {/* Charts */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardTemplate>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--brand-forest)' }}>Top Crops</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={cropData} barSize={28}>
                <XAxis dataKey="crop" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={20} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} cursor={{ fill: 'var(--brand-mint)' }} />
                <Bar dataKey="count" fill="var(--brand-dark)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardTemplate>

          <CardTemplate>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--brand-forest)' }}>FRI Zone Distribution</p>
            <div className="space-y-4">
              {zoneData.map(({ zone, count }) => {
                const total = zoneData.reduce((s, z) => s + z.count, 0)
                const pct   = total > 0 ? Math.round((count / total) * 100) : 0
                const color = ZONE_COLORS[zone] ?? '#6B7280'
                return (
                  <div key={zone} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-gray-700">{zone}</span>
                      <span className="text-gray-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardTemplate>

          <div />
        </div>
      )}

      {/* Farmer sheet */}
      <SheetTemplate
        open={!!sheetFilter}
        onClose={() => setSheetFilter(null)}
        title={sheetFilter?.title ?? ''}
        subtitle={sheetFilter?.subtitle ?? ''}
        size="md"
        bodyClassName="p-0"
      >
        {sheetFilter?.kind === 'opportunity' ? (
          <OpportunitySheet groups={buildOpportunityGroups(sheetFilter.farmers)} />
        ) : sheetFilter?.kind === 'trajectory' ? (
          <TrajectoryList farmers={sheetFilter?.farmers ?? []} />
        ) : (
          <FarmerList farmers={sheetFilter?.farmers ?? []} />
        )}
      </SheetTemplate>

      {/* Field agents sheet */}
      <SheetTemplate
        open={agentsOpen}
        onClose={() => setAgentsOpen(false)}
        title="Field Agents"
        subtitle={`${AGENTS.length} active field agents`}
        size="md"
        bodyClassName="pt-3 pb-3"
      >
        {AGENTS.map(a => <AgentCard key={a.id} agent={a} />)}
      </SheetTemplate>
    </div>
  )
}
