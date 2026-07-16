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
} from 'recharts'
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  Eye,
} from 'lucide-react'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { PaginationBar } from '@/customComponents/PaginationBar'
import { DatagridTemplate } from '@/customComponents/DatagridTemplate'
import type { DatagridColumn } from '@/customComponents/DatagridTemplate'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const CURRENT_WEEK = 8
const TOTAL_WEEKS = 12

const WEEK_TITLES: Record<number, string> = {
  1: 'Soil Preparation',
  2: 'Seed Selection',
  3: 'Planting',
  4: 'Early Growth',
  5: 'Irrigation Setup',
  6: 'Fertilisation',
  7: 'Pest Monitoring',
  8: 'Mid-Season Review',
  9: 'Canopy Management',
  10: 'Pre-Harvest',
  11: 'Harvest',
  12: 'Post-Harvest',
}

const trendData = [
  { week: 'W1', pct: 81 },
  { week: 'W2', pct: 83 },
  { week: 'W3', pct: 85 },
  { week: 'W4', pct: 84 },
  { week: 'W5', pct: 86 },
  { week: 'W6', pct: 88 },
  { week: 'W7', pct: 85 },
  { week: 'W8', pct: 87 },
]

const cohortBarData = [
  { cohort: 'C1', pct: 94 },
  { cohort: 'C2', pct: 88 },
  { cohort: 'C3', pct: 90 },
  { cohort: 'C4', pct: 91 },
  { cohort: 'C5', pct: 85 },
  { cohort: 'C6', pct: 84 },
  { cohort: 'C7', pct: 86 },
  { cohort: 'C8', pct: 82 },
]

const cohortTableData = [
  { cohortName: 'Cohort 1', community: 'Northern Highlands', submitted: 282, total: 300, pct: 94, onTime: true },
  { cohortName: 'Cohort 2', community: 'Central Valley',     submitted: 246, total: 280, pct: 88, onTime: true },
  { cohortName: 'Cohort 3', community: 'Eastern Plains',     submitted: 261, total: 290, pct: 90, onTime: true },
  { cohortName: 'Cohort 4', community: 'Western Ridge',      submitted: 255, total: 280, pct: 91, onTime: false },
  { cohortName: 'Cohort 5', community: 'Southern Coast',     submitted: 221, total: 260, pct: 85, onTime: true },
  { cohortName: 'Cohort 6', community: 'Coastal Lowlands',   submitted: 202, total: 240, pct: 84, onTime: false },
  { cohortName: 'Cohort 7', community: 'Highland Basin',     submitted: 232, total: 270, pct: 86, onTime: true },
  { cohortName: 'Cohort 8', community: 'Lowland Flats',      submitted: 213, total: 260, pct: 82, onTime: false },
]

