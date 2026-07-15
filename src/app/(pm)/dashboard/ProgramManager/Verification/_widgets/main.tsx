'use client'

import { useState } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Eye,
  Pencil,
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  MessageSquare,
  RefreshCw,
  CheckCircle,
} from 'lucide-react'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { PaginationBar } from '@/customComponents/PaginationBar'
import { DatagridTemplate } from '@/customComponents/DatagridTemplate'
import type { DatagridColumn } from '@/customComponents/DatagridTemplate'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CohortProgress {
  id: string
  cohort: string
  community: string
  enrolled: number
  verified: number
  pending: number
  rejected: number
  pct: number
}

interface ReviewRecord {
  id: string
  farmer: string
  community: string
  cohort: string
  submittedDate: string
  type: 'Initial' | 'Resubmission'
  reviewedBy: string
  priority: 'High' | 'Medium' | 'Low'
  status: 'Pending' | 'In Review'
}

interface RevisitRecord {
  id: string
  farmer: string
  community: string
  cohort: string
  reason: 'Missing Data' | 'Photo Quality' | 'Inconsistent Info' | 'Incomplete Form'
  assignedTo: string
  dueDate: string
  daysLeft: number
  priority: 'High' | 'Medium'
}

interface DisputeRecord {
  id: string
  farmer: string
  community: string
  cohort: string
  resolvedDate: string
  resolution: 'Approved' | 'Rejected' | 'Escalated'
  resolvedBy: string
  notes: string
}

