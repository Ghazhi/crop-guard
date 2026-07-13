'use client'

import { useState } from 'react'
import { Download, Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SectionCard } from '../../_shared'
import { PaginationBar } from '@/customComponents/PaginationBar'
import { TRANSACTIONS, fmtGHS, txTypeStyle, txStatusStyle, type Transaction } from '../../_data'

const TX_TYPES: Transaction['type'][] = ['Disbursement', 'Repayment', 'Provision', 'Write-off']

export function Main() {
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<Transaction['type'] | ''>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filtered = TRANSACTIONS.filter(t => {
    if (typeFilter && t.type !== typeFilter) return false
    if (search.trim() && !t.farmer.toLowerCase().includes(search.toLowerCase()) &&
        !t.reference.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const displayed = pageSize === 0 ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#7c3a00' }}>Transaction Ledger</h1>
        <p className="text-sm text-gray-500 mt-0.5">Agricultural DFI · Full audit trail of all financial transactions</p>
      </div>

      {/* Filters card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full border border-gray-200 rounded-lg pl-10 pr-9 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) transition-colors bg-white"
              placeholder="Search by farmer or reference…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(v => !v)}
            className={cn(
              'flex items-center gap-1.5 h-10 px-3 rounded-lg border text-sm font-medium transition-colors shrink-0',
              filtersOpen || typeFilter
                ? 'border-(--brand-green) text-(--brand-green) bg-green-50'
                : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700',
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {typeFilter && (
              <span className="ml-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: 'var(--brand-green)' }}>1</span>
            )}
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', filtersOpen && 'rotate-180')} />
          </button>
        </div>
        {filtersOpen && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-1 border-t border-gray-100">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Type</p>
              <select
                value={typeFilter}
                onChange={e => { setTypeFilter(e.target.value as Transaction['type'] | ''); setPage(1) }}
                className="h-8 w-full border border-gray-200 rounded-lg px-2.5 text-xs focus:outline-none bg-white"
              >
                <option value="">All types</option>
                {TX_TYPES.map(t => <option key={t} value={t}>{t} ({TRANSACTIONS.filter(tx => tx.type === t).length})</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Pagination (top) */}
      {filtered.length > 0 && (
        <PaginationBar
          page={page} pageSize={pageSize} total={filtered.length}
          onPageChange={setPage} onPageSizeChange={ps => { setPageSize(ps); setPage(1) }}
        />
      )}

      <SectionCard title={`Transaction Ledger (${filtered.length} records)`}
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
