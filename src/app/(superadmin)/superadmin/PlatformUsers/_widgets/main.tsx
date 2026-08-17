'use client'

import { useState } from 'react'
import { Users, Search, UserX, UserCheck2, Plus, Eye, EyeOff, Pencil, Mail, Phone, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { usePersistedState } from '@/lib/usePersistedState'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { PersonAvatar } from '@/customComponents/PersonAvatar'
import { SEED_PLATFORM_USERS, type PlatformUser } from '@/app/(admin)/dashboard/Configuration/_logics/userManagement'
import { SEED_SUPER_ADMIN_ROLES, type Role } from '@/dataCenter/roles'
import { AUDIT_LOG_KEY, SEED_AUDIT_LOG, newAuditEntry } from '../../AuditLog/_logics/functions'
import type { AuditLogEntry } from '../../AuditLog/_logics/interface'

const CURRENT_ACTOR = 'Nana Adjei'

interface UserFormSheetProps {
  open: boolean
  title: string
  roles: Role[]
  initial?: PlatformUser
  onClose: () => void
  onSave: (u: PlatformUser) => void
  onBack?: () => void
}

function UserFormSheet({ open, title, roles, initial, onClose, onSave, onBack }: UserFormSheetProps) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [roleId, setRoleId] = useState(initial?.roleId ?? roles[0]?.id ?? '')

  const isEdit = !!initial
  const key = initial?.id ?? 'new'
  const [lastKey, setLastKey] = useState(key)
  if (lastKey !== key) {
    setLastKey(key)
    setFullName(initial?.fullName ?? '')
    setEmail(initial?.email ?? '')
    setPhone(initial?.phone ?? '')
    setPassword('')
    setRoleId(initial?.roleId ?? roles[0]?.id ?? '')
  }

  function reset() {
    setFullName(''); setEmail(''); setPhone(''); setPassword('')
    setRoleId(roles[0]?.id ?? '')
  }

  const valid = fullName.trim() && email.trim() && phone.trim() && roleId && (isEdit || password.length >= 6)

  function submit() {
    if (!valid) return
    onSave({
      id: initial?.id ?? `u-${Date.now()}`,
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      roleId,
      isActive: initial?.isActive ?? true,
    })
    if (!isEdit) reset()
  }

  return (
    <SheetTemplate
      open={open}
      onClose={() => { if (!isEdit) reset(); onClose() }}
      onBack={onBack}
      title={title}
      footer={
        <div className="col-span-2 flex justify-end gap-2">
          <ButtonTemplate variant="outline" label="Cancel" onClick={() => { if (!isEdit) reset(); onClose() }} />
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
        <SelectTemplate
          label="Role"
          options={roles.map(r => ({ value: r.id, label: `${r.name}${r.isSystem ? ' (Built-in)' : ''}` }))}
          value={roleId}
          onChange={e => setRoleId(e.target.value)}
        />
        <p className="text-xs text-gray-400 leading-relaxed">
          The assigned role determines which pages this user can view and what actions they can take on each.
        </p>
      </div>
    </SheetTemplate>
  )
}

function UserDetailSheet({
  open, user, roles, onClose, onEdit,
}: {
  open: boolean
  user: PlatformUser | null
  roles: Role[]
  onClose: () => void
  onEdit: () => void
}) {
  if (!user) return null
  const role = roles.find(r => r.id === user.roleId)

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title={user.fullName}
      subtitle={role?.name ?? 'Unknown Role'}
      headerExtra={
        <ButtonTemplate variant="outline" size="sm" label="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={onEdit} />
      }
    >
      <div className="px-6 py-5 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <PersonAvatar name={user.fullName} size={48} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <BadgeTemplate label={user.isActive ? 'Active' : 'Inactive'} variant={user.isActive ? 'success' : 'neutral'} size="sm" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5 text-sm">
            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-700">{user.email}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-700">{user.phone}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <Shield className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-700">{role?.name ?? 'Unknown Role'}</span>
          </div>
        </div>

        <div className="rounded-xl border p-4" style={{ backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' }}>
          <p className="text-xs text-gray-500 leading-relaxed">{role?.description ?? 'This role no longer exists.'}</p>
        </div>
      </div>
    </SheetTemplate>
  )
}

export function Main() {
  const [users, setUsers] = usePersistedState<PlatformUser[]>('um-users', SEED_PLATFORM_USERS)
  const [roles] = usePersistedState<Role[]>('super-admin-roles', SEED_SUPER_ADMIN_ROLES)
  const [, setAuditLog] = usePersistedState<AuditLogEntry[]>(AUDIT_LOG_KEY, SEED_AUDIT_LOG)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [viewing, setViewing] = useState<PlatformUser | null>(null)
  const [editing, setEditing] = useState<PlatformUser | null>(null)
  const [editedFromDetail, setEditedFromDetail] = useState(false)

  const superAdminUsers = users.filter(u => roles.some(r => r.id === u.roleId))

  const filtered = superAdminUsers.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  function toggleActive(u: PlatformUser) {
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isActive: !x.isActive } : x))
    toast.success(`${u.fullName} ${u.isActive ? 'deactivated' : 'reactivated'}`)
  }

  function saveEdit(u: PlatformUser) {
    setUsers(prev => prev.map(x => x.id === u.id ? u : x))
    setAuditLog(prev => [...prev, newAuditEntry('platform_user', u.fullName, 'updated', CURRENT_ACTOR)])
    toast.success(`${u.fullName} updated`)
    if (editedFromDetail) { setViewing(u); setEditedFromDetail(false) }
    setEditing(null)
  }

  function closeEdit() {
    if (editedFromDetail && editing) { setViewing(editing); setEditedFromDetail(false) }
    setEditing(null)
  }

  function backFromEdit() {
    if (editing) setViewing(editing)
    setEditedFromDetail(false)
    setEditing(null)
  }

  function roleLabel(u: PlatformUser) {
    return roles.find(r => r.id === u.roleId)?.name ?? 'Unknown Role'
  }

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--surface-page)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#1f2937' }}>
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>Platform Users</h1>
            <p className="text-sm" style={{ color: 'var(--brand-slate)' }}>Super Admin platform-operator accounts</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64">
            <InputTemplate
              placeholder="Search name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5 text-gray-400" />}
            />
          </div>
          <ButtonTemplate variant="primary" label="Add User" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAdding(true)} />
        </div>
      </div>

      <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No users match this search.</p>
        ) : filtered.map(u => (
          <div
            key={u.id}
            className="flex items-center gap-3 px-4 py-3 border-b border-(--brand-pale)/30 last:border-b-0 cursor-pointer hover:bg-gray-50/60 transition-colors"
            onClick={() => setViewing(u)}
          >
            <PersonAvatar name={u.fullName} size={32} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900 truncate">{u.fullName}</p>
                <BadgeTemplate label={roleLabel(u)} variant="info" size="sm" />
                {!u.isActive && <BadgeTemplate label="Inactive" variant="neutral" size="sm" />}
              </div>
              <p className="text-xs text-gray-400 truncate">{u.email} · {u.phone}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
              <ButtonTemplate
                variant="outline" size="sm" isIcon tooltip="Edit"
                leftIcon={<Pencil className="w-3.5 h-3.5" />}
                onClick={() => setEditing(u)}
              />
              <ButtonTemplate
                variant={u.isActive ? 'outline' : 'primary'}
                size="sm"
                label={u.isActive ? 'Deactivate' : 'Reactivate'}
                leftIcon={u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck2 className="w-3.5 h-3.5" />}
                className={u.isActive ? 'text-red-600 border-red-200 hover:bg-red-50' : undefined}
                onClick={() => toggleActive(u)}
              />
            </div>
          </div>
        ))}
      </div>

      <UserDetailSheet
        open={!!viewing}
        user={viewing}
        roles={roles}
        onClose={() => setViewing(null)}
        onEdit={() => { setEditing(viewing); setEditedFromDetail(true); setViewing(null) }}
      />

      <UserFormSheet
        open={!!editing}
        title="Edit User"
        roles={roles}
        initial={editing ?? undefined}
        onClose={closeEdit}
        onBack={editedFromDetail ? backFromEdit : undefined}
        onSave={saveEdit}
      />

      <UserFormSheet
        open={adding}
        title="New Platform User"
        roles={roles}
        onClose={() => setAdding(false)}
        onSave={(u) => {
          setUsers(prev => [...prev, u])
          setAuditLog(prev => [...prev, newAuditEntry('platform_user', u.fullName, 'created', CURRENT_ACTOR)])
          toast.success(`${u.fullName} added`)
          setAdding(false)
        }}
      />
    </div>
  )
}
