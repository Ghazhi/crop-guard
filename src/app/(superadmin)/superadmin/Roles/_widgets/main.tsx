'use client'

import { useState } from 'react'
import { Shield, Plus, Pencil, Trash2, Search } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { DatagridTemplate, type DatagridColumn } from '@/customComponents/DatagridTemplate'
import { RoleFormSheet } from '@/customComponents/RoleFormSheet'
import { SEED_SUPER_ADMIN_ROLES, SUPER_ADMIN_ROLE_PAGE_GROUPS, type Role } from '@/dataCenter/roles'

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'builtin', label: 'Built-in' },
  { value: 'custom', label: 'Custom' },
]

export function Main() {
  const [roles, setRoles] = usePersistedState<Role[]>('super-admin-roles', SEED_SUPER_ADMIN_ROLES)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState<Role | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const filtered = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) &&
    (!typeFilter || (typeFilter === 'builtin' ? r.isSystem : !r.isSystem))
  )

  function saveRole(role: Role) {
    setRoles(prev => {
      const exists = prev.some(r => r.id === role.id)
      return exists ? prev.map(r => r.id === role.id ? role : r) : [...prev, role]
    })
    setAdding(false)
    setEditing(null)
  }

  function confirmDelete() {
    if (!deleting) return
    setRoles(prev => prev.filter(r => r.id !== deleting.id))
    setDeleting(null)
  }

  const columns: DatagridColumn<Role>[] = [
    { key: 'name', label: 'Role' },
    { key: 'description', label: 'Description', render: v => (
      <span className="line-clamp-1 max-w-md block">{String(v)}</span>
    ) },
    { key: 'isSystem', label: 'Type', render: v => (
      <BadgeTemplate label={v ? 'Built-in' : 'Custom'} variant={v ? 'warning' : 'info'} size="sm" />
    ) },
    { key: 'id', label: '', id: 'actions', render: (_v, r) => (
      <div className="flex items-center justify-end gap-1">
        <ButtonTemplate variant="ghost" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setEditing(r)} />
        {!r.isSystem && (
          <ButtonTemplate variant="ghost" size="sm" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setDeleting(r)} />
        )}
      </div>
    ) },
  ]

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--surface-page)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#1f2937' }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>Roles</h1>
            <p className="text-sm" style={{ color: 'var(--brand-slate)' }}>Create roles and configure their page-level permissions</p>
          </div>
        </div>
        <ButtonTemplate variant="primary" label="New Role" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAdding(true)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <InputTemplate
            placeholder="Search role name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5 text-gray-400" />}
          />
        </div>
        <div className="w-44">
          <SelectTemplate
            options={TYPE_FILTER_OPTIONS}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          />
        </div>
        <BadgeTemplate label={`${filtered.length} role${filtered.length !== 1 ? 's' : ''}`} variant="neutral" size="sm" />
      </div>

      <DatagridTemplate<Role>
        columns={columns}
        data={filtered}
        rowKey="id"
        emptyLabel="No roles found"
        pageSizeOptions={[10, 25, 50, 100, 0]}
      />

      <RoleFormSheet
        open={adding}
        pageGroups={SUPER_ADMIN_ROLE_PAGE_GROUPS}
        onClose={() => setAdding(false)}
        onSave={saveRole}
      />
      <RoleFormSheet
        open={!!editing}
        role={editing ?? undefined}
        pageGroups={SUPER_ADMIN_ROLE_PAGE_GROUPS}
        onClose={() => setEditing(null)}
        onSave={saveRole}
      />

      <ConfirmModal
        open={!!deleting}
        title="Delete Role"
        message={`Delete "${deleting?.name}"? Users assigned this role will need to be reassigned.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
