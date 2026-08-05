'use client'

import { useMemo, useState } from 'react'
import {
  Shield, Lock, Users, Search, Plus, Pencil, Eye, EyeOff,
  FilePlus, BookOpen, Edit3, Trash2, ChevronDown, ChevronRight,
} from 'lucide-react'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { TextareaTemplate } from '@/customComponents/TextareaTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { PaginationBar } from '@/customComponents/PaginationBar'
import { usePersistedState } from '@/lib/usePersistedState'
import { cn } from '@/lib/utils'
import {
  BUILT_IN_ROLES, BUILT_IN_ROLE_META, SEED_PLATFORM_USERS, SEED_CUSTOM_ROLES,
  PAGE_GROUPS, presetPermissionsFor, emptyPermission, fullPermission,
  type BuiltInRole, type PlatformUser, type CustomRole, type RolePermission,
} from '../_logics/userManagement'

type UMTab = 'users' | 'roles' | 'permissions'

const UM_TABS: { id: UMTab; Icon: React.ElementType; label: string }[] = [
  { id: 'users',       Icon: Users, label: 'Users' },
  { id: 'roles',       Icon: Shield, label: 'Roles' },
  { id: 'permissions', Icon: Lock,  label: 'Permissions' },
]

const ROLE_OPTIONS = BUILT_IN_ROLES.map(r => ({ value: r, label: BUILT_IN_ROLE_META[r].label }))

export function UserManagementTab() {
  const [tab, setTab] = usePersistedState<UMTab>('config-um-tab', 'users')

  const [users, setUsers]             = usePersistedState<PlatformUser[]>('um-users', SEED_PLATFORM_USERS)
  const [customRoles, setCustomRoles] = usePersistedState<CustomRole[]>('um-custom-roles', SEED_CUSTOM_ROLES)
  const [customPerms, setCustomPerms] = usePersistedState<RolePermission[]>('um-custom-perms', [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-0.5">
        <Shield className="w-5 h-5 shrink-0" style={{ color: 'var(--brand-forest)' }} />
        <h1 className="text-xl font-bold text-gray-900">User Management</h1>
      </div>
      <p className="text-sm text-gray-500 -mt-3 ml-7">Manage users, roles, and page-level permissions</p>

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

      {tab === 'users' && <UsersSection users={users} setUsers={setUsers} customRoles={customRoles} />}
      {tab === 'roles' && <RolesSection customRoles={customRoles} setCustomRoles={setCustomRoles} />}
      {tab === 'permissions' && (
        <PermissionsSection customRoles={customRoles} customPerms={customPerms} setCustomPerms={setCustomPerms} />
      )}
    </div>
  )
}

// ─── Users sub-tab ───────────────────────────────────────────────────────────

function UsersSection({
  users, setUsers, customRoles,
}: {
  users: PlatformUser[]
  setUsers: (v: PlatformUser[] | ((p: PlatformUser[]) => PlatformUser[])) => void
  customRoles: CustomRole[]
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<PlatformUser | null>(null)

  const filtered = useMemo(
    () => users.filter(u =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    ),
    [users, search]
  )

  const paged = pageSize === 0 ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize)

  function customRoleOptions() {
    return [{ value: '', label: '— None —' }, ...customRoles.map(r => ({ value: r.id, label: r.name }))]
  }

  function toggleStatus(id: string) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u))
  }

  function setCustomRole(id: string, customRoleId: string) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, customRoleId: customRoleId || null } : u))
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
        <ButtonTemplate variant="primary" size="sm" label="New User" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAdding(true)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Built-in Role</th>
                <th className="px-4 py-3 font-semibold">Custom Role</th>
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
                    <BadgeTemplate label={BUILT_IN_ROLE_META[u.builtInRole].label} variant="info" size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <SelectTemplate
                      size="sm"
                      options={customRoleOptions()}
                      value={u.customRoleId ?? ''}
                      onChange={e => setCustomRole(u.id, e.target.value)}
                      className="min-w-[9rem]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(u.id)}>
                      <BadgeTemplate label={u.isActive ? 'Active' : 'Disabled'} variant={u.isActive ? 'success' : 'neutral'} size="sm" />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ButtonTemplate variant="ghost" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setEditing(u)} />
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No users found</td></tr>
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
        customRoles={customRoles}
        onClose={() => setAdding(false)}
        onSave={(u) => { setUsers(prev => [...prev, u]); setAdding(false) }}
      />
      <UserFormSheet
        open={!!editing}
        title="Edit User"
        customRoles={customRoles}
        initial={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSave={(u) => { setUsers(prev => prev.map(p => p.id === u.id ? u : p)); setEditing(null) }}
      />
    </div>
  )
}

