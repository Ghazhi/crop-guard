'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts'
import {
  BarChart2, Calendar, Sparkles, RefreshCcw, Download,
  ChevronDown, ChevronUp, Users, CheckCircle2, Layers,
  TrendingUp, AlertTriangle, Clock, CheckCircle,
} from 'lucide-react'
import { FARMERS_LIST } from '@/dataCenter/farmerManagement'
import { AGENTS, COHORTS } from '@/dataCenter/agents'
import { PM_PROGRAMS, isPmProgram } from '@/dataCenter/pmScope'
import { ScrollTabsTemplate } from '@/customComponents/ScrollTabsTemplate'

// ─── PM-scoped data ───────────────────────────────────────────────────────────

// Farmers enrolled in one of the PM's programs (reporting scope).
const PM_FARMERS = FARMERS_LIST.filter(f => isPmProgram(f.enrollment?.programId))

// Agents that serve cohorts belonging to PM programs (via cohort → program linkage).
const PM_AGENT_IDS = new Set(
  COHORTS.filter(c => isPmProgram(c.programId)).flatMap(c => c.agents.map(a => a.agentId)),
)
const PM_AGENTS = PM_AGENT_IDS.size > 0 ? AGENTS.filter(a => PM_AGENT_IDS.has(a.id)) : AGENTS
const PM_AGENT_NAMES = new Set(PM_AGENTS.map(a => a.name))

// ─── derived data (recomputed from PM scope) ──────────────────────────────────

const totalFarmers     = PM_FARMERS.length
const verifiedFarmers  = PM_FARMERS.filter(f => f.currentFri !== null).length
const verifiedPct      = totalFarmers ? Math.round((verifiedFarmers / totalFarmers) * 100) : 0
const activeEnroll     = PM_FARMERS.filter(f => f.enrollment?.status === 'active').length
const friScores        = PM_FARMERS.map(f => f.currentFri).filter((s): s is number => s !== null)
const avgFri           = friScores.length ? Math.round(friScores.reduce((a, b) => a + b, 0) / friScores.length) : 0
const openRiskFlags    = 0

const ENROLL_DATA = PM_PROGRAMS.map(p => ({ name: p.name, enrolled: p.enrolledCount }))

const ZONE_COLORS: Record<string, string> = {
  'Resilience Leader':  '#1A3D2B',
  'Resilience Builder': '#3D7A56',
  'Resilience Learner': '#E8963A',
  'Resilience Starter': '#D94F3D',
}
// Zone breakdown recomputed from PM-scoped farmers.
const ZONE_BREAKDOWN = ['Resilience Builder', 'Resilience Leader', 'Resilience Learner', 'Resilience Starter']
  .map(zone => ({ zone, count: PM_FARMERS.filter(f => f.currentZone === zone).length }))
const ZONE_DATA = ZONE_BREAKDOWN.map(z => ({ name: z.zone, value: z.count, color: ZONE_COLORS[z.zone] ?? '#9ca3af' }))

const TREND_DATA = [
  { week: 'Wk 0', avgFri: avgFri },
]

const LEADERBOARD_DATA = PM_AGENTS.map(a => ({
  name: a.name.split(' ')[0],
  checkins: a.checkinCount,
  farmers: a.farmerCount,
}))

// ─── weekly report mock data (scoped to PM agents) ────────────────────────────

const WEEKLY_REPORTS = [
  {
    week: 25, label: 'Week 25', range: '17 Jun – 23 Jun',
    checkins: 1, verifiedPct: 0, farmers: 1,
    agents: [{ name: 'Kwame Asante', initial: 'K', checkins: 1, verified: 0 }],
  },
  {
    week: 24, label: 'Week 24', range: '10 Jun – 16 Jun',
    checkins: 1, verifiedPct: 100, farmers: 1,
    agents: [{ name: 'Kwame Asante', initial: 'K', checkins: 1, verified: 1 }],
  },
  {
    week: 1, label: 'Week 1', range: '1 Jan – 7 Jan',
    checkins: 1, verifiedPct: 0, farmers: 1,
    agents: [{ name: 'Kwame Asante', initial: 'K', checkins: 1, verified: 0 }],
  },
].map(w => ({ ...w, agents: w.agents.filter(a => PM_AGENT_NAMES.has(a.name)) }))

// Check-ins in the last 7 days, derived from the latest PM weekly report.
const checkinsLast7 = WEEKLY_REPORTS[0]?.checkins ?? 0

// ─── report generator ─────────────────────────────────────────────────────────

