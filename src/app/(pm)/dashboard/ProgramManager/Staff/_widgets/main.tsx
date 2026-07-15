'use client'

import { useState } from 'react'
import {
  UserCog,
  Users,
  TrendingUp,
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  Eye,
  Pencil,
  MapPin,
} from 'lucide-react'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { PaginationBar } from '@/customComponents/PaginationBar'
import { DatagridTemplate } from '@/customComponents/DatagridTemplate'
import type { DatagridColumn } from '@/customComponents/DatagridTemplate'
import { cn } from '@/lib/utils'

type AgentStatus = 'active' | 'absent' | 'on_leave'

interface Agent {
  id: string
  name: string
  initials: string
  zone: 'Zone A' | 'Zone B' | 'Zone C'
  assignedFarmers: number
  capacity: number
  avgFRI: number
  visitsThisWeek: number
  lastActive: string
  status: AgentStatus
}

const AGENTS: Agent[] = [
  { id: '1',  name: 'Amara Diallo',     initials: 'AD', zone: 'Zone A', assignedFarmers: 138, capacity: 200, avgFRI: 72, visitsThisWeek: 5, lastActive: '2h ago',      status: 'active'   },
  { id: '2',  name: 'Chukwudi Osei',    initials: 'CO', zone: 'Zone B', assignedFarmers: 121, capacity: 200, avgFRI: 68, visitsThisWeek: 4, lastActive: 'Yesterday',   status: 'active'   },
  { id: '3',  name: 'Fatima Al-Hassan', initials: 'FA', zone: 'Zone A', assignedFarmers: 110, capacity: 200, avgFRI: 75, visitsThisWeek: 7, lastActive: '2h ago',      status: 'active'   },
  { id: '4',  name: 'Ibrahim Musa',     initials: 'IM', zone: 'Zone C', assignedFarmers: 165, capacity: 200, avgFRI: 81, visitsThisWeek: 6, lastActive: '45m ago',     status: 'active'   },
  { id: '5',  name: 'Ngozi Eze',        initials: 'NE', zone: 'Zone B', assignedFarmers: 145, capacity: 200, avgFRI: 70, visitsThisWeek: 3, lastActive: '3h ago',      status: 'active'   },
  { id: '6',  name: 'Suleiman Bello',   initials: 'SB', zone: 'Zone A', assignedFarmers: 133, capacity: 200, avgFRI: 66, visitsThisWeek: 2, lastActive: '5h ago',      status: 'active'   },
  { id: '7',  name: 'Aisha Kwari',      initials: 'AK', zone: 'Zone C', assignedFarmers: 118, capacity: 200, avgFRI: 78, visitsThisWeek: 6, lastActive: '1h ago',      status: 'active'   },
  { id: '8',  name: 'Emeka Nwosu',      initials: 'EN', zone: 'Zone B', assignedFarmers: 126, capacity: 200, avgFRI: 73, visitsThisWeek: 4, lastActive: '4h ago',      status: 'active'   },
  { id: '9',  name: 'Halima Yusuf',     initials: 'HY', zone: 'Zone C', assignedFarmers: 98,  capacity: 200, avgFRI: 65, visitsThisWeek: 1, lastActive: 'Yesterday',   status: 'absent'   },
  { id: '10', name: 'Tunde Adeyemi',    initials: 'TA', zone: 'Zone A', assignedFarmers: 115, capacity: 200, avgFRI: 69, visitsThisWeek: 0, lastActive: '3 days ago',  status: 'on_leave' },
  { id: '11', name: 'Binta Camara',     initials: 'BC', zone: 'Zone B', assignedFarmers: 155, capacity: 200, avgFRI: 85, visitsThisWeek: 7, lastActive: '1h ago',      status: 'active'   },
  { id: '12', name: 'Usman Garba',      initials: 'UG', zone: 'Zone C', assignedFarmers: 80,  capacity: 200, avgFRI: 67, visitsThisWeek: 0, lastActive: '5 days ago',  status: 'on_leave' },
]

const STATUS_DOT: Record<AgentStatus, string> = { active: '#22c55e', absent: '#f59e0b', on_leave: '#9ca3af' }

