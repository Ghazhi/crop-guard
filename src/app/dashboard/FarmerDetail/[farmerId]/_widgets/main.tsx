'use client'

import { PersonAvatar } from '@/customComponents/PersonAvatar'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import {
  ArrowLeft,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import { CardTemplate } from '@/customComponents/CardTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'

import {
  getFarmerDetail,
  getWeekScores,
  getRiskFlags,
  getInterventions,
} from '../_logics/functions'
import type {
  FarmerDetail,
  WeekScore,
  RiskFlag,
  Intervention,
  FriZone,
  Trajectory,
  Recommendation,
  RiskBand,
} from '../_logics/interface'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function zoneVariant(zone: FriZone) {
  if (zone === 'Resilience Leader') return 'success'
  if (zone === 'Resilience Builder') return 'info'
  if (zone === 'Resilience Learner') return 'warning'
  return 'danger'
}

function trajectoryVariant(t: Trajectory) {
  if (t === 'Improving') return 'improving'
  if (t === 'Stable') return 'stable'
  return 'declining'
}

function recommendationVariant(r: Recommendation) {
  if (r === 'Approve') return 'success'
  if (r === 'Review') return 'warning'
  if (r === 'Defer') return 'neutral'
  return 'danger'
}

function riskBandVariant(rb: RiskBand) {
  if (rb === 'Low') return 'success'
  if (rb === 'Moderate') return 'warning'
  if (rb === 'High') return 'danger'
  return 'danger'
}

// ─── Item scores data ─────────────────────────────────────────────────────────

const PILLAR_ITEMS: { pillar: 'p1'|'p2'|'p3'|'p4'; label: string; max: number }[] = [
  { pillar: 'p1', label: 'Farming Experience',     max: 6 },
  { pillar: 'p1', label: 'Weed Management',        max: 6 },
  { pillar: 'p1', label: 'Proper Planting',        max: 6 },
  { pillar: 'p1', label: 'Fertilizer Use',         max: 6 },
  { pillar: 'p1', label: 'Pest & Disease Control', max: 6 },
  { pillar: 'p2', label: 'Mulching',               max: 6 },
  { pillar: 'p2', label: 'Composting',             max: 6 },
  { pillar: 'p2', label: 'Crop Rotation',          max: 6 },
  { pillar: 'p2', label: 'Water Harvesting',       max: 6 },
  { pillar: 'p2', label: 'Conservation Tillage',   max: 6 },
  { pillar: 'p3', label: 'Attends Training',       max: 5 },
  { pillar: 'p3', label: 'Follows Agronomist',     max: 5 },
  { pillar: 'p3', label: 'Cooperative Visits',     max: 5 },
  { pillar: 'p3', label: 'Cooperative Affiliation',max: 5 },
  { pillar: 'p4', label: 'Repayment History',      max: 5 },
  { pillar: 'p4', label: 'Savings Habit',          max: 5 },
  { pillar: 'p4', label: 'Additional Income',      max: 5 },
  { pillar: 'p4', label: 'Offtaker Confirmed',     max: 5 },
]

const ECI_ITEMS: { label: string; max: number }[] = [
  { label: 'Stable Income & Debt Burden',  max: 8 },
  { label: 'Moderate Financial Stability', max: 8 },
  { label: 'Identity & Eligibility',       max: 8 },
  { label: 'Production Commitment',        max: 8 },
  { label: 'Asset & Land Tenure',          max: 8 },
]

const PILLAR_META = {
  p1: { label: 'P1 — AGRONOMY',  color: '#2C5F3F' },
  p2: { label: 'P2 — CSA',       color: '#2B7BB9' },
  p3: { label: 'P3 — ADVISORY',  color: '#E8963A' },
  p4: { label: 'P4 — ENTERPRISE',color: '#D94F3D' },
}

function hash(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function scatterScores(pillarScore: number, items: { label: string; max: number }[], farmerId: string) {
  const total = items.reduce((s, i) => s + i.max, 0)
  if (total === 0 || pillarScore === 0) return items.map(() => 0)
  const weights = items.map(item => {
    const h = hash(`${farmerId}:${item.label}`) % 100
    return item.max * (0.5 + h / 200)
  })
  const weightSum = weights.reduce((s, w) => s + w, 0)
  let remaining = pillarScore
  return items.map((item, idx) => {
    if (idx === items.length - 1) return Math.max(0, Math.min(item.max, remaining))
    const raw = Math.round((weights[idx] / weightSum) * pillarScore)
    const score = Math.min(item.max, Math.max(0, raw))
    remaining -= score
    return score
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 ${className ?? ''}`}
    />
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-48 w-full" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} className="h-24" />
        ))}
      </div>
      <SkeletonBlock className="h-64 w-full" />
      <SkeletonBlock className="h-64 w-full" />
    </div>
  )
}

function PillarBar({
  label,
  score,
  max,
}: {
  label: string
  score: number
  max: number
}) {
  const pct = Math.round((score / max) * 100)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--brand-slate)' }}>
          {label}
        </span>
        <span className="text-xs font-semibold" style={{ color: 'var(--brand-dark)' }}>
          {score}/{max}
        </span>
      </div>
      <div className="h-2 w-full rounded-full" style={{ background: 'var(--brand-mint)' }}>
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: 'var(--brand-dark)' }}
        />
      </div>
    </div>
  )
}

function ItemScoresPanel({ weekData, eciScore, farmerId }: { weekData: WeekScore; eciScore: number; farmerId: string }) {
  const [open, setOpen] = useState(false)

  const p1Items = PILLAR_ITEMS.filter(i => i.pillar === 'p1')
  const p2Items = PILLAR_ITEMS.filter(i => i.pillar === 'p2')
  const p3Items = PILLAR_ITEMS.filter(i => i.pillar === 'p3')
  const p4Items = PILLAR_ITEMS.filter(i => i.pillar === 'p4')

  const p1Scores = scatterScores(weekData.p1Score, p1Items, farmerId)
  const p2Scores = scatterScores(weekData.p2Score, p2Items, farmerId)
  const p3Scores = scatterScores(weekData.p3Score, p3Items, farmerId)
  const p4Scores = scatterScores(weekData.p4Score, p4Items, farmerId)
  const eciScores = scatterScores(eciScore, ECI_ITEMS, farmerId)

  function ItemRow({ label, score, max, color }: { label: string; score: number; max: number; color: string }) {
    const pct = Math.round((score / max) * 100)
    return (
      <div className="flex items-center gap-3 py-2">
        <span className="flex-1 text-sm text-gray-700">{label}</span>
        <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <span className="text-xs font-medium text-gray-500 tabular-nums w-8 text-right shrink-0">{score}/{max}</span>
      </div>
    )
  }

  function PillarSection({ pillar, items, scores }: { pillar: 'p1'|'p2'|'p3'|'p4'; items: typeof p1Items; scores: number[] }) {
    const meta = PILLAR_META[pillar]
    return (
      <div className="pt-3">
        <p className="text-xs font-bold tracking-wide mb-1" style={{ color: meta.color }}>{meta.label}</p>
        <div className="divide-y divide-gray-50">
          {items.map((item, i) => (
            <ItemRow key={item.label} label={item.label} score={scores[i]} max={item.max} color={meta.color} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between text-sm text-gray-500 hover:text-gray-700 transition-colors py-1"
      >
        <span className="font-medium">View all item scores</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 space-y-1">
          <PillarSection pillar="p1" items={p1Items} scores={p1Scores} />
          <PillarSection pillar="p2" items={p2Items} scores={p2Scores} />
          <PillarSection pillar="p3" items={p3Items} scores={p3Scores} />
          <PillarSection pillar="p4" items={p4Items} scores={p4Scores} />
          <div className="pt-3">
            <p className="text-xs font-bold tracking-wide mb-1" style={{ color: '#2B7BB9' }}>ECI ITEMS</p>
            <div className="divide-y divide-gray-50">
              {ECI_ITEMS.map((item, i) => (
                <ItemRow key={item.label} label={item.label} score={eciScores[i]} max={item.max} color="#2B7BB9" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InterventionCard({ item, farmerScore }: { item: Intervention; farmerScore: number }) {
  const [expanded, setExpanded] = useState(false)
  const eligible = item.eligible

  return (
    <div
      className="rounded-xl border p-4 transition-all"
      style={{
        borderColor: eligible ? '#6EE7B7' : '#E5E7EB',
        background: eligible ? '#F0FDF4' : '#FAFAFA',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <BadgeTemplate label={item.type} variant="info" size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--brand-forest)' }}>
              {item.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--brand-slate)' }}>
              Min FRI: {item.minFRI} &nbsp;|&nbsp; Farmer score: {farmerScore}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {eligible ? (
            <BadgeTemplate label="Eligible" variant="success" size="sm" dot />
          ) : (
            <BadgeTemplate label="Not Eligible" variant="danger" size="sm" dot />
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-gray-200"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <ChevronUp size={14} style={{ color: 'var(--brand-slate)' }} />
            ) : (
              <ChevronDown size={14} style={{ color: 'var(--brand-slate)' }} />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: eligible ? '#A7F3D0' : '#E5E7EB' }}>
          <p className="text-sm" style={{ color: 'var(--brand-slate)' }}>
            {item.description}
          </p>
          {!eligible && item.friGap !== null && (
            <p className="mt-2 text-xs font-medium" style={{ color: '#991B1B' }}>
              FRI gap: {item.friGap} points needed to qualify
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function FriThresholdBar({
  interventions,
  farmerScore,
}: {
  interventions: Intervention[]
  farmerScore: number
}) {
  const bands = [
    { from: 0, to: 40, color: '#FEE2E2', label: '0' },
    { from: 40, to: 60, color: '#FEF3C7', label: '40' },
    { from: 60, to: 80, color: '#DBEAFE', label: '60' },
    { from: 80, to: 100, color: '#D1FAE5', label: '80' },
  ]

  const farmerPct = farmerScore

  return (
    <div className="relative mb-6">
      {/* Band bar */}
      <div className="relative h-8 w-full rounded-lg overflow-hidden flex">
        {bands.map((b) => (
          <div
            key={b.from}
            className="h-full flex-none"
            style={{
              width: `${b.to - b.from}%`,
              background: b.color,
            }}
          />
        ))}

        {/* Threshold tick marks */}
        {interventions.map((iv) => (
          <div
            key={iv.id}
            className="absolute top-0 bottom-0 flex flex-col items-center"
            style={{ left: `${iv.minFRI}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-0.5 h-full" style={{ background: 'rgba(0,0,0,0.25)' }} />
          </div>
        ))}

        {/* Farmer score dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 z-10"
          style={{ left: `${farmerPct}%`, transform: 'translateX(-50%) translateY(-50%)' }}
        >
          <div
            className="h-5 w-5 rounded-full border-2 border-white shadow-md"
            style={{ background: 'var(--brand-dark)' }}
          />
        </div>
      </div>

      {/* Scale labels */}
      <div className="relative mt-1 h-4">
        {[0, 20, 40, 60, 80, 100].map((v) => (
          <span
            key={v}
            className="absolute text-[10px]"
            style={{ left: `${v}%`, transform: 'translateX(-50%)', color: 'var(--brand-slate)' }}
          >
            {v}
          </span>
        ))}
      </div>

      {/* Intervention labels */}
      <div className="relative mt-3 h-5">
        {interventions.map((iv) => (
          <span
            key={iv.id}
            className="absolute text-[10px] font-medium whitespace-nowrap"
            style={{
              left: `${iv.minFRI}%`,
              transform: 'translateX(-50%)',
              color: iv.eligible ? 'var(--brand-forest)' : 'var(--brand-slate)',
            }}
          >
            {iv.name}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function Main({ farmerId }: { farmerId: string }) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [farmer, setFarmer] = useState<FarmerDetail | null>(null)
  const [weekScores, setWeekScores] = useState<WeekScore[]>([])
  const [flags, setFlags] = useState<RiskFlag[]>([])
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [activeWeek, setActiveWeek] = useState<number | 'baseline' | 'current'>('current')

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const [f, ws, rf, iv] = await Promise.all([
        getFarmerDetail(farmerId),
        getWeekScores(farmerId),
        getRiskFlags(farmerId),
        getInterventions(farmerId),
      ])
      setFarmer(f)
      setWeekScores(ws)
      setFlags(rf)
      setInterventions(iv)
      setLoading(false)
    }
    fetchAll()
  }, [farmerId])

  // Which week's pillar data to show
  const activeWeekData: WeekScore | null = (() => {
    if (!weekScores.length) return null
    if (activeWeek === 'current') return weekScores[weekScores.length - 1]
    if (activeWeek === 'baseline') return weekScores[0]
    return weekScores.find((w) => w.weekNumber === activeWeek) ?? null
  })()

  // Chart data — 12 weeks, fill with null for pending weeks
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const weekNum = i + 1
    const ws = weekScores.find((w) => w.weekNumber === weekNum)
    return {
      week: `W${weekNum}`,
      final: ws && ws.scoreStatus === 'final' ? ws.totalScore : null,
      provisional: ws && ws.scoreStatus === 'provisional' ? ws.totalScore : null,
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8" style={{ background: 'var(--brand-gray)' }}>
        <div className="mb-4">
          <ButtonTemplate
            variant="ghost"
            size="sm"
            label="Back to list"
            leftIcon={<ArrowLeft size={15} />}
            onClick={() => router.back()}
          />
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (!farmer) return null

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: 'var(--brand-gray)' }}>
      {/* ── Back button ────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <ButtonTemplate
          variant="ghost"
          size="sm"
          label="Back to list"
          leftIcon={<ArrowLeft size={15} />}
          onClick={() => router.back()}
        />
      </div>

      {/* ── Header card ────────────────────────────────────────────────────── */}
      <div
        className="mb-6 rounded-2xl bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          {/* Left: avatar + identity */}
          <div className="flex items-start gap-4">
            <PersonAvatar name={farmer.fullName} size={56} />
            <div>
              <h1
                className="text-2xl font-bold leading-tight"
                style={{ color: 'var(--brand-forest)' }}
              >
                {farmer.fullName}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--brand-slate)' }}>
                {farmer.asinyoId} &nbsp;·&nbsp; {farmer.community}, {farmer.district}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <BadgeTemplate label={farmer.zone} variant={zoneVariant(farmer.zone)} size="sm" dot />
                <BadgeTemplate label={farmer.recommendation} variant={recommendationVariant(farmer.recommendation)} size="sm" />
                <BadgeTemplate label={farmer.riskBand + ' Risk'} variant={riskBandVariant(farmer.riskBand)} size="sm" />
                <BadgeTemplate label={farmer.trajectory} variant={trajectoryVariant(farmer.trajectory)} size="sm" dot />
              </div>
            </div>
          </div>

          {/* Right: program + cohort */}
          <div className="md:text-right shrink-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--brand-forest)' }}>
              {farmer.programName}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--brand-slate)' }}>
              {farmer.cohortName}
            </p>
            {farmer.isProvisional && (
              <div className="mt-2 flex md:justify-end">
                <BadgeTemplate label="Has Provisional Scores" variant="warning" size="sm" />
              </div>
            )}
          </div>
        </div>

        {/* Stat boxes */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* FRI Score */}
          <div
            className="rounded-xl p-4"
            style={{ background: 'var(--brand-mint)' }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--brand-slate)' }}>
              FRI Score
            </p>
            <p className="text-4xl font-bold leading-none" style={{ color: 'var(--brand-forest)' }}>
              {farmer.totalScore}
            </p>
            <div className="mt-2">
              <BadgeTemplate label={farmer.zone} variant={zoneVariant(farmer.zone)} size="sm" />
            </div>
          </div>

          {/* Credit Score */}
          <div
            className="rounded-xl p-4"
            style={{ background: '#EFF6FF' }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--brand-slate)' }}>
              Credit Score
            </p>
            <p className="text-4xl font-bold leading-none" style={{ color: 'var(--brand-blue, #2B7BB9)' }}>
              {farmer.creditScore}
            </p>
            <div className="mt-2">
              <BadgeTemplate label={farmer.riskBand + ' Risk'} variant={riskBandVariant(farmer.riskBand)} size="sm" />
            </div>
          </div>

          {/* ECI Score */}
          <div
            className="rounded-xl p-4"
            style={{ background: '#FFFBEB' }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--brand-slate)' }}>
              ECI Score
            </p>
            <p className="text-4xl font-bold leading-none" style={{ color: 'var(--brand-amber, #E8963A)' }}>
              {farmer.eciScore}
            </p>
            <div className="mt-2">
              <BadgeTemplate label={farmer.trajectory} variant={trajectoryVariant(farmer.trajectory)} size="sm" dot />
            </div>
          </div>
        </div>
      </div>

      {/* ── View selector ──────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(['current', 'baseline', ...weekScores.map((w) => w.weekNumber)] as const).map((key) => {
          const label =
            key === 'current'
              ? 'Current Season'
              : key === 'baseline'
                ? 'Baseline'
                : `Week ${key}`
          const isActive = activeWeek === key
          return (
            <button
              key={String(key)}
              onClick={() => setActiveWeek(key)}
              className="rounded-full px-3 py-1 text-xs font-medium transition-all"
              style={{
                background: isActive ? 'var(--brand-dark)' : 'white',
                color: isActive ? 'white' : 'var(--brand-slate)',
                border: isActive ? 'none' : '1px solid #E5E7EB',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Pillar Scores ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <CardTemplate title="Pillar Scores">
          {activeWeekData ? (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <PillarBar label="P1 Agronomy Readiness" score={activeWeekData.p1Score} max={30} />
                <PillarBar label="P2 CSA & Climate-Smart" score={activeWeekData.p2Score} max={30} />
                <PillarBar label="P3 Advisory & Commitment" score={activeWeekData.p3Score} max={20} />
                <PillarBar label="P4 Farm Enterprise" score={activeWeekData.p4Score} max={20} />
              </div>
              <ItemScoresPanel weekData={activeWeekData} eciScore={farmer.eciScore} farmerId={farmer.farmerId} />
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--brand-slate)' }}>
              No data for this week.
            </p>
          )}
        </CardTemplate>
      </div>

      {/* ── Season Progress chart ──────────────────────────────────────────── */}
      <div className="mb-6">
        <CardTemplate title="Season Progress (Weeks 1–12)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 8, right: 24, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-mint)" />
              <XAxis
                dataKey="week"
                tick={{ fill: 'var(--brand-slate)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'var(--brand-slate)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid var(--brand-mint)',
                  fontSize: 12,
                }}
              />
              <ReferenceLine
                y={80}
                stroke="var(--brand-green)"
                strokeDasharray="4 4"
                label={{ value: '80', fill: 'var(--brand-green)', fontSize: 10 }}
              />
              <ReferenceLine
                y={60}
                stroke="var(--brand-amber, #E8963A)"
                strokeDasharray="4 4"
                label={{ value: '60', fill: 'var(--brand-amber, #E8963A)', fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="final"
                name="Final"
                stroke="var(--brand-dark)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: 'var(--brand-dark)' }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="provisional"
                name="Provisional"
                stroke="var(--brand-amber, #E8963A)"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={{ r: 3, fill: 'var(--brand-amber, #E8963A)' }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Week chips */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {Array.from({ length: 12 }, (_, i) => {
              const weekNum = i + 1
              const ws = weekScores.find((w) => w.weekNumber === weekNum)
              const chipColor = ws
                ? ws.scoreStatus === 'final'
                  ? 'var(--brand-dark)'
                  : '#D97706'
                : '#D1D5DB'
              const textColor = ws ? 'white' : '#6B7280'
              return (
                <div
                  key={weekNum}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                  style={{ background: chipColor, color: textColor }}
                  title={ws ? (ws.scoreStatus === 'final' ? 'Final' : 'Provisional') : 'Pending'}
                >
                  {weekNum}
                </div>
              )
            })}
            <div className="ml-2 flex items-center gap-3 text-xs" style={{ color: 'var(--brand-slate)' }}>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: 'var(--brand-dark)' }} />
                Final
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#D97706' }} />
                Provisional
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full bg-gray-300" />
                Pending
              </span>
            </div>
          </div>
        </CardTemplate>
      </div>

      {/* ── Active Risk Flags ──────────────────────────────────────────────── */}
      {flags.length > 0 && (
        <div className="mb-6">
          <CardTemplate title="Active Risk Flags" noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--brand-mint)' }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--brand-slate)' }}>
                      Flag Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--brand-slate)' }}>
                      Severity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--brand-slate)' }}>
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--brand-slate)' }}>
                      Triggered
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {flags.map((flag, idx) => (
                    <tr
                      key={flag.id}
                      style={{
                        borderBottom: idx < flags.length - 1 ? '1px solid #F3F4F6' : 'none',
                      }}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--brand-forest)' }}>
                        {flag.flagType}
                      </td>
                      <td className="px-4 py-3">
                        <BadgeTemplate
                          label={flag.severity === 'high' ? 'High' : 'Medium'}
                          variant={flag.severity === 'high' ? 'danger' : 'warning'}
                          dot
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--brand-slate)' }}>
                        {flag.description}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--brand-slate)' }}>
                        {flag.createdAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardTemplate>
        </div>
      )}

      {/* ── Opportunity Eligibility ────────────────────────────────────────── */}
      {interventions.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Zap size={18} style={{ color: 'var(--brand-amber, #E8963A)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--brand-forest)' }}>
              Opportunity Eligibility
            </h2>
          </div>

          <CardTemplate title="FRI Threshold Overview" subtitle="Farmer score vs. intervention requirements">
            <FriThresholdBar
              interventions={interventions}
              farmerScore={farmer.totalScore}
            />
          </CardTemplate>

          <div className="mt-4 space-y-3">
            {interventions.map((iv) => (
              <InterventionCard key={iv.id} item={iv} farmerScore={farmer.totalScore} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