function UserFormSheet({
  open, title, customRoles, initial, onClose, onSave,
}: {
  open: boolean
  title: string
  customRoles: CustomRole[]
  initial?: PlatformUser
  onClose: () => void
  onSave: (u: PlatformUser) => void
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [builtInRole, setBuiltInRole] = useState<BuiltInRole>(initial?.builtInRole ?? 'staff')
  const [customRoleId, setCustomRoleId] = useState(initial?.customRoleId ?? '')

  // reset local state whenever a different record (or a fresh add) opens
  const key = initial?.id ?? 'new'
  const [lastKey, setLastKey] = useState(key)
  if (lastKey !== key) {
    setLastKey(key)
    setFullName(initial?.fullName ?? '')
    setEmail(initial?.email ?? '')
    setPhone(initial?.phone ?? '')
    setPassword('')
    setBuiltInRole(initial?.builtInRole ?? 'staff')
    setCustomRoleId(initial?.customRoleId ?? '')
  }

  const isEdit = !!initial
  const valid = fullName.trim() && email.trim() && phone.trim() && (isEdit || password.length >= 6)

  function submit() {
    if (!valid) return
    onSave({
      id: initial?.id ?? `u-${Date.now()}`,
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      builtInRole,
      customRoleId: customRoleId || null,
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
        <InputTemplate label="Full Name" isRequired value={fullName} onChange={e => setFullName(e.target.value)} />
        <InputTemplate label="Email" type="email" isRequired value={email} onChange={e => setEmail(e.target.value)} />
        <InputTemplate label="Phone" isRequired value={phone} onChange={e => setPhone(e.target.value)} />
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
        <div className="grid grid-cols-2 gap-3">
          <SelectTemplate label="Built-in Role" options={ROLE_OPTIONS} value={builtInRole} onChange={e => setBuiltInRole(e.target.value as BuiltInRole)} />
          <SelectTemplate
            label="Custom Role"
            options={[{ value: '', label: '— None —' }, ...customRoles.map(r => ({ value: r.id, label: r.name }))]}
            value={customRoleId}
            onChange={e => setCustomRoleId(e.target.value)}
          />
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          The built-in role controls which portal the user sees. A custom role adds fine-grained page permissions on top.
        </p>
      </div>
    </SheetTemplate>
  )
}

// ─── Roles sub-tab ───────────────────────────────────────────────────────────

function RolesSection({
  customRoles, setCustomRoles,
}: {
  customRoles: CustomRole[]
  setCustomRoles: (v: CustomRole[] | ((p: CustomRole[]) => CustomRole[])) => void
}) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<CustomRole | null>(null)
  const [deleting, setDeleting] = useState<CustomRole | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  function openAdd() { setName(''); setDescription(''); setAdding(true) }
  function openEdit(r: CustomRole) { setEditing(r); setName(r.name); setDescription(r.description) }

  function submit() {
    if (!name.trim()) return
    if (editing) {
      setCustomRoles(prev => prev.map(r => r.id === editing.id ? { ...r, name: name.trim(), description: description.trim() } : r))
      setEditing(null)
    } else {
      setCustomRoles(prev => [...prev, { id: `crole-${Date.now()}`, name: name.trim(), description: description.trim(), isSystem: false }])
      setAdding(false)
    }
  }

  function confirmDelete() {
    if (!deleting) return
    setCustomRoles(prev => prev.filter(r => r.id !== deleting.id))
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <ButtonTemplate variant="primary" size="sm" label="New Role" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openAdd} />
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Built-in Roles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BUILT_IN_ROLES.map(r => (
            <div key={r} className="rounded-xl border p-4" style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-gray-900">{BUILT_IN_ROLE_META[r].label}</p>
                <BadgeTemplate label="Built-in" variant="warning" size="sm" />
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{BUILT_IN_ROLE_META[r].description}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Custom Roles</h3>
        {customRoles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-14 text-gray-400">
            <Shield className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No custom roles yet. Click &quot;New Role&quot; to create one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customRoles.map(r => (
              <div key={r.id} className="rounded-xl border p-4 flex flex-col gap-2" style={{ backgroundColor: 'var(--brand-mint)', borderColor: 'var(--brand-light)' }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--brand-forest)' }}>{r.name}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openEdit(r)} />
                    <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setDeleting(r)} />
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{r.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <SheetTemplate
        open={adding || !!editing}
        onClose={() => { setAdding(false); setEditing(null) }}
        title={editing ? 'Edit Role' : 'New Role'}
        footer={
          <div className="col-span-2 flex justify-end gap-2">
            <ButtonTemplate variant="outline" label="Cancel" onClick={() => { setAdding(false); setEditing(null) }} />
            <ButtonTemplate variant="primary" label={editing ? 'Save Changes' : 'Create Role'} isDisabled={!name.trim()} onClick={submit} />
          </div>
        }
      >
        <div className="px-6 py-5 flex flex-col gap-4">
          <InputTemplate label="Role Name" isRequired value={name} onChange={e => setName(e.target.value)} />
          <TextareaTemplate label="Description" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </SheetTemplate>

      <ConfirmModal
        open={!!deleting}
        title="Delete Role"
        message={`Delete "${deleting?.name}"? Users assigned this custom role will fall back to their built-in role only.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}

// ─── Permissions sub-tab ─────────────────────────────────────────────────────

const FLAG_ICONS: { key: keyof Omit<RolePermission, 'roleId' | 'pageKey'>; Icon: React.ElementType; label: string }[] = [
  { key: 'view',   Icon: Eye,      label: 'View'   },
  { key: 'create', Icon: FilePlus, label: 'Create' },
  { key: 'read',   Icon: BookOpen, label: 'Read'   },
  { key: 'update', Icon: Edit3,    label: 'Update' },
  { key: 'delete', Icon: Trash2,   label: 'Delete' },
]

function PermissionsSection({
  customRoles, customPerms, setCustomPerms,
}: {
  customRoles: CustomRole[]
  customPerms: RolePermission[]
  setCustomPerms: (v: RolePermission[] | ((p: RolePermission[]) => RolePermission[])) => void
}) {
  const [selectedRole, setSelectedRole] = useState<string>(BUILT_IN_ROLES[0])
  const isBuiltIn = (BUILT_IN_ROLES as string[]).includes(selectedRole)

  const [draft, setDraft] = useState<RolePermission[] | null>(null)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ 'Staff Portal': true })

  const basePerms: RolePermission[] = useMemo(() => {
    if (isBuiltIn) return presetPermissionsFor(selectedRole as BuiltInRole)
    const existing = customPerms.filter(p => p.roleId === selectedRole)
    if (existing.length > 0) return existing
    return PAGE_GROUPS.flatMap(g => g.pages).map(p => emptyPermission(selectedRole, p))
  }, [selectedRole, isBuiltIn, customPerms])

  const activePerms = draft ?? basePerms
  const dirty = !isBuiltIn && draft !== null

  function selectRole(id: string) {
    setSelectedRole(id)
    setDraft(null)
  }

  function updateFlag(pageKey: string, key: keyof Omit<RolePermission, 'roleId' | 'pageKey'>, value: boolean) {
    if (isBuiltIn) return
    setDraft(prev => {
      const base = prev ?? basePerms
      return base.map(p => p.pageKey === pageKey ? { ...p, [key]: value } : p)
    })
  }

  function setAllForPage(pageKey: string, value: boolean) {
    if (isBuiltIn) return
    setDraft(prev => {
      const base = prev ?? basePerms
      return base.map(p => p.pageKey === pageKey ? { ...p, view: value, create: value, read: value, update: value, delete: value } : p)
    })
  }

  function grantAll(value: boolean) {
    if (isBuiltIn) return
    setDraft(PAGE_GROUPS.flatMap(g => g.pages).map(p => value ? fullPermission(selectedRole, p) : emptyPermission(selectedRole, p)))
  }

  function grantAllForGroup(group: string, value: boolean) {
    if (isBuiltIn) return
    setDraft(prev => {
      const base = prev ?? basePerms
      const groupPages = new Set(PAGE_GROUPS.find(g => g.group === group)?.pages ?? [])
      return base.map(p => groupPages.has(p.pageKey) ? (value ? fullPermission(selectedRole, p.pageKey) : emptyPermission(selectedRole, p.pageKey)) : p)
    })
  }

  function save() {
    if (!draft) return
    setCustomPerms(prev => [...prev.filter(p => p.roleId !== selectedRole), ...draft])
    setDraft(null)
  }

  function groupStatus(group: string): 'All granted' | 'Partial' | 'None granted' {
    const groupPages = new Set(PAGE_GROUPS.find(g => g.group === group)?.pages ?? [])
    const rows = activePerms.filter(p => groupPages.has(p.pageKey))
    const flags = rows.flatMap(r => [r.view, r.create, r.read, r.update, r.delete])
    if (flags.every(f => f)) return 'All granted'
    if (flags.some(f => f)) return 'Partial'
    return 'None granted'
  }

  const roleOptions = [
    ...BUILT_IN_ROLES.map(r => ({ value: r, label: BUILT_IN_ROLE_META[r].label, group: 'Built-in Roles' })),
    ...customRoles.map(r => ({ value: r.id, label: r.name, group: 'Custom Roles' })),
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-64">
          <SelectTemplate
            label="Role"
            labelVariant="compact"
            value={selectedRole}
            onChange={e => selectRole(e.target.value)}
            options={roleOptions.map(o => ({ value: o.value, label: `${o.label}${o.group === 'Built-in Roles' ? ' (Built-in)' : ' (Custom)'}` }))}
          />
        </div>
        {!isBuiltIn && (
          <div className="flex items-center gap-2">
            <ButtonTemplate variant="outline" size="sm" label="Revoke All" onClick={() => grantAll(false)} />
            <ButtonTemplate variant="secondary" size="sm" label="Grant All" onClick={() => grantAll(true)} />
          </div>
        )}
      </div>

      {isBuiltIn && (
        <div className="rounded-xl border px-4 py-3 text-sm" style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E' }}>
          Built-in role permissions are preset and cannot be modified.
        </div>
      )}

      {dirty && (
        <div className="rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-sm" style={{ backgroundColor: 'var(--brand-mint)', borderColor: 'var(--brand-light)', color: 'var(--brand-forest)' }}>
          <span>You have unsaved changes. Click Save Changes to apply them.</span>
          <div className="flex items-center gap-2 shrink-0">
            <ButtonTemplate variant="outline" size="sm" label="Reset" onClick={() => setDraft(null)} />
            <ButtonTemplate variant="primary" size="sm" label="Save Changes" onClick={save} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {PAGE_GROUPS.map(({ group, pages }) => {
          const open = openGroups[group] ?? false
          const status = groupStatus(group)
          const statusVariant = status === 'All granted' ? 'success' : status === 'Partial' ? 'warning' : 'neutral'
          return (
            <div key={group} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                onClick={() => setOpenGroups(prev => ({ ...prev, [group]: !open }))}
              >
                {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <p className="text-sm font-semibold text-gray-900 flex-1">{group}</p>
                <BadgeTemplate label={status} variant={statusVariant} size="sm" />
                {!isBuiltIn && (
                  <div className="flex items-center gap-2 text-xs" onClick={e => e.stopPropagation()}>
                    <button className="font-medium hover:underline" style={{ color: 'var(--brand-forest)' }} onClick={() => grantAllForGroup(group, true)}>Grant all</button>
                    <span className="text-gray-300">·</span>
                    <button className="font-medium text-gray-400 hover:underline" onClick={() => grantAllForGroup(group, false)}>Revoke all</button>
                  </div>
                )}
              </div>

              {open && (
                <div className="border-t border-gray-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-gray-400">
                        <th className="px-4 py-2 font-semibold">Page</th>
                        {FLAG_ICONS.map(({ key, Icon, label }) => (
                          <th key={key} className="px-3 py-2 font-semibold text-center">
                            <span className="inline-flex items-center gap-1"><Icon className="w-3 h-3" />{label}</span>
                          </th>
                        ))}
                        <th className="px-3 py-2 font-semibold text-center">All</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pages.map(page => {
                        const row = activePerms.find(p => p.pageKey === page) ?? emptyPermission(selectedRole, page)
                        const allOn = row.view && row.create && row.read && row.update && row.delete
                        return (
                          <tr key={page}>
                            <td className="px-4 py-2.5 text-gray-700">{page}</td>
                            {FLAG_ICONS.map(({ key }) => (
                              <td key={key} className="px-3 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={row[key]}
                                  disabled={isBuiltIn}
                                  onChange={e => updateFlag(page, key, e.target.checked)}
                                  className="w-4 h-4 accent-current disabled:opacity-40"
                                  style={{ accentColor: 'var(--brand-forest)' }}
                                />
                              </td>
                            ))}
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={allOn}
                                disabled={isBuiltIn}
                                onChange={e => setAllForPage(page, e.target.checked)}
                                className="w-4 h-4 disabled:opacity-40"
                                style={{ accentColor: 'var(--brand-forest)' }}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
