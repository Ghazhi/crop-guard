'use client'

import { ClipboardList, Building2, Users as UsersIcon, Settings2 } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { AUDIT_LOG_KEY, SEED_AUDIT_LOG } from '../_logics/functions'
import type { AuditLogEntry, AuditEntityType, AuditAction } from '../_logics/interface'

const ENTITY_ICON: Record<AuditEntityType, React.ElementType> = {
  tenant: Building2, platform_user: UsersIcon, settings: Settings2,
}

const ACTION_VARIANT: Record<AuditAction, 'success' | 'info' | 'danger' | 'warning' | 'neutral'> = {
  created: 'success', updated: 'info', suspended: 'danger', reactivated: 'success', deleted: 'warning',
}

export function Main() {
  const [entries] = usePersistedState<AuditLogEntry[]>(AUDIT_LOG_KEY, SEED_AUDIT_LOG)
  const sorted = [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--surface-page)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#1f2937' }}>
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>Audit Log</h1>
          <p className="text-sm" style={{ color: 'var(--brand-slate)' }}>Platform-wide record of tenant, user, and settings changes</p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-12 flex flex-col items-center gap-2">
          <ClipboardList className="w-8 h-8 text-gray-200" />
          <p className="text-sm font-medium text-gray-400 text-center">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 shadow-sm overflow-hidden">
          {sorted.map(e => {
            const Icon = ENTITY_ICON[e.entityType]
            return (
              <div key={e.id} className="flex items-start gap-3 px-4 py-3 border-b border-(--brand-pale)/30 last:border-b-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--brand-mint)' }}>
                  <Icon className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-semibold text-gray-900">{e.entityName}</p>
                    <BadgeTemplate label={e.action} variant={ACTION_VARIANT[e.action]} size="sm" className="capitalize" />
                    <BadgeTemplate label={e.entityType.replace('_', ' ')} variant="neutral" size="sm" className="capitalize" />
                  </div>
                  {e.detail && <p className="text-xs text-gray-500">{e.detail}</p>}
                  <p className="text-[11px] text-gray-400 mt-0.5">by {e.actor}</p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">{new Date(e.timestamp).toLocaleString()}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
