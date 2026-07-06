'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { SectionCard } from '../../_shared'
import { TRANSACTIONS, fmtGHS, txTypeStyle, txStatusStyle, type Transaction } from '../../_data'

export function Main() {
  const [typeFilter, setTypeFilter] = useState<Transaction['type'] | ''>('')
  const displayed = TRANSACTIONS.filter(t => !typeFilter || t.type === typeFilter)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#7c3a00' }}>Transaction Ledger</h1>
        <p className="text-sm text-gray-500 mt-0.5">Agricultural DFI · Full audit trail of all financial transactions</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['Disbursement','Repayment','Provision','Write-off'] as Transaction['type'][]).map(t => {
          const c = TRANSACTIONS.filter(tx => tx.type === t).length
          return (
            <button key={t} onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${typeFilter === t ? txTypeStyle(t) : 'bg-white text-gray-600 border-gray-200'}`}>
              {t} <span className="font-bold">{c}</span>
            </button>
          )
        })}
      </div>

      <SectionCard title={`Transaction Ledger (${displayed.length} records)`}
        action={
          <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-center px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Farmer</th>
                <th className="text-left px-4 py-3">Program</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Reference</th>
                <th className="text-center px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-gray-500 text-xs">{t.date}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${txTypeStyle(t.type)}`}>{t.type}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{t.farmer}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{t.program}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${t.type === 'Repayment' ? 'text-green-700' : t.type === 'Write-off' ? 'text-red-700' : 'text-gray-800'}`}>
                    {t.type === 'Repayment' ? '+' : '-'}{fmtGHS(t.amount)}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">{t.reference}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${txStatusStyle(t.status)}`}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