const AGENT_COLUMNS: DatagridColumn<Agent>[] = [
  {
    key: 'name', label: 'Agent',
    render: (v, agent) => (
      <div className="flex items-center gap-2.5">
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: 'var(--brand-forest)' }}>
            {agent.initials}
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ backgroundColor: STATUS_DOT[agent.status] }} />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate leading-tight">{String(v)}</p>
          <p className="text-xs text-gray-400 truncate">{agent.zone}</p>
        </div>
      </div>
    ),
  },
  { key: 'zone', label: 'Zone', render: v => <span className="text-gray-600 whitespace-nowrap">{String(v)}</span> },
  {
    key: 'assignedFarmers', label: 'Assigned / Capacity',
    render: (v, agent) => {
      const fillPct = Math.min(100, Math.round((agent.assignedFarmers / agent.capacity) * 100))
      return (
        <div className="flex flex-col gap-1 min-w-[110px]">
          <span className="text-xs text-gray-700 font-medium">{String(v)} / {agent.capacity}</span>
          <div className="h-1.5 w-24 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${fillPct}%`, backgroundColor: fillPct >= 90 ? 'var(--brand-red)' : fillPct >= 70 ? '#f59e0b' : 'var(--brand-green)' }} />
          </div>
        </div>
      )
    },
  },
  { key: 'visitsThisWeek', label: 'Visits This Week', render: v => <span className="text-gray-700 whitespace-nowrap">{String(v)}</span> },
  {
    key: 'avgFRI', label: 'Avg FRI',
    render: v => {
      const fri = Number(v)
      return (
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
          fri >= 75 ? 'bg-green-100 text-green-700' : fri >= 65 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
          {fri}
        </span>
      )
    },
  },
  { key: 'lastActive', label: 'Last Active', render: v => <span className="text-gray-500 whitespace-nowrap text-xs">{String(v)}</span> },
  {
    key: 'status', label: 'Status',
    render: v => {
      const status = v as AgentStatus
      if (status === 'active')   return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 whitespace-nowrap">Active</span>
      if (status === 'absent')   return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 whitespace-nowrap">Absent</span>
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 whitespace-nowrap">On Leave</span>
    },
  },
  {
    key: 'id', id: 'actions', label: 'Actions',
    render: () => (
      <div className="flex items-center gap-1">
        <ButtonTemplate variant="outline" size="sm" isIcon tooltip="View" leftIcon={<Eye className="w-3.5 h-3.5" />} onClick={() => {}} />
        <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => {}} />
      </div>
    ),
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

const totalAgents = AGENTS.length
const activeToday = AGENTS.filter(a => a.status === 'active').length
const avgCaseload = Math.round(AGENTS.reduce((s, a) => s + a.assignedFarmers, 0) / AGENTS.length)

export function Main() {
  const [search, setSearch]           = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterZone, setFilterZone]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage]               = useState(1)
  const [pageSize, setPageSize]       = useState(25)

  const activeFilterCount = [filterZone, filterStatus].filter(Boolean).length

  const filtered = AGENTS.filter(a => {
    const q = search.toLowerCase()
    if (q && !a.name.toLowerCase().includes(q) && !a.zone.toLowerCase().includes(q)) return false
    if (filterZone && a.zone !== filterZone) return false
    if (filterStatus && a.status !== filterStatus) return false
    return true
  })

  const displayed = pageSize > 0
    ? filtered.slice((page - 1) * pageSize, page * pageSize)
    : filtered

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <UserCog className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
            <h1 className="text-xl font-bold text-gray-900">Field Staff</h1>
          </div>
          <p className="text-sm text-gray-500 ml-7">Season 2025A · 12 field agents</p>
        </div>
        <ButtonTemplate variant="primary" size="sm" leftIcon={<Users className="w-3.5 h-3.5" />}>
          Add Staff
        </ButtonTemplate>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Agents</p>
              <p className="text-2xl font-bold text-gray-900">{totalAgents}</p>
              <p className="text-xs text-green-600 mt-0.5">Season 2025A</p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--brand-pale)' }}>
              <Users className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Active Today</p>
              <p className="text-2xl font-bold text-gray-900">{activeToday}</p>
              <p className="text-xs text-green-600 mt-0.5">of {totalAgents} agents</p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--brand-pale)' }}>
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Avg Caseload</p>
              <p className="text-2xl font-bold text-gray-900">{avgCaseload}</p>
              <p className="text-xs text-gray-400 mt-0.5">farmers per agent</p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--brand-pale)' }}>
              <MapPin className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Search + filter toggle */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or zone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
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
              label="Zone"
              value={filterZone}
              onChange={v => { setFilterZone(v); setPage(1) }}
              options={[
                { value: '', label: 'All Zones' },
                { value: 'Zone A', label: 'Zone A' },
                { value: 'Zone B', label: 'Zone B' },
                { value: 'Zone C', label: 'Zone C' },
              ]}
            />
            <FilterSelect
              label="Status"
              value={filterStatus}
              onChange={v => { setFilterStatus(v); setPage(1) }}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'absent', label: 'Absent' },
                { value: 'on_leave', label: 'On Leave' },
              ]}
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Agent Roster</h3>
        <DatagridTemplate<Agent>
          columns={AGENT_COLUMNS}
          data={displayed}
          rowKey="id"
          emptyLabel="No agents match your filters."
          defaultPageSize={0}
          pageSizeOptions={[0]}
        />

        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={ps => { setPageSize(ps); setPage(1) }}
          className="pt-3 border-t border-gray-100"
        />
      </div>
    </div>
  )
}
