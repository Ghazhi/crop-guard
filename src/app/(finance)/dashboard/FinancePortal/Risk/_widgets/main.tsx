'use client'

import { SectionCard } from '../../_shared'
import { PersonAvatar } from '@/customComponents/PersonAvatar'
import { RISK_ENTRIES, fmtGHS, riskBandStyle, type RiskEntry } from '../../_data'
import { DatagridTemplate } from '@/customComponents/DatagridTemplate'
import type { DatagridColumn } from '@/customComponents/DatagridTemplate'

const RISK_COLUMNS: DatagridColumn<RiskEntry>[] = [
  {
    key: 'name', label: 'Farmer',
    render: (v, r) => (
      <div className="flex items-center gap-2.5">
        <PersonAvatar name={r.name} size={28} />
        <span className="font-medium text-gray-800">{String(v)}</span>
      </div>
    ),
  },
  { key: 'program', label: 'Program', render: v => <span className="text-gray-600 text-xs">{String(v)}</span> },
  { key: 'loanAmount', label: 'Loan', render: v => <span className="block text-right font-medium text-gray-800">{fmtGHS(Number(v))}</span> },
  {
    key: 'fri', label: 'FRI',
    render: (v, r) => (
      <span className={`block text-center text-xs font-bold px-2 py-0.5 rounded-full ${r.fri < 50 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{String(v)}</span>
    ),
  },
  {
    key: 'daysOverdue', label: 'Days Overdue',
    render: (v, r) => <span className={`block text-center text-xs font-bold ${r.daysOverdue > 30 ? 'text-red-700' : 'text-amber-700'}`}>{String(v)}d</span>,
  },
  {
    key: 'riskBand', label: 'Risk Band',
    render: v => <span className={`block text-center text-xs font-semibold px-2 py-0.5 rounded-full border ${riskBandStyle(v as RiskEntry['riskBand'])}`}>{String(v)}</span>,
  },
  { key: 'recommendation', label: 'Recommendation', render: v => <span className="text-xs text-gray-500">{String(v)}</span> },
]

export function Main() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#7c3a00' }}>Credit Risk</h1>
        <p className="text-sm text-gray-500 mt-0.5">Agricultural DFI · At-risk farmer register and exposure analysis</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(['High','Medium','Watch'] as RiskEntry['riskBand'][]).map(b => {
          const count = RISK_ENTRIES.filter(r => r.riskBand === b).length
          const value = RISK_ENTRIES.filter(r => r.riskBand === b).reduce((a, r) => a + r.loanAmount, 0)
          return (
            <div key={b} className={`rounded-xl border p-4 ${riskBandStyle(b)}`}>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{b} Risk</p>
              <p className="text-2xl font-bold mt-1">{count}</p>
              <p className="text-xs opacity-70 mt-0.5">{fmtGHS(value)} exposed</p>
            </div>
          )
        })}
      </div>

      <SectionCard title="At-Risk Farmer Register">
        <div className="p-5">
          <DatagridTemplate<RiskEntry>
            columns={RISK_COLUMNS}
            data={RISK_ENTRIES}
            rowKey="id"
            defaultPageSize={0}
            pageSizeOptions={[0]}
          />
        </div>
      </SectionCard>
    </div>
  )
}
