'use client'

import { useState } from 'react'
import { Building2, CreditCard, TrendingUp, Users, ExternalLink, Search } from 'lucide-react'

interface Partner {
  id: string
  name: string
  type: 'Bank' | 'DFI' | 'MFI'
  linkedPrograms: number
  activeLoanees: number
  portfolioValue: string
  repaymentRate: number
  friThreshold: number
  status: 'active' | 'inactive'
}

const MOCK_PARTNERS: Partner[] = [
  {
    id: 'p-001',
    name: 'Fidelity Bank Ghana',
    type: 'Bank',
    linkedPrograms: 4,
    activeLoanees: 1240,
    portfolioValue: 'GHS 4.8M',
    repaymentRate: 94,
    friThreshold: 65,
    status: 'active',
  },
  {
    id: 'p-002',
    name: 'Agricultural Development Bank',
    type: 'Bank',
    linkedPrograms: 6,
    activeLoanees: 3100,
    portfolioValue: 'GHS 12.3M',
    repaymentRate: 88,
    friThreshold: 60,
    status: 'active',
  },
  {
    id: 'p-003',
    name: 'IFAD Ghana Office',
    type: 'DFI',
    linkedPrograms: 3,
    activeLoanees: 870,
    portfolioValue: 'GHS 7.2M',
    repaymentRate: 91,
    friThreshold: 70,
    status: 'active',
  },
  {
    id: 'p-004',
    name: 'Sinapi Aba Trust',
    type: 'MFI',
    linkedPrograms: 2,
    activeLoanees: 540,
    portfolioValue: 'GHS 2.4M',
    repaymentRate: 82,
    friThreshold: 55,
    status: 'active',
  },
  {
    id: 'p-005',
    name: 'World Bank IDA',
    type: 'DFI',
    linkedPrograms: 1,
    activeLoanees: 0,
    portfolioValue: 'GHS 9.1M',
    repaymentRate: 0,
    friThreshold: 75,
    status: 'inactive',
  },
  {
    id: 'p-006',
    name: 'Opportunity International',
    type: 'MFI',
    linkedPrograms: 2,
    activeLoanees: 310,
    portfolioValue: 'GHS 1.6M',
    repaymentRate: 79,
    friThreshold: 50,
    status: 'active',
  },
]

function typeBadge(type: Partner['type']) {
  const cls =
    type === 'Bank' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
    type === 'DFI'  ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                     'bg-amber-50 text-amber-700 border border-amber-200'
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {type}
    </span>
  )
}

function repaymentColor(rate: number) {
  if (rate === 0) return 'text-gray-400'
  if (rate >= 90) return 'text-green-700 font-semibold'
  if (rate >= 80) return 'text-amber-600 font-semibold'
  return 'text-red-600 font-semibold'
}

function statusBadge(status: Partner['status']) {
  return status === 'active'
    ? <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Active</span>
    : <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Inactive</span>
}

export function Main() {
  const [search, setSearch] = useState('')

  const activePartners   = MOCK_PARTNERS.filter(p => p.status === 'active').length
  const totalPortfolio   = 'GHS 37.4M'
  const avgRepayment     = Math.round(
    MOCK_PARTNERS.filter(p => p.repaymentRate > 0).reduce((sum, p) => sum + p.repaymentRate, 0) /
    MOCK_PARTNERS.filter(p => p.repaymentRate > 0).length
  )

  const displayed = MOCK_PARTNERS.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Partners</h1>
        <p className="text-sm text-gray-500 mt-0.5">Financial partners linked to active programs</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Active Partners</p>
            <p className="text-2xl font-bold text-gray-900 leading-tight">{activePartners}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total Loan Portfolio</p>
            <p className="text-2xl font-bold text-gray-900 leading-tight">{totalPortfolio}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Avg Repayment Rate</p>
            <p className="text-2xl font-bold text-gray-900 leading-tight">{avgRepayment}%</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-300 bg-white"
          placeholder="Search partners…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="text-left px-5 py-3 whitespace-nowrap">Partner Name</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Type</th>
                <th className="text-center px-4 py-3 whitespace-nowrap">Linked Programs</th>
                <th className="text-center px-4 py-3 whitespace-nowrap">Active Loanees</th>
                <th className="text-right px-4 py-3 whitespace-nowrap">Portfolio Value</th>
                <th className="text-center px-4 py-3 whitespace-nowrap">Repayment Rate</th>
                <th className="text-center px-4 py-3 whitespace-nowrap">FRI Threshold</th>
                <th className="text-center px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-gray-400" />
                      </div>
                      <span className="font-medium text-gray-900 whitespace-nowrap">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">{typeBadge(p.type)}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="font-semibold text-gray-700">{p.linkedPrograms}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="font-semibold text-gray-700">{p.activeLoanees.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="font-semibold text-gray-800 whitespace-nowrap">{p.portfolioValue}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={repaymentColor(p.repaymentRate)}>
                      {p.repaymentRate > 0 ? `${p.repaymentRate}%` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-sm text-gray-600">{p.friThreshold}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">{statusBadge(p.status)}</td>
                  <td className="px-4 py-3.5">
                    <button className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {displayed.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
            <Building2 className="w-8 h-8 opacity-30" />
            <p className="text-sm">No partners found</p>
          </div>
        )}
      </div>
    </div>
  )
}
