'use client'

import { useState, useMemo } from 'react'
import {
  Sparkles, TrendingUp, AlertTriangle, CloudRain, Grid3x3, BarChart2,
  CheckCircle, Zap, TrendingDown, Target, Lightbulb, Clock, Sprout,
} from 'lucide-react'
import { Main as FRIDashboardMain } from '@/app/(admin)/dashboard/FRIDashboard/_widgets/main'
import { Main as RiskIntelligenceMain } from '@/app/(admin)/dashboard/RiskIntelligence/_widgets/main'
import { Main as ReportsMain } from '@/app/(admin)/dashboard/Reports/_widgets/main'
import { FARMERS_LIST } from '@/dataCenter/farmerManagement'
import { COOPERATIVES } from '@/dataCenter/cooperatives'
import { FARMER_COOPERATIVE_MAP } from '@/dataCenter/farmerCooperatives'
import { PROGRAMS } from '@/dataCenter/programs'
import type { Farmer } from '@/app/(admin)/dashboard/FarmersRegistry/_logics/interface'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { cn } from '@/lib/utils'
import {
  computeExposureScore, computeQuadrant, QUADRANT_INFO,
  type ExposureResult, type QuadrantKey,
} from '../_logics/exposure'
import { COHORT_EXPOSURE, type CohortExposureRecord } from '../_logics/exposureData'

// ─── Tab config ─────────────────────────────────────────────────────────────────

type InsightsTab = 'ai-overview' | 'fri-dashboard' | 'risk-intelligence' | 'climate-exposure' | 'risk-quadrant' | 'reports'

const TABS: { id: InsightsTab; label: string; Icon: React.ElementType }[] = [
  { id: 'ai-overview',        label: 'AI Overview',        Icon: Sparkles     },
  { id: 'fri-dashboard',      label: 'FRI Dashboard',      Icon: TrendingUp   },
  { id: 'risk-intelligence',  label: 'Risk Intelligence',  Icon: AlertTriangle },
  { id: 'climate-exposure',   label: 'Climate Exposure',   Icon: CloudRain    },
  { id: 'risk-quadrant',      label: 'Risk Quadrant',      Icon: Grid3x3      },
  { id: 'reports',            label: 'Reports',            Icon: BarChart2    },
]

// ─── Zone config (reused from FRI Dashboard / Dashboard palette) ────────────────

const ZONE_COLORS: Record<string, string> = {
  'Resilience Leader':  '#7C3AED',
  'Resilience Builder': '#16a34a',
  'Resilience Learner': '#ca8a04',
  'Resilience Starter': '#dc2626',
}
const ZONES = ['Resilience Leader', 'Resilience Builder', 'Resilience Learner', 'Resilience Starter'] as const

// ══════════════════════════════════════════════════════════════════════════════
// AI Overview tab
// ══════════════════════════════════════════════════════════════════════════════

function StatCard({ icon: Icon, iconColor, iconBg, label, value, sub }: {
  icon: React.ElementType; iconColor: string; iconBg: string
  label: string; value: string | number; sub: string
}) {
  return (
    <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-4 flex flex-col gap-2">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', iconBg)}>
        <Icon className={cn('w-4 h-4', iconColor)} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs font-medium text-gray-600 mt-0.5">{label}</p>
        <p className="text-[11px] text-gray-400">{sub}</p>
      </div>
    </div>
  )
}