const COHORT_TABLE_COLUMNS: DatagridColumn<typeof cohortTableData[number]>[] = [
  { key: 'cohortName', label: 'Cohort Name', render: v => <span className="font-medium text-gray-900">{String(v)}</span> },
  { key: 'community', label: 'Community', render: v => <span className="text-gray-600">{String(v)}</span> },
  { key: 'submitted', label: 'Submitted', render: v => <span className="block text-right tabular-nums text-gray-700">{String(v)}</span> },
  { key: 'total', label: 'Total', render: v => <span className="block text-right tabular-nums text-gray-500">{String(v)}</span> },
  {
    key: 'pct', label: 'Completion %', width: '140px',
    render: v => (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Number(v)}%`, backgroundColor: 'var(--brand-green)' }} />
        </div>
        <span className="text-xs text-gray-700 tabular-nums w-8 text-right">{String(v)}%</span>
      </div>
    ),
  },
  {
    key: 'onTime', label: 'On Time',
    render: v => v
      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">On Time</span>
      : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Late</span>,
  },
  {
    key: 'cohortName', id: 'actions', label: 'Actions',
    render: () => (
      <div className="flex justify-end">
        <ButtonTemplate variant="outline" size="sm" isIcon tooltip="View" leftIcon={<Eye className="w-3.5 h-3.5" />} onClick={() => {}} />
      </div>
    ),
  },
]

// ---------------------------------------------------------------------------
// FilterSelect helper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function Main() {
  const [selectedWeek, setSelectedWeek] = useState(CURRENT_WEEK)
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterOnTime, setFilterOnTime] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const canGoPrev = selectedWeek > 1
  const canGoNext = selectedWeek < CURRENT_WEEK

  const filtered = cohortTableData.filter(row => {
    const matchesSearch =
      !search ||
      row.cohortName.toLowerCase().includes(search.toLowerCase()) ||
      row.community.toLowerCase().includes(search.toLowerCase())
    const matchesOnTime =
      filterOnTime === 'all' ||
      (filterOnTime === 'yes' && row.onTime) ||
      (filterOnTime === 'no' && !row.onTime)
    return matchesSearch && matchesOnTime
  })

  const displayed =
    pageSize > 0 ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered

  const activeFilterCount = [filterOnTime !== 'all'].filter(Boolean).length

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* 1. Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Activity className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
            <h1 className="text-xl font-bold text-gray-900">Weekly Progress</h1>
          </div>
          <p className="text-sm text-gray-500 ml-7">Season 2025A</p>
        </div>
      </div>

      {/* 2. Week navigator */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => canGoPrev && setSelectedWeek(w => w - 1)}
            disabled={!canGoPrev}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-sm font-semibold text-gray-900">
              Week {selectedWeek} of {TOTAL_WEEKS}
            </span>
            <span className="text-sm text-gray-400 mx-2">—</span>
            <span className="text-sm text-gray-600">{WEEK_TITLES[selectedWeek]}</span>
          </div>
          <button
            onClick={() => canGoNext && setSelectedWeek(w => w + 1)}
            disabled={!canGoNext}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => {
            const isFuture = w > CURRENT_WEEK
            const isCurrent = w === selectedWeek
            const isDone = w < CURRENT_WEEK
            return (
              <button
                key={w}
                onClick={() => !isFuture && setSelectedWeek(w)}
                disabled={isFuture}
                aria-label={`Week ${w}`}
                className="flex items-center justify-center disabled:cursor-default"
              >
                {isCurrent ? (
                  <span
                    className="w-3 h-3 rounded-full ring-2 ring-green-500 ring-offset-1 inline-block"
                    style={{ backgroundColor: 'var(--brand-green)' }}
                  />
                ) : isDone ? (
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: 'var(--brand-forest)' }}
                  />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full border border-gray-200 bg-gray-100 inline-block" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">86%</p>
              <p className="text-xs text-green-600 mt-0.5">+2% from last week</p>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--brand-pale)' }}
            >
              <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Questions Answered</p>
              <p className="text-2xl font-bold text-gray-900">10,752</p>
              <p className="text-xs text-green-600 mt-0.5">Week 8 total responses</p>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--brand-pale)' }}
            >
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Pending Submissions</p>
              <p className="text-2xl font-bold text-gray-900">174</p>
              <p className="text-xs text-amber-600 mt-0.5">Awaiting farmer response</p>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--brand-pale)' }}
            >
              <AlertCircle className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Charts — side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Left: Season Completion Trend (line) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Season Completion Trend</h3>
          <div className="overflow-x-auto">
            <div style={{ minWidth: 240 }}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[70, 100]}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${v}%`}
                    width={38}
                  />
                  <Tooltip
                    formatter={value => [`${value}%`, 'Completion']}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pct"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#16a34a', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    name="Completion"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: Cohort Completion bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Cohort Completion — Week {selectedWeek}
          </h3>
          <div className="overflow-x-auto">
            <div style={{ minWidth: 240 }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={cohortBarData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="cohort"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${v}%`}
                    width={38}
                  />
                  <Tooltip
                    formatter={value => [`${value}%`, 'Completion']}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="pct" fill="#16a34a" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Cohort Submissions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Cohort Submissions</h3>

        {/* Search + filter toggle */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search cohorts or communities..."
                className="w-full border border-gray-200 rounded-lg pl-10 pr-9 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) transition-colors"
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
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
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
              <ChevronDown
                className={cn('w-3.5 h-3.5 transition-transform', filtersOpen && 'rotate-180')}
              />
            </button>
          </div>

          {filtersOpen && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-1 border-t border-gray-100">
              <FilterSelect
                label="On Time"
                value={filterOnTime}
                onChange={v => {
                  setFilterOnTime(v)
                  setPage(1)
                }}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'yes', label: 'On Time' },
                  { value: 'no', label: 'Late' },
                ]}
              />
            </div>
          )}
        </div>

        {/* Table */}
        <DatagridTemplate<typeof cohortTableData[number]>
          columns={COHORT_TABLE_COLUMNS}
          data={displayed}
          rowKey="cohortName"
          emptyLabel="No cohorts match your filters."
          defaultPageSize={0}
          pageSizeOptions={[0]}
          hideFooter
        />

        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={ps => {
            setPageSize(ps)
            setPage(1)
          }}
          className="pt-3 border-t border-gray-100"
        />
      </div>
    </div>
  )
}
