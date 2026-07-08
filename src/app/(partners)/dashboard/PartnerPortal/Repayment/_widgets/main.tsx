'use client'

import { useState } from 'react'
import {
  TrendingUp, Users, AlertTriangle, ShieldCheck,
  ArrowUp, ArrowDown, Minus, Search,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
  Legend,
} from 'recharts'
import { DatagridTemplate }  from '@/customComponents/DatagridTemplate'
import type { DatagridColumn } from '@/customComponents/DatagridTemplate'
import { BadgeTemplate }     from '@/customComponents/BadgeTemplate'
import { PersonAvatar }      from '@/customComponents/PersonAvatar'
import { SelectTemplate }    from '@/customComponents/SelectTemplate'
import { PROGRAMS }          from '@/dataCenter/programs'
import { INTERVENTIONS }     from '@/dataCenter/interventions'
import { FARMERS_LIST }      from '@/dataCenter/farmerManagement'
import type { Farmer, FriZone } from '@/app/(admin)/dashboard/FarmersRegistry/_logics/interface'
import { usePartnerId }      from '../../_logics/usePartnerId'
import { StatCard }          from '../../_components/StatCard'
import { ChartCard }         from '../../_components/ChartCard'
import { TOOLTIP_STYLE }     from '../../_logics/chartUtils'
import { ZONES, ZONE_COLOR, ZONE_BG } from '../../_logics/zoneConstants'

// ── constants ──────────────────────────────────────────────────────────────────
const FOREST = 'var(--brand-forest)'

// ── helpers ────────────────────────────────────────────────────────────────────
function friRisk(fri: number | null): 'Low' | 'Medium' | 'High' | 'Unscored' {
  if (fri === null) return 'Unscored'
  if (fri >= 70)   return 'Low'
  if (fri >= 50)   return 'Medium'
  return 'High'
}

function friRiskVariant(risk: string): 'success' | 'warning' | 'danger' | 'neutral' {
  return risk === 'Low' ? 'success' : risk === 'Medium' ? 'warning' : risk === 'High' ? 'danger' : 'neutral'
}

function zoneVariant(z: FriZone): 'success' | 'info' | 'warning' | 'danger' {
  return z === 'Resilience Leader' ? 'success' : z === 'Resilience Builder' ? 'info' :
         z === 'Resilience Learner' ? 'warning' : 'danger'
}

// ── farmer row type ────────────────────────────────────────────────────────────
interface FarmerRow {
  id:       string
  fullName: string
  program:  string
  cohort:   string
  crop:     string
  fri:      number | null
  friStr:   string
  zone:     FriZone | null
  risk:     string
  trend:    'up' | 'down' | 'flat' | null
}

// ── farmer table columns ───────────────────────────────────────────────────────
const FARMER_COLS: DatagridColumn<FarmerRow>[] = [
  { key: 'fullName', label: 'Farmer', render: (_v, r) => (
    <div className="flex items-center gap-2">
      <PersonAvatar name={r.fullName} size={28} />
      <span className="font-medium text-gray-800">{r.fullName}</span>
    </div>
  )},
  { key: 'program', label: 'Program', render: v => <span className="text-gray-600 text-xs">{v as string}</span> },
  { key: 'cohort',  label: 'Cohort',  render: v => <span className="text-gray-500 text-xs">{v as string}</span> },
  { key: 'crop',    label: 'Crop',    width: '80px', render: v => (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 capitalize">{v as string}</span>
  )},
  { key: 'friStr', label: 'FRI Score', width: '85px', render: (_v, r) => {
    const n = r.fri
    if (n === null) return <span className="text-xs text-gray-400">No score</span>
    const color = n >= 70 ? '#15803d' : n >= 50 ? '#b45309' : '#dc2626'
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-bold text-sm" style={{ color }}>{n.toFixed(1)}</span>
        {r.trend === 'up'   && <ArrowUp   className="w-3.5 h-3.5 text-green-500" />}
        {r.trend === 'down' && <ArrowDown className="w-3.5 h-3.5 text-red-500"   />}
        {r.trend === 'flat' && <Minus     className="w-3.5 h-3.5 text-gray-400"  />}
      </div>
    )
  }},
  { key: 'zone', label: 'Zone', render: (_v, r) => r.zone
    ? <BadgeTemplate label={r.zone} variant={zoneVariant(r.zone)} size="sm" />
    : <span className="text-xs text-gray-400">—</span>
  },
  { key: 'risk', label: 'Risk', width: '80px', render: v => (
    <BadgeTemplate label={v as string} variant={friRiskVariant(v as string)} size="sm" />
  )},
]

