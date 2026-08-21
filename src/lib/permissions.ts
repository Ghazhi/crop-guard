// ─── Tenant permission resolution ────────────────────────────────────────────
// Prototype-only: no real backend. Tenant (non-super-admin) users are gated by
// the Role grid configured in Configuration > User Management > Roles, which
// persists under the 'tenant-roles' key. This module is the single source of
// truth for turning "which role am I" into "what may I see and do".
//
// Super Admin is deliberately NOT gated here — it keeps unrestricted access to
// the platform-operator portal, exactly as before. Only tenant roles resolve
// through the permission grid.

import type { Role, RolePermission } from '@/dataCenter/roles'
import { emptyPermission, fullPermission } from '@/dataCenter/roles'

/** The CRUD verbs a role can be granted on a page. `view` controls nav + route access. */
export type PermissionAction = 'view' | 'create' | 'read' | 'update' | 'delete'

/**
 * Maps a nav href to the permission page key used in the Role grid
 * (see TENANT_ROLE_PAGE_GROUPS). Longest-prefix wins, so a sub-route inherits
 * its parent portal's key unless it declares its own.
 */
const ROUTE_PAGE_KEYS: { prefix: string; pageKey: string }[] = [
  // Staff portal
  { prefix: '/dashboard/Dashboard',            pageKey: 'Dashboard' },
  { prefix: '/dashboard/Governance',           pageKey: 'Cooperative Governance' },
  { prefix: '/dashboard/FarmersRegistry',      pageKey: 'Farmer Registry' },
  { prefix: '/dashboard/FarmerDetail',         pageKey: 'Farmer Registry' },
  { prefix: '/dashboard/ProgramsSetup',        pageKey: 'Programs Setup' },
  { prefix: '/dashboard/AgentAssignment',      pageKey: 'Agent Assignment' },
  { prefix: '/dashboard/CheckinConfig',        pageKey: 'Check-in Config' },
  { prefix: '/dashboard/CommunityProfile',     pageKey: 'Community Profiling' },
  { prefix: '/dashboard/Insights',             pageKey: 'Insights' },
  { prefix: '/dashboard/Configuration',        pageKey: 'Configuration' },
  { prefix: '/dashboard/TrainingMaterials',    pageKey: 'Programs Setup' },

  // Analytics & intelligence
  { prefix: '/dashboard/FRIDashboard',         pageKey: 'FRI Dashboard' },
  { prefix: '/dashboard/RiskIntelligence',     pageKey: 'Risk Intelligence' },
  { prefix: '/dashboard/Reports',              pageKey: 'Reports' },

  // Portals
  { prefix: '/dashboard/OpportunityPathways',  pageKey: 'Opportunities / Interventions' },
  { prefix: '/dashboard/PartnerDirectory',     pageKey: 'Partner / MERL' },
  { prefix: '/dashboard/PartnerPortal',        pageKey: 'Partner / MERL' },
  { prefix: '/dashboard/FinancePortal',        pageKey: 'Finance & Insurance' },

  // Program Manager — sub-routes first so they beat the bare portal prefix
  { prefix: '/dashboard/ProgramManager/Programs',       pageKey: 'Programs & Cohorts' },
  { prefix: '/dashboard/ProgramManager/Farmers',        pageKey: 'Farmer Management' },
  { prefix: '/dashboard/ProgramManager/Partners',       pageKey: 'Partners' },
  { prefix: '/dashboard/ProgramManager/Verification',   pageKey: 'Verification & Review' },
  { prefix: '/dashboard/ProgramManager/FRIPerformance', pageKey: 'FRI & Performance' },
  { prefix: '/dashboard/ProgramManager/Interventions',  pageKey: 'Interventions' },
  { prefix: '/dashboard/ProgramManager/Reports',        pageKey: 'Reports' },
  { prefix: '/dashboard/ProgramManager/Settings',       pageKey: 'PM Settings' },
  { prefix: '/dashboard/ProgramManager/Cohorts',        pageKey: 'Programs & Cohorts' },
  { prefix: '/dashboard/ProgramManager/WeeklyProgress', pageKey: 'FRI & Performance' },
  { prefix: '/dashboard/ProgramManager',                pageKey: 'Programs & Cohorts' },
]

/** Resolves the permission page key that governs a route, or null if the route is ungated. */
export function pageKeyForRoute(pathname: string): string | null {
  let best: { prefix: string; pageKey: string } | null = null
  for (const entry of ROUTE_PAGE_KEYS) {
    const matches = pathname === entry.prefix || pathname.startsWith(entry.prefix + '/')
    if (matches && (!best || entry.prefix.length > best.prefix.length)) best = entry
  }
  return best?.pageKey ?? null
}

/** The permission row for a page, defaulting to fully-denied when the role has no entry. */
export function permissionFor(role: Role | null | undefined, pageKey: string): RolePermission {
  if (!role) return emptyPermission('', pageKey)
  return role.permissions.find(p => p.pageKey === pageKey) ?? emptyPermission(role.id, pageKey)
}

/** True when the role is granted `action` on `pageKey`. */
export function can(role: Role | null | undefined, pageKey: string, action: PermissionAction): boolean {
  return permissionFor(role, pageKey)[action]
}

/**
 * The permission set applied to Super Admin and to any session we cannot resolve
 * a tenant role for — unrestricted, so the platform-operator portal and the
 * existing demo logins keep working exactly as they do today.
 */
export function unrestrictedPermission(pageKey: string): RolePermission {
  return fullPermission('__unrestricted__', pageKey)
}