function AIOverviewTab({ farmers }: { farmers: Farmer[] }) {
  const stats = useMemo(() => {
    const scored = farmers.filter(f => f.currentFri !== null)
    const avgFri = scored.length
      ? Math.round(scored.reduce((s, f) => s + (f.currentFri ?? 0), 0) / scored.length)
      : 0
    const highRisk   = farmers.filter(f => f.currentFri !== null && f.currentFri < 40).length
    const lowRisk    = farmers.filter(f => f.currentFri !== null && f.currentFri >= 60).length
    const mediumRisk = farmers.filter(f => f.currentFri !== null && f.currentFri >= 40 && f.currentFri <= 59).length
    const activeEnrolled = farmers.filter(f => f.enrollment?.status === 'active').length

    const enrolledWithCheckinField = farmers.filter(f => f.enrollment && f.enrollment.checkinOnTrack !== undefined && f.enrollment.checkinOnTrack !== null)
    const onTrack = farmers.filter(f => f.enrollment?.checkinOnTrack === true).length
    const checkinRate = enrolledWithCheckinField.length > 0
      ? Math.round((onTrack / enrolledWithCheckinField.length) * 100)
      : null

    const helpRequests = 0

    const zoneCounts = ZONES.map(zone => ({
      zone,
      count: farmers.filter(f => f.currentZone === zone).length,
    }))
    const zoneTotal = zoneCounts.reduce((s, z) => s + z.count, 0)

    return { scored, avgFri, highRisk, lowRisk, mediumRisk, activeEnrolled, checkinRate, helpRequests, zoneCounts, zoneTotal, total: farmers.length }
  }, [farmers])

  const [summary, setSummary] = useState<{ overview: string; assessment: string; recommendations: string } | null>(null)
  const [generating, setGenerating] = useState(false)

  function handleGenerate() {
    setGenerating(true)
    setTimeout(() => {
      const overview = `Across ${stats.total} registered farmers, ${stats.scored.length} have a scored FRI with an average of ${stats.avgFri}. ${stats.activeEnrolled} farmer${stats.activeEnrolled !== 1 ? 's are' : ' is'} actively enrolled in a program.`
      const assessment = `${stats.highRisk} farmer${stats.highRisk !== 1 ? 's fall' : ' falls'} into the high-risk band (FRI < 40), while ${stats.lowRisk} are classified low-risk (FRI ≥ 60) and ${stats.mediumRisk} sit in the medium band (FRI 40–59). Check-in rate over the last 7 days is ${stats.checkinRate !== null ? `${stats.checkinRate}%` : 'not yet trackable from current data'}.`
      const topZone = stats.zoneCounts.slice().sort((a, b) => b.count - a.count)[0]
      const recommendations = stats.highRisk > 0
        ? `Prioritise outreach for the ${stats.highRisk} high-risk farmer${stats.highRisk !== 1 ? 's' : ''} this cycle, and continue reinforcing habits for the ${topZone?.count ?? 0} farmers in the ${topZone?.zone ?? 'leading'} zone.`
        : `No farmers currently fall in the high-risk band — maintain current coaching cadence and monitor the ${stats.mediumRisk} medium-risk farmers for early drift.`

      setSummary({ overview, assessment, recommendations })
      setGenerating(false)
    }, 500)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp}    iconColor="text-emerald-600" iconBg="bg-emerald-50" label="Avg FRI Score" value={stats.avgFri}            sub={`${stats.scored.length} scored`} />
        <StatCard icon={AlertTriangle} iconColor="text-red-600"     iconBg="bg-red-50"     label="High Risk"     value={stats.highRisk}          sub="FRI < 40" />
        <StatCard icon={CheckCircle}   iconColor="text-emerald-600" iconBg="bg-emerald-50" label="Low Risk"      value={stats.lowRisk}           sub="FRI >= 60" />
        <StatCard icon={Zap}           iconColor="text-blue-600"    iconBg="bg-blue-50"    label="Active Enrol." value={stats.activeEnrolled}    sub="farmers" />
        <StatCard icon={BarChart2}     iconColor="text-amber-600"   iconBg="bg-amber-50"   label="Check-in Rate" value={stats.checkinRate !== null ? `${stats.checkinRate}%` : '—'} sub="last 7 days" />
        <StatCard icon={AlertTriangle} iconColor="text-orange-600"  iconBg="bg-orange-50"  label="Help Requests" value={stats.helpRequests}      sub="total" />
        <StatCard icon={TrendingDown}  iconColor="text-amber-600"   iconBg="bg-amber-50"   label="Medium Risk"   value={stats.mediumRisk}        sub="FRI 40-59" />
        <StatCard icon={CheckCircle}   iconColor="text-gray-500"    iconBg="bg-gray-100"   label="Total Farmers" value={stats.total}             sub="registered" />
      </div>

      {/* FRI Zone Distribution */}
      <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-5">
        <p className="text-sm font-semibold text-gray-900 mb-4">FRI Zone Distribution</p>
        <div className="flex flex-col gap-3">
          {stats.zoneCounts.map(({ zone, count }) => {
            const pct = stats.zoneTotal > 0 ? Math.round((count / stats.zoneTotal) * 100) : 0
            const color = ZONE_COLORS[zone] ?? '#9ca3af'
            return (
              <div key={zone} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-xs font-medium text-gray-600">{zone}</span>
                <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="w-10 shrink-0 text-xs font-semibold text-gray-900 text-right">{count}</span>
                <span className="w-10 shrink-0 text-[11px] text-gray-400 text-right">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Norvi AI Intelligence Summary */}
      <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-3" style={{ background: 'var(--brand-forest)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/10">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Norvi AI Intelligence Summary</p>
            <p className="text-xs text-white/60">AI-generated overview of your program&apos;s FRI trends, risks, and recommended actions</p>
          </div>
          {summary && !generating && (
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Regenerate
            </button>
          )}
        </div>

        <div className="p-5">
          {generating ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Sparkles className="w-6 h-6 animate-pulse" style={{ color: 'var(--brand-forest)' }} />
              <p className="text-sm text-gray-400">Norvi is analyzing program data…</p>
            </div>
          ) : summary ? (
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--brand-mint)' }}>
                  <Target className="w-3.5 h-3.5" style={{ color: 'var(--brand-forest)' }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--brand-forest)' }}>Overview</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{summary.overview}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--brand-mint)' }}>
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--brand-forest)' }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--brand-forest)' }}>Assessment</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{summary.assessment}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--brand-mint)' }}>
                  <Lightbulb className="w-3.5 h-3.5" style={{ color: 'var(--brand-forest)' }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--brand-forest)' }}>Recommendations</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{summary.recommendations}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <Sparkles className="w-10 h-10 opacity-30" style={{ color: 'var(--brand-forest)' }} />
              <p className="text-sm text-gray-400 text-center">Click &quot;Generate AI Summary&quot; to get an AI-powered intelligence overview</p>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--brand-forest)' }}
              >
                <Sparkles className="w-4 h-4" />
                Generate AI Summary
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Climate Exposure tab
// ══════════════════════════════════════════════════════════════════════════════

