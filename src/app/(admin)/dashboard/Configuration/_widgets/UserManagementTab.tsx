'use client'

import { useMemo, useState, useCallback } from 'react'
import {
  Shield, Users, Search, Plus, Pencil, Eye, EyeOff, Trash2,
} from 'lucide-react'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { PaginationBar } from '@/customComponents/PaginationBar'
import { RoleFormSheet } from '@/customComponents/RoleFormSheet'
import { PermissionGate } from '@/customComponents/PermissionGate'
import { DynamicFormRenderer } from '@/customComponents/DynamicFormRenderer'
import { useFormConfig } from '@/lib/useFormConfig'
import { useDynamicFieldOptions } from '@/lib/useDynamicFieldOptions'
import { PLATFORM_USER_FORM_ID } from '@/dataCenter/formEngine'
import { usePersistedState } from '@/lib/usePersistedState'
import { usePermissions } from '@/lib/usePermissions'
import { cn } from '@/lib/utils'
import { SEED_PLATFORM_USERS, type PlatformUser } from '../_logics/userManagement'
import { SEED_TENANT_ROLES, TENANT_ROLE_PAGE_GROUPS, type Role } from '@/dataCenter/roles'

type UMTab = 'users' | 'roles'

const UM_TABS: { id: UMTab; Icon: React.ElementType; label: string }[] = [
  { id: 'users', Icon: Users,  label: 'Users' },
  { id: 'roles', Icon: Shield, label: 'Roles' },
]

export function UserManagementTab() {
  const [tab, setTab] = usePersistedState<UMTab>('config-um-tab', 'users')

  const [users, setUsers] = usePersistedState<PlatformUser[]>('um-users', SEED_PLATFORM_USERS)
  const [roles, setRoles] = usePersistedState<Role[]>('tenant-roles', SEED_TENANT_ROLES)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-0.5">
        <Shield className="w-5 h-5 shrink-0" style={{ color: 'var(--brand-forest)' }} />
        <h1 className="text-xl font-bold text-gray-900">User Management</h1>
      </div>
      <p className="text-sm text-gray-500 -mt-3 ml-7">Manage users and roles</p>

      <div className="flex items-center gap-1 border-b border-gray-200 w-fit max-w-full overflow-x-auto">
        {UM_TABS.map(({ id, Icon, label }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors shrink-0',
                active ? 'border-current' : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
              style={active ? { color: 'var(--brand-forest)' } : {}}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          )
        })}
      </div>

      {tab === 'users' && <UsersSection users={users} setUsers={setUsers} roles={roles} />}
      {tab === 'roles' && <RolesSection roles={roles} setRoles={setRoles} />}
    </div>
  )
}

// ─── Users sub-tab ───────────────────────────────────────────────────────────

function UsersSection({
  users, setUsers, roles,
}: {
  users: PlatformUser[]
  setUsers: (v: PlatformUser[] | ((p: PlatformUser[]) => PlatformUser[])) => void
  roles: Role[]
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<PlatformUser | null>(null)
  // inline role/status edits are updates, so they follow the same grant as the Edit button
  const { can } = usePermissions()
  const canUpdate = can('User Management', 'update')

  const filtered = useMemo(
    () => users.filter(u =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    ),
    [users, search]
  )

  const paged = pageSize === 0 ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize)

  function toggleStatus(id: string) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u))
  }

  function setUserRole(id: string, roleId: string) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, roleId } : u))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <InputTemplate
            placeholder="Search by name or email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            leftIcon={<Search className="w-3.5 h-3.5" />}
            className="w-64"
          />
          <BadgeTemplate label={`${filtered.length} user${filtered.length !== 1 ? 's' : ''}`} variant="neutral" size="sm" />
        </div>
        <PermissionGate pageKey="User Management" action="create">
          <ButtonTemplate variant="primary" size="sm" label="New User" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAdding(true)} />
        </PermissionGate>
      </div>

      <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{u.fullName}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{u.email}</td>
                  <td className="px-4 py-3">
                    <SelectTemplate
                      size="sm"
                      isDisabled={!canUpdate}
                      options={roles.map(r => ({ value: r.id, label: r.name }))}
                      value={u.roleId}
                      onChange={e => setUserRole(u.id, e.target.value)}
                      className="min-w-[9rem]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(u.id)} disabled={!canUpdate}>
                      <BadgeTemplate label={u.isActive ? 'Active' : 'Disabled'} variant={u.isActive ? 'success' : 'neutral'} size="sm" />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PermissionGate pageKey="User Management" action="update">
                      <ButtonTemplate variant="ghost" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setEditing(u)} />
                    </PermissionGate>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-gray-100">
          <PaginationBar page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </div>

      <UserFormSheet
        open={adding}
        title="New User"
        roles={roles}
        onClose={() => setAdding(false)}
        onSave={(u) => { setUsers(prev => [...prev, u]); setAdding(false) }}
      />
      <UserFormSheet
        open={!!editing}
        title="Edit User"
        roles={roles}
        initial={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSave={(u) => { setUsers(prev => prev.map(p => p.id === u.id ? u : p)); setEditing(null) }}
      />
    </div>
  )
}

