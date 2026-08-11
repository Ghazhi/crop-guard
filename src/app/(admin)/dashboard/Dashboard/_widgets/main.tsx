'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, ClipboardList, UserCheck, TrendingUp, Zap, ArrowUp, ArrowDown, Minus, Phone, MapPin, Search,
  Landmark, Globe2, Building2, Layers, FileText, CloudRain, Grid3x3, RefreshCw, ArrowUpRight, ChevronRight,
  Settings2,
} from 'lucide-react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { CardTemplate }   from '@/customComponents/CardTemplate'
import { SheetTemplate }  from '@/customComponents/SheetTemplate'
import { BadgeTemplate }  from '@/customComponents/BadgeTemplate'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { FARMERS_LIST }  from '@/dataCenter/farmerManagement'
import { INTERVENTIONS } from '@/dataCenter/interventions'
import { AGENTS }        from '@/dataCenter/agents'
import { COOPERATIVES }  from '@/dataCenter/cooperatives'
import { COMMUNITIES }   from '@/dataCenter/communityProfile'
import { PROGRAMS }      from '@/dataCenter/programs'
import { getStats, getCropBreakdown, getZoneBreakdown } from '../_logics/functions'
import type { Stats, CropBreakdown, ZoneBreakdown } from '../_logics/interface'
import type { Farmer } from '@/app/(admin)/dashboard/FarmersRegistry/_logics/interface'
import type { AgentSummary } from '@/app/(admin)/dashboard/AgentAssignment/_logics/interface'
import type { Intervention } from '@/app/(admin)/dashboard/OpportunityPathways/_logics/interface'
import { cn } from '@/lib/utils'
import { usePersistedState } from '@/lib/usePersistedState'
import {
  DEFAULT_DASHBOARD_WIDGET_VISIBILITY, DASHBOARD_WIDGET_VISIBILITY_KEY,
  type DashboardWidgetVisibility,
} from '@/app/(admin)/dashboard/Configuration/_logics/dashboardConfig'
import { DashboardConfigSection } from '@/app/(admin)/dashboard/Configuration/_widgets/dashboard/DashboardConfigSection'

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
        {onClick && <ChevronRight className="w-4 h-4 shrink-0 text-gray-300" />}
      </div>
    </CardTemplate>
  )
}

function SkeletonCard() {
  return <div className="h-24 rounded-xl bg-gray-200 animate-pulse" />
}

