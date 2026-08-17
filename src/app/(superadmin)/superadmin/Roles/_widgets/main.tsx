'use client'

import { useState } from 'react'
import { Shield, Plus, Pencil, Trash2 } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { RoleFormSheet } from '@/customComponents/RoleFormSheet'
import { SEED_SUPER_ADMIN_ROLES, SUPER_ADMIN_ROLE_PAGE_GROUPS, type Role } from '@/dataCenter/roles'

export function Main() {
  const [roles, setRoles] = usePersistedState<Role[]>('super-admin-roles', SEED_SUPER_ADMIN_ROLES)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState<Role | null>(null)

  const builtIn = roles.filter(r => r.isSystem)
  const custom = roles.filter(r => !r.isSystem)

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

      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Built-in Roles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {builtIn.map(r => (
            <div key={r.id} className="rounded-xl border p-4 flex flex-col gap-2" style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <BadgeTemplate label="Built-in" variant="warning" size="sm" />
                  <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setEditing(r)} />
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{r.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Custom Roles</h3>
        {custom.length === 0 ? (
          <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 shadow-sm flex flex-col items-center justify-center py-14 text-gray-400">
            <Shield className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No custom roles yet. Click &quot;New Role&quot; to create one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {custom.map(r => (
              <div key={r.id} className="rounded-xl border p-4 flex flex-col gap-2" style={{ backgroundColor: 'var(--brand-mint)', borderColor: 'var(--brand-light)' }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--brand-forest)' }}>{r.name}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setEditing(r)} />
                    <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setDeleting(r)} />
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{r.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

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
