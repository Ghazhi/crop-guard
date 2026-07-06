'use client'

import { KpiCard, SectionCard } from '../_shared'
import { FINANCIAL_KPI, PROGRAM_BREAKDOWN, fmtGHS } from '../_data'

export function Main() {
  const collectionRate = Math.round((FINANCIAL_KPI.collected / FINANCIAL_KPI.disbursed) * 100)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#7c3a00' }}>Finance Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Agricultural DFI · Portfolio analytics and compliance management</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Portfolio"    value={fmtGHS(FINANCIAL_KPI.totalPortfolio)}    sub="committed capital"              accent="#2B7BB9" />
        <KpiCard label="Disbursed"          value={fmtGHS(FINANCIAL_KPI.disbursed)}          sub="to farmers"        trend="up"   accent="#22c55e" />
        <KpiCard label="Collected"          value={fmtGHS(FINANCIAL_KPI.collected)}          sub="repayments received" trend="up" accent="#10b981" />
        <KpiCard label="Outstanding"        value={fmtGHS(FINANCIAL_KPI.outstanding)}        sub="still to be repaid"             accent="#f59e0b" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="NPL Rate"           value={`${FINANCIAL_KPI.nplRate}%`}              sub="non-performing loans" trend="down" accent="#ef4444" />
        <KpiCard label="Portfolio at Risk"  value={`${FINANCIAL_KPI.portfolioAtRisk}%`}      sub="PAR > 30 days"                    accent="#f97316" />
        <KpiCard label="Provision Required" value={fmtGHS(FINANCIAL_KPI.provisionRequired)} sub="IFRS 9 ECL estimate"              accent="#8b5cf6" />
        <KpiCard label="Portfolio ROI"      value={`${FINANCIAL_KPI.roi}%`}                  sub="annualised return"   trend="up"   accent="#06b6d4" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Collection Rate by Program">
          <div className="p-5 space-y-4">
            {PROGRAM_BREAKDOWN.map(p => {
              const rate = Math.round((p.repaid / p.value) * 100)
              const color = rate >= 70 ? '#22c55e' : rate >= 50 ? '#f59e0b' : '#ef4444'
              return (
                <div key={p.program}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-gray-700">{p.program}</span>
                    <span className="text-gray-500">{rate}% · {p.loans} loans</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, backgroundColor: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard title="Portfolio Health Snapshot">
          <div className="p-5 space-y-3">
            {[
              { label: 'Total Disbursed',    value: fmtGHS(FINANCIAL_KPI.disbursed),         color: 'text-blue-700'   },
              { label: 'Total Collected',    value: fmtGHS(FINANCIAL_KPI.collected),         color: 'text-green-700'  },
              { label: 'Collection Rate',    value: `${collectionRate}%`,                     color: 'text-green-700'  },
              { label: 'Outstanding Balance',value: fmtGHS(FINANCIAL_KPI.outstanding),        color: 'text-amber-700'  },
              { label: 'Provision Required', value: fmtGHS(FINANCIAL_KPI.provisionRequired), color: 'text-purple-700' },
              { label: 'NPL Rate',           value: `${FINANCIAL_KPI.nplRate}%`,              color: 'text-red-700'    },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{label}</span>
                <span className={`text-sm font-semibold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