// ── Modules row ──────────────────────────────────────────────────────────────
function ModulePill({ icon: Icon, label, count, href, onClick }: {
  icon: React.ElementType; label: string; count: number; href?: string; onClick?: () => void
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 transition-colors ${href ? 'cursor-pointer hover:border-gray-300 hover:shadow-sm' : ''}`}
      onClick={href ? onClick : undefined}
      role={href ? 'button' : undefined}
      tabIndex={href ? 0 : undefined}
      onKeyDown={href ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } } : undefined}
    >
      <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-forest)' }} />
      <span className="text-sm text-gray-700">{label}</span>
      <span className="ml-auto text-sm font-bold" style={{ color: 'var(--brand-forest)' }}>{count}</span>
    </div>
  )
}

const TOTAL_COHORTS = PROGRAMS.reduce((sum, p) => sum + p.cohorts.length, 0)

const MODULES = [
  { id: 'module-cooperatives',  icon: Landmark,   label: 'Cooperatives',   count: COOPERATIVES.length,  href: '/dashboard/Governance' },
  { id: 'module-communities',   icon: Globe2,     label: 'Communities',    count: COMMUNITIES.length,   href: '/dashboard/CommunityProfile' },
  { id: 'module-programs',      icon: Building2,  label: 'Programs',       count: PROGRAMS.length,      href: '/dashboard/ProgramsSetup' },
  { id: 'module-cohorts',       icon: Layers,     label: 'Cohorts',        count: TOTAL_COHORTS,        href: '/dashboard/ProgramsSetup' },
  { id: 'module-interventions', icon: Zap,        label: 'Interventions',  count: INTERVENTIONS.length, href: '/dashboard/OpportunityPathways' },
  { id: 'module-applications',  icon: FileText,   label: 'Applications',   count: 0 },
] as const

// ── Cooperatives chart ─────────────────────────────────────────────────────────
const COOPERATIVE_CHART_DATA = COOPERATIVES
  .map(c => ({ name: c.name, members: c.memberCount }))
  .sort((a, b) => b.members - a.members)
  .slice(0, 6)

// ── 6-month trend data (deterministic — derived from current totals, no Math.random) ──
const MONTH_LABELS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']

function buildTrend(finalValue: number): { month: string; value: number }[] {
  return MONTH_LABELS.map((month, i) => {
    const fraction = (i + 1) / MONTH_LABELS.length
    return { month, value: Math.round(finalValue * fraction) }
  })
}

// ── Climate Exposure (derived from farmer FRI zones as a proxy for exposure) ───
function buildClimateExposure(farmers: Farmer[]) {
  const scored = farmers.filter(f => f.currentFri !== null)
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, f) => s + (f.currentFri ?? 0), 0) / scored.length)
    : 0
  const cohortIds = new Set(farmers.map(f => f.enrollment?.cohortId).filter(Boolean))
  const highRiskCohorts = PROGRAMS
    .flatMap(p => p.cohorts)
    .filter(c => cohortIds.has(c.id) && c.status === 'Active' && c.enrolledCount / Math.max(c.targetCount, 1) < 0.3).length
  return { avgScore, highRiskCohorts, cohortsTracked: cohortIds.size }
}

// ── Risk Quadrant (Capacity = verification status, Exposure = FRI zone risk) ──
function buildRiskQuadrant(farmers: Farmer[]) {
  let hcle = 0, hche = 0, lcle = 0, lche = 0
  for (const f of farmers) {
    if (f.currentFri === null) continue
    const highCapacity = !f.duplicateFlag
    const highExposure = f.currentFri < 60
    if (highCapacity && !highExposure) hcle++
    else if (highCapacity && highExposure) hche++
    else if (!highCapacity && !highExposure) lcle++
    else lche++
  }
  return [
    { label: 'High Capacity – Low Exposure',  count: hcle, color: '#16a34a' },
    { label: 'High Capacity – High Exposure', count: hche, color: '#ca8a04' },
    { label: 'Low Capacity – Low Exposure',   count: lcle, color: '#5A9E74' },
    { label: 'Low Capacity – High Exposure',  count: lche, color: '#dc2626' },
  ]
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function Main() {
  const router = useRouter()
  const [stats,      setStats]      = useState<Stats | null>(null)
  const [cropData,   setCropData]   = useState<CropBreakdown[]>([])
  const [zoneData,   setZoneData]   = useState<ZoneBreakdown[]>([])
  const [loading,    setLoading]    = useState(true)
  const [sheetFilter,  setSheetFilter]  = useState<SheetFilter | null>(null)
  const [agentsOpen,   setAgentsOpen]   = useState(false)
  const [summary,      setSummary]      = useState<string | null>(null)
  const [generating,   setGenerating]   = useState(false)
  const [configOpen,   setConfigOpen]   = useState(false)
  const [widgets] = usePersistedState<DashboardWidgetVisibility>(
    DASHBOARD_WIDGET_VISIBILITY_KEY, DEFAULT_DASHBOARD_WIDGET_VISIBILITY,
  )

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

  const climateExposure = useMemo(() => buildClimateExposure(FARMERS_LIST as Farmer[]), [])
  const riskQuadrant     = useMemo(() => buildRiskQuadrant(FARMERS_LIST as Farmer[]), [])
  const maxQuadrantCount = Math.max(1, ...riskQuadrant.map(q => q.count))

  function handleGenerateSummary() {
    if (!stats) return
    setGenerating(true)
    setTimeout(() => {
      const topFactor = climateExposure.highRiskCohorts > 0
        ? `${climateExposure.highRiskCohorts} cohort${climateExposure.highRiskCohorts !== 1 ? 's are' : ' is'} under-enrolled relative to target and flagged as high risk.`
        : 'No cohorts currently fall into the high-risk band.'
      const sentences = [
        `Program is tracking ${stats.totalFarmers} farmers across ${PROGRAMS.length} programs and ${TOTAL_COHORTS} cohorts, with an average FRI of ${stats.avgFRI ?? '—'}/100.`,
        `Climate exposure averages ${climateExposure.avgScore}/100 across ${climateExposure.cohortsTracked} tracked cohorts. ${topFactor}`,
        stats.opportunityCount > 0
          ? `${stats.opportunityCount} farmers are enrolled in active interventions, translating verified resilience data into real opportunity access.`
          : 'No farmers are currently enrolled in an active intervention.',
        `Norvi recommends prioritizing governance and check-in follow-up in cohorts with below-target enrollment to reduce climate risk exposure.`,
      ]
      setSummary(sentences.join(' '))
      setGenerating(false)
    }, 500)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--brand-slate)' }}>Program overview and key metrics</p>
        </div>
        <ButtonTemplate
          variant="outline" size="sm" label="Configure Dashboard"
          leftIcon={<Settings2 className="w-3.5 h-3.5" />}
          onClick={() => setConfigOpen(true)}
        />
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
          {(widgets['stat-total-farmers'] || widgets['stat-active-enrollments'] || widgets['stat-verified-farmers'] || widgets['stat-field-agents']) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
              {widgets['stat-total-farmers'] && <StatCard icon={Users}         label="Total Farmers"      value={stats.totalFarmers}      color="bg-(--brand-dark)"  onClick={() => open('totalFarmers')} />}
              {widgets['stat-active-enrollments'] && <StatCard icon={ClipboardList} label="Active Enrollments" value={stats.activeEnrollments} color="bg-(--brand-green)" onClick={() => open('activeEnrollments')} />}
              {widgets['stat-verified-farmers'] && <StatCard icon={UserCheck}     label="Verified Farmers"   value={stats.verifiedFarmers}   color="bg-(--brand-mid)"   onClick={() => open('verifiedFarmers')} />}
              {widgets['stat-field-agents'] && <StatCard icon={TrendingUp}    label="Field Agents"       value={stats.totalAgents}       color="bg-(--brand-amber)" onClick={() => setAgentsOpen(true)} />}
            </div>
          )}

          {/* Modules */}
          {MODULES.some(m => widgets[m.id]) && (
            <div>
              <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Modules</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {MODULES.filter(m => widgets[m.id]).map(m => (
                  <ModulePill key={m.label} icon={m.icon} label={m.label} count={m.count} href={'href' in m ? m.href : undefined} onClick={'href' in m && m.href ? () => router.push(m.href) : undefined} />
                ))}
              </div>
            </div>
          )}

        </>
      )}

      {/* Charts */}
      {!loading && (widgets['chart-top-crops'] || widgets['chart-fri-zone'] || widgets['chart-cooperatives']) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {widgets['chart-top-crops'] && (
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
          )}

          {widgets['chart-fri-zone'] && (
          <CardTemplate>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--brand-forest)' }}>FRI Zone Distribution</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={zoneData}
                  dataKey="count"
                  nameKey="zone"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {zoneData.map(({ zone }) => (
                    <Cell key={zone} fill={ZONE_COLORS[zone] ?? '#6B7280'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  formatter={(value, name) => [`${value} farmers`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-col gap-1.5">
              {zoneData.map(({ zone, count }) => (
                <div key={zone} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-gray-700">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ZONE_COLORS[zone] ?? '#6B7280' }} />
                    {zone}
                  </span>
                  <span className="text-gray-500">{count}</span>
                </div>
              ))}
            </div>
          </CardTemplate>
          )}

          {widgets['chart-cooperatives'] && (
          <CardTemplate>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--brand-forest)' }}>Cooperatives</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={COOPERATIVE_CHART_DATA} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} cursor={{ fill: 'var(--brand-mint)' }} />
                <Bar dataKey="members" fill="var(--brand-green)" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </CardTemplate>
          )}
        </div>
      )}

      {/* Trend charts */}
      {!loading && stats && (widgets['chart-fri-trend'] || widgets['chart-new-enrollments']) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {widgets['chart-fri-trend'] && (
          <CardTemplate>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--brand-forest)' }}>FRI Score Trend (6 months)</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={buildTrend(stats.avgFRI ?? 0)} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-mint)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(v) => [`Avg FRI: ${v}`, '']} />
                <Line type="monotone" dataKey="value" stroke="var(--brand-dark)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--brand-dark)' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardTemplate>
          )}

          {widgets['chart-new-enrollments'] && (
          <CardTemplate>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--brand-forest)' }}>New Enrollments (6 months)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={buildTrend(stats.activeEnrollments)} barSize={28}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} cursor={{ fill: 'var(--brand-mint)' }} />
                <Bar dataKey="value" fill="var(--brand-green)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardTemplate>
          )}
        </div>
      )}

      {/* Climate Exposure + Risk Quadrant */}
      {!loading && (widgets['climate-exposure'] || widgets['risk-quadrant']) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {widgets['climate-exposure'] && (
          <CardTemplate>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CloudRain className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--brand-forest)' }}>Climate Exposure</p>
              </div>
              <button className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--brand-green)' }}>
                Details <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-gray-50 px-3 py-3 text-center">
                <p className="text-xl font-bold" style={{ color: 'var(--brand-forest)' }}>{climateExposure.avgScore}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Avg Score</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-3 text-center">
                <p className="text-xl font-bold text-red-600">{climateExposure.highRiskCohorts}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">High Risk Cohorts</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-3 text-center">
                <p className="text-xl font-bold" style={{ color: 'var(--brand-forest)' }}>{climateExposure.cohortsTracked}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Cohorts Tracked</p>
              </div>
            </div>
          </CardTemplate>
          )}

          {widgets['risk-quadrant'] && (
          <CardTemplate>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Grid3x3 className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--brand-forest)' }}>Risk Quadrant</p>
              </div>
              <button className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--brand-green)' }}>
                Details <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {riskQuadrant.map(q => (
                <div key={q.label} className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: q.color }} />
                  <span className="text-xs text-gray-600 flex-1 min-w-0 truncate">{q.label}</span>
                  <div className="w-24 h-1.5 rounded-full bg-gray-100 overflow-hidden shrink-0">
                    <div className="h-full rounded-full" style={{ width: `${(q.count / maxQuadrantCount) * 100}%`, backgroundColor: q.color }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-4 text-right shrink-0">{q.count}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-4">
              {riskQuadrant.reduce((s, q) => s + q.count, 0)} scored farmers across {TOTAL_COHORTS} cohorts
            </p>
          </CardTemplate>
          )}
        </div>
      )}

      {/* Norvi AI Program Summary */}
      {!loading && widgets['norvi-summary'] && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'var(--brand-forest)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/10">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Norvi AI Program Summary</p>
              <p className="text-xs text-white/60">AI-generated overview of your program&apos;s farmers, governance, interventions, and recommended actions</p>
            </div>
            {summary ? (
              <button
                onClick={handleGenerateSummary}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors shrink-0"
                aria-label="Regenerate summary"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-white ${generating ? 'animate-spin' : ''}`} />
              </button>
            ) : (
              <button
                onClick={handleGenerateSummary}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors shrink-0 disabled:opacity-60"
              >
                <Zap className="w-3.5 h-3.5" />
                Generate
              </button>
            )}
          </div>
          <div className="p-5">
            {generating ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Zap className="w-6 h-6 animate-pulse" style={{ color: 'var(--brand-forest)' }} />
                <p className="text-sm text-gray-400">Norvi is analyzing program data…</p>
              </div>
            ) : summary ? (
              <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Zap className="w-6 h-6 text-gray-200" />
                <p className="text-sm text-gray-400">Click &quot;Generate&quot; to get an AI-powered program overview</p>
              </div>
            )}
          </div>
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

      {/* Configure Dashboard sheet */}
      <SheetTemplate
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        title="Configure Dashboard"
        subtitle="Choose which cards, charts, and widgets appear on this page"
        size="md"
      >
        <div className="px-6 py-5">
          <DashboardConfigSection />
        </div>
      </SheetTemplate>
    </div>
  )
}
