'use client'

import { useState, useMemo } from 'react'
import { AlertTriangle, RefreshCw, TrendingUp, Activity, Filter, ChevronDown } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts'
import { FARMERS_LIST } from '@/dataCenter/farmerManagement'
import type { Farmer } from '@/app/(admin)/dashboard/FarmersRegistry/_logics/interface'

// ── Risk classification ────────────────────────────────────────────────────────
function riskLevel(f: Farmer): 'High' | 'Medium' | 'Low' {
  if (f.currentFri === null || f.currentFri < 50) return 'High'
  if (f.currentFri < 68)                           return 'Medium'
  return 'Low'
}

const RISK_COLOR: Record<string, string> = {
  High:   '#ef4444',
  Medium: '#f59e0b',
  Low:    '#22c55e',
}

const REGION_LABEL: Record<string, string> = {
  ah: 'Ashanti', sa: 'Savannah', nr: 'Northern', ue: 'Upper East', uw: 'Upper West',
}

type RiskTab    = 'overview' | 'at-risk' | 'by-region' | 'trends'
type RiskFilter = 'all' | 'high' | 'medium' | 'low'

// Mock days since last check-in per farmer
const CHECKIN_DAYS: Record<string, number> = {
  'f-001': 78, 'f-002': 80, 'f-003': 5, 'f-004': 12, 'f-005': 95, 'f-006': 45,
}

function riskTag(f: Farmer): string {
  const days = CHECKIN_DAYS[f.id] ?? 0
  if (days > 30) return 'Missed check-ins'
  if ((f.currentFri ?? 0) < 50) return 'Low FRI Score'
  return 'Below Avg FRI'
}

