'use client'

import Link from 'next/link'
import { Layers, Zap, ArrowRight } from 'lucide-react'
import { KpiCard, SectionCard } from '../_shared'
import { PersonAvatar } from '@/customComponents/PersonAvatar'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { KPI, FARMER_LOANS, LOAN_APPS, REPAY_ROWS, fmtGHS, fmt, loanStatusStyle, appStatusStyle, type LoanStatus, type AppStatus } from '../_data'
import { usePartnerId } from '../_logics/usePartnerId'
import { PROGRAMS } from '@/dataCenter/programs'
import { INTERVENTIONS } from '@/dataCenter/interventions'
import type { Cohort } from '@/app/(admin)/dashboard/ProgramsSetup/_logics/interface'

export function Main() {
  const partnerId = usePartnerId()

  const programs = PROGRAMS.filter(p => p.partnerId === partnerId)
  const programsEnrolled = programs.reduce((s, p) =>
    s + p.cohorts.reduce((cs: number, c: Cohort) => cs + c.enrolledCount, p.enrolledCount), 0)
  const activePrograms = programs.filter(p => p.status === 'Active').length

  const interventions = INTERVENTIONS.filter(iv =>
    iv.partnerAssignments?.some((pa: { partnerId: string }) => pa.partnerId === partnerId)
  )
  const activeInterventions = interventions.filter(iv => iv.status === 'Active').length

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

      {/* Linked Programs + Interventions summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard
          title="Linked Programs"
          action={
            <Link href="/dashboard/PartnerPortal/Farmers"
              className="flex items-center gap-1 text-xs font-semibold hover:underline" style={{ color: 'var(--brand-forest)' }}>
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          {programs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <Layers className="w-7 h-7 text-gray-300" />
              <p className="text-sm text-gray-400">No programs linked yet.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 p-4">
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-lg font-bold" style={{ color: 'var(--brand-forest)' }}>{activePrograms}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Active</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-lg font-bold" style={{ color: 'var(--brand-forest)' }}>{programsEnrolled}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Farmers Enrolled</p>
                </div>
              </div>
              <div className="divide-y divide-gray-100 border-t border-gray-100">
                {programs.slice(0, 4).map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                    <p className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate">{p.name}</p>
                    <BadgeTemplate label={p.status} variant={p.status === 'Active' ? 'success' : p.status === 'Completed' ? 'info' : 'neutral'} size="sm" />
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard
          title="Linked Interventions"
          action={
            <Link href="/dashboard/PartnerPortal/Loans"
              className="flex items-center gap-1 text-xs font-semibold hover:underline" style={{ color: 'var(--brand-forest)' }}>
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          {interventions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <Zap className="w-7 h-7 text-gray-300" />
              <p className="text-sm text-gray-400">No interventions assigned yet.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 p-4">
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-lg font-bold" style={{ color: 'var(--brand-forest)' }}>{activeInterventions}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Active</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-lg font-bold" style={{ color: 'var(--brand-forest)' }}>{interventions.length}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Total Assigned</p>
                </div>
              </div>
              <div className="divide-y divide-gray-100 border-t border-gray-100">
                {interventions.slice(0, 4).map(iv => (
                  <div key={iv.id} className="flex items-center gap-3 px-5 py-2.5">
                    <p className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate">{iv.name}</p>
                    <BadgeTemplate label={iv.status} variant={iv.status === 'Active' ? 'success' : iv.status === 'Suspended' ? 'warning' : 'neutral'} size="sm" />
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>
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