const REPORT_TYPES = [
  { id: 'portfolio',    icon: BarChart2,    title: 'Portfolio Summary',     desc: 'Full overview of farmers, enrollments, FRI scores, and zone distribution.' },
  { id: 'agent',        icon: Users,        title: 'Agent Performance',     desc: 'Agent-level check-in rates, farmer counts, and verification activity.' },
  { id: 'intervention', icon: Layers,       title: 'Intervention Uptake',   desc: 'Enrollment vs. eligible farmers per intervention, approval rates.' },
  { id: 'risk',         icon: AlertTriangle,title: 'Risk Analysis',         desc: 'Open risk flags by type and severity, high-risk farmer breakdown.' },
  { id: 'checkin',      icon: CheckCircle2, title: 'Check-in Compliance',   desc: 'Weekly check-in completion rates across agents and farmers.' },
  { id: 'fri-trends',   icon: TrendingUp,   title: 'FRI Score Trends',      desc: 'FRI score movement over weeks, pillar breakdowns, and zone changes.' },
]

function generateReport(typeId: string, programFilter: string): { profile: string; recommendation: string } | null {
  const prog = programFilter === 'all' ? 'All Programs' : PM_PROGRAMS.find(p => p.id === programFilter)?.name ?? 'All Programs'
  switch (typeId) {
    case 'portfolio':
      return {
        profile:        `${totalFarmers} farmers registered across ${PM_PROGRAMS.length} active programs. ${verifiedFarmers} farmers have completed FRI assessments (${verifiedPct}% verification rate). Average FRI score is ${avgFri}. Zone breakdown: ${ZONE_BREAKDOWN.map(z => `${z.count} ${z.zone}`).join(', ')}.`,
        recommendation: `Prioritise verification for the ${totalFarmers - verifiedFarmers} unverified farmer${totalFarmers - verifiedFarmers !== 1 ? 's' : ''}. Focus agent effort on improving FRI scores in the Resilience Starter zone.`,
      }
    case 'agent': {
      const zeroCheckin = PM_AGENTS.filter(a => a.checkinCount === 0)
      return {
        profile:        `${PM_AGENTS.length} agents active across ${[...new Set(PM_AGENTS.flatMap(a => a.regions))].length} regions. ${PM_AGENTS.map(a => `${a.name}: ${a.checkinCount} check-ins, ${a.farmerCount} farmers`).join('. ')}. Overall check-in rate is below target.`,
        recommendation: zeroCheckin.length > 0
          ? `${zeroCheckin.map(a => a.name).join(', ')} ${zeroCheckin.length === 1 ? 'has' : 'have'} 0 check-ins recorded. Follow up to confirm check-in data is being submitted. Set a weekly check-in target of at least 2 per assigned farmer.`
          : `Set a weekly check-in target of at least 2 per assigned farmer and monitor submission consistency across agents.`,
      }
    }
    case 'intervention':
      return {
        profile:        `4 interventions active across ${PM_PROGRAMS.length} programs in ${prog}. ${activeEnroll} farmers currently enrolled. Intervention uptake rate is below programme capacity — most opportunities have significant remaining slots.`,
        recommendation: `Review eligibility criteria for Input Loan interventions. Agents should actively screen all enrolled farmers for qualifying FRI thresholds to increase uptake.`,
      }
    case 'risk':
      return {
        profile:        `${openRiskFlags} farmers are in high or critical FRI zones. 1 help request was flagged by farmers during check-ins. ${PM_FARMERS.filter(f => f.currentFri !== null && f.currentFri < 50).length} farmers are in the medium risk zone and require monitoring.`,
        recommendation: `Follow up on 1 outstanding help request from farmers. Check-in verification rate is below 70% — agents should increase timely responses.`,
      }
    case 'checkin':
      return {
        profile:        `${checkinsLast7} check-in recorded in the last 7 days across all agents. Overall compliance rate is low relative to enrolled farmer count. Week 24 had the highest verified check-in rate at 100%.`,
        recommendation: `Set minimum weekly check-in targets per agent. Introduce automated reminders for agents with zero check-ins over a 7-day window.`,
      }
    case 'fri-trends':
      return {
        profile:        `Average FRI score across assessed farmers is ${avgFri}. ${ZONE_BREAKDOWN.find(z => z.zone === 'Resilience Leader')?.count ?? 0} farmer(s) have reached the Resilience Leader zone. ${ZONE_BREAKDOWN.find(z => z.zone === 'Resilience Starter')?.count ?? 0} farmer(s) remain in Resilience Starter and require immediate support.`,
        recommendation: `Focus pillar-specific coaching on Farm Management (P1) and Climate Resilience (P2) where scores are lowest. Schedule quarterly FRI re-assessments to track movement.`,
      }
    default:
      return null
  }
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub }: {
  icon: React.ElementType; iconBg: string; iconColor: string
  label: string; value: string | number; sub?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && <div className="mt-1">{sub}</div>}
      </div>
    </div>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────

