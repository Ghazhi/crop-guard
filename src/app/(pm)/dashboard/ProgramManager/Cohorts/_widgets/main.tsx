'use client'

import { useState } from 'react'
import {
  CalendarDays,
  Users,
  TrendingUp,
  ChevronDown,
  Search,
  X,
  SlidersHorizontal,
  Plus,
  Eye,
  Pencil,
} from 'lucide-react'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { PaginationBar } from '@/customComponents/PaginationBar'
import { cn } from '@/lib/utils'

type CohortStatus = 'active' | 'completing' | 'completed' | 'not_started'

interface Cohort {
  id: string
  name: string
  community: string
  startDate: string
  endDate: string
  enrolled: number
  target: number
  currentWeek: number
  totalWeeks: number
  avgFRI: number
  compliance: number
  status: CohortStatus
}

const mockCohorts: Cohort[] = [
  {
    id: '1',
    name: 'Cohort Alpha 2025',
    community: 'Nakuru East',
    startDate: 'Jan 6, 2025',
    endDate: 'Apr 6, 2025',
    enrolled: 180,
    target: 200,
    currentWeek: 8,
    totalWeeks: 12,
    avgFRI: 3.4,
    compliance: 91,
    status: 'active',
  },
  {
    id: '2',
    name: 'Cohort Beta 2025',
    community: 'Eldoret North',
    startDate: 'Jan 13, 2025',
    endDate: 'Apr 13, 2025',
    enrolled: 154,
    target: 160,
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
    startDate: 'Jan 1, 2025',
    endDate: 'Apr 1, 2025',
    enrolled: 172,
    target: 175,
    currentWeek: 12,
    totalWeeks: 12,
    avgFRI: 4.1,
    compliance: 98,
    status: 'completed',
  },
  {
    id: '4',
    name: 'Cohort Delta 2025',
    community: 'Meru Central',
    startDate: 'Feb 3, 2025',
    endDate: 'May 3, 2025',
    enrolled: 143,
    target: 150,
    currentWeek: 7,
    totalWeeks: 12,
    avgFRI: 3.1,
    compliance: 84,
    status: 'active',
  },
  {
    id: '5',
    name: 'Cohort Epsilon 2025',
    community: 'Thika Town',
    startDate: 'Mar 2, 2025',
    endDate: 'Jun 2, 2025',
    enrolled: 161,
    target: 180,
    currentWeek: 3,
    totalWeeks: 12,
    avgFRI: 2.7,
    compliance: 79,
    status: 'active',
  },
  {
    id: '6',
    name: 'Cohort Zeta 2025',
    community: 'Kakamega South',
    startDate: 'Apr 7, 2025',
    endDate: 'Jul 7, 2025',
    enrolled: 138,
    target: 150,
    currentWeek: 11,
    totalWeeks: 12,
    avgFRI: 3.6,
    compliance: 93,
    status: 'completing',
  },
  {
    id: '7',
    name: 'Cohort Eta 2025',
    community: 'Nyeri South',
    startDate: 'Aug 4, 2025',
    endDate: 'Nov 4, 2025',
    enrolled: 0,
    target: 160,
    currentWeek: 0,
    totalWeeks: 12,
    avgFRI: 0,
    compliance: 0,
    status: 'not_started',
  },
  {
    id: '8',
    name: 'Cohort Theta 2025',
    community: 'Bungoma East',
    startDate: 'Feb 17, 2025',
    endDate: 'May 17, 2025',
    enrolled: 167,
    target: 170,
    currentWeek: 5,
    totalWeeks: 12,
    avgFRI: 3.0,
    compliance: 87,
    status: 'active',
  },
  {
    id: '9',
    name: 'Cohort Iota 2025',
    community: 'Machakos North',
    startDate: 'Mar 10, 2025',
    endDate: 'Jun 10, 2025',
    enrolled: 149,
    target: 155,
    currentWeek: 9,
    totalWeeks: 12,
    avgFRI: 3.3,
    compliance: 88,
    status: 'active',
  },
  {
    id: '10',
    name: 'Cohort Kappa 2025',
    community: 'Kisii Central',
    startDate: 'May 5, 2025',
    endDate: 'Aug 5, 2025',
    enrolled: 131,
    target: 140,
    currentWeek: 11,
    totalWeeks: 12,
    avgFRI: 3.5,
    compliance: 92,
    status: 'completing',
  },
  {
    id: '11',
    name: 'Cohort Lambda 2025',
    community: 'Turkana East',
    startDate: 'Jun 2, 2025',
    endDate: 'Sep 2, 2025',
    enrolled: 145,
    target: 150,
    currentWeek: 6,
    totalWeeks: 12,
    avgFRI: 2.9,
    compliance: 81,
    status: 'active',
  },
  {
    id: '12',
    name: 'Cohort Mu 2025',
    community: 'Nandi Hills',
    startDate: 'Jul 1, 2025',
    endDate: 'Oct 1, 2025',
    enrolled: 0,
    target: 165,
    currentWeek: 0,
    totalWeeks: 12,
    avgFRI: 0,
    compliance: 0,
    status: 'not_started',
  },
]

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 w-full border border-gray-200 rounded-lg px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) bg-white"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function StatusBadge({ status }: { status: CohortStatus }) {
  if (status === 'active')
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
  if (status === 'completing')
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Completing</span>
  if (status === 'completed')
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Completed</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Not Started</span>
}

