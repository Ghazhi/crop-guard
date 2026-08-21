'use client'

import { useEffect, useState } from 'react'
import { Building2, Plus, Pencil, Trash2, Search, Ban, Power } from 'lucide-react'
import { toast } from 'sonner'
import { usePersistedState } from '@/lib/usePersistedState'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { DatagridTemplate, type DatagridColumn } from '@/customComponents/DatagridTemplate'
import { DynamicFormRenderer } from '@/customComponents/DynamicFormRenderer'
import { useFormConfig } from '@/lib/useFormConfig'
import { TENANT_FORM_ID } from '@/dataCenter/formEngine'
import { getTenants } from '../_logics/functions'
import type { Tenant, TenantStatus } from '../_logics/interface'
import { AUDIT_LOG_KEY, SEED_AUDIT_LOG, newAuditEntry } from '../../AuditLog/_logics/functions'
import type { AuditLogEntry } from '../../AuditLog/_logics/interface'

const CURRENT_ACTOR = 'Nana Adjei'

const STATUS_VARIANT: Record<TenantStatus, 'success' | 'danger'> = {
  active: 'success', suspended: 'danger',
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

const FORM_PLACEHOLDERS: Record<string, string> = {
  name: 'e.g. ASINYO Cooperative',
  subdomain: 'e.g. asinyo',
  contactEmail: 'e.g. admin@asinyo.coop',
}

function emptyTenant(): Tenant {
  return {
    id: `ten-${Date.now()}`, name: '', subdomain: '',
    status: 'active', contactEmail: '', createdAt: new Date().toISOString().slice(0, 10),
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

  // Field list, order, labels and required-ness all come from Configuration > Forms.
  const config = useFormConfig(TENANT_FORM_ID)
  const step = config.steps[0]
  const values = draft as unknown as Record<string, unknown>

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(tenant ?? emptyTenant())
    }
  }, [open, tenant])

  const canSave = config.isValid(values)

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
      {step && (
        <DynamicFormRenderer
          form={config.form}
          stepId={step.id}
          values={values}
          onChange={(k, v) => setDraft(prev => ({ ...prev, [k]: v }))}
          placeholders={FORM_PLACEHOLDERS}
          className="px-6 py-5"
        />
      )}
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    getTenants().then(t => {
      setTenants(prev => prev.length > 0 ? prev : t)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = tenants.filter(t =>
    (t.name.toLowerCase().includes(search.toLowerCase()) || t.subdomain.toLowerCase().includes(search.toLowerCase()) || t.contactEmail.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || t.status === statusFilter)
  )

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

  const columns: DatagridColumn<Tenant>[] = [
    { key: 'name', label: 'Organization' },
    { key: 'subdomain', label: 'Subdomain', render: v => `${String(v)}.cropguard.app` },
    { key: 'contactEmail', label: 'Contact Email' },
    { key: 'status', label: 'Status', render: v => (
      <BadgeTemplate label={v as TenantStatus} variant={STATUS_VARIANT[v as TenantStatus]} size="sm" className="capitalize" />
    ) },
    { key: 'createdAt', label: 'Created' },
    { key: 'id', label: '', id: 'actions', render: (_v, t) => (
      <div className="flex items-center justify-end gap-1">
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
    ) },
  ]

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--surface-page)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <InputTemplate
            placeholder="Search name, subdomain, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5 text-gray-400" />}
          />
        </div>
        <div className="w-48">
          <SelectTemplate
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          />
        </div>
        <BadgeTemplate label={`${filtered.length} tenant${filtered.length !== 1 ? 's' : ''}`} variant="neutral" size="sm" />
      </div>

      <DatagridTemplate<Tenant>
        columns={columns}
        data={filtered}
        rowKey="id"
        isLoading={loading}
        emptyLabel="No tenants found"
        pageSizeOptions={[10, 25, 50, 100, 0]}
      />

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
