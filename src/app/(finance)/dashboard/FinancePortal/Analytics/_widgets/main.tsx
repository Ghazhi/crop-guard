'use client'

import { SectionCard } from '../../_shared'
import { PROGRAM_BREAKDOWN, fmtGHS } from '../../_data'
import { DatagridTemplate } from '@/customComponents/DatagridTemplate'
import type { DatagridColumn } from '@/customComponents/DatagridTemplate'
import type { ProgramBreakdown } from '../../_data'

const PROGRAM_COLUMNS: DatagridColumn<ProgramBreakdown>[] = [
  { key: 'program', label: 'Program' },
  { key: 'loans', label: 'Loans', render: v => <span className="block text-right text-gray-600">{String(v)}</span> },
  { key: 'value', label: 'Value', render: v => <span className="block text-right text-gray-800 font-medium">{fmtGHS(Number(v))}</span> },
  { key: 'repaid', label: 'Repaid', render: v => <span className="block text-right text-green-700 font-medium">{fmtGHS(Number(v))}</span> },
  {
    key: 'npl', id: 'collectionRate', label: 'Collection Rate',
    render: (_, p) => {
      const rate = Math.round((p.repaid / p.value) * 100)
      return (
        <div className="flex items-center justify-end gap-2">
          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: rate >= 70 ? '#22c55e' : '#f59e0b' }} />
          </div>
          <span className={`text-xs font-semibold ${rate >= 70 ? 'text-green-700' : 'text-amber-700'}`}>{rate}%</span>
        </div>
      )
    },
  },
  {
    key: 'npl', label: 'NPL Rate',
    render: v => {
      const npl = Number(v)
      return <span className={`block text-right text-xs font-semibold ${npl <= 3 ? 'text-green-700' : npl <= 5 ? 'text-amber-700' : 'text-red-700'}`}>{npl}%</span>
    },
  },
  { key: 'zone', label: 'Zone', render: v => <span className="text-gray-500 text-xs">{String(v)}</span> },
]

export function Main() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#7c3a00' }}>Portfolio Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Agricultural DFI · Program-level performance and FRI band analysis</p>
      </div>

      <SectionCard title="Program Portfolio Breakdown">
        <div className="p-5">
          <DatagridTemplate<ProgramBreakdown>
            columns={PROGRAM_COLUMNS}
            data={PROGRAM_BREAKDOWN}
            rowKey="program"
            defaultPageSize={0}
            pageSizeOptions={[0]}
          />
          <div className="mt-3 flex items-center justify-between rounded-lg border-t-2 border-gray-200 bg-gray-50 px-5 py-3 text-sm font-semibold">
            <span className="text-gray-800">Total</span>
            <div className="flex items-center gap-8 text-gray-800">
              <span>{PROGRAM_BREAKDOWN.reduce((a, p) => a + p.loans, 0)} loans</span>
              <span>{fmtGHS(PROGRAM_BREAKDOWN.reduce((a, p) => a + p.value, 0))}</span>
              <span className="text-green-700">{fmtGHS(PROGRAM_BREAKDOWN.reduce((a, p) => a + p.repaid, 0))}</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="FRI Band Distribution Across Portfolio">
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { band: 'Excellent (80–100)', count: 58,  value: 104400, color: '#2C5F3F', bg: '#f0f9f3' },
            { band: 'Good (65–79)',       count: 112, value: 201600, color: '#3D7A56', bg: '#e8f5ee' },
            { band: 'Moderate (50–64)',   count: 79,  value: 110600, color: '#f59e0b', bg: '#fffbeb' },
            { band: 'At Risk (<50)',      count: 38,  value:  53200, color: '#ef4444', bg: '#fef2f2' },
          ].map(({ band, count, value, color, bg }) => (
            <div key={band} className="rounded-xl border p-4" style={{ borderColor: color + '40', backgroundColor: bg }}>
              <p className="text-xs font-semibold mb-2 leading-tight" style={{ color }}>{band}</p>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{fmtGHS(value)}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
