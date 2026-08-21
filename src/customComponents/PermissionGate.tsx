'use client'

import { usePermissions } from '@/lib/usePermissions'
import type { PermissionAction } from '@/lib/permissions'

export interface PermissionGateProps {
  /** Page key from TENANT_ROLE_PAGE_GROUPS. Omit to use the page the user is currently on. */
  pageKey?: string
  /** The CRUD verb this UI performs. */
  action:   PermissionAction
  /** Rendered only when the role holds the grant. */
  children: React.ReactNode
  /** Rendered instead when the grant is missing. Defaults to nothing. */
  fallback?: React.ReactNode
}

/**
 * Hides an action control (New / Edit / Delete buttons, bulk tools, inline
 * add-rows) from roles that lack the matching grant on the page. Pair with
 * PermissionGuard, which handles whole-route access.
 */
export function PermissionGate({ pageKey, action, children, fallback = null }: PermissionGateProps) {
  const { permission, currentPageKey } = usePermissions()
  const key = pageKey ?? currentPageKey
  // An ungated route places no restriction on its actions.
  if (!key) return <>{children}</>
  return permission(key)[action] ? <>{children}</> : <>{fallback}</>
}