// ── Trend mock data ────────────────────────────────────────────────────────────
const TREND_DATA = [
  { month: 'Jan', avgFri: 49, dropouts: 6,  enrollments: 7  },
  { month: 'Feb', avgFri: 51, dropouts: 7,  enrollments: 11 },
  { month: 'Mar', avgFri: 53, dropouts: 5,  enrollments: 17 },
  { month: 'Apr', avgFri: 55, dropouts: 5,  enrollments: 20 },
  { month: 'May', avgFri: 57, dropouts: 4,  enrollments: 21 },
  { month: 'Jun', avgFri: 58, dropouts: 3,  enrollments: 27 },
]

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ icon, iconBg, label, value, trend }: {
  icon: React.ReactNode; iconBg: string; label: string; value: string | number; trend: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <span className="text-xs font-medium text-green-500 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function Main() {
  const [tab,         setTab]       = useState<RiskTab>('overview')
  const [riskFilter,  setRiskFilter] = useState<RiskFilter>('all')
  const [refreshed,   setRefreshed]  = useState(false)

  const farmers = FARMERS_LIST as Farmer[]

  const stats = useMemo(() => {
    const high   = farmers.filter(f => riskLevel(f) === 'High')
    const medium = farmers.filter(f => riskLevel(f) === 'Medium')
    const low    = farmers.filter(f => riskLevel(f) === 'Low')
    const withFri = farmers.filter(f => f.currentFri !== null)
    const avgFri  = withFri.length
      ? Math.round(withFri.reduce((s, f) => s + (f.currentFri ?? 0), 0) / withFri.length)
      : 0

    const riskDist = [
      { name: 'High',   value: high.length,   color: RISK_COLOR.High   },
      { name: 'Medium', value: medium.length,  color: RISK_COLOR.Medium },
      { name: 'Low',    value: low.length,     color: RISK_COLOR.Low    },
    ]

    const riskFactors = [
      { factor: 'Low FRI Score',    count: farmers.filter(f => (f.currentFri ?? 0) < 45).length },
      { factor: 'Below Avg FRI',    count: farmers.filter(f => (f.currentFri ?? 0) < avgFri).length },
      { factor: 'Missed Check-ins', count: Math.round(farmers.length * 0.4) },
      { factor: 'Infrequent Visits',count: farmers.length - 2 },
    ]

    const byRegion = Object.entries(
      farmers.reduce<Record<string, { high: number; medium: number; low: number }>>((acc, f) => {
        const region = f.region ?? 'unknown'
        if (!acc[region]) acc[region] = { high: 0, medium: 0, low: 0 }
        const r = riskLevel(f).toLowerCase() as 'high' | 'medium' | 'low'
        acc[region][r]++
        return acc
      }, {})
    ).map(([region, counts]) => ({ region: REGION_LABEL[region] ?? region, ...counts }))

    return { high, medium, low, avgFri, riskDist, riskFactors, byRegion }
  }, [farmers])

  function handleRefresh() {
    setRefreshed(true)
    setTimeout(() => setRefreshed(false), 800)
  }

  const TABS: { key: RiskTab; label: string }[] = [
    { key: 'overview',   label: 'Overview'       },
    { key: 'at-risk',    label: 'At-Risk Farmers' },
    { key: 'by-region',  label: 'By Region'       },
    { key: 'trends',     label: 'Trends'          },
  ]

  return (
    <div className="min-h-screen p-6 space-y-5" style={{ background: 'var(--brand-gray)' }}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Risk Intelligence
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Identify and monitor at-risk farmers across your program</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-600"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshed ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
          iconBg="bg-red-50"
          label="High Risk"
          value={stats.high.length}
          trend="3%"
        />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          iconBg="bg-amber-50"
          label="Medium Risk"
          value={stats.medium.length}
          trend="5%"
        />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4 text-green-500" />}
          iconBg="bg-green-50"
          label="Avg FRI Score"
          value={stats.avgFri}
          trend="4%"
        />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4 text-blue-400" />}
          iconBg="bg-blue-50"
          label="Check-in Rate"
          value="0%"
          trend="2%"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'pb-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === t.key
                ? 'border-(--brand-forest) text-(--brand-forest)'
                : 'border-transparent text-gray-400 hover:text-gray-600',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Risk Distribution donut */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-800 mb-4">Risk Distribution</p>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={stats.riskDist}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={80}
                      dataKey="value" stroke="none"
                    >
                      {stats.riskDist.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v ?? '', n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {stats.riskDist.map(d => (
                    <div key={d.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-sm text-gray-600 w-16">{d.name}</span>
                      <span className="text-sm font-bold text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Risk Factors horizontal bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-800 mb-4">Top Risk Factors</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={stats.riskFactors}
                  layout="vertical"
                  margin={{ left: 80, right: 16, top: 0, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category" dataKey="factor"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false} tickLine={false} width={80}
                  />
                  <Tooltip cursor={{ fill: '#f9fafb' }} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Action Required banner */}
          {stats.high.length > 0 && (
            <div className="rounded-xl border border-amber-200 px-5 py-4 flex items-start gap-3"
                 style={{ background: '#fffbeb' }}>
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Action Required</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  {stats.high.length} farmer{stats.high.length !== 1 ? 's are' : ' is'} classified as high risk.
                  Schedule urgent check-ins and consider targeted interventions.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── At-Risk Farmers ── */}
      {tab === 'at-risk' && (() => {
        const filterMap: Record<RiskFilter, Farmer[]> = {
          all:    farmers,
          high:   stats.high,
          medium: stats.medium,
          low:    stats.low,
        }
        const displayed = filterMap[riskFilter]
          .slice()
          .sort((a, b) => (a.currentFri ?? 0) - (b.currentFri ?? 0))

        const FILTER_PILLS: { key: RiskFilter; label: string; count: number; activeColor: string }[] = [
          { key: 'all',    label: 'All',    count: farmers.length,       activeColor: '#1A3D2B' },
          { key: 'high',   label: 'High',   count: stats.high.length,   activeColor: '#ef4444' },
          { key: 'medium', label: 'Medium', count: stats.medium.length, activeColor: '#f59e0b' },
          { key: 'low',    label: 'Low',    count: stats.low.length,    activeColor: '#22c55e' },
        ]

        return (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Filter bar */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-500 font-medium">Filter:</span>
                <div className="flex gap-1.5">
                  {FILTER_PILLS.map(p => {
                    const active = riskFilter === p.key
                    return (
                      <button
                        key={p.key}
                        onClick={() => setRiskFilter(p.key)}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all border"
                        style={active
                          ? { background: p.activeColor, color: '#fff', borderColor: p.activeColor }
                          : { background: 'transparent', color: '#6b7280', borderColor: '#e5e7eb' }
                        }
                      >
                        {p.label} ({p.count})
                      </button>
                    )
                  })}
                </div>
              </div>
              <button className="flex items-center gap-1 text-xs text-gray-500 font-medium hover:text-gray-700 shrink-0">
                FRI Score <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List */}
            {displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Activity className="w-7 h-7 text-gray-300" />
                <p className="text-sm text-gray-400">No farmers in this category</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {displayed.map(f => {
                  const risk  = riskLevel(f)
                  const days  = CHECKIN_DAYS[f.id] ?? 0
                  const tag   = riskTag(f)
                  const rCode = (f.region ?? '').toUpperCase()

                  return (
                    <div key={f.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                      {/* Dot */}
                      <div className="w-2.5 h-2.5 rounded-full shrink-0"
                           style={{ background: RISK_COLOR[risk] }} />

                      {/* Name + region */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{f.fullName}</p>
                        <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide">{rCode}</p>
                      </div>

                      {/* FRI + days */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold" style={{ color: RISK_COLOR[risk] }}>
                          FRI {f.currentFri ?? '—'}
                        </p>
                        <p className="text-[11px] text-gray-400">{days}d ago</p>
                      </div>

                      {/* Tag */}
                      <span className="text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 shrink-0">
                        {tag}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── By Region ── */}
      {tab === 'by-region' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-800 mb-4">Risk by Region</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={stats.byRegion.map(r => ({ ...r, region: r.region.slice(0, 2).toUpperCase() }))}
              margin={{ left: 0, right: 16, top: 4, bottom: 0 }}
              barSize={64}
            >
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="region" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: '#f9fafb' }} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
              <Bar dataKey="high"   name="High"   stackId="a" fill="#ef4444" />
              <Bar dataKey="medium" name="Medium" stackId="a" fill="#f59e0b" />
              <Bar dataKey="low"    name="Low"    stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Trends ── */}
      {tab === 'trends' && (
        <div className="space-y-4">

          {/* Avg FRI area chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-800 mb-4">Average FRI Score Over Time</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={TREND_DATA} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="friGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis domain={[40, 80]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ stroke: '#e5e7eb' }} />
                <Area type="monotone" dataKey="avgFri" name="Avg FRI"
                  stroke="#22c55e" strokeWidth={2} fill="url(#friGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Dropouts + Enrollments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-800 mb-4">Dropouts per Month</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={TREND_DATA} margin={{ left: 0, right: 8, top: 4, bottom: 0 }} barSize={28}>
                  <CartesianGrid vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#fef2f2' }} />
                  <Bar dataKey="dropouts" name="Dropouts" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-800 mb-4">New Enrollments per Month</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={TREND_DATA} margin={{ left: 0, right: 8, top: 4, bottom: 0 }} barSize={28}>
                  <CartesianGrid vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f0fdf4' }} />
                  <Bar dataKey="enrollments" name="Enrollments" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary stat row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <p className="text-xl font-bold" style={{ color: 'var(--brand-forest)' }}>+8 pts</p>
              <p className="text-xs font-semibold text-gray-700 mt-0.5">FRI improvement</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--brand-green)' }}>Jan — Jun</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <p className="text-xl font-bold text-red-500">
                {TREND_DATA.reduce((s, d) => s + d.dropouts, 0)}
              </p>
              <p className="text-xs font-semibold text-gray-700 mt-0.5">Total dropouts</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Last 6 months</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <p className="text-xl font-bold" style={{ color: 'var(--brand-forest)' }}>
                {TREND_DATA.reduce((s, d) => s + d.enrollments, 0)}
              </p>
              <p className="text-xs font-semibold text-gray-700 mt-0.5">Total enrolled</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Last 6 months</p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
