'use client'

import {
  Users,
  CalendarDays,
  TrendingUp,
  ClipboardCheck,
  Target,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart2,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

const weeklyCheckinData = [
  { week: 'W1', completion: 81 },
  { week: 'W2', completion: 84 },
  { week: 'W3', completion: 80 },
  { week: 'W4', completion: 87 },
  { week: 'W5', completion: 83 },
  { week: 'W6', completion: 90 },
  { week: 'W7', completion: 88 },
  { week: 'W8', completion: 92 },
  { week: 'W9', completion: 89 },
  { week: 'W10', completion: 94 },
  { week: 'W11', completion: 91 },
  { week: 'W12', completion: 95 },
]

const programHealth = [
  { cohort: 'Kumasi North A', completion: 95 },
  { cohort: 'Bekwai Cluster', completion: 88 },
  { cohort: 'Obuasi East', completion: 76 },
  { cohort: 'Amansie West', completion: 63 },
  { cohort: 'Kwabre District', completion: 51 },
]

const alerts = [
  {
    icon: <ClipboardCheck className="h-4 w-4 text-amber-500" />,
    text: 'Overdue check-in: 14 farmers in Obuasi East',
    time: '2 hours ago',
  },
  {
    icon: <AlertCircle className="h-4 w-4 text-red-500" />,
    text: 'Low FRI score flagged for Amansie West cohort',
    time: '5 hours ago',
  },
  {
    icon: <Users className="h-4 w-4 text-emerald-500" />,
    text: '23 new farmers enrolled in Kwabre District',
    time: 'Yesterday',
  },
  {
    icon: <Activity className="h-4 w-4 text-red-500" />,
    text: 'Agent absence reported: Bekwai Cluster (2 days)',
    time: 'Yesterday',
  },
]

const topCohorts = [
  { rank: 1, name: 'Kumasi North A', fri: 91.4 },
  { rank: 2, name: 'Bekwai Cluster', fri: 88.7 },
  { rank: 3, name: 'Juaben Ashanti', fri: 85.2 },
  { rank: 4, name: 'Obuasi East', fri: 81.9 },
  { rank: 5, name: 'Kwabre District', fri: 78.3 },
]

function getHealthBarColor(pct: number) {
  if (pct >= 85) return 'bg-emerald-500'
  if (pct >= 65) return 'bg-amber-400'
  return 'bg-red-500'
}

export function Main() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--brand-forest)' }}>
          Program Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Season 2025A · Ashanti Region
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Farmers */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Farmers</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950">
              <Users className="h-4 w-4" style={{ color: 'var(--brand-forest)' }} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold">1,248</p>
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
            <ArrowUpRight className="h-3 w-3" />
            <span>+12% vs last season</span>
          </div>
        </div>

        {/* Active Cohorts */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Active Cohorts</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950">
              <CalendarDays className="h-4 w-4 text-amber-600" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold">18</p>
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-600">
            <Target className="h-3 w-3" />
            <span>6 completing soon</span>
          </div>
        </div>

        {/* Avg FRI Score */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Avg FRI Score</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950">
              <TrendingUp className="h-4 w-4" style={{ color: 'var(--brand-forest)' }} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold">74.2</p>
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
            <ArrowUpRight className="h-3 w-3" />
            <span>+3.1 pts this season</span>
          </div>
        </div>

        {/* Compliance Rate */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Compliance Rate</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
              <ClipboardCheck className="h-4 w-4 text-red-500" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold">82%</p>
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-red-500">
            <ArrowDownRight className="h-3 w-3" />
            <span>-2% vs last week</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Area Chart */}
        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4" style={{ color: 'var(--brand-forest)' }} />
            <h2 className="text-sm font-semibold">Weekly Check-in Completion</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyCheckinData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2C5F3F" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2C5F3F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[70, 100]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Completion']}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="completion"
                stroke="#2C5F3F"
                strokeWidth={2}
                fill="url(#completionGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#2C5F3F' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Program Health */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BarChart2 className="h-4 w-4" style={{ color: 'var(--brand-forest)' }} />
            <h2 className="text-sm font-semibold">Program Health</h2>
          </div>
          <ul className="flex flex-col gap-4">
            {programHealth.map((item) => (
              <li key={item.cohort}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{item.cohort}</span>
                  <span className="text-muted-foreground">{item.completion}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${getHealthBarColor(item.completion)}`}
                    style={{ width: `${item.completion}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Alerts + Top Cohorts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Recent Alerts */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold">Recent Alerts</h2>
          </div>
          <ul className="flex flex-col gap-3">
            {alerts.map((alert, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">{alert.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{alert.text}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{alert.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Top Performing Cohorts */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-4 w-4" style={{ color: 'var(--brand-forest)' }} />
            <h2 className="text-sm font-semibold">Top Performing Cohorts</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={topCohorts}
              layout="vertical"
              margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              barSize={10}
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                stroke="currentColor"
                strokeOpacity={0.08}
              />
              <XAxis
                type="number"
                domain={[60, 100]}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip
                formatter={(value) => [typeof value === 'number' ? value.toFixed(1) : value, 'FRI Score']}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="fri" fill="#2C5F3F" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