const TIER_BADGE: Record<'High' | 'Moderate' | 'Low', { bg: string; text: string }> = {
  High:     { bg: '#FEE2E2', text: '#B91C1C' },
  Moderate: { bg: '#FEF3C7', text: '#B45309' },
  Low:      { bg: '#DCFCE7', text: '#15803D' },
}

const COMPONENT_ICON: Record<'E1' | 'E2' | 'E3' | 'E4', React.ElementType> = {
  E1: AlertTriangle,
  E2: CloudRain,
  E3: Clock,
  E4: Sprout,
}

function ExposureCard({ record, exposure, selected, onClick }: {
  record: CohortExposureRecord; exposure: ExposureResult; selected: boolean; onClick: () => void
}) {
  const badge = TIER_BADGE[exposure.tier]
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left rounded-xl border p-4 transition-all',
        selected ? 'border-2 bg-white shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
      )}
      style={selected ? { borderColor: badge.text } : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-gray-900 truncate">{record.cohortName}</p>
        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: badge.bg, color: badge.text }}>
          {exposure.tier}
        </span>
      </div>
      <p className="text-[11px] text-gray-400 mb-3">{record.district} · {record.farmerCount} farmer{record.farmerCount !== 1 ? 's' : ''}</p>
      <p className="text-2xl font-bold mb-2" style={{ color: badge.text }}>{exposure.score}</p>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${exposure.score}%`, background: badge.text }} />
      </div>
    </button>
  )
}

function ClimateExposureTab({ cohortIds }: { cohortIds: Set<string> | null }) {
  const cohortsWithExposure = useMemo(() => COHORT_EXPOSURE
    .filter(c => !cohortIds || cohortIds.has(c.cohortId))
    .map(c => ({ record: c, exposure: computeExposureScore(c.inputs) })), [cohortIds])
  const [selectedId, setSelectedId] = useState<string>(cohortsWithExposure[0]?.record.cohortId ?? '')
  const selected = cohortsWithExposure.find(c => c.record.cohortId === selectedId) ?? cohortsWithExposure[0] ?? null

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-base font-bold text-gray-900">Climate Exposure Score</h2>
        <p className="text-sm text-gray-500 mt-0.5">Computed per cohort from four weighted climate-risk components. Independent of farmer FRI scores.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cohortsWithExposure.map(({ record, exposure }) => (
          <ExposureCard
            key={record.cohortId}
            record={record}
            exposure={exposure}
            selected={selectedId === record.cohortId}
            onClick={() => setSelectedId(record.cohortId)}
          />
        ))}
      </div>

      {selected && (() => {
        const { record, exposure } = selected
        const badge = TIER_BADGE[exposure.tier]
        const inputs = record.inputs
        return (
          <div className="flex flex-col gap-4">
            {/* Detail header */}
            <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-5 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-base font-bold text-gray-900">{record.cohortName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{record.district} · {record.farmerCount} farmer{record.farmerCount !== 1 ? 's' : ''} · {record.programName}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold leading-none" style={{ color: badge.text }}>{exposure.score}</p>
                <span className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: badge.bg, color: badge.text }}>
                  {exposure.tier} Exposure
                </span>
              </div>
            </div>

            {/* Component breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {exposure.components.map(c => {
                const Icon = COMPONENT_ICON[c.key]
                return (
                  <div key={c.key} className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand-mint)' }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: 'var(--brand-forest)' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900">{c.key} · {c.label}</p>
                        <p className="text-[11px] text-gray-400">Weight {Math.round(c.weight * 100)}%</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Raw: {Math.round(c.raw)}</span>
                      <span>Weighted: {c.weighted.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, c.raw)}%`, background: 'var(--brand-forest)' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Raw inputs dark panel */}
            <div className="rounded-xl p-5 text-white" style={{ background: 'var(--brand-forest)' }}>
              <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-3">Raw Climate Inputs</p>
              <div className="flex flex-wrap gap-2">
                {[
                  `Hazard Class: ${inputs.hazardClassification}`,
                  `Actual Rainfall: ${inputs.actualRainfall}mm`,
                  `Historical Avg: ${inputs.historicalAvgRainfall}mm`,
                  `Critical Alerts: ${inputs.criticalAlertCount}`,
                  `High Alerts: ${inputs.highAlertCount}`,
                  `Medium Alerts: ${inputs.mediumAlertCount}`,
                  `In Critical Stage: ${inputs.inCriticalGrowthStage ? 'Yes' : 'No'}`,
                  `Forecast Stress: ${inputs.forecastStressFlag ? 'Active' : 'None'}`,
                ].map(chip => (
                  <span key={chip} className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/10">{chip}</span>
                ))}
              </div>
            </div>

            {/* Formula info box */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Score = (E1 × 0.40) + (E2 × 0.25) + (E3 × 0.20) + (E4 × 0.15). Tier: High ≥ 67, Moderate ≥ 34, Low &lt; 34.
                E1 is a fixed hazard lookup; E2 uses rainfall deviation; E3 counts alert severity over 3-5 seasons; E4 is stepped by crop-stage window and forecast stress.
              </p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Risk Quadrant tab
// ══════════════════════════════════════════════════════════════════════════════

interface FarmerWithQuadrant {
  farmer: Farmer
  cohort: CohortExposureRecord
  exposure: ExposureResult
  friScore: number
  quadrant: QuadrantKey
}

function friZoneLabel(fri: number): string {
  if (fri >= 80) return 'Resilience Leader'
  if (fri >= 60) return 'Resilience Builder'
  if (fri >= 40) return 'Resilience Learner'
  return 'Resilience Starter'
}

function buildFarmersWithQuadrant(farmers: Farmer[]): FarmerWithQuadrant[] {
  const cohortMap = new Map(COHORT_EXPOSURE.map(c => [c.cohortId, c]))
  const result: FarmerWithQuadrant[] = []
  for (const farmer of farmers) {
    if (farmer.currentFri === null) continue
    const cohortId = farmer.enrollment?.cohortId
    if (!cohortId) continue
    const cohort = cohortMap.get(cohortId)
    if (!cohort) continue
    const exposure = computeExposureScore(cohort.inputs)
    const quadrant = computeQuadrant(farmer.currentFri, exposure.score)
    result.push({ farmer, cohort, exposure, friScore: farmer.currentFri, quadrant })
  }
  return result
}

type SortKey = 'fri' | 'exposure' | null
type SortDir = 'asc' | 'desc'

function RiskQuadrantTab({ farmers }: { farmers: Farmer[] }) {
  const allRows = useMemo(() => buildFarmersWithQuadrant(farmers), [farmers])
  const [filterQuadrant, setFilterQuadrant] = useState<QuadrantKey | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedRow, setSelectedRow] = useState<FarmerWithQuadrant | null>(null)

  const quadrantCounts = useMemo(() => {
    const counts: Record<QuadrantKey, number> = { HighCap_LowExp: 0, HighCap_HighExp: 0, LowCap_LowExp: 0, LowCap_HighExp: 0 }
    for (const row of allRows) counts[row.quadrant]++
    return counts
  }, [allRows])

  const filtered = useMemo(() => {
    let rows = filterQuadrant === 'all' ? allRows : allRows.filter(r => r.quadrant === filterQuadrant)
    if (sortKey) {
      rows = rows.slice().sort((a, b) => {
        const av = sortKey === 'fri' ? a.friScore : a.exposure.score
        const bv = sortKey === 'fri' ? b.friScore : b.exposure.score
        return sortDir === 'asc' ? av - bv : bv - av
      })
    }
    return rows
  }, [allRows, filterQuadrant, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const QUADRANT_KEYS: QuadrantKey[] = ['HighCap_LowExp', 'HighCap_HighExp', 'LowCap_LowExp', 'LowCap_HighExp']

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-base font-bold text-gray-900">Risk Portfolio Quadrant</h2>
        <p className="text-sm text-gray-500 mt-0.5">Combines each farmer&apos;s FRI score with their cohort&apos;s current climate exposure. Computed at read time — not persisted.</p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterQuadrant('all')}
          className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
          style={filterQuadrant === 'all'
            ? { background: '#1A3D2B', color: '#fff', borderColor: '#1A3D2B' }
            : { background: 'transparent', color: '#6b7280', borderColor: '#e5e7eb' }}
        >
          All Farmers ({allRows.length})
        </button>
        {QUADRANT_KEYS.map(q => {
          const info = QUADRANT_INFO[q]
          const active = filterQuadrant === q
          return (
            <button
              key={q}
              onClick={() => setFilterQuadrant(q)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
              style={active
                ? { background: info.color, color: '#fff', borderColor: info.color }
                : { background: 'transparent', color: '#6b7280', borderColor: '#e5e7eb' }}
            >
              {info.shortLabel} ({quadrantCounts[q]})
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Farmer</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cohort</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none" onClick={() => toggleSort('fri')}>
                FRI {sortKey === 'fri' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none" onClick={() => toggleSort('exposure')}>
                Exposure {sortKey === 'exposure' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Quadrant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No farmers match the current filter.</td>
              </tr>
            ) : filtered.map(row => {
              const info = QUADRANT_INFO[row.quadrant]
              return (
                <tr key={row.farmer.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setSelectedRow(row)}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{row.farmer.fullName}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{row.cohort.cohortName}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold" style={{ color: '#3E7D5A' }}>{row.friScore}</span>
                    <span className="text-[11px] text-gray-400 ml-1.5">{friZoneLabel(row.friScore)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold" style={{ color: '#B04A2E' }}>{row.exposure.score}</span>
                    <span className="text-[11px] text-gray-400 ml-1.5">{row.exposure.tier}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold text-white" style={{ background: info.color }}>
                      {info.shortLabel}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Detail sheet */}
      <SheetTemplate
        open={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        title={selectedRow?.farmer.fullName ?? ''}
        subtitle={selectedRow ? `${selectedRow.cohort.cohortName} · ${selectedRow.cohort.district}` : undefined}
      >
        {selectedRow && (() => {
          const { farmer, exposure, friScore, quadrant } = selectedRow
          const info = QUADRANT_INFO[quadrant]
          const aiText = `${farmer.fullName} sits in the ${info.axisLabel} quadrant with an FRI of ${friScore} and cohort exposure of ${exposure.score} (${exposure.tier}). ${info.recommendation}`
          return (
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">FRI Score</p>
                  <p className="text-2xl font-bold" style={{ color: '#3E7D5A' }}>{friScore}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{friZoneLabel(friScore)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Exposure Score</p>
                  <p className="text-2xl font-bold" style={{ color: '#B04A2E' }}>{exposure.score}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{exposure.tier}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Exposure Breakdown</p>
                <div className="grid grid-cols-2 gap-2">
                  {exposure.components.map(c => (
                    <div key={c.key} className="rounded-lg bg-gray-50 p-2.5">
                      <p className="text-[11px] font-semibold text-gray-700">{c.key} · {c.label}</p>
                      <p className="text-xs text-gray-400">Raw {Math.round(c.raw)} · Wt {c.weighted.toFixed(1)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: 'var(--brand-forest)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-white" />
                  <p className="text-xs font-semibold text-white">Norvi AI Assessment</p>
                </div>
                <p className="text-xs text-white/80 leading-relaxed">{aiText}</p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4" style={{ background: '#FAFAFA' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: info.color }}>Intervention Routing</p>
                <p className="text-sm text-gray-600 leading-relaxed">{info.recommendation}</p>
              </div>
            </div>
          )
        })()}
      </SheetTemplate>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════════════════════

const INSIGHTS_FILTER_TABS: InsightsTab[] = ['ai-overview', 'climate-exposure', 'risk-quadrant']

export function Main() {
  const [tab, setTab] = useState<InsightsTab>('ai-overview')
  const [communityFilter,   setCommunityFilter]   = useState('all')
  const [programFilter,     setProgramFilter]     = useState('all')
  const [cohortFilter,      setCohortFilter]      = useState('all')
  const [cooperativeFilter, setCooperativeFilter] = useState('all')

  const communityOptions = useMemo(() => [
    { value: 'all', label: 'All Communities' },
    ...Array.from(new Set((FARMERS_LIST as Farmer[]).map(f => f.community))).sort().map(c => ({ value: c, label: c })),
  ], [])
  const programOptions = useMemo(() => [
    { value: 'all', label: 'All Programs' },
    ...PROGRAMS.map(p => ({ value: p.id, label: p.name })),
  ], [])
  const cohortOptions = useMemo(() => {
    const cohorts = programFilter === 'all'
      ? PROGRAMS.flatMap(p => p.cohorts)
      : PROGRAMS.find(p => p.id === programFilter)?.cohorts ?? []
    return [{ value: 'all', label: 'All Cohorts' }, ...cohorts.map(c => ({ value: c.id, label: c.name }))]
  }, [programFilter])
  const cooperativeOptions = useMemo(() => [
    { value: 'all', label: 'All Cooperatives' },
    ...COOPERATIVES.map(c => ({ value: c.id, label: c.name })),
  ], [])

  const hasActiveFilter = communityFilter !== 'all' || programFilter !== 'all' || cohortFilter !== 'all' || cooperativeFilter !== 'all'

  function clearFilters() {
    setCommunityFilter('all')
    setProgramFilter('all')
    setCohortFilter('all')
    setCooperativeFilter('all')
  }

  const filteredFarmers = useMemo(() => (FARMERS_LIST as Farmer[]).filter(f => {
    if (communityFilter !== 'all' && f.community !== communityFilter) return false
    if (programFilter !== 'all' && f.enrollment?.programId !== programFilter) return false
    if (cohortFilter !== 'all' && f.enrollment?.cohortId !== cohortFilter) return false
    if (cooperativeFilter !== 'all' && FARMER_COOPERATIVE_MAP[f.id] !== cooperativeFilter) return false
    return true
  }), [communityFilter, programFilter, cohortFilter, cooperativeFilter])

  const filteredCohortIds = useMemo(() => {
    if (!hasActiveFilter) return null
    return new Set(filteredFarmers.map(f => f.enrollment?.cohortId).filter((id): id is string => !!id))
  }, [hasActiveFilter, filteredFarmers])

  return (
    <div className="p-6 space-y-5" style={{ background: 'var(--surface-page)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--brand-mint)' }}>
          <Sparkles className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900">Insights</h1>
          <p className="text-sm text-gray-500 mt-0.5">FRI scores, risk monitoring, reports &amp; AI-powered insights</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto w-fit max-w-full">
        {TABS.map(({ id, Icon, label }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0',
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

      {/* Filters — apply to AI Overview, Climate Exposure, Risk Quadrant */}
      {INSIGHTS_FILTER_TABS.includes(tab) && (
        <div className="flex flex-col gap-2 bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <SelectTemplate size="sm" options={communityOptions} value={communityFilter} onChange={e => setCommunityFilter(e.target.value)} />
            <SelectTemplate size="sm" options={programOptions} value={programFilter} onChange={e => { setProgramFilter(e.target.value); setCohortFilter('all') }} />
            <SelectTemplate size="sm" options={cohortOptions} value={cohortFilter} onChange={e => setCohortFilter(e.target.value)} />
            <SelectTemplate size="sm" options={cooperativeOptions} value={cooperativeFilter} onChange={e => setCooperativeFilter(e.target.value)} />
          </div>
          {hasActiveFilter && (
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-gray-400">{filteredFarmers.length} farmer{filteredFarmers.length !== 1 ? 's' : ''} match</p>
              <button onClick={clearFilters} className="text-[11px] font-medium hover:underline" style={{ color: 'var(--brand-forest)' }}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab content */}
      {tab === 'ai-overview' && <AIOverviewTab farmers={filteredFarmers} />}
      {tab === 'fri-dashboard' && (
        <div className="-mt-4 -mx-6">
          <FRIDashboardMain />
        </div>
      )}
      {tab === 'risk-intelligence' && (
        <div className="-mt-4 -mx-6">
          <RiskIntelligenceMain />
        </div>
      )}
      {tab === 'climate-exposure' && <ClimateExposureTab cohortIds={filteredCohortIds} />}
      {tab === 'risk-quadrant' && <RiskQuadrantTab farmers={filteredFarmers} />}
      {tab === 'reports' && (
        <div className="-mt-4 -mx-6">
          <ReportsMain />
        </div>
      )}
    </div>
  )
}
