'use client'

import { KpiCard, SectionCard } from '../_shared'
import { PersonAvatar } from '@/customComponents/PersonAvatar'
import { KPI, FARMER_LOANS, LOAN_APPS, REPAY_ROWS, fmtGHS, fmt, loanStatusStyle, appStatusStyle, repayStatusCls, type LoanStatus, type AppStatus } from '../_data'

export function Main() {
  const repayByStatus = {
    onTime:   REPAY_ROWS.filter(r => r.status === 'On Time').length,
    late:     REPAY_ROWS.filter(r => r.status === 'Late').length,
    missed:   REPAY_ROWS.filter(r => r.status === 'Missed').length,
    upcoming: REPAY_ROWS.filter(r => r.status === 'Upcoming').length,
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1e3a5f' }}>Portfolio Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Fidelity Bank · Loan portfolio and repayment management</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Portfolio Value"   value={fmtGHS(KPI.portfolioValue)} sub="total loans extended"      trend="up"      />
        <KpiCard label="Active Loans"      value={fmt(KPI.activeLoans)}       sub="farmers with live loans"                   />
        <KpiCard label="Repayment Rate"    value={`${KPI.repaymentRate}%`}    sub="of due amounts collected"  trend="up"      />
        <KpiCard label="At-Risk Farmers"   value={fmt(KPI.atRisk)}            sub="below repayment threshold" trend="down"    />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Disbursed (MTD)"   value={fmtGHS(KPI.disbursedMTD)}  sub="this month"                               />
        <KpiCard label="Collected (MTD)"   value={fmtGHS(KPI.collectedMTD)}  sub="this month"                trend="up"     />
        <KpiCard label="Avg Loan Size"     value={fmtGHS(KPI.avgLoanSize)}   sub="per farmer"                               />
        <KpiCard label="NPL Rate"          value={`${KPI.nplRate}%`}         sub="non-performing loans"      trend="down"   />
      </div>

      {/* Repayment summary + Recent apps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Repayment Status Summary">
          <div className="p-5 space-y-3">
            {[
              { label: 'On Time',  count: repayByStatus.onTime,   color: '#22c55e', bg: '#f0fdf4' },
              { label: 'Late',     count: repayByStatus.late,     color: '#f59e0b', bg: '#fffbeb' },
              { label: 'Missed',   count: repayByStatus.missed,   color: '#ef4444', bg: '#fef2f2' },
              { label: 'Upcoming', count: repayByStatus.upcoming, color: '#6b7280', bg: '#f9fafb' },
            ].map(({ label, count, color }) => {
              const pct = Math.round((count / REPAY_ROWS.length) * 100)
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{label}</span>
                    <span className="text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard title="Recent Loan Applications">
          <div className="divide-y divide-gray-100">
            {LOAN_APPS.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                <PersonAvatar name={a.name} size={28} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{a.name}</p>
                  <p className="text-xs text-gray-400">{a.type} · {fmtGHS(a.amount)}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${appStatusStyle(a.status as AppStatus)}`}>{a.status}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Loan status breakdown */}
      <SectionCard title="Portfolio by Loan Status">
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(['Active','Completed','Defaulted','Suspended'] as LoanStatus[]).map(s => {
            const count = FARMER_LOANS.filter(l => l.status === s).length
            const value = FARMER_LOANS.filter(l => l.status === s).reduce((a, l) => a + l.loanAmount, 0)
            return (
              <div key={s} className={`rounded-xl border p-4 ${loanStatusStyle(s)}`}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{s}</p>
                <p className="text-2xl font-bold mt-1">{count}</p>
                <p className="text-xs opacity-70 mt-0.5">{fmtGHS(value)}</p>
              </div>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}
