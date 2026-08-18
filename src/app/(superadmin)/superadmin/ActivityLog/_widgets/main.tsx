'use client'

import { useState } from 'react'
import { History, Building2, Search } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { AUDIT_LOG_KEY, SEED_AUDIT_LOG } from '../../AuditLog/_logics/functions'
import type { AuditLogEntry, AuditAction } from '../../AuditLog/_logics/interface'

const ACTION_VARIANT: Record<AuditAction, 'success' | 'info' | 'danger' | 'warning' | 'neutral'> = {
  created: 'success', updated: 'info', suspended: 'danger', reactivated: 'success', deleted: 'warning',
}

const ACTION_FILTER_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'reactivated', label: 'Reactivated' },
  { value: 'deleted', label: 'Deleted' },
]

export function Main() {
  const [entries] = usePersistedState<AuditLogEntry[]>(AUDIT_LOG_KEY, SEED_AUDIT_LOG)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const tenantEntries = entries
    .filter(e => e.entityType === 'tenant')
    .filter(e => e.entityName.toLowerCase().includes(search.toLowerCase()))
    .filter(e => !actionFilter || e.action === actionFilter)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--surface-page)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#1f2937' }}>
          <History className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>Activity Log</h1>
          <p className="text-sm" style={{ color: 'var(--brand-slate)' }}>Tenant-related activity — created, updated, suspended, reactivated</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <InputTemplate
            placeholder="Search tenant name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5 text-gray-400" />}
          />
        </div>
        <div className="w-44">
          <SelectTemplate options={ACTION_FILTER_OPTIONS} value={actionFilter} onChange={e => setActionFilter(e.target.value)} />
        </div>
        <BadgeTemplate label={`${tenantEntries.length} entr${tenantEntries.length !== 1 ? 'ies' : 'y'}`} variant="neutral" size="sm" />
      </div>

      {tenantEntries.length === 0 ? (
        <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-12 flex flex-col items-center gap-2">
          <History className="w-8 h-8 text-gray-200" />
          <p className="text-sm font-medium text-gray-400 text-center">No tenant activity found.</p>
        </div>
      ) : (
        <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 shadow-sm overflow-hidden">
          {tenantEntries.map(e => (
            <div key={e.id} className="flex items-start gap-3 px-4 py-3 border-b border-(--brand-pale)/30 last:border-b-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--brand-mint)' }}>
                <Building2 className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="text-sm font-semibold text-gray-900">{e.entityName}</p>
                  <BadgeTemplate label={e.action} variant={ACTION_VARIANT[e.action]} size="sm" className="capitalize" />
                </div>
                {e.detail && <p className="text-xs text-gray-500">{e.detail}</p>}
                <p className="text-[11px] text-gray-400 mt-0.5">by {e.actor}</p>
              </div>
              <span className="text-[11px] text-gray-400 shrink-0">{new Date(e.timestamp).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
