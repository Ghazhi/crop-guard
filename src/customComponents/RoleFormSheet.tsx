'use client'

import { useState } from 'react'
import { Eye, FilePlus, BookOpen, Edit3, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { TextareaTemplate } from '@/customComponents/TextareaTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { emptyPermission, fullPermission, type Role, type RolePermission } from '@/dataCenter/roles'

export interface RoleFormSheetProps {
  open:       boolean
  role?:      Role
  pageGroups: { group: string; pages: string[] }[]
  onClose:    () => void
  onSave:     (role: Role) => void
}

const FLAG_ICONS: { key: keyof Omit<RolePermission, 'roleId' | 'pageKey'>; Icon: React.ElementType; label: string }[] = [
  { key: 'view',   Icon: Eye,      label: 'View'   },
  { key: 'create', Icon: FilePlus, label: 'Create' },
  { key: 'read',   Icon: BookOpen, label: 'Read'   },
  { key: 'update', Icon: Edit3,    label: 'Update' },
  { key: 'delete', Icon: Trash2,   label: 'Delete' },
]

export function RoleFormSheet({ open, role, pageGroups, onClose, onSave }: RoleFormSheetProps) {
  // Placeholder roleId used only to satisfy RolePermission.roleId while the
  // sheet is open for a new (unsaved) role — the real id is stamped in submit().
  const DRAFT_ROLE_ID = '__draft__'

  const allPageKeys = pageGroups.flatMap(g => g.pages)
  const isEdit = !!role
  const roleId = role?.id ?? DRAFT_ROLE_ID

  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [perms, setPerms] = useState<RolePermission[]>(
    role ? allPageKeys.map(p => role.permissions.find(x => x.pageKey === p) ?? emptyPermission(roleId, p))
         : allPageKeys.map(p => emptyPermission(roleId, p))
  )
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ [pageGroups[0]?.group ?? '']: true })

  const key = role?.id ?? 'new'
  const [lastKey, setLastKey] = useState(key)
  if (lastKey !== key) {
    setLastKey(key)
    setName(role?.name ?? '')
    setDescription(role?.description ?? '')
    setPerms(role ? allPageKeys.map(p => role.permissions.find(x => x.pageKey === p) ?? emptyPermission(roleId, p))
                  : allPageKeys.map(p => emptyPermission(roleId, p)))
  }

  const hasAnyPermission = perms.some(p => p.view || p.create || p.read || p.update || p.delete)
  const valid = name.trim().length > 0 && hasAnyPermission

  function updateFlag(pageKey: string, k: keyof Omit<RolePermission, 'roleId' | 'pageKey'>, value: boolean) {
    setPerms(prev => prev.map(p => p.pageKey === pageKey ? { ...p, [k]: value } : p))
  }

  function setAllForPage(pageKey: string, value: boolean) {
    setPerms(prev => prev.map(p => p.pageKey === pageKey ? { ...p, view: value, create: value, read: value, update: value, delete: value } : p))
  }

  function grantAllForGroup(group: string, value: boolean) {
    const groupPages = new Set(pageGroups.find(g => g.group === group)?.pages ?? [])
    setPerms(prev => prev.map(p => groupPages.has(p.pageKey) ? (value ? fullPermission(roleId, p.pageKey) : emptyPermission(roleId, p.pageKey)) : p))
  }

  function groupStatus(group: string): 'All granted' | 'Partial' | 'None granted' {
    const groupPages = new Set(pageGroups.find(g => g.group === group)?.pages ?? [])
    const rows = perms.filter(p => groupPages.has(p.pageKey))
    const flags = rows.flatMap(r => [r.view, r.create, r.read, r.update, r.delete])
    if (flags.every(f => f)) return 'All granted'
    if (flags.some(f => f)) return 'Partial'
    return 'None granted'
  }

  function submit() {
    if (!valid) return
    const id = role?.id ?? `role-${Date.now()}`
    onSave({
      id,
      name: isEdit && role?.isSystem ? role.name : name.trim(),
      description: description.trim(),
      isSystem: role?.isSystem ?? false,
      permissions: perms.map(p => ({ ...p, roleId: id })),
    })
  }

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit Role — ${role!.name}` : 'New Role'}
      size="xl"
      footer={
        <div className="col-span-2 flex justify-end gap-2">
          <ButtonTemplate variant="outline" label="Cancel" onClick={onClose} />
          <ButtonTemplate variant="primary" label={isEdit ? 'Save Changes' : 'Create Role'} isDisabled={!valid} onClick={submit} />
        </div>
      }
    >
      <div className="px-6 py-5 flex flex-col gap-5">
        <InputTemplate
          label="Role Name" isRequired
          value={name}
          onChange={e => setName(e.target.value)}
          isDisabled={isEdit && role?.isSystem}
          hint={isEdit && role?.isSystem ? 'Role name cannot be changed once created' : undefined}
        />
        <TextareaTemplate label="Description" value={description} onChange={e => setDescription(e.target.value)} />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Permissions</p>
            {!hasAnyPermission && (
              <span className="text-xs" style={{ color: 'var(--brand-red)' }}>Select at least one permission</span>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {pageGroups.map(({ group, pages }) => {
              const open = openGroups[group] ?? false
              const status = groupStatus(group)
              return (
                <div key={group} className="rounded-xl border border-gray-100 overflow-hidden">
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer bg-gray-50/60"
                    onClick={() => setOpenGroups(prev => ({ ...prev, [group]: !open }))}
                  >
                    {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                    <p className="text-xs font-semibold text-gray-800 flex-1">{group}</p>
                    <span className="text-[10px] text-gray-400">{status}</span>
                    <div className="flex items-center gap-1.5 text-[11px]" onClick={e => e.stopPropagation()}>
                      <button className="font-medium hover:underline" style={{ color: 'var(--brand-forest)' }} onClick={() => grantAllForGroup(group, true)}>All</button>
                      <span className="text-gray-300">·</span>
                      <button className="font-medium text-gray-400 hover:underline" onClick={() => grantAllForGroup(group, false)}>None</button>
                    </div>
                  </div>

                  {open && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                            <th className="px-3 py-1.5 font-semibold">Page</th>
                            {FLAG_ICONS.map(({ key, Icon, label }) => (
                              <th key={key} className="px-2 py-1.5 font-semibold text-center">
                                <span className="inline-flex items-center gap-0.5"><Icon className="w-2.5 h-2.5" />{label}</span>
                              </th>
                            ))}
                            <th className="px-2 py-1.5 font-semibold text-center">All</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {pages.map(page => {
                            const row = perms.find(p => p.pageKey === page) ?? emptyPermission(roleId, page)
                            const allOn = row.view && row.create && row.read && row.update && row.delete
                            return (
                              <tr key={page}>
                                <td className="px-3 py-1.5 text-gray-700">{page}</td>
                                {FLAG_ICONS.map(({ key }) => (
                                  <td key={key} className="px-2 py-1.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={row[key]}
                                      onChange={e => updateFlag(page, key, e.target.checked)}
                                      className="w-3.5 h-3.5"
                                      style={{ accentColor: 'var(--brand-forest)' }}
                                    />
                                  </td>
                                ))}
                                <td className="px-2 py-1.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={allOn}
                                    onChange={e => setAllForPage(page, e.target.checked)}
                                    className="w-3.5 h-3.5"
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
      </div>
    </SheetTemplate>
  )
}
