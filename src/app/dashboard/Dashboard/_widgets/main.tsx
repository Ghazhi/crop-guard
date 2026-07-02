'use client'

import { useState, useEffect } from 'react'
import { Users, ClipboardList, UserCheck, TrendingUp, Zap, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { CardTemplate } from '@/customComponents/CardTemplate'
import { getStats, getCropBreakdown, getZoneBreakdown } from '../_logics/functions'
import type { Stats, CropBreakdown, ZoneBreakdown } from '../_logics/interface'

const ZONE_COLORS: Record<string, string> = {
  'Resilience Leader':  '#7C3AED',
  'Resilience Builder': '#16a34a',
  'Resilience Learner': '#ca8a04',
  'Resilience Starter': '#dc2626',
}

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType; label: string; value: number | string; color: string; sub?: string
}) {
  return (
    <CardTemplate className="h-full">
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--brand-slate)' }}>{label}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </CardTemplate>
  )
}

function SkeletonCard() {
  return <div className="h-24 rounded-xl bg-gray-200 animate-pulse" />
}

export function Main() {
  const [stats,    setStats]    = useState<Stats | null>(null)
  const [cropData, setCropData] = useState<CropBreakdown[]>([])
  const [zoneData, setZoneData] = useState<ZoneBreakdown[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([getStats(), getCropBreakdown(), getZoneBreakdown()]).then(
      ([s, c, z]) => { setStats(s); setCropData(c); setZoneData(z); setLoading(false) }
    )
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--brand-slate)' }}>Program overview and key metrics</p>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
          </div>
        </>
      ) : stats && (
        <>
          {/* Primary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            <StatCard icon={Users}         label="Total Farmers"      value={stats.totalFarmers}      color="bg-(--brand-dark)"  />
            <StatCard icon={ClipboardList} label="Active Enrollments" value={stats.activeEnrollments} color="bg-(--brand-green)" />
            <StatCard icon={UserCheck}     label="Verified Farmers"   value={stats.verifiedFarmers}   color="bg-(--brand-mid)"   />
            <StatCard icon={TrendingUp}    label="Field Agents"       value={stats.totalAgents}       color="bg-(--brand-amber)" />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            <StatCard icon={TrendingUp} label="Average FRI Score"    value={stats.avgFRI !== null ? `${stats.avgFRI}/100` : '—'} color="bg-emerald-600" sub="across all scored farmers" />
            <StatCard icon={UserCheck}  label="Verification Rate"    value={`${stats.verificationRate}%`}                        color="bg-sky-600"     sub="of registered farmers" />
            <StatCard icon={Zap}        label="Opportunity Enrolled" value={stats.opportunityCount}                               color="bg-orange-500"  sub="active intervention enrollments" />

            {/* FRI Trajectory */}
            <CardTemplate>
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--brand-slate)' }}>FRI Trajectory</p>
              <div className="flex flex-col gap-1.5">
                {[
                  { label: 'Improving', count: stats.trajectoryUp,   icon: ArrowUp,   cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
                  { label: 'Stable',    count: stats.trajectoryFlat, icon: Minus,     cls: 'border-gray-200 bg-gray-50 text-gray-600' },
                  { label: 'Declining', count: stats.trajectoryDown, icon: ArrowDown, cls: 'border-red-200 bg-red-50 text-red-700' },
                ].map(({ label, count, icon: Icon, cls }) => (
                  <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${cls}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">{count}</span>
                    <span className="text-xs">{label}</span>
                  </div>
                ))}
              </div>
            </CardTemplate>
          </div>
        </>
      )}

      {/* Charts */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top Crops */}
          <CardTemplate>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--brand-forest)' }}>Top Crops</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={cropData} barSize={28}>
                <XAxis dataKey="crop" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={20} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} cursor={{ fill: 'var(--brand-mint)' }} />
                <Bar dataKey="count" fill="var(--brand-dark)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardTemplate>

          {/* FRI Zone Distribution */}
          <CardTemplate>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--brand-forest)' }}>FRI Zone Distribution</p>
            <div className="space-y-4">
              {zoneData.map(({ zone, count }) => {
                const total = zoneData.reduce((s, z) => s + z.count, 0)
                const pct   = total > 0 ? Math.round((count / total) * 100) : 0
                const color = ZONE_COLORS[zone] ?? '#6B7280'
                return (
                  <div key={zone} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-gray-700">{zone}</span>
                      <span className="text-gray-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardTemplate>

          {/* Empty slot */}
          <div />
        </div>
      )}
    </div>
  )
}