function CohortCard({ cohort }: { cohort: Cohort }) {
  const weekPct = cohort.totalWeeks > 0 ? Math.round((cohort.currentWeek / cohort.totalWeeks) * 100) : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4">
      {/* Top row: name + badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{cohort.name}</p>
          <p className="text-sm text-gray-500 mt-0.5">{cohort.community}</p>
        </div>
        <StatusBadge status={cohort.status} />
      </div>

      {/* Week progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Week {cohort.currentWeek} of {cohort.totalWeeks}</span>
          <span>{weekPct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-100">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${weekPct}%`, backgroundColor: 'var(--brand-green)' }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 rounded-xl bg-gray-50 py-3">
        <div className="flex flex-col items-center px-2 text-center gap-0.5">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">
            {cohort.status === 'not_started' ? '—' : `${cohort.enrolled}/${cohort.target}`}
          </span>
          <span className="text-[10px] text-gray-400">Farmers</span>
        </div>
        <div className="flex flex-col items-center px-2 text-center gap-0.5">
          <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">
            {cohort.status === 'not_started' ? '—' : cohort.avgFRI.toFixed(1)}
          </span>
          <span className="text-[10px] text-gray-400">Avg FRI</span>
        </div>
        <div className="flex flex-col items-center px-2 text-center gap-0.5">
          <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">
            {cohort.status === 'not_started' ? '—' : `${cohort.compliance}%`}
          </span>
          <span className="text-[10px] text-gray-400">Compliance</span>
        </div>
      </div>

      {/* Date range */}
      <p className="text-xs text-gray-400">{cohort.startDate} — {cohort.endDate}</p>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
        <ButtonTemplate
          variant="outline"
          size="sm"
          isIcon
          tooltip="View"
          leftIcon={<Eye className="w-3.5 h-3.5" />}
          onClick={() => {}}
        />
        <ButtonTemplate
          variant="outline"
          size="sm"
          isIcon
          tooltip="Edit"
          leftIcon={<Pencil className="w-3.5 h-3.5" />}
          onClick={() => {}}
        />
      </div>
    </div>
  )
}

export function Main() {
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  const filtered = mockCohorts.filter(c => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.community.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  const displayed = pageSize > 0 ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered

  const activeFilterCount = [filterStatus !== 'all'].filter(Boolean).length

  const activeCount = mockCohorts.filter(c => c.status === 'active').length
  const completingCount = mockCohorts.filter(c => c.status === 'completing').length
  const completedCount = mockCohorts.filter(c => c.status === 'completed').length

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <CalendarDays className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
            <h1 className="text-xl font-bold text-gray-900">Cohorts</h1>
          </div>
          <p className="text-sm text-gray-500 ml-7">Season 2025A</p>
        </div>
        <ButtonTemplate
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {}}
        >
          New Cohort
        </ButtonTemplate>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Active</p>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-xs text-green-600 mt-0.5">Currently running</p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--brand-pale)' }}>
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Completing Soon</p>
              <p className="text-2xl font-bold text-gray-900">{completingCount}</p>
              <p className="text-xs text-amber-600 mt-0.5">Final weeks</p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--brand-pale)' }}>
              <CalendarDays className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">This season</p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--brand-pale)' }}>
              <Users className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg pl-10 pr-9 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) transition-colors"
              placeholder="Search cohorts or communities…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className={cn(
              'flex items-center gap-1.5 h-10 px-3 rounded-lg border text-sm font-medium transition-colors shrink-0',
              filtersOpen || activeFilterCount > 0
                ? 'border-(--brand-green) text-(--brand-green) bg-green-50'
                : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700',
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span
                className="ml-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                style={{ backgroundColor: 'var(--brand-green)' }}
              >
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', filtersOpen && 'rotate-180')} />
          </button>
        </div>

        {filtersOpen && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-1 border-t border-gray-100">
            <FilterSelect
              label="Status"
              value={filterStatus}
              onChange={v => { setFilterStatus(v); setPage(1) }}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'active', label: 'Active' },
                { value: 'completing', label: 'Completing' },
                { value: 'completed', label: 'Completed' },
                { value: 'not_started', label: 'Not Started' },
              ]}
            />
          </div>
        )}
      </div>

      {/* Cohort Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayed.map(cohort => (
          <CohortCard key={cohort.id} cohort={cohort} />
        ))}
        {displayed.length === 0 && (
          <div className="col-span-full py-16 text-center text-sm text-gray-400">
            No cohorts match your filters.
          </div>
        )}
      </div>

      {/* Pagination */}
      <PaginationBar
        page={page}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={ps => { setPageSize(ps); setPage(1) }}
        className="pt-3 border-t border-gray-100"
      />
    </div>
  )
}
