'use client'

import { useState } from 'react'
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  Users,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react'

type FarmerStatus = 'active' | 'at_risk' | 'inactive'

interface Farmer {
  id: string
  name: string
  community: string
  cohort: string
  zone: string
  friScore: number
  compliance: number
  status: FarmerStatus
  weeklyCheckIn: boolean
}

const MOCK_FARMERS: Farmer[] = [
  { id: 'F001', name: 'Amara Diallo', community: 'Kpando North', cohort: 'Cohort 3', zone: 'Northern', friScore: 88, compliance: 95, status: 'active', weeklyCheckIn: true },
  { id: 'F002', name: 'Kwame Asante', community: 'Bawku West', cohort: 'Cohort 2', zone: 'Upper East', friScore: 72, compliance: 80, status: 'active', weeklyCheckIn: false },
  { id: 'F003', name: 'Fatima Ouedraogo', community: 'Tamale Central', cohort: 'Cohort 4', zone: 'Northern', friScore: 55, compliance: 62, status: 'at_risk', weeklyCheckIn: false },
  { id: 'F004', name: 'Kofi Mensah', community: 'Wa East', cohort: 'Cohort 1', zone: 'Upper West', friScore: 91, compliance: 98, status: 'active', weeklyCheckIn: true },
  { id: 'F005', name: 'Abena Boateng', community: 'Bongo District', cohort: 'Cohort 3', zone: 'Upper East', friScore: 63, compliance: 71, status: 'active', weeklyCheckIn: true },
  { id: 'F006', name: 'Yaw Darko', community: 'Savelugu', cohort: 'Cohort 2', zone: 'Northern', friScore: 50, compliance: 60, status: 'at_risk', weeklyCheckIn: false },
  { id: 'F007', name: 'Adwoa Frimpong', community: 'Lambussie', cohort: 'Cohort 4', zone: 'Upper West', friScore: 79, compliance: 85, status: 'active', weeklyCheckIn: true },
  { id: 'F008', name: 'Issah Alhassan', community: 'Pusiga', cohort: 'Cohort 1', zone: 'Upper East', friScore: 58, compliance: 65, status: 'inactive', weeklyCheckIn: false },
  { id: 'F009', name: 'Efua Appiah', community: 'Tolon', cohort: 'Cohort 3', zone: 'Northern', friScore: 84, compliance: 91, status: 'active', weeklyCheckIn: true },
  { id: 'F010', name: 'Mustapha Yakubu', community: 'Nandom', cohort: 'Cohort 2', zone: 'Upper West', friScore: 67, compliance: 74, status: 'active', weeklyCheckIn: false },
  { id: 'F011', name: 'Akosua Nyarko', community: 'Karaga', cohort: 'Cohort 4', zone: 'Northern', friScore: 93, compliance: 99, status: 'active', weeklyCheckIn: true },
  { id: 'F012', name: 'Seidu Mahama', community: 'Garu', cohort: 'Cohort 1', zone: 'Upper East', friScore: 52, compliance: 61, status: 'at_risk', weeklyCheckIn: false },
  { id: 'F013', name: 'Ama Dankwa', community: 'Jirapa', cohort: 'Cohort 3', zone: 'Upper West', friScore: 76, compliance: 83, status: 'active', weeklyCheckIn: true },
  { id: 'F014', name: 'Abdulai Sumaila', community: 'Damongo', cohort: 'Cohort 2', zone: 'Savannah', friScore: 61, compliance: 69, status: 'inactive', weeklyCheckIn: false },
  { id: 'F015', name: 'Philomena Acheampong', community: 'Bole', cohort: 'Cohort 4', zone: 'Savannah', friScore: 82, compliance: 90, status: 'active', weeklyCheckIn: true },
]

const COHORTS = ['All Cohorts', 'Cohort 1', 'Cohort 2', 'Cohort 3', 'Cohort 4']
const ZONES = ['All Zones', 'Northern', 'Upper East', 'Upper West', 'Savannah']
const STATUSES = ['All Status', 'active', 'at_risk', 'inactive']

const PAGE_SIZE = 8

function friBadge(score: number) {
  if (score >= 75) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
  if (score >= 60) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
}

function statusBadge(status: FarmerStatus) {
  if (status === 'active') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
  if (status === 'at_risk') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
  return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
}

function statusLabel(status: FarmerStatus) {
  if (status === 'active') return 'Active'
  if (status === 'at_risk') return 'At Risk'
  return 'Inactive'
}

interface SelectDropdownProps {
  value: string
  options: string[]
  onChange: (v: string) => void
}

function SelectDropdown({ value, options, onChange }: SelectDropdownProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
      >
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    </div>
  )
}

export function Main() {
  const [search, setSearch] = useState('')
  const [cohort, setCohort] = useState('All Cohorts')
  const [zone, setZone] = useState('All Zones')
  const [status, setStatus] = useState('All Status')
  const [page, setPage] = useState(1)

  const filtered = MOCK_FARMERS.filter(f => {
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.community.toLowerCase().includes(search.toLowerCase())
    const matchCohort = cohort === 'All Cohorts' || f.cohort === cohort
    const matchZone = zone === 'All Zones' || f.zone === zone
    const matchStatus = status === 'All Status' || f.status === status
    return matchSearch && matchCohort && matchZone && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleSearchChange(v: string) {
    setSearch(v)
    setPage(1)
  }
  function handleCohortChange(v: string) { setCohort(v); setPage(1) }
  function handleZoneChange(v: string) { setZone(v); setPage(1) }
  function handleStatusChange(v: string) { setStatus(v); setPage(1) }

  return (
    <div className="p-6 space-y-6 min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Farmers Registry</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage and monitor enrolled farmers across all cohorts</p>
        </div>
        <button className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">Total Farmers</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">1,248</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">At Risk</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">87</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">Avg FRI Score</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">74.2</p>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or community..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <SelectDropdown value={cohort} options={COHORTS} onChange={handleCohortChange} />
          <SelectDropdown value={zone} options={ZONES} onChange={handleZoneChange} />
          <SelectDropdown value={status} options={STATUSES} onChange={handleStatusChange} />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Farmer Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Community</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Cohort</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Zone</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">FRI Score</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Compliance %</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Check-in</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 dark:text-slate-500">
                    No farmers match the current filters.
                  </td>
                </tr>
              ) : (
                paginated.map((farmer, i) => (
                  <tr
                    key={farmer.id}
                    className={`border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-800/20'}`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{farmer.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{farmer.community}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{farmer.cohort}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{farmer.zone}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${friBadge(farmer.friScore)}`}>
                        {farmer.friScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {farmer.compliance}%
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {farmer.weeklyCheckIn ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <span className="w-4 h-4 inline-block rounded-full border-2 border-slate-300 dark:border-slate-600" />
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(farmer.status)}`}>
                        {statusLabel(farmer.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium">
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} farmers
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-7 px-3 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400 min-w-[70px] text-center">
              Page {safePage} of {totalPages}
            </span>
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="h-7 px-3 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
