'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const TOTAL_WEEKS = 12
const SEASON = '2025A'

const cohorts = [
  { id: 'C1', name: 'Cohort 1 – Northern', color: '#166534' },
  { id: 'C2', name: 'Cohort 2 – Central',  color: '#15803d' },
  { id: 'C3', name: 'Cohort 3 – Eastern',  color: '#16a34a' },
  { id: 'C4', name: 'Cohort 4 – Western',  color: '#22c55e' },
  { id: 'C5', name: 'Cohort 5 – Southern', color: '#4ade80' },
  { id: 'C6', name: 'Cohort 6 – Coastal',  color: '#0d9488' },
  { id: 'C7', name: 'Cohort 7 – Highland', color: '#14b8a6' },
  { id: 'C8', name: 'Cohort 8 – Lowland',  color: '#2dd4bf' },
]

// Weekly stacked data — each entry is one week bar with per-cohort completion %
const weeklyStackedData = [
  { week: 'W1', C1: 95, C2: 88, C3: 92, C4: 90, C5: 85, C6: 78, C7: 82, C8: 80 },
  { week: 'W2', C1: 91, C2: 85, C3: 89, C4: 87, C5: 83, C6: 76, C7: 80, C8: 77 },
  { week: 'W3', C1: 88, C2: 90, C3: 86, C4: 84, C5: 88, C6: 80, C7: 78, C8: 82 },
  { week: 'W4', C1: 93, C2: 87, C3: 91, C4: 89, C5: 86, C6: 83, C7: 85, C8: 79 },
  { week: 'W5', C1: 90, C2: 84, C3: 88, C4: 92, C5: 84, C6: 81, C7: 83, C8: 76 },
  { week: 'W6', C1: 87, C2: 91, C3: 85, C4: 88, C5: 90, C6: 85, C7: 87, C8: 83 },
  { week: 'W7', C1: 92, C2: 89, C3: 93, C4: 86, C5: 87, C6: 82, C7: 89, C8: 85 },
  { week: 'W8', C1: 94, C2: 88, C3: 90, C4: 91, C5: 85, C6: 84, C7: 86, C8: 82 },
]

// Overall completion trend line data
const trendData = [
  { week: 'W1', completion: 86 },
  { week: 'W2', completion: 83 },
  { week: 'W3', completion: 85 },
  { week: 'W4', completion: 87 },
  { week: 'W5', completion: 84 },
  { week: 'W6', completion: 88 },
  { week: 'W7', completion: 88 },
  { week: 'W8', completion: 86 },
]

// Cohort detail for current week (week 8)
const cohortWeekDetail = [
  { name: 'Cohort 1 – Northern', submitted: 282, total: 300, pct: 94, onTime: true  },
  { name: 'Cohort 2 – Central',  submitted: 246, total: 280, pct: 88, onTime: true  },
  { name: 'Cohort 3 – Eastern',  submitted: 261, total: 290, pct: 90, onTime: true  },
  { name: 'Cohort 4 – Western',  submitted: 255, total: 280, pct: 91, onTime: false },
  { name: 'Cohort 5 – Southern', submitted: 221, total: 260, pct: 85, onTime: true  },
  { name: 'Cohort 6 – Coastal',  submitted: 202, total: 240, pct: 84, onTime: false },
  { name: 'Cohort 7 – Highland', submitted: 232, total: 270, pct: 86, onTime: true  },
  { name: 'Cohort 8 – Lowland',  submitted: 213, total: 260, pct: 82, onTime: false },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function WeekDot({ state }: { state: 'done' | 'current' | 'future' }) {
  if (state === 'current') {
    return (
      <span className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-green-500/40 ring-offset-1 ring-offset-background inline-block" />
    )
  }
  if (state === 'done') {
    return <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" />
  }
  return <span className="w-2.5 h-2.5 rounded-full border border-border bg-muted inline-block" />
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function Main() {
  const [currentWeek, setCurrentWeek] = useState(8)

  const canGoPrev = currentWeek > 1
  const canGoNext = currentWeek < TOTAL_WEEKS

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Weekly Progress</h1>
        <p className="text-sm text-muted-foreground">
          Week {currentWeek} of {TOTAL_WEEKS} · Season {SEASON}
        </p>
      </div>

      {/* Week navigator */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
        <button
          onClick={() => canGoPrev && setCurrentWeek(w => w - 1)}
          disabled={!canGoPrev}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-2 flex-1">
          <span className="text-sm font-medium">Week {currentWeek}</span>
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => (
              <button
                key={w}
                onClick={() => setCurrentWeek(w)}
                aria-label={`Go to week ${w}`}
                className="flex items-center justify-center"
              >
                <WeekDot
                  state={w < currentWeek ? 'done' : w === currentWeek ? 'current' : 'future'}
                />
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => canGoNext && setCurrentWeek(w => w + 1)}
          disabled={!canGoNext}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next week"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
          label="This Week Completion"
          value="86%"
          sub="Across all cohorts"
          accent="bg-green-50 dark:bg-green-950"
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-teal-600" />}
          label="Questions Answered"
          value="10,752"
          sub="Week 8 total responses"
          accent="bg-teal-50 dark:bg-teal-950"
        />
        <StatCard
          icon={<AlertCircle className="w-5 h-5 text-amber-600" />}
          label="Pending Submissions"
          value="174"
          sub="Awaiting farmer response"
          accent="bg-amber-50 dark:bg-amber-950"
        />
      </div>

      {/* Stacked bar chart — completion by cohort per week */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Completion by Cohort — Weeks 1–{currentWeek}</h2>
        </div>
        <div className="overflow-x-auto">
          <div style={{ minWidth: 480 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={weeklyStackedData.slice(0, currentWeek)}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                barCategoryGap="28%"
                barGap={1}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v}%`}
                  width={40}
                />
                <Tooltip
                  formatter={(value, name) => [`${value}%`, name]}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--foreground)',
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  formatter={name => cohorts.find(c => c.id === name)?.name ?? name}
                />
                {cohorts.map(c => (
                  <Bar key={c.id} dataKey={c.id} fill={c.color} radius={[2, 2, 0, 0]} maxBarSize={14} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cohort completion table */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            Cohort Submissions — Week {currentWeek}
          </h2>
          <div className="flex flex-col gap-3">
            {cohortWeekDetail.map(row => (
              <div key={row.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm truncate">{row.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {row.submitted}/{row.total}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        row.onTime
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                      }`}
                    >
                      {row.onTime ? 'On-time' : 'Late'}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{row.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Completion trend line chart */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            Completion Trend
          </h2>
          <div className="overflow-x-auto">
            <div style={{ minWidth: 260 }}>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart
                  data={trendData.slice(0, currentWeek)}
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
                    domain={[70, 100]}
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${v}%`}
                    width={40}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Completion']}
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
                    dataKey="completion"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#16a34a', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    name="Overall Completion"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