function UserFormSheet({
  open, title, roles, initial, onClose, onSave,
}: {
  open: boolean
  title: string
  roles: Role[]
  initial?: PlatformUser
  onClose: () => void
  onSave: (u: PlatformUser) => void
}) {
  // Field list, order, labels and required-ness all come from Configuration > Forms.
  const config = useFormConfig(PLATFORM_USER_FORM_ID)
  const step = config.steps[0]

  const isEdit = !!initial
  const seedValues = useCallback(
    () => (initial
      ? { fullName: initial.fullName, email: initial.email, phone: initial.phone, roleId: initial.roleId }
      : { fullName: '', email: '', phone: '', roleId: roles[0]?.id ?? '' }) as Record<string, unknown>,
    [initial, roles],
  )

  const [values, setValues] = useState<Record<string, unknown>>(seedValues)
  // Password lives outside the config: it is create-only and never stored on the record.
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  // reset local state whenever a different record (or a fresh add) opens
  const key = initial?.id ?? 'new'
  const [lastKey, setLastKey] = useState(key)
  if (lastKey !== key) {
    setLastKey(key)
    setValues(seedValues())
    setPassword('')
  }

  // Role labels flag built-in roles, which the generic option map does not know about.
  const roleOptions = useMemo(
    () => roles.map(r => ({ value: r.id, label: `${r.name}${r.isSystem ? ' (Built-in)' : ''}` })),
    [roles],
  )
  const dynamicOptions = useDynamicFieldOptions({ extra: { roleId: roleOptions } })

  const valid = config.isValid(values) && (isEdit || password.length >= 6)

  function submit() {
    if (!valid) return
    onSave({
      id: initial?.id ?? `u-${Date.now()}`,
      fullName: String(values.fullName ?? '').trim(),
      email: String(values.email ?? '').trim(),
      phone: String(values.phone ?? '').trim(),
      roleId: String(values.roleId ?? ''),
      isActive: initial?.isActive ?? true,
    })
  }

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="col-span-2 flex justify-end gap-2">
          <ButtonTemplate variant="outline" label="Cancel" onClick={onClose} />
          <ButtonTemplate variant="primary" label={isEdit ? 'Save Changes' : 'Create User'} isDisabled={!valid} onClick={submit} />
        </div>
      }
    >
      <div className="px-6 py-5 flex flex-col gap-4">
        {step && (
          <DynamicFormRenderer
            form={config.form}
            stepId={step.id}
            values={values}
            onChange={(k, v) => setValues(prev => ({ ...prev, [k]: v }))}
            optionsOverride={dynamicOptions}
          />
        )}
        {!isEdit && (
          <InputTemplate
            label="Password" isRequired type={showPw ? 'text' : 'password'}
            value={password} onChange={e => setPassword(e.target.value)}
            hint="At least 6 characters"
            rightIcon={
              <button type="button" onClick={() => setShowPw(v => !v)} className="text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            }
          />
        )}
        <p className="text-xs text-gray-400 leading-relaxed">
          The assigned role determines which pages this user can view and what actions they can take on each.
        </p>
      </div>
    </SheetTemplate>
  )
}

// ─── Roles sub-tab ───────────────────────────────────────────────────────────

function RolesSection({
  roles, setRoles,
}: {
  roles: Role[]
  setRoles: (v: Role[] | ((p: Role[]) => Role[])) => void
}) {
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
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <PermissionGate pageKey="User Management" action="create">
          <ButtonTemplate variant="primary" size="sm" label="New Role" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAdding(true)} />
        </PermissionGate>
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
                  <PermissionGate pageKey="User Management" action="update">
                    <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setEditing(r)} />
                  </PermissionGate>
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
                    <PermissionGate pageKey="User Management" action="update">
                      <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setEditing(r)} />
                    </PermissionGate>
                    <PermissionGate pageKey="User Management" action="delete">
                      <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setDeleting(r)} />
                    </PermissionGate>
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
        pageGroups={TENANT_ROLE_PAGE_GROUPS}
        onClose={() => setAdding(false)}
        onSave={saveRole}
      />
      <RoleFormSheet
        open={!!editing}
        role={editing ?? undefined}
        pageGroups={TENANT_ROLE_PAGE_GROUPS}
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
