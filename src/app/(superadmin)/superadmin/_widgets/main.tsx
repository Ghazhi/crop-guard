'use client'

import { LayoutDashboard, Building2, CheckCircle2, XCircle, Layers } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area, CartesianGrid,
} from 'recharts'
import { usePersistedState } from '@/lib/usePersistedState'
import { getTenants } from '../Tenants/_logics/functions'
import type { Tenant } from '../Tenants/_logics/interface'
import { AUDIT_LOG_KEY, SEED_AUDIT_LOG } from '../AuditLog/_logics/functions'
import type { AuditLogEntry } from '../AuditLog/_logics/interface'
import { useEffect, useState } from 'react'

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub }: {
  icon: React.ElementType; iconBg: string; iconColor: string
  label: string; value: string | number; sub?: React.ReactNode
}) {
  return (
    <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-5 flex flex-col gap-3">
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

const PLAN_COLORS: Record<string, string> = {
  Starter: '#9ca3af', Pro: '#3D7A56', Enterprise: '#1A3D2B',
}

const ACTION_LABEL: Record<AuditLogEntry['action'], string> = {
  created: 'created', updated: 'updated', suspended: 'suspended', reactivated: 'reactivated', deleted: 'deleted',
}

export function Main() {
  const [tenants, setTenants] = usePersistedState<Tenant[]>('sa-tenants', [])
  const [auditLog] = usePersistedState<AuditLogEntry[]>(AUDIT_LOG_KEY, SEED_AUDIT_LOG)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTenants().then(t => {
      setTenants(prev => prev.length > 0 ? prev : t)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const active = tenants.filter(t => t.status === 'active').length
  const suspended = tenants.filter(t => t.status === 'suspended').length
  const starter = tenants.filter(t => t.planTier === 'starter').length
  const pro = tenants.filter(t => t.planTier === 'pro').length
  const enterprise = tenants.filter(t => t.planTier === 'enterprise').length

  const PLAN_DATA = [
    { name: 'Starter', value: starter, color: PLAN_COLORS.Starter },
    { name: 'Pro', value: pro, color: PLAN_COLORS.Pro },
    { name: 'Enterprise', value: enterprise, color: PLAN_COLORS.Enterprise },
  ]

  const STATUS_DATA = [
    { name: 'Active', count: active },
    { name: 'Suspended', count: suspended },
  ]

  const growthByMonth = new Map<string, number>()
  tenants
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach(t => {
      const month = t.createdAt.slice(0, 7)
      growthByMonth.set(month, (growthByMonth.get(month) ?? 0) + 1)
    })
  let running = 0
  const GROWTH_DATA = Array.from(growthByMonth.entries()).map(([month, count]) => {
    running += count
    return { month, total: running }
  })

  const recentActivity = auditLog
    .slice()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 5)

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--surface-page)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#1f2937' }}>
          <LayoutDashboard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>Overview</h1>
          <p className="text-sm" style={{ color: 'var(--brand-slate)' }}>Platform-wide tenant statistics</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-12 text-center text-gray-400 text-sm">
          Loading…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Building2} iconBg="bg-[#E6F4EC]" iconColor="text-[#1A3D2B]" label="Total Tenants" value={tenants.length} />
            <StatCard icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" label="Active" value={active} />
            <StatCard icon={XCircle} iconBg="bg-red-50" iconColor="text-red-600" label="Suspended" value={suspended} />
            <StatCard
              icon={Layers} iconBg="bg-blue-50" iconColor="text-blue-600" label="Plan Tiers"
              value={tenants.length}
              sub={
                <p className="text-[11px] text-gray-400">
                  {starter} Starter · {pro} Pro · {enterprise} Enterprise
                </p>
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">Plan Tier Distribution</p>
              {tenants.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No tenants yet</p>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={130} height={130}>
                    <PieChart>
                      <Pie data={PLAN_DATA} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" strokeWidth={2}>
                        {PLAN_DATA.map((p, i) => <Cell key={i} fill={p.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2.5">
                    {PLAN_DATA.map((p, i) => (
                      <div key={i} className="flex items-center justify-between gap-8">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                          <span className="text-xs text-gray-600">{p.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-900">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">Tenant Status Breakdown</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={STATUS_DATA} layout="vertical" margin={{ left: 20, right: 16, top: 0, bottom: 0 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip formatter={(v) => [v, 'Tenants']} cursor={{ fill: '#f3f4f6' }} />
                  <Bar dataKey="count" fill="var(--brand-dark)" radius={[0, 4, 4, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">Tenant Growth Over Time</p>
              {GROWTH_DATA.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No tenant history yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={GROWTH_DATA} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="total" stroke="var(--brand-green)" fill="var(--brand-green)" fillOpacity={0.15} strokeWidth={2} name="Total tenants" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-5">
              <p className="text-sm font-semibold text-gray-900 mb-4">Recent Platform Activity</p>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No activity yet</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentActivity.map(entry => (
                    <div key={entry.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="text-gray-800 truncate">
                          <span className="font-medium">{entry.entityName}</span> was {ACTION_LABEL[entry.action]}
                        </p>
                        <p className="text-xs text-gray-400">{entry.actor} · {new Date(entry.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