interface SupportRequest {
  id: string
  farmer: string
  community: string
  type: 'Technical' | 'Data Query' | 'General'
  subject: string
  submittedDate: string
  status: 'Open' | 'In Progress' | 'Closed'
  assignedTo: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_COHORTS: CohortProgress[] = [
  { id: 'C001', cohort: 'Kumasi North',  community: 'Ahinsan',          enrolled: 120, verified: 102, pending: 12, rejected: 6,  pct: 85 },
  { id: 'C002', cohort: 'Ejisu',         community: 'Ejisu Town',        enrolled: 95,  verified: 74,  pending: 15, rejected: 6,  pct: 78 },
  { id: 'C003', cohort: 'Mampong',       community: 'Mampong Ashanti',   enrolled: 110, verified: 95,  pending: 10, rejected: 5,  pct: 86 },
  { id: 'C004', cohort: 'Offinso',       community: 'Offinso Nkwanta',   enrolled: 88,  verified: 50,  pending: 30, rejected: 8,  pct: 57 },
  { id: 'C005', cohort: 'Kwabre West',   community: 'Kwabre',            enrolled: 102, verified: 67,  pending: 25, rejected: 10, pct: 66 },
  { id: 'C006', cohort: 'Juaben',        community: 'Juaben Town',       enrolled: 76,  verified: 62,  pending: 10, rejected: 4,  pct: 82 },
  { id: 'C007', cohort: 'Afigya-Kwabre', community: 'Patasi',            enrolled: 90,  verified: 55,  pending: 28, rejected: 7,  pct: 61 },
  { id: 'C008', cohort: 'Bosomtwe',      community: 'Bonwire',           enrolled: 84,  verified: 73,  pending: 7,  rejected: 4,  pct: 87 },
  { id: 'C009', cohort: 'Asante Akim',   community: 'Onwe',              enrolled: 65,  verified: 36,  pending: 22, rejected: 7,  pct: 55 },
  { id: 'C010', cohort: 'Sekyere East',  community: 'Afrancho',          enrolled: 98,  verified: 80,  pending: 12, rejected: 6,  pct: 82 },
]

const MOCK_REVIEW: ReviewRecord[] = [
  { id: 'R001', farmer: 'Abena Asante',       community: 'Ahinsan',         cohort: 'Kumasi North',  submittedDate: '2026-07-01', type: 'Initial',      reviewedBy: '—',           priority: 'High',   status: 'Pending'   },
  { id: 'R002', farmer: 'Kwaku Mensah',        community: 'Ejisu Town',      cohort: 'Ejisu',         submittedDate: '2026-07-02', type: 'Resubmission', reviewedBy: 'Ama Darko',   priority: 'Medium', status: 'In Review' },
  { id: 'R003', farmer: 'Akosua Frimpong',     community: 'Bonwire',         cohort: 'Ejisu',         submittedDate: '2026-07-02', type: 'Initial',      reviewedBy: '—',           priority: 'Low',    status: 'Pending'   },
  { id: 'R004', farmer: 'Yaw Boateng',         community: 'Mampong Ashanti', cohort: 'Mampong',       submittedDate: '2026-07-03', type: 'Initial',      reviewedBy: 'Kofi Osei',   priority: 'High',   status: 'In Review' },
  { id: 'R005', farmer: 'Efua Darko',          community: 'Offinso Nkwanta', cohort: 'Offinso',       submittedDate: '2026-07-03', type: 'Resubmission', reviewedBy: '—',           priority: 'Medium', status: 'Pending'   },
  { id: 'R006', farmer: 'Kofi Acheampong',     community: 'Kwabre',          cohort: 'Kwabre West',   submittedDate: '2026-07-04', type: 'Initial',      reviewedBy: 'Ama Darko',   priority: 'Low',    status: 'In Review' },
  { id: 'R007', farmer: 'Adwoa Nyarko',        community: 'Patasi',          cohort: 'Kumasi North',  submittedDate: '2026-07-04', type: 'Initial',      reviewedBy: '—',           priority: 'High',   status: 'Pending'   },
  { id: 'R008', farmer: 'Kwame Antwi',         community: 'Juaben',          cohort: 'Ejisu',         submittedDate: '2026-07-05', type: 'Resubmission', reviewedBy: 'Kofi Osei',   priority: 'Medium', status: 'In Review' },
  { id: 'R009', farmer: 'Ama Owusu',           community: 'Mampong',         cohort: 'Mampong',       submittedDate: '2026-07-05', type: 'Initial',      reviewedBy: '—',           priority: 'Low',    status: 'Pending'   },
  { id: 'R010', farmer: 'Kwabena Appiah',      community: 'Offinso South',   cohort: 'Offinso',       submittedDate: '2026-07-05', type: 'Initial',      reviewedBy: 'Ama Darko',   priority: 'Medium', status: 'In Review' },
  { id: 'R011', farmer: 'Akua Bempong',        community: 'Kwabre North',    cohort: 'Kwabre West',   submittedDate: '2026-07-06', type: 'Resubmission', reviewedBy: '—',           priority: 'Low',    status: 'Pending'   },
  { id: 'R012', farmer: 'Yaa Osei',            community: 'Tafo',            cohort: 'Kumasi North',  submittedDate: '2026-07-06', type: 'Initial',      reviewedBy: 'Kofi Osei',   priority: 'Medium', status: 'In Review' },
  { id: 'R013', farmer: 'Kwesi Asare',         community: 'Onwe',            cohort: 'Ejisu',         submittedDate: '2026-07-07', type: 'Initial',      reviewedBy: '—',           priority: 'High',   status: 'Pending'   },
  { id: 'R014', farmer: 'Maame Amponsah',      community: 'Afrancho',        cohort: 'Offinso',       submittedDate: '2026-07-07', type: 'Resubmission', reviewedBy: 'Ama Darko',   priority: 'Low',    status: 'In Review' },
  { id: 'R015', farmer: 'Nana Agyei',          community: 'Kumasi Central',  cohort: 'Kumasi North',  submittedDate: '2026-07-08', type: 'Initial',      reviewedBy: '—',           priority: 'Medium', status: 'Pending'   },
]

const MOCK_REVISIT: RevisitRecord[] = [
  { id: 'V001', farmer: 'Adjoa Tetteh',        community: 'Antoa',           cohort: 'Kwabre West',   reason: 'Missing Data',       assignedTo: 'Ama Darko',   dueDate: '2026-07-10', daysLeft: 1,  priority: 'High'   },
  { id: 'V002', farmer: 'Kweku Bonsu',         community: 'Mampong North',   cohort: 'Mampong',       reason: 'Photo Quality',      assignedTo: 'Kofi Osei',   dueDate: '2026-07-11', daysLeft: 2,  priority: 'High'   },
  { id: 'V003', farmer: 'Abina Sarpong',       community: 'Ejisu Besease',   cohort: 'Ejisu',         reason: 'Inconsistent Info',  assignedTo: 'Ama Darko',   dueDate: '2026-07-12', daysLeft: 3,  priority: 'High'   },
  { id: 'V004', farmer: 'Kofi Oteng',          community: 'Offinso Akuma',   cohort: 'Offinso',       reason: 'Incomplete Form',    assignedTo: 'Kofi Osei',   dueDate: '2026-07-13', daysLeft: 4,  priority: 'Medium' },
  { id: 'V005', farmer: 'Akosua Twum',         community: 'Kwabre South',    cohort: 'Kwabre West',   reason: 'Missing Data',       assignedTo: 'Ama Darko',   dueDate: '2026-07-14', daysLeft: 5,  priority: 'Medium' },
  { id: 'V006', farmer: 'Yaw Asante',          community: 'Kumasi South',    cohort: 'Kumasi North',  reason: 'Photo Quality',      assignedTo: 'Kofi Osei',   dueDate: '2026-07-14', daysLeft: 5,  priority: 'Medium' },
  { id: 'V007', farmer: 'Adwoa Mensah',        community: 'Juaben East',     cohort: 'Juaben',        reason: 'Inconsistent Info',  assignedTo: 'Ama Darko',   dueDate: '2026-07-15', daysLeft: 6,  priority: 'Medium' },
  { id: 'V008', farmer: 'Kwame Frimpong',      community: 'Patasi South',    cohort: 'Kumasi North',  reason: 'Incomplete Form',    assignedTo: 'Kofi Osei',   dueDate: '2026-07-15', daysLeft: 6,  priority: 'Medium' },
  { id: 'V009', farmer: 'Efua Owusu',          community: 'Bonwire North',   cohort: 'Bosomtwe',      reason: 'Missing Data',       assignedTo: 'Ama Darko',   dueDate: '2026-07-16', daysLeft: 7,  priority: 'Medium' },
  { id: 'V010', farmer: 'Kofi Nyarko',         community: 'Onwe South',      cohort: 'Asante Akim',   reason: 'Photo Quality',      assignedTo: 'Kofi Osei',   dueDate: '2026-07-17', daysLeft: 8,  priority: 'Medium' },
  { id: 'V011', farmer: 'Abena Boateng',       community: 'Afrancho West',   cohort: 'Sekyere East',  reason: 'Inconsistent Info',  assignedTo: 'Ama Darko',   dueDate: '2026-07-18', daysLeft: 9,  priority: 'Medium' },
  { id: 'V012', farmer: 'Nana Appiah',         community: 'Mampong East',    cohort: 'Mampong',       reason: 'Incomplete Form',    assignedTo: 'Kofi Osei',   dueDate: '2026-07-20', daysLeft: 11, priority: 'Medium' },
]

const MOCK_DISPUTES: DisputeRecord[] = [
  { id: 'D001', farmer: 'Abena Asante',       community: 'Ahinsan',         cohort: 'Kumasi North', resolvedDate: '2026-06-10', resolution: 'Approved',   resolvedBy: 'Kofi Osei',   notes: 'Documents verified successfully after resubm...' },
  { id: 'D002', farmer: 'Kwaku Mensah',        community: 'Ejisu Town',      cohort: 'Ejisu',        resolvedDate: '2026-06-11', resolution: 'Rejected',   resolvedBy: 'Ama Darko',   notes: 'Inconsistencies could not be resolved.' },
  { id: 'D003', farmer: 'Akosua Frimpong',     community: 'Bonwire',         cohort: 'Ejisu',        resolvedDate: '2026-06-12', resolution: 'Escalated',  resolvedBy: 'Kofi Osei',   notes: 'Referred to regional coordinator for review.' },
  { id: 'D004', farmer: 'Yaw Boateng',         community: 'Mampong Ashanti', cohort: 'Mampong',      resolvedDate: '2026-06-13', resolution: 'Approved',   resolvedBy: 'Ama Darko',   notes: 'All required documents provided and valid.' },
  { id: 'D005', farmer: 'Efua Darko',          community: 'Offinso Nkwanta', cohort: 'Offinso',      resolvedDate: '2026-06-14', resolution: 'Approved',   resolvedBy: 'Kofi Osei',   notes: 'Photo quality issue resolved with new photos.' },
  { id: 'D006', farmer: 'Kofi Acheampong',     community: 'Kwabre',          cohort: 'Kwabre West',  resolvedDate: '2026-06-15', resolution: 'Rejected',   resolvedBy: 'Ama Darko',   notes: 'Farm plot boundary dispute unresolved.' },
  { id: 'D007', farmer: 'Adwoa Nyarko',        community: 'Patasi',          cohort: 'Kumasi North', resolvedDate: '2026-06-16', resolution: 'Approved',   resolvedBy: 'Kofi Osei',   notes: 'Verified with community leader testimony.' },
  { id: 'D008', farmer: 'Kwame Antwi',         community: 'Juaben',          cohort: 'Ejisu',        resolvedDate: '2026-06-17', resolution: 'Escalated',  resolvedBy: 'Ama Darko',   notes: 'Complex land ownership dispute pending.' },
  { id: 'D009', farmer: 'Ama Owusu',           community: 'Mampong',         cohort: 'Mampong',      resolvedDate: '2026-06-18', resolution: 'Approved',   resolvedBy: 'Kofi Osei',   notes: 'Cleared after supervisor review.' },
  { id: 'D010', farmer: 'Kwabena Appiah',      community: 'Offinso South',   cohort: 'Offinso',      resolvedDate: '2026-06-19', resolution: 'Approved',   resolvedBy: 'Ama Darko',   notes: 'Missing data supplied at field visit.' },
  { id: 'D011', farmer: 'Akua Bempong',        community: 'Kwabre North',    cohort: 'Kwabre West',  resolvedDate: '2026-06-20', resolution: 'Rejected',   resolvedBy: 'Kofi Osei',   notes: 'Fraudulent documentation detected.' },
  { id: 'D012', farmer: 'Yaa Osei',            community: 'Tafo',            cohort: 'Kumasi North', resolvedDate: '2026-06-21', resolution: 'Approved',   resolvedBy: 'Ama Darko',   notes: 'FRI data discrepancy resolved.' },
  { id: 'D013', farmer: 'Kwesi Asare',         community: 'Onwe',            cohort: 'Asante Akim',  resolvedDate: '2026-06-22', resolution: 'Escalated',  resolvedBy: 'Kofi Osei',   notes: 'Escalated to national office for guidance.' },
  { id: 'D014', farmer: 'Maame Amponsah',      community: 'Afrancho',        cohort: 'Sekyere East', resolvedDate: '2026-06-23', resolution: 'Approved',   resolvedBy: 'Ama Darko',   notes: 'Identity confirmed via community register.' },
  { id: 'D015', farmer: 'Nana Agyei',          community: 'Kumasi Central',  cohort: 'Kumasi North', resolvedDate: '2026-06-24', resolution: 'Rejected',   resolvedBy: 'Kofi Osei',   notes: 'Duplicate record — already enrolled elsewhere.' },
  { id: 'D016', farmer: 'Adjoa Tetteh',        community: 'Antoa',           cohort: 'Kwabre West',  resolvedDate: '2026-06-25', resolution: 'Approved',   resolvedBy: 'Ama Darko',   notes: 'Plot size discrepancy corrected.' },
  { id: 'D017', farmer: 'Kweku Bonsu',         community: 'Mampong North',   cohort: 'Mampong',      resolvedDate: '2026-06-26', resolution: 'Approved',   resolvedBy: 'Kofi Osei',   notes: 'Supervisor override applied after field visit.' },
  { id: 'D018', farmer: 'Abina Sarpong',       community: 'Ejisu Besease',   cohort: 'Ejisu',        resolvedDate: '2026-06-27', resolution: 'Escalated',  resolvedBy: 'Ama Darko',   notes: 'Pending regional arbitration decision.' },
  { id: 'D019', farmer: 'Kofi Oteng',          community: 'Offinso Akuma',   cohort: 'Offinso',      resolvedDate: '2026-06-28', resolution: 'Approved',   resolvedBy: 'Kofi Osei',   notes: 'Cleared with updated GPS coordinates.' },
  { id: 'D020', farmer: 'Akosua Twum',         community: 'Kwabre South',    cohort: 'Kwabre West',  resolvedDate: '2026-06-29', resolution: 'Rejected',   resolvedBy: 'Ama Darko',   notes: 'Third-party land claim invalidates enrollment.' },
]

const MOCK_SUPPORT: SupportRequest[] = [
  { id: 'S001', farmer: 'Abena Asante',       community: 'Ahinsan',         type: 'Technical',   subject: 'Unable to upload verification photos',     submittedDate: '2026-07-01', status: 'Open',        assignedTo: '—'          },
  { id: 'S002', farmer: 'Kwaku Mensah',        community: 'Ejisu Town',      type: 'Data Query',  subject: 'FRI score discrepancy in portal',           submittedDate: '2026-07-02', status: 'In Progress', assignedTo: 'Ama Darko'  },
  { id: 'S003', farmer: 'Akosua Frimpong',     community: 'Bonwire',         type: 'General',     subject: 'Query on enrollment eligibility criteria',  submittedDate: '2026-07-02', status: 'Closed',      assignedTo: 'Kofi Osei'  },
  { id: 'S004', farmer: 'Yaw Boateng',         community: 'Mampong Ashanti', type: 'Technical',   subject: 'App crashes when submitting form',          submittedDate: '2026-07-03', status: 'Open',        assignedTo: '—'          },
  { id: 'S005', farmer: 'Efua Darko',          community: 'Offinso Nkwanta', type: 'Data Query',  subject: 'Intervention record missing from history',  submittedDate: '2026-07-04', status: 'In Progress', assignedTo: 'Ama Darko'  },
  { id: 'S006', farmer: 'Kofi Acheampong',     community: 'Kwabre',          type: 'General',     subject: 'Request for proof of enrollment document',  submittedDate: '2026-07-05', status: 'Closed',      assignedTo: 'Kofi Osei'  },
  { id: 'S007', farmer: 'Adwoa Nyarko',        community: 'Patasi',          type: 'Technical',   subject: 'GPS coordinates not saving correctly',      submittedDate: '2026-07-05', status: 'Open',        assignedTo: '—'          },
  { id: 'S008', farmer: 'Kwame Antwi',         community: 'Juaben',          type: 'Data Query',  subject: 'Land area calculation seems incorrect',     submittedDate: '2026-07-06', status: 'In Progress', assignedTo: 'Ama Darko'  },
  { id: 'S009', farmer: 'Ama Owusu',           community: 'Mampong',         type: 'General',     subject: 'Need to update contact information',        submittedDate: '2026-07-07', status: 'Open',        assignedTo: '—'          },
  { id: 'S010', farmer: 'Kwabena Appiah',      community: 'Offinso South',   type: 'Technical',   subject: 'Password reset not working on mobile',      submittedDate: '2026-07-08', status: 'In Progress', assignedTo: 'Kofi Osei'  },
]

// ─── Helper Components ────────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options }: {
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
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg pl-10 pr-9 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) transition-colors"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2">
          <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
        </button>
      )}
    </div>
  )
}

