'use client'

import { useState } from 'react'
import {
  Zap,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
} from 'lucide-react'

type InterventionType = 'Input Support' | 'Training' | 'Financial' | 'Advisory'
type InterventionStatus = 'active' | 'completed' | 'pending'
type Urgency = 'high' | 'medium' | 'low'

interface Intervention {
  id: string
  title: string
  type: InterventionType
  targetCohort: string
  beneficiaries: number
  status: InterventionStatus
  urgency: Urgency
  startDate: string
  endDate: string
  owner: string
  progress: number
}

const MOCK_INTERVENTIONS: Intervention[] = [
  {
    id: 'INT-001',
    title: 'Fertilizer Distribution – Season A',
    type: 'Input Support',
    targetCohort: 'Cohort 3 – Rift Valley',
    beneficiaries: 124,
    status: 'active',
    urgency: 'high',
    startDate: '2026-05-10',
    endDate: 'ongoing',
    owner: 'Amara Diallo',
    progress: 62,
  },
  {
    id: 'INT-002',
    title: 'GAP Training – Maize Farmers',
    type: 'Training',
    targetCohort: 'Cohort 1 – Western Region',
    beneficiaries: 88,
    status: 'active',
    urgency: 'medium',
    startDate: '2026-05-20',
    endDate: '2026-07-30',
    owner: 'Kofi Mensah',
    progress: 45,
  },
  {
    id: 'INT-003',
    title: 'Micro-loan Disbursement Q2',
    type: 'Financial',
    targetCohort: 'Cohort 2 – Northern Plains',
    beneficiaries: 210,
    status: 'active',
    urgency: 'high',
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    owner: 'Fatima Nkosi',
    progress: 80,
  },
  {
    id: 'INT-004',
    title: 'Soil Health Advisory',
    type: 'Advisory',
    targetCohort: 'Cohort 4 – Eastern Highlands',
    beneficiaries: 56,
    status: 'active',
    urgency: 'low',
    startDate: '2026-06-15',
    endDate: 'ongoing',
    owner: 'Samuel Osei',
    progress: 33,
  },
  {
    id: 'INT-005',
    title: 'Seed Kit Distribution – Sorghum',
    type: 'Input Support',
    targetCohort: 'Cohort 3 – Rift Valley',
    beneficiaries: 97,
    status: 'active',
    urgency: 'medium',
    startDate: '2026-04-12',
    endDate: 'ongoing',
    owner: 'Amara Diallo',
    progress: 55,
  },
  {
    id: 'INT-006',
    title: 'Post-Harvest Loss Reduction Training',
    type: 'Training',
    targetCohort: 'Cohort 2 – Northern Plains',
    beneficiaries: 73,
    status: 'active',
    urgency: 'medium',
    startDate: '2026-06-20',
    endDate: '2026-08-15',
    owner: 'Kofi Mensah',
    progress: 18,
  },
  {
    id: 'INT-007',
    title: 'Emergency Pest Control – Armyworm',
    type: 'Input Support',
    targetCohort: 'Cohort 1 – Western Region',
    beneficiaries: 144,
    status: 'active',
    urgency: 'high',
    startDate: '2026-07-01',
    endDate: 'ongoing',
    owner: 'Fatima Nkosi',
    progress: 10,
  },
  {
    id: 'INT-008',
    title: 'Credit Scoring & Access Workshop',
    type: 'Financial',
    targetCohort: 'Cohort 4 – Eastern Highlands',
    beneficiaries: 62,
    status: 'active',
    urgency: 'low',
    startDate: '2026-06-05',
    endDate: '2026-07-20',
    owner: 'Samuel Osei',
    progress: 72,
  },
  {
    id: 'INT-009',
    title: 'Season A Input Pack Distribution',
    type: 'Input Support',
    targetCohort: 'Cohort 5 – Coastal Belt',
    beneficiaries: 115,
    status: 'completed',
    urgency: 'medium',
    startDate: '2026-02-01',
    endDate: '2026-03-15',
    owner: 'Amara Diallo',
    progress: 100,
  },
  {
    id: 'INT-010',
    title: 'Irrigation Scheduling Advisory',
    type: 'Advisory',
    targetCohort: 'Cohort 3 – Rift Valley',
    beneficiaries: 49,
    status: 'completed',
    urgency: 'low',
    startDate: '2026-01-10',
    endDate: '2026-04-10',
    owner: 'Kofi Mensah',
    progress: 100,
  },
  {
    id: 'INT-011',
    title: 'Women Farmers Financial Literacy',
    type: 'Financial',
    targetCohort: 'Cohort 6 – Central Zone',
    beneficiaries: 78,
    status: 'pending',
    urgency: 'medium',
    startDate: '2026-08-01',
    endDate: '2026-09-30',
    owner: 'Fatima Nkosi',
    progress: 0,
  },
  {
    id: 'INT-012',
    title: 'Youth Agri-Entrepreneur Training',
    type: 'Training',
    targetCohort: 'Cohort 6 – Central Zone',
    beneficiaries: 38,
    status: 'pending',
    urgency: 'low',
    startDate: '2026-08-15',
    endDate: '2026-10-31',
    owner: 'Samuel Osei',
    progress: 0,
  },
]

