'use client'

import { SectionCard } from '../../_shared'
import { PersonAvatar } from '@/customComponents/PersonAvatar'
import { RISK_ENTRIES, fmtGHS, riskBandStyle, type RiskEntry } from '../../_data'

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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="text-left px-5 py-3">Farmer</th>
                <th className="text-left px-4 py-3">Program</th>
                <th className="text-right px-4 py-3">Loan</th>
                <th className="text-center px-4 py-3">FRI</th>
                <th className="text-center px-4 py-3">Days Overdue</th>
                <th className="text-center px-4 py-3">Risk Band</th>
                <th className="text-left px-4 py-3">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {RISK_ENTRIES.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <PersonAvatar name={r.name} size={28} />
                      <span className="font-medium text-gray-800">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{r.program}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">{fmtGHS(r.loanAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.fri < 50 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{r.fri}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold ${r.daysOverdue > 30 ? 'text-red-700' : 'text-amber-700'}`}>{r.daysOverdue}d</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${riskBandStyle(r.riskBand)}`}>{r.riskBand}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