function FilterToggle({ open, count, onClick }: { open: boolean; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 h-10 px-3 rounded-lg border text-sm font-medium transition-colors shrink-0',
        open || count > 0
          ? 'border-(--brand-green) text-(--brand-green) bg-green-50'
          : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
      )}
    >
      <SlidersHorizontal className="w-3.5 h-3.5" />
      Filters
      {count > 0 && (
        <span
          className="ml-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
          style={{ backgroundColor: 'var(--brand-green)' }}
        >
          {count}
        </span>
      )}
      <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
    </button>
  )
}

function StatCard({ icon, label, value, sub, iconBg, iconColor }: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  iconBg?: string
  iconColor?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: iconBg || 'var(--brand-pale)', color: iconColor || 'var(--brand-forest)' }}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ icon, message, action }: { icon: React.ReactNode; message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
        {icon}
      </div>
      <p className="text-sm text-gray-500">{message}</p>
      {action}
    </div>
  )
}

// ─── Tab: Verification Progress ───────────────────────────────────────────────

function VerificationProgressTab() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filtered = MOCK_COHORTS.filter(c => {
    const q = search.toLowerCase()
    return !q || c.cohort.toLowerCase().includes(q) || c.community.toLowerCase().includes(q)
  })

  const displayed = pageSize > 0 ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered

  function pctColor(pct: number) {
    if (pct >= 80) return 'bg-green-500'
    if (pct >= 60) return 'bg-amber-400'
    return 'bg-red-400'
  }

  function pctTextColor(pct: number) {
    if (pct >= 80) return 'text-green-700'
    if (pct >= 60) return 'text-amber-700'
    return 'text-red-600'
  }

  const COHORT_COLUMNS: DatagridColumn<CohortProgress>[] = [
    { key: 'cohort', label: 'Cohort', render: v => <span className="font-medium text-gray-900 whitespace-nowrap">{String(v)}</span> },
    { key: 'community', label: 'Community', render: v => <span className="text-gray-500 whitespace-nowrap">{String(v)}</span> },
    { key: 'enrolled', label: 'Enrolled', render: v => <span className="text-gray-700 whitespace-nowrap tabular-nums">{String(v)}</span> },
    { key: 'verified', label: 'Verified', render: v => <span className="text-gray-700 whitespace-nowrap tabular-nums">{String(v)}</span> },
    { key: 'pending', label: 'Pending', render: v => <span className="text-amber-600 whitespace-nowrap tabular-nums font-medium">{String(v)}</span> },
    { key: 'rejected', label: 'Rejected', render: v => <span className="text-red-500 whitespace-nowrap tabular-nums font-medium">{String(v)}</span> },
    {
      key: 'pct', label: 'Progress %', width: '160px',
      render: v => {
        const pct = Number(v)
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-20">
              <div className={cn('h-full rounded-full', pctColor(pct))} style={{ width: `${pct}%` }} />
            </div>
            <span className={cn('text-xs font-semibold tabular-nums w-10 text-right', pctTextColor(pct))}>{pct}%</span>
          </div>
        )
      },
    },
    {
      key: 'id', id: 'actions', label: '',
      render: () => <ButtonTemplate variant="outline" size="sm" isIcon tooltip="View Details" leftIcon={<Eye className="w-3.5 h-3.5" />} onClick={() => {}} />,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Total Verified" value="743" sub="Across all cohorts" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Pending Review" value="87" sub="Awaiting verification" iconBg="#fef3c7" iconColor="#d97706" />
        <StatCard icon={<XCircle className="w-5 h-5" />} label="Rejection Rate" value="3.2%" sub="Below 5% target" iconBg="#fee2e2" iconColor="#dc2626" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Per-Cohort Verification Progress</h3>

        <div className="flex items-center gap-2 mb-4">
          <SearchBar value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search cohort or community…" />
        </div>

        {displayed.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="w-6 h-6" />} message="No cohorts match the current search." />
        ) : (
          <DatagridTemplate<CohortProgress>
            columns={COHORT_COLUMNS}
            data={displayed}
            rowKey="id"
            defaultPageSize={0}
            pageSizeOptions={[0]}
          />
        )}

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

