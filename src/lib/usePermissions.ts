'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { usePersistedState } from '@/lib/usePersistedState'
import { SEED_TENANT_ROLES, type Role, type RolePermission } from '@/dataCenter/roles'
import { SEED_PLATFORM_USERS, type PlatformUser } from '@/app/(admin)/dashboard/Configuration/_logics/userManagement'
import {
  can, pageKeyForRoute, permissionFor, unrestrictedPermission,
  type PermissionAction,
} from '@/lib/permissions'
import type { UserRole } from '@/app/login/_logics/interface'

export const TENANT_ROLES_KEY = 'tenant-roles'
export const TENANT_USERS_KEY = 'um-users'

export interface PermissionState {
  /** The resolved tenant Role, or null for Super Admin / unresolved sessions. */
  role:        Role | null
  /** Auth role from the session cookie. */
  sessionRole: UserRole
  /** True once the session fetch has settled — gate redirects on this to avoid a flash. */
  ready:       boolean
  /** Super Admin bypasses the tenant permission grid entirely. */
  isSuperAdmin: boolean
  /** Full permission row for a page key. */
  permission:  (pageKey: string) => RolePermission
  /** True when the current user may perform `action` on `pageKey`. */
  can:         (pageKey: string, action: PermissionAction) => boolean
  /** Permission row for the page the user is currently on (all-true when the route is ungated). */
  current:     RolePermission
  /** Page key governing the current route, or null when ungated. */
  currentPageKey: string | null
}

/**
 * Resolves the signed-in user's tenant Role and exposes page × action checks.
 *
 * Resolution order: the session cookie gives us a display name and auth role;
 * we match that name against the configured tenant users (Configuration >
 * User Management) to find their roleId, then look that role up in the
 * persisted role grid. Super Admin — and any session we cannot match to a
 * configured tenant user — is treated as unrestricted so existing demo logins
 * and the platform-operator portal behave exactly as before.
 */
export function usePermissions(): PermissionState {
  const pathname = usePathname()
  const [roles] = usePersistedState<Role[]>(TENANT_ROLES_KEY, SEED_TENANT_ROLES)
  const [users] = usePersistedState<PlatformUser[]>(TENANT_USERS_KEY, SEED_PLATFORM_USERS)

  const [sessionRole, setSessionRole] = useState<UserRole>('staff')
  const [userName, setUserName] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(session => {
        if (cancelled) return
        if (session?.role) setSessionRole(session.role)
        if (session?.user?.name) setUserName(session.user.name)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReady(true) })
    return () => { cancelled = true }
  }, [])

  const isSuperAdmin = sessionRole === 'super_admin'

  const role = useMemo<Role | null>(() => {
    if (isSuperAdmin || !userName) return null
    const matchedUser = users.find(u => u.fullName.toLowerCase() === userName.toLowerCase())
    if (!matchedUser) return null
    return roles.find(r => r.id === matchedUser.roleId) ?? null
  }, [isSuperAdmin, userName, users, roles])

  // No resolvable tenant role => unrestricted, so nothing silently disappears
  // for a session that predates permission configuration.
  const unrestricted = isSuperAdmin || role === null

  const permission = useMemo(
    () => (pageKey: string): RolePermission =>
      unrestricted ? unrestrictedPermission(pageKey) : permissionFor(role, pageKey),
    [unrestricted, role],
  )

  const check = useMemo(
    () => (pageKey: string, action: PermissionAction): boolean =>
      unrestricted ? true : can(role, pageKey, action),
    [unrestricted, role],
  )

  const currentPageKey = pageKeyForRoute(pathname)
  const current = currentPageKey ? permission(currentPageKey) : unrestrictedPermission('__ungated__')

  return { role, sessionRole, ready, isSuperAdmin, permission, can: check, current, currentPageKey }
}
