'use client'

import { useState } from 'react'
import { CalendarDays, Users, TrendingUp, Clock, CheckCircle2, AlertTriangle, Plus } from 'lucide-react'

type CohortStatus = 'active' | 'completing' | 'completed' | 'not_started'

interface Cohort {
  id: string
  name: string
  community: string
  startDate: string
  endDate: string
  enrolledFarmers: number
  targetFarmers: number
  currentWeek: number
  totalWeeks: number
  avgFRI: number
  compliance: number
  status: CohortStatus
}

const mockCohorts: Cohort[] = [
  {
    id: '1',
    name: 'Cohort Alpha 2026',
    community: 'Nakuru East',
    startDate: 'Jan 6, 2026',
    endDate: 'Apr 6, 2026',
    enrolledFarmers: 180,
    targetFarmers: 200,
    currentWeek: 8,
    totalWeeks: 12,
    avgFRI: 3.4,
    compliance: 91,
    status: 'active',
  },
  {
    id: '2',
    name: 'Cohort Beta 2026',
    community: 'Eldoret North',
    startDate: 'Jan 13, 2026',
    endDate: 'Apr 13, 2026',
    enrolledFarmers: 154,
    targetFarmers: 160,
    currentWeek: 11,
    totalWeeks: 12,
    avgFRI: 3.8,
    compliance: 95,
    status: 'completing',
  },
  {
    id: '3',
    name: 'Cohort Gamma 2025',
    community: 'Kisumu West',
    startDate: 'Sep 1, 2025',
    endDate: 'Dec 1, 2025',
    enrolledFarmers: 172,
    targetFarmers: 175,
    currentWeek: 12,
    totalWeeks: 12,
    avgFRI: 4.1,
    compliance: 98,
    status: 'completed',
  },
  {
    id: '4',
    name: 'Cohort Delta 2026',
    community: 'Meru Central',
    startDate: 'Feb 3, 2026',
    endDate: 'May 3, 2026',
    enrolledFarmers: 143,
    targetFarmers: 150,
    currentWeek: 7,
    totalWeeks: 12,
    avgFRI: 3.1,
    compliance: 84,
    status: 'active',
  },
  {
    id: '5',
    name: 'Cohort Epsilon 2026',
    community: 'Thika Town',
    startDate: 'Mar 2, 2026',
    endDate: 'Jun 2, 2026',
    enrolledFarmers: 161,
    targetFarmers: 180,
    currentWeek: 3,
    totalWeeks: 12,
    avgFRI: 2.7,
    compliance: 79,
    status: 'active',
  },
  {
    id: '6',
    name: 'Cohort Zeta 2026',
    community: 'Kakamega South',
    startDate: 'Apr 7, 2026',
    endDate: 'Jul 7, 2026',
    enrolledFarmers: 138,
    targetFarmers: 150,
    currentWeek: 11,
    totalWeeks: 12,
    avgFRI: 3.6,
    compliance: 93,
    status: 'completing',
  },
  {
    id: '7',
    name: 'Cohort Eta 2026',
    community: 'Nyeri South',
    startDate: 'Aug 4, 2026',
    endDate: 'Nov 4, 2026',
    enrolledFarmers: 0,
    targetFarmers: 160,
    currentWeek: 0,
    totalWeeks: 12,
    avgFRI: 0,
    compliance: 0,
    status: 'not_started',
  },
  {
    id: '8',
    name: 'Cohort Theta 2026',
    community: 'Bungoma East',
    startDate: 'Feb 17, 2026',
    endDate: 'May 17, 2026',
    enrolledFarmers: 167,
    targetFarmers: 170,
    currentWeek: 5,
    totalWeeks: 12,
    avgFRI: 3.0,
    compliance: 87,
    status: 'active',
  },
]

const statusConfig: Record<CohortStatus, { label: string; bg: string; text: string; dot: string }> = {
  active: {
    label: 'Active',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  completing: {
    label: 'Completing',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  not_started: {
    label: 'Not Started',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-400',
    dot: 'bg-slate-400',
  },
}

function StatusBadge({ status }: { status: CohortStatus }) {
  const cfg = statusConfig[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Week {current} of {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-1.5 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
        </div>
        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
          {icon}
        </div>
      </div>
    </div>
  )
}

function CohortCard({ cohort }: { cohort: Cohort }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900 dark:text-white">{cohort.name}</h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{cohort.community}</p>
        </div>
        <StatusBadge status={cohort.status} />
      </div>

      {/* Progress */}
      <div className="mt-4">
        <ProgressBar current={cohort.currentWeek} total={cohort.totalWeeks} />
      </div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 rounded-lg bg-slate-50 py-3 dark:divide-slate-700 dark:bg-slate-800">
        <div className="flex flex-col items-center px-2 text-center">
          <Users className="mb-1 h-3.5 w-3.5 text-slate-400" />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {cohort.status === 'not_started' ? '—' : cohort.enrolledFarmers}
          </span>
          <span className="text-[10px] text-slate-400">Enrolled</span>
        </div>
        <div className="flex flex-col items-center px-2 text-center">
          <TrendingUp className="mb-1 h-3.5 w-3.5 text-slate-400" />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {cohort.status === 'not_started' ? '—' : cohort.avgFRI.toFixed(1)}
          </span>
          <span className="text-[10px] text-slate-400">Avg FRI</span>
        </div>
        <div className="flex flex-col items-center px-2 text-center">
          {cohort.compliance >= 90 ? (
            <CheckCircle2 className="mb-1 h-3.5 w-3.5 text-emerald-500" />
          ) : cohort.compliance > 0 ? (
            <AlertTriangle className="mb-1 h-3.5 w-3.5 text-amber-500" />
          ) : (
            <CheckCircle2 className="mb-1 h-3.5 w-3.5 text-slate-400" />
          )}
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {cohort.status === 'not_started' ? '—' : `${cohort.compliance}%`}
          </span>
          <span className="text-[10px] text-slate-400">Compliance</span>
        </div>
      </div>

      {/* Dates */}
      <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
        <span>{cohort.startDate} — {cohort.endDate}</span>
      </div>

      {/* View Details */}
      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-700">
        <button className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
          View Details
        </button>
      </div>
    </div>
  )
}

export function Main() {
  const [cohorts] = useState<Cohort[]>(mockCohorts)

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cohorts</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            2026 Season — managing active training cohorts across all communities
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
          <Plus className="h-4 w-4" />
          New Cohort
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Active Cohorts"
          value={18}
          sub="Across all regions"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Completing This Month"
          value={6}
          sub="Finishing within 30 days"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total Enrolled"
          value="1,248"
          sub="Farmers in active cohorts"
        />
      </div>

      {/* Cohort Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cohorts.map((cohort) => (
          <CohortCard key={cohort.id} cohort={cohort} />
        ))}
      </div>
    </div>
  )
}