// ── main ───────────────────────────────────────────────────────────────────────
export function Main() {
  const partnerId                        = usePartnerId()
  const [filterCohort, setFilterCohort]  = useState('')
  const [filterRisk,   setFilterRisk]    = useState('')
  const [search,       setSearch]        = useState('')

  // ── derive partner cohort IDs ─────────────────────────────────────────────
  const programs     = PROGRAMS.filter(p => p.partnerId === partnerId)
  const interventions = INTERVENTIONS.filter(iv =>
    iv.partnerAssignments?.some((pa: { partnerId: string; cohorts: { cohortId: string }[] }) => pa.partnerId === partnerId)
  )

  const partnerCohortIds = new Set([
    ...interventions.flatMap(iv =>
      iv.partnerAssignments?.find((pa: { partnerId: string; cohorts: { cohortId: string }[] }) => pa.partnerId === partnerId)?.cohorts.map((c: { cohortId: string }) => c.cohortId) ?? []
    ),
    ...programs.flatMap(p => p.cohorts.map((c: { id: string }) => c.id)),
  ])

  const allFarmers = FARMERS_LIST as Farmer[]
  const myFarmers  = allFarmers.filter(f =>
    f.enrollment?.cohortId && partnerCohortIds.has(f.enrollment.cohortId)
  )

  // ── build rows ────────────────────────────────────────────────────────────
  // Deterministic mock trends seeded from farmer id
  const trends: ('up' | 'down' | 'flat')[] = ['up', 'flat', 'down', 'up', 'flat', 'up', 'down']
  const rows: FarmerRow[] = myFarmers.map((f, i) => ({
    id:       f.id,
    fullName: f.fullName,
    program:  f.enrollment?.programName ?? '—',
    cohort:   f.enrollment?.cohortName  ?? '—',
    crop:     f.primaryCrop,
    fri:      f.currentFri,
    friStr:   f.currentFri !== null ? f.currentFri.toFixed(1) : '—',
    zone:     f.currentZone,
    risk:     friRisk(f.currentFri),
    trend:    f.currentFri !== null ? trends[i % trends.length] : null,
  }))

  // ── filter rows ───────────────────────────────────────────────────────────
  const filteredRows = rows.filter(r => {
    if (filterCohort && r.cohort !== filterCohort) return false
    if (filterRisk   && r.risk   !== filterRisk)   return false
    if (search && !r.fullName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Sorted by FRI ascending (highest risk first)
  const sortedRows = [...filteredRows].sort((a, b) => {
    if (a.fri === null && b.fri === null) return 0
    if (a.fri === null) return -1
    if (b.fri === null) return 1
    return a.fri - b.fri
  })

  // ── stats ─────────────────────────────────────────────────────────────────
  const scored    = myFarmers.filter(f => f.currentFri !== null)
  const avgFri    = scored.length ? scored.reduce((s, f) => s + (f.currentFri ?? 0), 0) / scored.length : 0
  const highRisk  = scored.filter(f => (f.currentFri ?? 0) < 50).length
  const leaders   = myFarmers.filter(f => f.currentZone === 'Resilience Leader').length

  // ── chart data ────────────────────────────────────────────────────────────
  // Zone donut
  const zoneData = ZONES.map(z => ({
    name:  z.replace('Resilience ', ''),
    value: myFarmers.filter(f => f.currentZone === z).length,
    color: ZONE_COLOR[z],
  })).filter(d => d.value > 0)

  // FRI score buckets
  const BUCKETS = [
    { range: '<40',   min: 0,  max: 40  },
    { range: '40–49', min: 40, max: 50  },
    { range: '50–59', min: 50, max: 60  },
    { range: '60–69', min: 60, max: 70  },
    { range: '70–79', min: 70, max: 80  },
    { range: '80+',   min: 80, max: 101 },
  ]
  const bucketColors = ['#dc2626', '#ef4444', '#b45309', '#16a34a', '#15803d', '#166534']
  const bucketData = BUCKETS.map(b => ({
    range:   b.range,
    Farmers: scored.filter(f => (f.currentFri ?? 0) >= b.min && (f.currentFri ?? 0) < b.max).length,
  }))

  // Risk breakdown bar
  const riskData = [
    { name: 'Low (≥70)',    value: scored.filter(f => (f.currentFri ?? 0) >= 70).length, color: '#15803d' },
    { name: 'Medium (50–69)', value: scored.filter(f => { const n = f.currentFri ?? 0; return n >= 50 && n < 70 }).length, color: '#b45309' },
    { name: 'High (<50)',   value: scored.filter(f => (f.currentFri ?? 0) < 50).length,  color: '#dc2626' },
    { name: 'Unscored',    value: myFarmers.length - scored.length,                       color: '#9ca3af' },
  ]

  // Per-cohort avg FRI
  const cohortMap = new Map<string, { name: string; scores: number[] }>()
  myFarmers.forEach(f => {
    if (!f.enrollment?.cohortId || f.currentFri === null) return
    const key = f.enrollment.cohortId
    if (!cohortMap.has(key)) cohortMap.set(key, { name: f.enrollment.cohortName ?? key, scores: [] })
    cohortMap.get(key)!.scores.push(f.currentFri!)
  })
  const cohortFriData = [...cohortMap.values()].map(({ name, scores }) => ({
    cohort:    name,
    'Avg FRI': parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)),
  }))

  // Filter options
  const cohortOptions = [
    { value: '', label: 'All cohorts' },
    ...myFarmers
      .map(f => f.enrollment?.cohortName ?? '')
      .filter((v, i, a) => v && a.indexOf(v) === i)
      .map(v => ({ value: v, label: v })),
  ]

  const riskOptions = [
    { value: '',         label: 'All risk levels' },
    { value: 'High',     label: 'High Risk'       },
    { value: 'Medium',   label: 'Medium Risk'     },
    { value: 'Low',      label: 'Low Risk'        },
    { value: 'Unscored', label: 'Unscored'        },
  ]

  return (
    <div className="min-h-screen bg-(--brand-gray) p-6 space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: FOREST }}>Risk & Performance</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--brand-dark)' }}>
          Farmer resilience scores and risk profile across your assigned cohorts
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Users className="w-5 h-5" style={{ color: FOREST }} />}
          label="Total Farmers" value={myFarmers.length} sub={`${scored.length} scored`} />
        <StatCard icon={<TrendingUp className="w-5 h-5" style={{ color: FOREST }} />}
          label="Avg FRI Score" value={scored.length ? avgFri.toFixed(1) : '—'} sub="across scored farmers" />
        <StatCard icon={<ShieldCheck className="w-5 h-5" style={{ color: '#15803d' }} />}
          label="Leaders" value={leaders} sub="FRI ≥ 75" accent="#f0fdf4" />
        <StatCard icon={<AlertTriangle className="w-5 h-5" style={{ color: '#dc2626' }} />}
          label="High Risk" value={highRisk} sub="FRI below 50" accent="#fef2f2" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* FRI distribution histogram */}
        <ChartCard title="FRI Score Distribution" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bucketData} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="Farmers" radius={[4, 4, 0, 0]}>
                {bucketData.map((_, i) => <Cell key={i} fill={bucketColors[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Zone donut */}
        <ChartCard title="Zone Breakdown">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={zoneData} cx="50%" cy="50%" innerRadius={52} outerRadius={80}
                   dataKey="value" paddingAngle={3}>
                {zoneData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Per-cohort avg FRI */}
        <ChartCard title="Average FRI by Cohort">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={cohortFriData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="cohort" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="Avg FRI" fill={FOREST} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Risk tier bar */}
        <ChartCard title="Risk Tier Breakdown">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={riskData} layout="vertical" barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={100} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Zone cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ZONES.map(zone => {
          const farmers = myFarmers.filter(f => f.currentZone === zone)
          return (
            <div key={zone} className="rounded-xl border p-4 space-y-2"
                 style={{ backgroundColor: ZONE_BG[zone], borderColor: ZONE_COLOR[zone] + '33' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold" style={{ color: ZONE_COLOR[zone] }}>
                  {zone.replace('Resilience ', '')}
                </p>
                <span className="text-2xl font-bold" style={{ color: ZONE_COLOR[zone] }}>{farmers.length}</span>
              </div>
              <div className="space-y-0.5">
                {farmers.slice(0, 3).map(f => (
                  <p key={f.id} className="text-xs text-gray-600 truncate">{f.fullName}</p>
                ))}
                {farmers.length > 3 && <p className="text-[10px] text-gray-400">+{farmers.length - 3} more</p>}
                {farmers.length === 0 && <p className="text-xs text-gray-400 italic">None</p>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Farmer risk table */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Farmer Risk Register — sorted by highest risk first
        </p>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text" placeholder="Search farmer…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 pl-9 pr-3 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 placeholder:text-gray-400 w-44"
            />
          </div>
          <SelectTemplate
            options={cohortOptions} value={filterCohort} size="sm"
            onChange={e => setFilterCohort(e.currentTarget.value)}
          />
          <SelectTemplate
            options={riskOptions} value={filterRisk} size="sm"
            onChange={e => setFilterRisk(e.currentTarget.value)}
          />
          {(filterCohort || filterRisk || search) && (
            <button onClick={() => { setFilterCohort(''); setFilterRisk(''); setSearch('') }}
              className="text-xs text-gray-400 hover:text-gray-600 underline">
              Clear filters
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <DatagridTemplate
            columns={FARMER_COLS}
            data={sortedRows}
            rowKey="id"
            defaultPageSize={10}
            emptyLabel="No farmers match the selected filters"
          />
        </div>
      </div>
    </div>
  )
}
