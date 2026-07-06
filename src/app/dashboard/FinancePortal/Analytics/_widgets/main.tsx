'use client'

import { SectionCard } from '../../_shared'
import { PROGRAM_BREAKDOWN, fmtGHS } from '../../_data'

export function Main() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#7c3a00' }}>Portfolio Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Agricultural DFI · Program-level performance and FRI band analysis</p>
      </div>

      <SectionCard title="Program Portfolio Breakdown">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="text-left px-5 py-3">Program</th>
                <th className="text-right px-4 py-3">Loans</th>
                <th className="text-right px-4 py-3">Value</th>
                <th className="text-right px-4 py-3">Repaid</th>
                <th className="text-right px-4 py-3">Collection Rate</th>
                <th className="text-right px-4 py-3">NPL Rate</th>
                <th className="text-left px-4 py-3">Zone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {PROGRAM_BREAKDOWN.map(p => {
                const rate = Math.round((p.repaid / p.value) * 100)
                return (
                  <tr key={p.program} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{p.program}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{p.loans}</td>
                    <td className="px-4 py-3 text-right text-gray-800 font-medium">{fmtGHS(p.value)}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-medium">{fmtGHS(p.repaid)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: rate >= 70 ? '#22c55e' : '#f59e0b' }} />
                        </div>
                        <span className={`text-xs font-semibold ${rate >= 70 ? 'text-green-700' : 'text-amber-700'}`}>{rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-semibold ${p.npl <= 3 ? 'text-green-700' : p.npl <= 5 ? 'text-amber-700' : 'text-red-700'}`}>{p.npl}%</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.zone}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-sm">
                <td className="px-5 py-3 text-gray-800">Total</td>
                <td className="px-4 py-3 text-right text-gray-800">{PROGRAM_BREAKDOWN.reduce((a, p) => a + p.loans, 0)}</td>
                <td className="px-4 py-3 text-right text-gray-800">{fmtGHS(PROGRAM_BREAKDOWN.reduce((a, p) => a + p.value, 0))}</td>
                <td className="px-4 py-3 text-right text-green-700">{fmtGHS(PROGRAM_BREAKDOWN.reduce((a, p) => a + p.repaid, 0))}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
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
