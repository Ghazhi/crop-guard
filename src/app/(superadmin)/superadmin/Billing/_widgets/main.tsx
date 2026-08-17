'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Users, HardDrive } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { getTenants } from '../../Tenants/_logics/functions'
import type { Tenant, TenantPlanTier } from '../../Tenants/_logics/interface'

const PLAN_VARIANT: Record<TenantPlanTier, 'neutral' | 'info' | 'success'> = {
  starter: 'neutral', pro: 'info', enterprise: 'success',
}

// Illustrative usage numbers only — not wired to any real billing/metering system.
function usageFor(tenant: Tenant) {
  const h = tenant.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return { farmers: 200 + (h % 800), storageGb: 1 + (h % 20) }
}

export function Main() {
  const [tenants, setTenants] = usePersistedState<Tenant[]>('sa-tenants', [])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTenants().then(t => {
      setTenants(prev => prev.length > 0 ? prev : t)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--surface-page)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#1f2937' }}>
          <CreditCard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>Billing &amp; Plans</h1>
          <p className="text-sm" style={{ color: 'var(--brand-slate)' }}>Plan tier and usage per tenant (illustrative — not wired to a real billing system)</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-12 text-center text-gray-400 text-sm">
          Loading…
        </div>
      ) : tenants.length === 0 ? (
        <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-12 flex flex-col items-center gap-2">
          <CreditCard className="w-8 h-8 text-gray-200" />
          <p className="text-sm font-medium text-gray-400 text-center">No tenants yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tenants.map(t => {
            const usage = usageFor(t)
            return (
              <div key={t.id} className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 shadow-sm p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <BadgeTemplate label={t.planTier} variant={PLAN_VARIANT[t.planTier]} size="sm" className="capitalize" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{usage.farmers.toLocaleString()} farmers</span>
                    <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{usage.storageGb} GB storage</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