export function Main() {
  const [tab, setTab]                   = useState<'overview' | 'weekly' | 'generator'>('overview')
  const [programFilter, setProgramFilter] = useState('all')
  const [expandedWeek, setExpandedWeek] = useState<number | null>(25)
  const [selectedReport, setSelectedReport] = useState('risk')
  const [generatedReport, setGeneratedReport] = useState<{ title: string; profile: string; recommendation: string } | null>(() => {
    const r = generateReport('risk', 'all')
    return r ? { title: 'Risk Analysis — All Programs', ...r } : null
  })

  const TABS = [
    { id: 'overview',   label: 'Platform Overview',    Icon: BarChart2   },
    { id: 'weekly',     label: 'Weekly Agent Reports',  Icon: Calendar    },
    { id: 'generator',  label: 'Report Generator',      Icon: Sparkles    },
  ] as const

  function handleGenerate() {
    const type = REPORT_TYPES.find(t => t.id === selectedReport)
    const r = generateReport(selectedReport, programFilter)
    if (!r || !type) return
    const prog = programFilter === 'all' ? 'All Programs' : PM_PROGRAMS.find(p => p.id === programFilter)?.name ?? 'All Programs'
    setGeneratedReport({ title: `${type.title} — ${prog}`, ...r })
  }

  return (
    <div className="p-6 max-w-300 mx-auto">

      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--brand-green)' }}>
            Platform analytics, weekly agent summaries, and AI-generated reports
          </p>
        </div>
        {tab === 'overview' && (
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <select
              value={programFilter}
              onChange={e => setProgramFilter(e.target.value)}
              className="h-8 px-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none w-full sm:w-auto min-w-0"
            >
              <option value="all">All programs</option>
              {PM_PROGRAMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors shrink-0">
              <RefreshCcw className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <button
              className="flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* tabs */}
      <ScrollTabsTemplate className="gap-1 bg-gray-100 rounded-xl p-1 max-w-fit mb-6" fadeColor="white">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0 whitespace-nowrap ${
              tab === id
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </ScrollTabsTemplate>

      {/* ── Platform Overview ── */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-5">
          {/* stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={Users}       iconBg="bg-[#E6F4EC]" iconColor="text-[#1A3D2B]" label="Registered Farmers"  value={totalFarmers} />
            <StatCard icon={CheckCircle2} iconBg="bg-green-50"  iconColor="text-green-600"  label="Verified Farmers"   value={verifiedFarmers}
              sub={<span className="text-xs font-medium" style={{ color: 'var(--brand-green)' }}>{verifiedPct}% of total</span>} />
            <StatCard icon={Layers}      iconBg="bg-[#E6F4EC]" iconColor="text-[#2C5F3F]"  label="Active Enrollments"  value={activeEnroll} />
            <StatCard icon={TrendingUp}  iconBg="bg-blue-50"   iconColor="text-blue-500"    label="Avg FRI Score"       value={avgFri} />
            <StatCard icon={AlertTriangle} iconBg="bg-amber-50" iconColor="text-amber-500"  label="Open Risk Flags"    value={openRiskFlags} />
            <StatCard icon={Clock}       iconBg="bg-[#E6F4EC]" iconColor="text-[#2C5F3F]"  label="Check-ins (7 days)"  value={checkinsLast7} />
          </div>

          {/* charts row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* enrollment by program */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">Enrollment by Program</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={ENROLL_DATA} layout="vertical" margin={{ left: 20, right: 16, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={130} />
                  <Tooltip formatter={(v) => [v, 'Enrolled']} cursor={{ fill: '#f3f4f6' }} />
                  <Bar dataKey="enrolled" fill="var(--brand-dark)" radius={[0, 4, 4, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* FRI zone distribution */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">FRI Zone Distribution</p>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie data={ZONE_DATA} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" strokeWidth={2}>
                      {ZONE_DATA.map((z, i) => <Cell key={i} fill={z.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2.5">
                  {ZONE_DATA.map((z, i) => (
                    <div key={i} className="flex items-center justify-between gap-8">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: z.color }} />
                        <span className="text-xs text-gray-600">{z.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-900">{z.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* charts row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* weekly FRI trend */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">Weekly Average FRI Score Trend</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={TREND_DATA} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgFri" stroke="var(--brand-green)" strokeWidth={2} dot={{ fill: 'var(--brand-green)', r: 4 }} name="Avg FRI Score" />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-center mt-1" style={{ color: 'var(--brand-green)' }}>→ Avg FRI Score</p>
            </div>

            {/* agent leaderboard */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">Agent Leaderboard (30 days)</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={LEADERBOARD_DATA} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                  <Bar dataKey="checkins" name="Check-ins" fill="#3D7A56" radius={[3, 3, 0, 0]} barSize={18} />
                  <Bar dataKey="farmers"  name="Farmers"   fill="#B3DCBF" radius={[3, 3, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* open risk flags */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">Open Risk Flags</p>
            {openRiskFlags === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle className="w-8 h-8" style={{ color: 'var(--brand-green)' }} />
                <p className="text-sm text-gray-500">No open risk flags</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">{openRiskFlags} flag(s) require attention.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Weekly Agent Reports ── */}
      {tab === 'weekly' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--brand-green)' }}>
              Auto-generated weekly summaries from agent check-in activity.
            </p>
            <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
              <RefreshCcw className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {WEEKLY_REPORTS.map(w => {
              const open = expandedWeek === w.week
              return (
                <div key={w.week} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedWeek(open ? null : w.week)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand-mint)' }}>
                      <Calendar className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-gray-900">{w.label}</p>
                      <p className="text-xs text-gray-400">{w.range}</p>
                    </div>
                    <div className="flex items-center gap-8 mr-4">
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-900">{w.checkins}</p>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Check-ins</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold" style={{ color: 'var(--brand-green)' }}>{w.verifiedPct}%</p>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Verified</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-900">{w.farmers}</p>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Farmers</p>
                      </div>
                    </div>
                    {open
                      ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                  </button>

                  {open && w.agents.length > 0 && (
                    <div className="border-t border-gray-100 px-5 py-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Agent Activity</p>
                      <div className="flex flex-col gap-2">
                        {w.agents.map((a, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                              style={{ background: 'var(--brand-forest)' }}
                            >
                              {a.initial}
                            </div>
                            <span className="text-sm font-medium text-gray-900 flex-1">{a.name}</span>
                            <span className="text-sm text-gray-500">{a.checkins} check-in{a.checkins !== 1 ? 's' : ''}</span>
                            <span
                              className="text-sm font-medium"
                              style={{ color: a.verified > 0 ? 'var(--brand-green)' : '#9ca3af' }}
                            >
                              {a.verified} verified
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Report Generator ── */}
      {tab === 'generator' && (
        <div className="flex flex-col gap-5">
          {/* Norvi banner */}
          <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: 'var(--brand-forest)' }}>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Norvi AI Report Generator</p>
              <p className="text-xs text-white/70 mt-0.5">
                Pick a report template, click generate — Norvi reads live platform data and writes a structured report instantly.
              </p>
            </div>
          </div>

          {/* report type selector */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Select Report Type</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {REPORT_TYPES.map(rt => {
                const selected = selectedReport === rt.id
                return (
                  <button
                    key={rt.id}
                    onClick={() => setSelectedReport(rt.id)}
                    className="text-left p-4 rounded-xl border transition-all"
                    style={selected ? { borderColor: 'var(--brand-forest)', background: 'var(--brand-mint)' } : { borderColor: '#e5e7eb', background: 'white' }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                      style={{ background: selected ? 'var(--brand-forest)' : '#f3f4f6' }}>
                      <rt.icon className="w-4 h-4" style={{ color: selected ? 'white' : '#6b7280' }} />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{rt.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{rt.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* generate controls */}
          <div className="flex items-center gap-3">
            <select
              value={programFilter}
              onChange={e => setProgramFilter(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none"
            >
              <option value="all">All programs</option>
              {PM_PROGRAMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 h-9 px-4 text-sm font-semibold text-white rounded-lg transition-colors hover:opacity-90"
              style={{ background: 'var(--brand-forest)' }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate with Norvi AI
            </button>
          </div>

          {/* generated output */}
          {generatedReport && (
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <div className="px-5 py-4 flex items-start justify-between" style={{ background: 'var(--brand-forest)' }}>
                <div>
                  <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Norvi AI Report</p>
                  <p className="text-base font-bold text-white mt-0.5">{generatedReport.title}</p>
                  <p className="text-xs text-white/60 mt-0.5">Generated 26 June 2026</p>
                </div>
                <button className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Download className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <div className="bg-white p-5 flex flex-col gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--brand-forest)' }}>Risk Profile</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{generatedReport.profile}</p>
                </div>
                <div className="rounded-lg p-4" style={{ background: 'var(--brand-mint)' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--brand-forest)' }}>Recommendations</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--brand-dark)' }}>{generatedReport.recommendation}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
