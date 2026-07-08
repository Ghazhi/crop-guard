'use client'

import { useState } from 'react'
import {
  Layers, Zap, TrendingUp, CreditCard, Users,
  CheckCircle2, AlertTriangle, GitBranch, Package,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
  Legend,
} from 'recharts'
import { BadgeTemplate }  from '@/customComponents/BadgeTemplate'
import { PROGRAMS }       from '@/dataCenter/programs'
import { INTERVENTIONS }  from '@/dataCenter/interventions'
import { FARMERS_LIST }   from '@/dataCenter/farmerManagement'
import type { Program }   from '@/app/(admin)/dashboard/ProgramsSetup/_logics/interface'
import type { Intervention } from '@/app/(admin)/dashboard/OpportunityPathways/_logics/interface'
import type { Farmer }    from '@/app/(admin)/dashboard/FarmersRegistry/_logics/interface'
import { usePartnerId }   from '../../_logics/usePartnerId'
import { StatCard }       from '../../_components/StatCard'
import { ChartCard }      from '../../_components/ChartCard'
import { pct, TOOLTIP_STYLE } from '../../_logics/chartUtils'
import { ZONES, ZONE_COLOR, ZONE_BG } from '../../_logics/zoneConstants'

// ── types ──────────────────────────────────────────────────────────────────────
type Tab = 'programs' | 'interventions' | 'fri' | 'repayment'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'programs',      label: 'Program Report',      icon: Layers     },
  { id: 'interventions', label: 'Intervention Report', icon: Zap        },
  { id: 'fri',           label: 'FRI Report',          icon: TrendingUp },
  { id: 'repayment',     label: 'Repayment Report',    icon: CreditCard },
]

// ── constants ──────────────────────────────────────────────────────────────────
const FOREST = 'var(--brand-forest)'
const GREEN  = '#16a34a'

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{children}</p>
}

