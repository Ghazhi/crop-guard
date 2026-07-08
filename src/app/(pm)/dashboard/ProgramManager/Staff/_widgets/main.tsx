'use client'

import { UserCog, Users, MapPin, TrendingUp, Phone, Search, CheckCircle2, AlertCircle } from 'lucide-react'
import { useState } from 'react'

type AgentStatus = 'active' | 'absent' | 'on_leave'

interface Agent {
  id: string
  name: string
  initials: string
  zone: string
  assignedFarmers: number
  capacity: number
  lastActive: string
  avgFRI: number
  visitsThisWeek: number
  status: AgentStatus
}

const agents: Agent[] = [
  { id: '1', name: 'Amara Diallo',     initials: 'AD', zone: 'Kano North',    assignedFarmers: 138, capacity: 150, lastActive: '1h ago',  avgFRI: 72, visitsThisWeek: 9,  status: 'active'   },
  { id: '2', name: 'Chukwudi Osei',    initials: 'CO', zone: 'Kaduna East',   assignedFarmers: 121, capacity: 140, lastActive: '3h ago',  avgFRI: 68, visitsThisWeek: 7,  status: 'active'   },
  { id: '3', name: 'Fatima Al-Hassan', initials: 'FA', zone: 'Sokoto South',  assignedFarmers: 110, capacity: 130, lastActive: '2h ago',  avgFRI: 75, visitsThisWeek: 11, status: 'active'   },
  { id: '4', name: 'Ibrahim Musa',     initials: 'IM', zone: 'Katsina West',  assignedFarmers: 129, capacity: 150, lastActive: '45m ago', avgFRI: 81, visitsThisWeek: 12, status: 'active'   },
  { id: '5', name: 'Ngozi Eze',        initials: 'NE', zone: 'Niger Central', assignedFarmers: 145, capacity: 160, lastActive: '2h ago',  avgFRI: 70, visitsThisWeek: 8,  status: 'active'   },
  { id: '6', name: 'Suleiman Bello',   initials: 'SB', zone: 'Jigawa North',  assignedFarmers: 133, capacity: 150, lastActive: '5h ago',  avgFRI: 66, visitsThisWeek: 6,  status: 'active'   },
  { id: '7', name: 'Aisha Kwari',      initials: 'AK', zone: 'Zamfara East',  assignedFarmers: 118, capacity: 140, lastActive: '1h ago',  avgFRI: 78, visitsThisWeek: 10, status: 'active'   },
  { id: '8', name: 'Emeka Nwosu',      initials: 'EN', zone: 'Kebbi South',   assignedFarmers: 126, capacity: 150, lastActive: '4h ago',  avgFRI: 73, visitsThisWeek: 7,  status: 'active'   },
  { id: '9', name: 'Halima Yusuf',     initials: 'HY', zone: 'Borno West',    assignedFarmers: 98,  capacity: 140, lastActive: 'Yesterday', avgFRI: 60, visitsThisWeek: 3, status: 'absent'   },
  { id: '10', name: 'Tunde Adeyemi',   initials: 'TA', zone: 'Plateau North', assignedFarmers: 115, capacity: 150, lastActive: '3d ago',  avgFRI: 64, visitsThisWeek: 0,  status: 'on_leave' },
]

const statusConfig: Record<AgentStatus, { dotColor: string; label: string }> = {
  active:   { dotColor: 'bg-emerald-500', label: 'Active'    },
  absent:   { dotColor: 'bg-amber-400',   label: 'Absent'    },
  on_leave: { dotColor: 'bg-slate-400',   label: 'On Leave'  },
}

function friBadgeClass(score: number): string {
  if (score >= 75) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
  if (score >= 65) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
}

const totalAgents  = agents.length
const activeToday  = agents.filter(a => a.status === 'active').length
const avgCaseload  = Math.round(agents.reduce((s, a) => s + a.assignedFarmers, 0) / agents.length)

export function Main() {
  const [query, setQuery] = useState('')

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(query.toLowerCase()) ||
    a.zone.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <UserCog className="w-6 h-6 text-primary" />
            Field Staff
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor agent activity, caseloads, and field performance across all zones.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-primary" />}
          label="Total Agents"
          value={totalAgents}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          label="Active Today"
          value={activeToday}
          valueClass="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
          label="Avg Caseload"
          value={avgCaseload}
          suffix="farmers"
        />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or zone..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Agent grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <AlertCircle className="w-8 h-8" />
          <p className="text-sm">No agents match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- Sub-components ---------- */

function StatCard({
  icon,
  label,
  value,
  suffix,
  valueClass = 'text-foreground',
}: {
  icon: React.ReactNode
  label: string
  value: number
  suffix?: string
  valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
      <div className="p-2 rounded-lg bg-muted">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-semibold ${valueClass}`}>
          {value}
          {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
        </p>
      </div>
    </div>
  )
}

function AgentCard({ agent }: { agent: Agent }) {
  const { dotColor, label } = statusConfig[agent.status]
  const fillPct = Math.min(100, Math.round((agent.assignedFarmers / agent.capacity) * 100))

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      {/* Top row: avatar + name + zone */}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center select-none">
            {agent.initials}
          </div>
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${dotColor}`}
            title={label}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{agent.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{agent.zone}</span>
          </p>
          <span
            className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              agent.status === 'active'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : agent.status === 'absent'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> Farmers
          </span>
          <span>
            <span className="font-medium text-foreground">{agent.assignedFarmers}</span>
            {' / '}{agent.capacity}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              fillPct >= 90 ? 'bg-red-500' : fillPct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-right">{fillPct}% capacity</p>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{agent.visitsThisWeek} visits this week</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${friBadgeClass(agent.avgFRI)}`}>
          FRI {agent.avgFRI}
        </span>
      </div>

      {/* Last active */}
      <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span>Last active: <span className="text-foreground font-medium">{agent.lastActive}</span></span>
        <button
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label={`Contact ${agent.name}`}
        >
          <Phone className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