const TYPE_COLORS: Record<InterventionType, string> = {
  'Input Support': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Training: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  Financial: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  Advisory: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
}

const URGENCY_BADGE: Record<Urgency, string> = {
  high: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
  low: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
}

const STATUS_BADGE: Record<InterventionStatus, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
}

const PROGRESS_COLORS: Record<InterventionStatus, string> = {
  active: 'bg-emerald-500',
  completed: 'bg-gray-400',
  pending: 'bg-yellow-400',
}

function formatDate(date: string) {
  if (date === 'ongoing') return 'Ongoing'
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex items-center gap-4">
      <div className={`rounded-lg p-2.5 ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{value}</p>
      </div>
    </div>
  )
}

function InterventionCard({ item }: { item: Intervention }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug flex-1 min-w-0">
          {item.title}
        </h3>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${URGENCY_BADGE[item.urgency]}`}
          >
            {item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)} urgency
          </span>
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[item.status]}`}
          >
            {item.status}
          </span>
        </div>
      </div>

      {/* Type + Cohort */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${TYPE_COLORS[item.type]}`}>
          {item.type}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{item.targetCohort}</span>
      </div>

      {/* Progress bar (shown for active and completed) */}
      {item.status !== 'pending' && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Progress</span>
            <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{item.progress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${PROGRESS_COLORS[item.status]}`}
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {item.beneficiaries.toLocaleString()} beneficiaries
        </span>
        <span className="flex items-center gap-1">
          <Zap className="w-3.5 h-3.5" />
          {item.owner}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {formatDate(item.startDate)} – {formatDate(item.endDate)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
        <button className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
          View Details
        </button>
        {item.status === 'active' && (
          <button className="text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark Complete
          </button>
        )}
        {item.status === 'pending' && (
          <button className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Approve
          </button>
        )}
      </div>
    </div>
  )
}

export function Main() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<InterventionType | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<InterventionStatus | 'All'>('All')

  const filtered = MOCK_INTERVENTIONS.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.targetCohort.toLowerCase().includes(search.toLowerCase()) ||
      item.owner.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'All' || item.type === typeFilter
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  const activeCount = MOCK_INTERVENTIONS.filter((i) => i.status === 'active').length
  const completedCount = MOCK_INTERVENTIONS.filter((i) => i.status === 'completed').length
  const pendingCount = MOCK_INTERVENTIONS.filter((i) => i.status === 'pending').length
  const totalBeneficiaries = MOCK_INTERVENTIONS.reduce((sum, i) => sum + i.beneficiaries, 0)

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Interventions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Track and manage all program interventions
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          New Intervention
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Zap className="w-4 h-4 text-green-600 dark:text-green-400" />}
          label="Active"
          value={activeCount}
          color="bg-green-100 dark:bg-green-900/40"
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
          label="Completed This Season"
          value={completedCount}
          color="bg-gray-100 dark:bg-gray-800"
        />
        <StatCard
          icon={<Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
          label="Total Beneficiaries"
          value={totalBeneficiaries.toLocaleString()}
          color="bg-blue-100 dark:bg-blue-900/40"
        />
        <StatCard
          icon={<AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
          label="Pending Approval"
          value={pendingCount}
          color="bg-amber-100 dark:bg-amber-900/40"
        />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search interventions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as InterventionType | 'All')}
            className="text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Types</option>
            <option value="Input Support">Input Support</option>
            <option value="Training">Training</option>
            <option value="Financial">Financial</option>
            <option value="Advisory">Advisory</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InterventionStatus | 'All')}
            className="text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Result count */}
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
        Showing {filtered.length} of {MOCK_INTERVENTIONS.length} interventions
      </p>

      {/* Intervention cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length > 0 ? (
          filtered.map((item) => <InterventionCard key={item.id} item={item} />)
        ) : (
          <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
            <TrendingUp className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No interventions found</p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
