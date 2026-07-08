'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'

export function KpiCard({ label, value, sub, trend, accent }: {
  label: string; value: string; sub?: string; trend?: 'up' | 'down'; accent?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {accent && <div className="w-8 h-1 rounded-full mb-3" style={{ backgroundColor: accent }} />}
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {trend === 'up'   && <TrendingUp   className="w-4 h-4 text-green-500 mb-1" />}
        {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 mb-1"   />}
      </div>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export function SectionCard({ title, children, action }: {
  title: string; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}