// ── Program Report ─────────────────────────────────────────────────────────────
function ProgramReport({ programs }: { programs: Program[] }) {
  const totalEnrolled = programs.reduce((s, p) =>
    s + p.cohorts.reduce((cs, c) => cs + c.enrolledCount, p.enrolledCount), 0)
  const totalTarget   = programs.reduce((s, p) => s + p.targetCount, 0)
  const totalCohorts  = programs.reduce((s, p) => s + p.cohorts.length, 0)
  const activeCount   = programs.filter(p => p.status === 'Active').length

  // bar chart: enrolled vs target per program
  const enrollmentData = programs.map(p => ({
    name:     p.name.split(' ').slice(0, 2).join(' '),
    Enrolled: p.cohorts.reduce((s, c) => s + c.enrolledCount, p.enrolledCount),
    Target:   p.targetCount,
  }))

  // cohort count per program
  const cohortData = programs.map(p => ({
    name:    p.name.split(' ').slice(0, 2).join(' '),
    Cohorts: p.cohorts.length,
  }))

  // status pie
  const statusCounts = [
    { name: 'Active',    value: programs.filter(p => p.status === 'Active').length,    color: '#15803d' },
    { name: 'Completed', value: programs.filter(p => p.status === 'Completed').length, color: '#0369a1' },
    { name: 'Inactive',  value: programs.filter(p => p.status === 'Inactive').length,  color: '#9ca3af' },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Layers className="w-5 h-5" style={{ color: FOREST }} />}       label="Programs"     value={programs.length} />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" style={{ color: GREEN }} />}   label="Active"       value={activeCount}     accent="#f0fdf4" />
        <StatCard icon={<GitBranch className="w-5 h-5" style={{ color: FOREST }} />}    label="Cohorts"      value={totalCohorts} />
        <StatCard icon={<Users className="w-5 h-5" style={{ color: FOREST }} />}        label="Farmers"      value={totalEnrolled}   sub={`of ${totalTarget} target`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Enrolled vs Target */}
        <ChartCard title="Enrollment vs Target" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={enrollmentData} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#f9fafb' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Enrolled" fill={GREEN}   radius={[4, 4, 0, 0]} />
              <Bar dataKey="Target"   fill="#d1fae5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Status pie */}
        <ChartCard title="Status Breakdown">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                   dataKey="value" paddingAngle={3}>
                {statusCounts.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Cohorts per program */}
      <ChartCard title="Cohorts per Program">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={cohortData} layout="vertical" barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={120} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#f9fafb' }} />
            <Bar dataKey="Cohorts" fill={FOREST} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Program cards */}
      <div className="space-y-2">
        <SectionHeading>Program Detail</SectionHeading>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {programs.map(p => {
            const enrolled = p.cohorts.reduce((s, c) => s + c.enrolledCount, p.enrolledCount)
            const progress = pct(enrolled, p.targetCount)
            const statusVariant = p.status === 'Active' ? 'success' : p.status === 'Completed' ? 'info' : 'neutral'
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.season}</p>
                  </div>
                  <BadgeTemplate label={p.status} variant={statusVariant} size="sm" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.crops.map(c => (
                    <span key={c} className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">{c}</span>
                  ))}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Enrollment</span>
                    <span className="font-semibold text-gray-800">{enrolled} / {p.targetCount} ({progress}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: GREEN }} />
                  </div>
                </div>
                {p.cohorts.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Cohorts ({p.cohorts.length})</p>
                    {p.cohorts.map(c => (
                      <div key={c.id} className="flex items-center gap-2 text-xs text-gray-600">
                        <GitBranch className="w-3 h-3 text-gray-300 shrink-0" />
                        <span className="flex-1 truncate">{c.name}</span>
                        <span className="text-gray-400 tabular-nums">{c.enrolledCount}/{c.targetCount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Intervention Report ────────────────────────────────────────────────────────
function InterventionReport({ interventions, partnerId }: { interventions: Intervention[]; partnerId: string }) {
  const activeCount  = interventions.filter(iv => iv.status === 'Active').length
  const totalCohorts = interventions.reduce((s, iv) =>
    s + (iv.partnerAssignments?.find(a => a.partnerId === partnerId)?.cohorts.length ?? 0), 0)

  // type bar chart
  const typeMap: Record<string, number> = {}
  interventions.forEach(iv => { typeMap[iv.type] = (typeMap[iv.type] ?? 0) + 1 })
  const typeData = Object.entries(typeMap).map(([name, count]) => ({ name: name.replace(' ', '\n'), Count: count }))

  // status pie
  const statusData = [
    { name: 'Active',    value: interventions.filter(iv => iv.status === 'Active').length,    color: '#15803d' },
    { name: 'Suspended', value: interventions.filter(iv => iv.status === 'Suspended').length, color: '#b45309' },
    { name: 'Draft',     value: interventions.filter(iv => iv.status === 'Draft').length,     color: '#9ca3af' },
  ].filter(d => d.value > 0)

  // cohorts per intervention
  const cohortData = interventions.map(iv => ({
    name:    iv.name.split(' ').slice(0, 2).join(' '),
    Cohorts: iv.partnerAssignments?.find(a => a.partnerId === partnerId)?.cohorts.length ?? 0,
  }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Zap className="w-5 h-5" style={{ color: FOREST }} />}           label="Interventions" value={interventions.length} />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" style={{ color: GREEN }} />}    label="Active"        value={activeCount}          accent="#f0fdf4" />
        <StatCard icon={<GitBranch className="w-5 h-5" style={{ color: FOREST }} />}     label="Your Cohorts"  value={totalCohorts} />
        <StatCard icon={<Package className="w-5 h-5" style={{ color: FOREST }} />}       label="Types"         value={Object.keys(typeMap).length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Interventions by Type" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={typeData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="Count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                   dataKey="value" paddingAngle={3}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Assigned Cohorts per Intervention">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={cohortData} layout="vertical" barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={110} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#f9fafb' }} />
            <Bar dataKey="Cohorts" fill={FOREST} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

// ── FRI Report ─────────────────────────────────────────────────────────────────
function FriReport({ myFarmers }: { myFarmers: Farmer[] }) {
  const scored   = myFarmers.filter(f => f.currentFri !== null)
  const avgFri   = scored.length ? scored.reduce((s, f) => s + (f.currentFri ?? 0), 0) / scored.length : 0
  const leaders  = scored.filter(f => f.currentZone === 'Resilience Leader').length
  const atRisk   = scored.filter(f => (f.currentFri ?? 0) < 50).length

  // zone distribution pie
  const zoneData = ZONES.map(z => ({
    name:  z.replace('Resilience ', ''),
    value: myFarmers.filter(f => f.currentZone === z).length,
    color: ZONE_COLOR[z],
  })).filter(d => d.value > 0)

  // FRI score buckets — bar chart
  const buckets = [
    { range: '<40',   min: 0,  max: 40  },
    { range: '40-49', min: 40, max: 50  },
    { range: '50-59', min: 50, max: 60  },
    { range: '60-69', min: 60, max: 70  },
    { range: '70-79', min: 70, max: 80  },
    { range: '80+',   min: 80, max: 101 },
  ]
  const bucketData = buckets.map(b => ({
    range:   b.range,
    Farmers: scored.filter(f => (f.currentFri ?? 0) >= b.min && (f.currentFri ?? 0) < b.max).length,
  }))

  // per-cohort avg FRI line/bar
  const cohortMap = new Map<string, { name: string; scores: number[] }>()
  myFarmers.forEach(f => {
    if (!f.enrollment?.cohortId || f.currentFri === null) return
    const key = f.enrollment.cohortId
    if (!cohortMap.has(key)) cohortMap.set(key, { name: f.enrollment.cohortName ?? key, scores: [] })
    cohortMap.get(key)!.scores.push(f.currentFri!)
  })
  const cohortAvgData = [...cohortMap.values()].map(({ name, scores }) => ({
    name,
    'Avg FRI': parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)),
  }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<TrendingUp className="w-5 h-5" style={{ color: FOREST }} />}   label="Avg FRI"        value={scored.length ? avgFri.toFixed(1) : '—'} sub={`${scored.length} scored`} />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" style={{ color: GREEN }} />}   label="Leaders (≥75)"  value={leaders}   accent="#f0fdf4" />
        <StatCard icon={<Users className="w-5 h-5" style={{ color: FOREST }} />}        label="Total Farmers"  value={myFarmers.length} sub={`${myFarmers.length - scored.length} unscored`} />
        <StatCard icon={<AlertTriangle className="w-5 h-5" style={{ color: '#dc2626' }} />} label="At Risk (<50)" value={atRisk} accent="#fef2f2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* FRI bucket distribution */}
        <ChartCard title="FRI Score Distribution" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bucketData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="Farmers" radius={[4, 4, 0, 0]}>
                {bucketData.map((_, i) => {
                  const colors = ['#dc2626', '#ef4444', '#b45309', '#16a34a', '#15803d', '#166534']
                  return <Cell key={i} fill={colors[i] ?? GREEN} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Zone donut */}
        <ChartCard title="Zone Breakdown">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={zoneData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                   dataKey="value" paddingAngle={3}>
                {zoneData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name) => [v, name]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Avg FRI by cohort */}
      <ChartCard title="Average FRI Score by Cohort">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={cohortAvgData} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#f9fafb' }} />
            <Bar dataKey="Avg FRI" fill={GREEN} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Zone cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ZONES.map(zone => {
          const farmers = myFarmers.filter(f => f.currentZone === zone)
          return (
            <div key={zone} className="rounded-xl border p-4 space-y-2"
                 style={{ backgroundColor: ZONE_BG[zone], borderColor: ZONE_COLOR[zone] + '40' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold" style={{ color: ZONE_COLOR[zone] }}>{zone.replace('Resilience ', '')}</p>
                <span className="text-2xl font-bold" style={{ color: ZONE_COLOR[zone] }}>{farmers.length}</span>
              </div>
              {farmers.slice(0, 3).map(f => (
                <p key={f.id} className="text-xs text-gray-600 truncate">{f.fullName}</p>
              ))}
              {farmers.length > 3 && <p className="text-[10px] text-gray-400">+{farmers.length - 3} more</p>}
              {farmers.length === 0 && <p className="text-xs text-gray-400 italic">None</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Repayment Report ───────────────────────────────────────────────────────────
function RepaymentReport({ myFarmers }: { myFarmers: Farmer[] }) {
  const active  = myFarmers.filter(f => f.currentFri !== null && f.currentFri >= 50)
  const atRisk  = myFarmers.filter(f => f.currentFri !== null && f.currentFri < 50)
  const pending = myFarmers.filter(f => f.currentFri === null)

  // status pie
  const statusPie = [
    { name: 'Active',  value: active.length,  color: '#15803d' },
    { name: 'At Risk', value: atRisk.length,  color: '#dc2626' },
    { name: 'Pending', value: pending.length, color: '#b45309' },
  ].filter(d => d.value > 0)

  // stage bar
  const stageCounts: Record<number, number> = {}
  myFarmers.forEach(f => {
    if (!f.enrollment) return
    const s = f.enrollment.currentStage
    stageCounts[s] = (stageCounts[s] ?? 0) + 1
  })
  const stageData = Object.entries(stageCounts)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([stage, Farmers]) => ({ stage: `Stage ${stage}`, Farmers }))

  // per-program breakdown bar
  const progMap = new Map<string, { Active: number; 'At Risk': number; Pending: number }>()
  myFarmers.forEach(f => {
    const name = f.enrollment?.programName ?? 'Unknown'
    if (!progMap.has(name)) progMap.set(name, { Active: 0, 'At Risk': 0, Pending: 0 })
    const e = progMap.get(name)!
    if (f.currentFri === null) e.Pending++
    else if (f.currentFri < 50) e['At Risk']++
    else e.Active++
  })
  const progData = [...progMap.entries()].map(([name, vals]) => ({
    name: name.split(' ').slice(0, 2).join(' '),
    ...vals,
  }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Users className="w-5 h-5" style={{ color: FOREST }} />}          label="Enrolled" value={myFarmers.length} />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" style={{ color: GREEN }} />}     label="Active"   value={active.length}   accent="#f0fdf4"
          sub={`${myFarmers.length ? Math.round((active.length / myFarmers.length) * 100) : 0}%`} />
        <StatCard icon={<AlertTriangle className="w-5 h-5" style={{ color: '#dc2626' }} />} label="At Risk"  value={atRisk.length}   accent="#fef2f2" sub="FRI < 50" />
        <StatCard icon={<CreditCard className="w-5 h-5" style={{ color: '#b45309' }} />}   label="Pending"  value={pending.length}  accent="#fffbeb" sub="Not scored" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Per-program stacked bar */}
        <ChartCard title="Status by Program" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={progData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#f9fafb' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Active"  stackId="a" fill="#15803d" radius={[0, 0, 0, 0]} />
              <Bar dataKey="At Risk" stackId="a" fill="#dc2626" />
              <Bar dataKey="Pending" stackId="a" fill="#b45309" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Status donut */}
        <ChartCard title="Overall Status">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                   dataKey="value" paddingAngle={3}>
                {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Stage bar */}
      <ChartCard title="Farmer Stage Progression">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={stageData} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#f9fafb' }} />
            <Bar dataKey="Farmers" fill={FOREST} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* At-risk callout */}
      {atRisk.length > 0 && (
        <div className="bg-white rounded-xl border border-red-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-sm font-semibold text-red-600">
              {atRisk.length} farmer{atRisk.length !== 1 ? 's' : ''} with FRI below 50
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {atRisk.map(f => (
              <div key={f.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-red-50 border border-red-100">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{f.fullName}</p>
                  <p className="text-xs text-gray-400">{f.enrollment?.cohortName}</p>
                </div>
                <span className="text-sm font-bold text-red-600">{f.currentFri?.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function Main() {
  const [activeTab, setActiveTab] = useState<Tab>('programs')
  const partnerId                 = usePartnerId()

  const programs      = PROGRAMS.filter(p => p.partnerId === partnerId)
  const interventions = INTERVENTIONS.filter(iv =>
    iv.partnerAssignments?.some((pa: { partnerId: string; cohorts: { cohortId: string }[] }) => pa.partnerId === partnerId)
  )
  const allFarmers = FARMERS_LIST as Farmer[]

  const partnerCohortIds = new Set([
    ...interventions.flatMap(iv =>
      iv.partnerAssignments?.find((pa: { partnerId: string; cohorts: { cohortId: string }[] }) => pa.partnerId === partnerId)?.cohorts.map((c: { cohortId: string }) => c.cohortId) ?? []
    ),
    ...programs.flatMap(p => p.cohorts.map((c: { id: string }) => c.id)),
  ])

  const myFarmers = allFarmers.filter(f =>
    f.enrollment?.cohortId && partnerCohortIds.has(f.enrollment.cohortId)
  )

  return (
    <div className="min-h-screen bg-(--brand-gray) p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: FOREST }}>Reports</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--brand-dark)' }}>
          Live performance reports for your organisation
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-white border border-gray-200 w-fit">
        {TABS.map(t => {
          const Icon     = t.icon
          const isActive = activeTab === t.id
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={['flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all',
                isActive ? 'shadow-sm text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'].join(' ')}
              style={isActive ? { backgroundColor: FOREST } : {}}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'programs'      && <ProgramReport      programs={programs} />}
      {activeTab === 'interventions' && <InterventionReport interventions={interventions} partnerId={partnerId} />}
      {activeTab === 'fri'           && <FriReport          myFarmers={myFarmers} />}
      {activeTab === 'repayment'     && <RepaymentReport    myFarmers={myFarmers} />}
    </div>
  )
}