// ─── Tab: Review Queue ────────────────────────────────────────────────────────

function ReviewQueueTab() {
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const activeFilterCount = [filterType, filterPriority, filterStatus].filter(Boolean).length

  const filtered = MOCK_REVIEW.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.farmer.toLowerCase().includes(q) || r.community.toLowerCase().includes(q) || r.cohort.toLowerCase().includes(q)
    const matchType = !filterType || r.type === filterType
    const matchPriority = !filterPriority || r.priority === filterPriority
    const matchStatus = !filterStatus || r.status === filterStatus
    return matchSearch && matchType && matchPriority && matchStatus
  })

  const displayed = pageSize > 0 ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered

  function priorityBadge(p: string) {
    if (p === 'High')   return 'bg-red-100 text-red-700'
    if (p === 'Medium') return 'bg-amber-100 text-amber-700'
    return 'bg-gray-100 text-gray-600'
  }

  function statusBadge(s: string) {
    if (s === 'In Review') return 'bg-blue-100 text-blue-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  const REVIEW_COLUMNS: DatagridColumn<ReviewRecord>[] = [
    { key: 'farmer', label: 'Farmer Name', render: v => <span className="font-medium text-gray-900 whitespace-nowrap">{String(v)}</span> },
    { key: 'community', label: 'Community', render: v => <span className="text-gray-500 whitespace-nowrap">{String(v)}</span> },
    { key: 'cohort', label: 'Cohort', render: v => <span className="text-gray-500 whitespace-nowrap">{String(v)}</span> },
    { key: 'submittedDate', label: 'Submitted', render: v => <span className="text-gray-500 whitespace-nowrap tabular-nums">{String(v)}</span> },
    {
      key: 'type', label: 'Type',
      render: v => <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', v === 'Resubmission' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600')}>{String(v)}</span>,
    },
    {
      key: 'priority', label: 'Priority',
      render: v => <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', priorityBadge(String(v)))}>{String(v)}</span>,
    },
    {
      key: 'status', label: 'Status',
      render: v => <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusBadge(String(v)))}>{String(v)}</span>,
    },
    {
      key: 'reviewedBy', label: 'Reviewer',
      render: v => <span className="text-gray-500 whitespace-nowrap text-xs">{v === '—' ? <span className="text-gray-300">—</span> : String(v)}</span>,
    },
    {
      key: 'id', id: 'actions', label: '',
      render: (_, r) => (
        <div className="flex items-center gap-1">
          <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Review" leftIcon={<Eye className="w-3.5 h-3.5" />} onClick={() => {}} />
          {r.reviewedBy === '—' ? (
            <ButtonTemplate variant="outline" size="sm" tooltip="Assign to yourself" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => {}} className="text-xs px-2 h-7" />
          ) : (
            <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Reassign" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => {}} />
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Clock className="w-5 h-5" />} label="Pending" value={MOCK_REVIEW.filter(r => r.status === 'Pending').length} sub="Awaiting reviewer assignment" iconBg="#fef3c7" iconColor="#d97706" />
        <StatCard icon={<Eye className="w-5 h-5" />} label="In Review" value={MOCK_REVIEW.filter(r => r.status === 'In Review').length} sub="Currently being reviewed" iconBg="#dbeafe" iconColor="#2563eb" />
        <StatCard icon={<AlertCircle className="w-5 h-5" />} label="High Priority" value={MOCK_REVIEW.filter(r => r.priority === 'High').length} sub="Require urgent attention" iconBg="#fee2e2" iconColor="#dc2626" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Review Queue</h3>

        <div className="flex items-center gap-2 mb-3">
          <SearchBar value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search farmer, community, or cohort…" />
          <FilterToggle open={filtersOpen} count={activeFilterCount} onClick={() => setFiltersOpen(v => !v)} />
        </div>

        {filtersOpen && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 mb-4 border-t border-gray-100">
            <FilterSelect label="Type" value={filterType} onChange={v => { setFilterType(v); setPage(1) }} options={[{ value: '', label: 'All Types' }, { value: 'Initial', label: 'Initial' }, { value: 'Resubmission', label: 'Resubmission' }]} />
            <FilterSelect label="Priority" value={filterPriority} onChange={v => { setFilterPriority(v); setPage(1) }} options={[{ value: '', label: 'All Priorities' }, { value: 'High', label: 'High' }, { value: 'Medium', label: 'Medium' }, { value: 'Low', label: 'Low' }]} />
            <FilterSelect label="Status" value={filterStatus} onChange={v => { setFilterStatus(v); setPage(1) }} options={[{ value: '', label: 'All Statuses' }, { value: 'Pending', label: 'Pending' }, { value: 'In Review', label: 'In Review' }]} />
          </div>
        )}

        {displayed.length === 0 ? (
          <EmptyState icon={<Clock className="w-6 h-6" />} message="No records match the current filters." />
        ) : (
          <DatagridTemplate<ReviewRecord>
            columns={REVIEW_COLUMNS}
            data={displayed}
            rowKey="id"
            defaultPageSize={0}
            pageSizeOptions={[0]}
          />
        )}

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

// ─── Tab: Revisit Required ────────────────────────────────────────────────────

function RevisitRequiredTab() {
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterReason, setFilterReason] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const activeFilterCount = [filterReason, filterPriority].filter(Boolean).length

  const filtered = MOCK_REVISIT.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.farmer.toLowerCase().includes(q) || r.community.toLowerCase().includes(q) || r.cohort.toLowerCase().includes(q)
    const matchReason = !filterReason || r.reason === filterReason
    const matchPriority = !filterPriority || r.priority === filterPriority
    return matchSearch && matchReason && matchPriority
  })

  const displayed = pageSize > 0 ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered

  function reasonBadge(reason: string) {
    const map: Record<string, string> = {
      'Missing Data':      'bg-red-100 text-red-700',
      'Photo Quality':     'bg-amber-100 text-amber-700',
      'Inconsistent Info': 'bg-orange-100 text-orange-700',
      'Incomplete Form':   'bg-yellow-100 text-yellow-700',
    }
    return map[reason] || 'bg-gray-100 text-gray-600'
  }

  function daysLeftColor(d: number) {
    if (d <= 3) return 'text-red-600 font-semibold'
    if (d <= 7) return 'text-amber-600 font-medium'
    return 'text-gray-600'
  }

  const REVISIT_COLUMNS: DatagridColumn<RevisitRecord>[] = [
    { key: 'farmer', label: 'Farmer', render: v => <span className="font-medium text-gray-900 whitespace-nowrap">{String(v)}</span> },
    { key: 'community', label: 'Community', render: v => <span className="text-gray-500 whitespace-nowrap">{String(v)}</span> },
    { key: 'cohort', label: 'Cohort', render: v => <span className="text-gray-500 whitespace-nowrap">{String(v)}</span> },
    {
      key: 'reason', label: 'Reason',
      render: v => <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', reasonBadge(String(v)))}>{String(v)}</span>,
    },
    { key: 'assignedTo', label: 'Assigned To', render: v => <span className="text-gray-500 whitespace-nowrap text-xs">{String(v)}</span> },
    { key: 'dueDate', label: 'Due Date', render: v => <span className="text-gray-500 whitespace-nowrap tabular-nums">{String(v)}</span> },
    {
      key: 'daysLeft', label: 'Days Left',
      render: v => <span className={cn('text-sm tabular-nums', daysLeftColor(Number(v)))}>{String(v)}d</span>,
    },
    {
      key: 'id', id: 'actions', label: '',
      render: () => (
        <div className="flex items-center gap-1">
          <ButtonTemplate variant="outline" size="sm" isIcon tooltip="View" leftIcon={<Eye className="w-3.5 h-3.5" />} onClick={() => {}} />
          <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Send Reminder" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => {}} />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Revisit Required</h3>

        <div className="flex items-center gap-2 mb-3">
          <SearchBar value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search farmer, community, or cohort…" />
          <FilterToggle open={filtersOpen} count={activeFilterCount} onClick={() => setFiltersOpen(v => !v)} />
        </div>

        {filtersOpen && (
          <div className="grid grid-cols-2 gap-3 pt-1 mb-4 border-t border-gray-100">
            <FilterSelect
              label="Reason"
              value={filterReason}
              onChange={v => { setFilterReason(v); setPage(1) }}
              options={[
                { value: '', label: 'All Reasons' },
                { value: 'Missing Data', label: 'Missing Data' },
                { value: 'Photo Quality', label: 'Photo Quality' },
                { value: 'Inconsistent Info', label: 'Inconsistent Info' },
                { value: 'Incomplete Form', label: 'Incomplete Form' },
              ]}
            />
            <FilterSelect
              label="Priority"
              value={filterPriority}
              onChange={v => { setFilterPriority(v); setPage(1) }}
              options={[
                { value: '', label: 'All Priorities' },
                { value: 'High', label: 'High' },
                { value: 'Medium', label: 'Medium' },
              ]}
            />
          </div>
        )}

        {displayed.length === 0 ? (
          <EmptyState icon={<AlertCircle className="w-6 h-6" />} message="No revisit items match the current filters." />
        ) : (
          <DatagridTemplate<RevisitRecord>
            columns={REVISIT_COLUMNS}
            data={displayed}
            rowKey="id"
            defaultPageSize={0}
            pageSizeOptions={[0]}
          />
        )}

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

// ─── Tab: Resolved Disputes ───────────────────────────────────────────────────

function ResolvedDisputesTab() {
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterResolution, setFilterResolution] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const activeFilterCount = [filterResolution].filter(Boolean).length

  const filtered = MOCK_DISPUTES.filter(d => {
    const q = search.toLowerCase()
    const matchSearch = !q || d.farmer.toLowerCase().includes(q) || d.community.toLowerCase().includes(q) || d.cohort.toLowerCase().includes(q)
    const matchResolution = !filterResolution || d.resolution === filterResolution
    return matchSearch && matchResolution
  })

  const displayed = pageSize > 0 ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered

  function resolutionBadge(r: string) {
    if (r === 'Approved')  return 'bg-green-100 text-green-700'
    if (r === 'Rejected')  return 'bg-red-100 text-red-700'
    return 'bg-amber-100 text-amber-700'
  }

  const DISPUTE_COLUMNS: DatagridColumn<DisputeRecord>[] = [
    { key: 'farmer', label: 'Farmer', render: v => <span className="font-medium text-gray-900 whitespace-nowrap">{String(v)}</span> },
    { key: 'community', label: 'Community', render: v => <span className="text-gray-500 whitespace-nowrap">{String(v)}</span> },
    { key: 'cohort', label: 'Cohort', render: v => <span className="text-gray-500 whitespace-nowrap">{String(v)}</span> },
    {
      key: 'resolution', label: 'Resolution',
      render: v => <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', resolutionBadge(String(v)))}>{String(v)}</span>,
    },
    { key: 'resolvedBy', label: 'Resolved By', render: v => <span className="text-gray-500 whitespace-nowrap text-xs">{String(v)}</span> },
    { key: 'resolvedDate', label: 'Resolved Date', render: v => <span className="text-gray-500 whitespace-nowrap tabular-nums">{String(v)}</span> },
    {
      key: 'notes', label: 'Notes', width: '200px',
      render: v => {
        const notes = String(v)
        return <span className="text-gray-400 text-xs max-w-50 truncate block">{notes.slice(0, 40)}{notes.length > 40 ? '…' : ''}</span>
      },
    },
    {
      key: 'id', id: 'actions', label: '',
      render: () => <ButtonTemplate variant="outline" size="sm" isIcon tooltip="View Details" leftIcon={<Eye className="w-3.5 h-3.5" />} onClick={() => {}} />,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Resolved Disputes</h3>

        <div className="flex items-center gap-2 mb-3">
          <SearchBar value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search farmer, community, or cohort…" />
          <FilterToggle open={filtersOpen} count={activeFilterCount} onClick={() => setFiltersOpen(v => !v)} />
        </div>

        {filtersOpen && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 mb-4 border-t border-gray-100">
            <FilterSelect
              label="Resolution"
              value={filterResolution}
              onChange={v => { setFilterResolution(v); setPage(1) }}
              options={[
                { value: '', label: 'All Resolutions' },
                { value: 'Approved', label: 'Approved' },
                { value: 'Rejected', label: 'Rejected' },
                { value: 'Escalated', label: 'Escalated' },
              ]}
            />
          </div>
        )}

        {displayed.length === 0 ? (
          <EmptyState icon={<CheckCircle className="w-6 h-6" />} message="No resolved disputes match the current filters." />
        ) : (
          <DatagridTemplate<DisputeRecord>
            columns={DISPUTE_COLUMNS}
            data={displayed}
            rowKey="id"
            defaultPageSize={0}
            pageSizeOptions={[0]}
          />
        )}

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

// ─── Tab: Support Requests ────────────────────────────────────────────────────

function SupportRequestsTab() {
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const activeFilterCount = [filterType, filterStatus].filter(Boolean).length

  const filtered = MOCK_SUPPORT.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.farmer.toLowerCase().includes(q) || s.community.toLowerCase().includes(q) || s.subject.toLowerCase().includes(q)
    const matchType = !filterType || s.type === filterType
    const matchStatus = !filterStatus || s.status === filterStatus
    return matchSearch && matchType && matchStatus
  })

  const displayed = pageSize > 0 ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered

  function typeBadge(t: string) {
    if (t === 'Technical')  return 'bg-blue-100 text-blue-700'
    if (t === 'Data Query') return 'bg-purple-100 text-purple-700'
    return 'bg-gray-100 text-gray-600'
  }

  function statusBadge(s: string) {
    if (s === 'Open')        return 'bg-yellow-100 text-yellow-700'
    if (s === 'In Progress') return 'bg-blue-100 text-blue-700'
    return 'bg-green-100 text-green-700'
  }

  const SUPPORT_COLUMNS: DatagridColumn<SupportRequest>[] = [
    { key: 'farmer', label: 'Farmer', render: v => <span className="font-medium text-gray-900 whitespace-nowrap">{String(v)}</span> },
    { key: 'community', label: 'Community', render: v => <span className="text-gray-500 whitespace-nowrap">{String(v)}</span> },
    {
      key: 'type', label: 'Type',
      render: v => <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', typeBadge(String(v)))}>{String(v)}</span>,
    },
    { key: 'subject', label: 'Subject', width: '220px', render: v => <span className="text-gray-600 max-w-55 truncate text-xs block">{String(v)}</span> },
    { key: 'submittedDate', label: 'Submitted', render: v => <span className="text-gray-500 whitespace-nowrap tabular-nums">{String(v)}</span> },
    {
      key: 'status', label: 'Status',
      render: v => <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusBadge(String(v)))}>{String(v)}</span>,
    },
    {
      key: 'assignedTo', label: 'Assigned To',
      render: v => <span className="text-gray-500 whitespace-nowrap text-xs">{v === '—' ? <span className="text-gray-300">—</span> : String(v)}</span>,
    },
    {
      key: 'id', id: 'actions', label: '',
      render: () => (
        <div className="flex items-center gap-1">
          <ButtonTemplate variant="outline" size="sm" isIcon tooltip="View" leftIcon={<Eye className="w-3.5 h-3.5" />} onClick={() => {}} />
          <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Reply" leftIcon={<MessageSquare className="w-3.5 h-3.5" />} onClick={() => {}} />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Support Requests</h3>

        <div className="flex items-center gap-2 mb-3">
          <SearchBar value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search farmer, community, or subject…" />
          <FilterToggle open={filtersOpen} count={activeFilterCount} onClick={() => setFiltersOpen(v => !v)} />
        </div>

        {filtersOpen && (
          <div className="grid grid-cols-2 gap-3 pt-1 mb-4 border-t border-gray-100">
            <FilterSelect
              label="Type"
              value={filterType}
              onChange={v => { setFilterType(v); setPage(1) }}
              options={[
                { value: '', label: 'All Types' },
                { value: 'Technical', label: 'Technical' },
                { value: 'Data Query', label: 'Data Query' },
                { value: 'General', label: 'General' },
              ]}
            />
            <FilterSelect
              label="Status"
              value={filterStatus}
              onChange={v => { setFilterStatus(v); setPage(1) }}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Open', label: 'Open' },
                { value: 'In Progress', label: 'In Progress' },
                { value: 'Closed', label: 'Closed' },
              ]}
            />
          </div>
        )}

        {displayed.length === 0 ? (
          <EmptyState icon={<MessageSquare className="w-6 h-6" />} message="No support requests match the current filters." />
        ) : (
          <DatagridTemplate<SupportRequest>
            columns={SUPPORT_COLUMNS}
            data={displayed}
            rowKey="id"
            defaultPageSize={0}
            pageSizeOptions={[0]}
          />
        )}

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

// ─── Main Export ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'progress',  label: 'Verification Progress' },
  { id: 'queue',     label: 'Review Queue'           },
  { id: 'revisit',   label: 'Revisit Required'       },
  { id: 'resolved',  label: 'Resolved Disputes'      },
  { id: 'support',   label: 'Support Requests'       },
] as const

type TabId = typeof TABS[number]['id']

export function Main() {
  const [tab, setTab] = useState<TabId>('progress')

  return (
    <div className="p-6 space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldCheck className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
            <h1 className="text-xl font-bold text-gray-900">Verification &amp; Review</h1>
          </div>
          <p className="text-sm text-gray-500 ml-7">Manage verification workflows, disputes, and support requests</p>
        </div>
        {tab === 'support' && (
          <ButtonTemplate
            variant="primary"
            size="sm"
            leftIcon={<MessageSquare className="w-4 h-4" />}
            onClick={() => {}}
          >
            New Request
          </ButtonTemplate>
        )}
        {tab === 'queue' && (
          <ButtonTemplate
            variant="primary"
            size="sm"
            leftIcon={<CheckCircle className="w-4 h-4" />}
            onClick={() => {}}
          >
            Bulk Assign
          </ButtonTemplate>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              tab === t.id
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'progress' && <VerificationProgressTab />}
      {tab === 'queue'    && <ReviewQueueTab />}
      {tab === 'revisit'  && <RevisitRequiredTab />}
      {tab === 'resolved' && <ResolvedDisputesTab />}
      {tab === 'support'  && <SupportRequestsTab />}
    </div>
  )
}
