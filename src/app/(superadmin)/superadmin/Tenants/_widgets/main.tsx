'use client'

import { useEffect, useState } from 'react'
import { Building2, Plus, Pencil, Trash2, Mail, Calendar, Ban, Power } from 'lucide-react'
import { toast } from 'sonner'
import { usePersistedState } from '@/lib/usePersistedState'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { getTenants } from '../_logics/functions'
import type { Tenant, TenantPlanTier, TenantStatus } from '../_logics/interface'
import { AUDIT_LOG_KEY, SEED_AUDIT_LOG, newAuditEntry } from '../../AuditLog/_logics/functions'
import type { AuditLogEntry } from '../../AuditLog/_logics/interface'

const CURRENT_ACTOR = 'Nana Adjei'

const PLAN_OPTIONS: { value: TenantPlanTier; label: string }[] = [
  { value: 'starter',    label: 'Starter' },
  { value: 'pro',        label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

const PLAN_VARIANT: Record<TenantPlanTier, 'neutral' | 'info' | 'success'> = {
  starter: 'neutral', pro: 'info', enterprise: 'success',
}

const STATUS_VARIANT: Record<TenantStatus, 'success' | 'danger'> = {
  active: 'success', suspended: 'danger',
}

function emptyTenant(): Tenant {
  return {
    id: `ten-${Date.now()}`, name: '', subdomain: '',
    planTier: 'starter', status: 'active', contactEmail: '', createdAt: new Date().toISOString().slice(0, 10),
  }
}

function TenantFormSheet({
  open, tenant, onClose, onSave,
}: {
  open: boolean
  tenant: Tenant | null
  onClose: () => void
  onSave: (t: Tenant) => void
}) {
  const [draft, setDraft] = useState<Tenant>(tenant ?? emptyTenant())

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(tenant ?? emptyTenant())
    }
  }, [open, tenant])

  const canSave = draft.name.trim() && draft.subdomain.trim() && draft.contactEmail.trim()

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title={tenant ? 'Edit Tenant' : 'New Tenant'}
      footer={
        <>
          <ButtonTemplate variant="outline" label="Cancel" onClick={onClose} />
          <ButtonTemplate variant="primary" label="Save" isDisabled={!canSave} onClick={() => onSave(draft)} />
        </>
      }
    >
      <div className="px-6 py-5 flex flex-col gap-4">
        <InputTemplate
          label="Organization Name" isRequired
          placeholder="e.g. ASINYO Cooperative"
          value={draft.name}
          onChange={e => setDraft({ ...draft, name: e.target.value })}
        />
        <InputTemplate
          label="Subdomain" isRequired
          placeholder="e.g. asinyo"
          value={draft.subdomain}
          onChange={e => setDraft({ ...draft, subdomain: e.target.value })}
        />
        <InputTemplate
          label="Contact Email" isRequired type="email"
          placeholder="e.g. admin@asinyo.coop"
          value={draft.contactEmail}
          onChange={e => setDraft({ ...draft, contactEmail: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <SelectTemplate
            label="Plan Tier"
            options={PLAN_OPTIONS}
            value={draft.planTier}
            onChange={e => setDraft({ ...draft, planTier: e.target.value as TenantPlanTier })}
          />
          <SelectTemplate
            label="Status"
            options={[{ value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]}
            value={draft.status}
            onChange={e => setDraft({ ...draft, status: e.target.value as TenantStatus })}
          />
        </div>
      </div>
    </SheetTemplate>
  )
}

export function Main() {
  const [tenants, setTenants] = usePersistedState<Tenant[]>('sa-tenants', [])
  const [, setAuditLog] = usePersistedState<AuditLogEntry[]>(AUDIT_LOG_KEY, SEED_AUDIT_LOG)
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Tenant | null>(null)
  const [deleting, setDeleting] = useState<Tenant | null>(null)

  useEffect(() => {
    getTenants().then(t => {
      setTenants(prev => prev.length > 0 ? prev : t)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openNew() {
    setEditing(null)
    setSheetOpen(true)
  }
  function openEdit(t: Tenant) {
    setEditing(t)
    setSheetOpen(true)
  }
  function handleSave(t: Tenant) {
    const statusChanged = editing && editing.status !== t.status
    setTenants(prev => {
      const exists = prev.some(p => p.id === t.id)
      return exists ? prev.map(p => p.id === t.id ? t : p) : [...prev, t]
    })
    const action = !editing ? 'created' : statusChanged ? (t.status === 'suspended' ? 'suspended' : 'reactivated') : 'updated'
    setAuditLog(prev => [...prev, newAuditEntry('tenant', t.name, action, CURRENT_ACTOR)])
    toast.success(`${t.name} ${editing ? 'updated' : 'added'}`)
    setSheetOpen(false)
  }
  function confirmDelete() {
    if (!deleting) return
    setTenants(prev => prev.filter(t => t.id !== deleting.id))
    setAuditLog(prev => [...prev, newAuditEntry('tenant', deleting.name, 'deleted', CURRENT_ACTOR)])
    toast.success(`${deleting.name} removed`)
    setDeleting(null)
  }
  function toggleStatus(t: Tenant) {
    const newStatus: TenantStatus = t.status === 'active' ? 'suspended' : 'active'
    setTenants(prev => prev.map(p => p.id === t.id ? { ...p, status: newStatus } : p))
    setAuditLog(prev => [...prev, newAuditEntry('tenant', t.name, newStatus === 'suspended' ? 'suspended' : 'reactivated', CURRENT_ACTOR)])
    toast.success(`${t.name} ${newStatus === 'suspended' ? 'suspended' : 'reactivated'}`)
  }

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--surface-page)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#1f2937' }}>
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>Tenants</h1>
            <p className="text-sm" style={{ color: 'var(--brand-slate)' }}>Manage customer organizations on the platform</p>
          </div>
        </div>
        <ButtonTemplate variant="primary" label="New Tenant" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openNew} />
      </div>

      {loading ? (
        <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-12 text-center text-gray-400 text-sm">
          Loading tenants…
        </div>
      ) : tenants.length === 0 ? (
        <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 p-12 flex flex-col items-center gap-2">
          <Building2 className="w-8 h-8 text-gray-200" />
          <p className="text-sm font-medium text-gray-400 text-center">No tenants yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tenants.map(t => (
            <div key={t.id} className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 shadow-sm p-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <BadgeTemplate label={t.planTier} variant={PLAN_VARIANT[t.planTier]} size="sm" className="capitalize" />
                  <BadgeTemplate label={t.status} variant={STATUS_VARIANT[t.status]} size="sm" className="capitalize" />
                </div>
                <p className="text-xs text-gray-400 mb-2">{t.subdomain}.cropguard.app</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{t.contactEmail}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Created {t.createdAt}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <ButtonTemplate
                  variant="outline" size="sm" isIcon
                  tooltip={t.status === 'active' ? 'Deactivate' : 'Reactivate'}
                  leftIcon={t.status === 'active' ? <Ban className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                  className={t.status === 'active' ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}
                  onClick={() => toggleStatus(t)}
                />
                <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openEdit(t)} />
                <ButtonTemplate variant="danger" size="sm" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setDeleting(t)} />
              </div>
            </div>
          ))}
        </div>
      )}

      <TenantFormSheet
        open={sheetOpen}
        tenant={editing}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
      />

      <ConfirmModal
        open={!!deleting}
        title="Delete Tenant"
        message={`Delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
