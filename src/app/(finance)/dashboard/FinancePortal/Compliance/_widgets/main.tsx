'use client'

import { CheckCircle2, Clock, XCircle, AlertCircle, Shield, AlertTriangle } from 'lucide-react'
import { SectionCard } from '../../_shared'
import { COMPLIANCE_ITEMS, complianceStatusCls, type ComplianceItem } from '../../_data'

const COMPLIANCE_ICONS: Record<ComplianceItem['status'], React.ComponentType<{ className?: string }>> = {
  'Compliant':     CheckCircle2,
  'Due Soon':      Clock,
  'Overdue':       XCircle,
  'Pending Review':AlertCircle,
}

export function Main() {
  const counts = { Compliant: 0, 'Due Soon': 0, Overdue: 0, 'Pending Review': 0 } as Record<ComplianceItem['status'], number>
  COMPLIANCE_ITEMS.forEach(c => counts[c.status]++)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#7c3a00' }}>Compliance & Audit</h1>
        <p className="text-sm text-gray-500 mt-0.5">Agricultural DFI · Regulatory obligations and audit trail</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(Object.entries(counts) as [ComplianceItem['status'], number][]).map(([s, c]) => (
          <div key={s} className={`rounded-xl border p-4 ${complianceStatusCls(s)}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{s}</p>
            <p className="text-2xl font-bold mt-1">{c}</p>
            <p className="text-xs opacity-70 mt-0.5">item{c !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      <SectionCard title="Compliance Register">
        <div className="divide-y divide-gray-100">
          {COMPLIANCE_ITEMS.map(c => {
            const cls  = complianceStatusCls(c.status)
            const Icon = COMPLIANCE_ICONS[c.status]
            return (
              <div key={c.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cls}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.item}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.category} · Owner: {c.owner}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{c.status}</span>
                      <span className="text-xs text-gray-400">Due {c.dueDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      <SectionCard title="Recent Audit Actions">
        <div className="divide-y divide-gray-100">
          {[
            { action: 'Portfolio provisioning reviewed and approved',    user: 'Akosua Asante', date: '2026-06-30', Icon: Shield        },
            { action: 'Q2 2026 external audit engagement letter signed', user: 'Finance Team',  date: '2026-06-28', Icon: CheckCircle2  },
            { action: 'AML/KYC documentation flagged for 12 farmers',   user: 'Compliance',    date: '2026-06-25', Icon: AlertTriangle },
            { action: 'IFRS 9 ECL model parameters updated',            user: 'Credit Risk',   date: '2026-06-20', Icon: Shield        },
          ].map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <a.Icon className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{a.action}</p>
                <p className="text-xs text-gray-400">{a.user} · {a.date}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
