'use client'

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts'
import { Target, TrendingUp, TrendingDown, Award, AlertTriangle } from 'lucide-react'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const OVERALL_FRI = 74.2
const OVERALL_FRI_PREV = 71.1

const pillars = [
  { name: 'Agronomy',       score: 78, prev: 75, icon: <Target className="w-5 h-5 text-green-600" />,  accent: 'bg-green-50 dark:bg-green-950'  },
  { name: 'Climate Smart',  score: 72, prev: 74, icon: <TrendingUp className="w-5 h-5 text-teal-600" />, accent: 'bg-teal-50 dark:bg-teal-950'  },
  { name: 'Advisory',       score: 80, prev: 77, icon: <Award className="w-5 h-5 text-blue-600" />,    accent: 'bg-blue-50 dark:bg-blue-950'    },
  { name: 'Farm Enterprise',score: 67, prev: 65, icon: <AlertTriangle className="w-5 h-5 text-amber-600" />, accent: 'bg-amber-50 dark:bg-amber-950' },
]

const radarData = pillars.map(p => ({ subject: p.name, score: p.score, fullMark: 100 }))

const distributionData = [
  { band: '50–60', pct: 8  },
  { band: '60–70', pct: 22 },
  { band: '70–80', pct: 41 },
  { band: '80–90', pct: 24 },
  { band: '90+',   pct: 5  },
]

const trendData = [
  { week: 'W1', fri: 68.4 },
  { week: 'W2', fri: 69.1 },
  { week: 'W3', fri: 70.0 },
  { week: 'W4', fri: 70.8 },
  { week: 'W5', fri: 71.5 },
  { week: 'W6', fri: 72.3 },
  { week: 'W7', fri: 73.1 },
  { week: 'W8', fri: 74.2 },
]

const topPerformers = [
  { name: 'Amara Diallo',    score: 93.2, cohort: 'Cohort 1 – Northern' },
  { name: 'Fatima Ouédraogo',score: 91.8, cohort: 'Cohort 3 – Eastern'  },
  { name: 'Kofi Mensah',     score: 90.5, cohort: 'Cohort 2 – Central'  },
  { name: 'Issa Traoré',     score: 88.9, cohort: 'Cohort 5 – Southern' },
  { name: 'Mariama Bah',     score: 87.4, cohort: 'Cohort 7 – Highland' },
]

const needsSupport = [
  { name: 'Boubacar Koné',   score: 51.3, cohort: 'Cohort 6 – Coastal',  risk: 'High'   },
  { name: 'Aminata Traoré',  score: 54.7, cohort: 'Cohort 8 – Lowland',  risk: 'High'   },
  { name: 'Seydou Camara',   score: 57.1, cohort: 'Cohort 4 – Western',  risk: 'Medium' },
  { name: 'Rokiatou Diaby',  score: 58.8, cohort: 'Cohort 6 – Coastal',  risk: 'Medium' },
  { name: 'Lamine Coulibaly',score: 61.2, cohort: 'Cohort 8 – Lowland',  risk: 'Medium' },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PillarCard({
  icon,
  name,
  score,
  prev,
  accent,
}: {
  icon: React.ReactNode
  name: string
  score: number
  prev: number
  accent: string
}) {
  const delta = score - prev
  const up = delta >= 0

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{name}</p>
        <p className="text-2xl font-semibold tracking-tight">{score}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
        <p className={`text-xs mt-0.5 flex items-center gap-0.5 ${up ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
          {up
            ? <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />
          }
          {up ? '+' : ''}{delta} vs last month
        </p>
      </div>
    </div>
  )
}

const RANK_STYLES: Record<number, string> = {
  1: 'bg-yellow-400 text-yellow-900',
  2: 'bg-slate-300 text-slate-800',
  3: 'bg-amber-600 text-amber-50',
}

const RISK_STYLES: Record<string, string> = {
  High:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  Low:    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function Main() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">FRI Performance</h1>
        <p className="text-sm text-muted-foreground">
          Overall FRI:{' '}
          <span className="font-medium text-foreground">{OVERALL_FRI}</span>
          <span className="ml-2 text-green-600 dark:text-green-400 text-xs inline-flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            +{(OVERALL_FRI - OVERALL_FRI_PREV).toFixed(1)} vs last season ({OVERALL_FRI_PREV})
          </span>
        </p>
      </div>

      {/* Pillar score cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {pillars.map(p => (
          <PillarCard
            key={p.name}
            icon={p.icon}
            name={p.name}
            score={p.score}
            prev={p.prev}
            accent={p.accent}
          />
        ))}
      </div>

      {/* Radar + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar chart */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            Pillar Breakdown — Radar
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} margin={{ top: 8, right: 32, left: 32, bottom: 8 }}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              />
              <Radar
                name="FRI Score"
                dataKey="score"
                stroke="#16a34a"
                fill="#16a34a"
                fillOpacity={0.35}
                strokeWidth={2}
                dot={{ r: 4, fill: '#16a34a', strokeWidth: 0 }}
              />
              <Tooltip
                formatter={(value) => [`${value}/100`, 'Score']}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--foreground)',
                  fontSize: 12,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Score distribution bar chart */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Award className="w-4 h-4 text-muted-foreground" />
            Score Distribution
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={distributionData}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="band"
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}%`}
                width={36}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Farmers']}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--foreground)',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="pct" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FRI Trend line chart */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          FRI Trend — Last 8 Weeks
        </h2>
        <div className="overflow-x-auto">
          <div style={{ minWidth: 320 }}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={trendData}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[60, 80]}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  formatter={(value) => [typeof value === 'number' ? value.toFixed(1) : value, 'FRI']}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--foreground)',
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="fri"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#16a34a', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  name="FRI"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Performers + Needs Support */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Performers */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Award className="w-4 h-4 text-muted-foreground" />
            Top Performers
          </h2>
          <div className="flex flex-col gap-3">
            {topPerformers.map((farmer, idx) => {
              const rank = idx + 1
              const badgeClass = RANK_STYLES[rank] ?? 'bg-muted text-muted-foreground'
              return (
                <div key={farmer.name} className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${badgeClass}`}
                  >
                    {rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{farmer.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{farmer.cohort}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums shrink-0">
                    {farmer.score.toFixed(1)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Needs Support */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            Needs Support
          </h2>
          <div className="flex flex-col gap-3">
            {needsSupport.map(farmer => (
              <div key={farmer.name} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{farmer.name}</p>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${RISK_STYLES[farmer.risk]}`}
                    >
                      {farmer.risk}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{farmer.cohort}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold tabular-nums">{farmer.score.toFixed(1)}</span>
                  <button className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-accent transition-colors font-medium">
                    Action
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
