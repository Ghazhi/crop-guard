// ─── Unified Role model ──────────────────────────────────────────────────────
// Prototype-only: no real backend. A Role bundles a name, description, and a
// full page × action permission grid. There are two entirely separate role
// spaces — Super Admin roles (platform-operator side) and Tenant/staff-portal
// roles — each with its own persisted store, since a tenant's roles have no
// bearing on the Super Admin platform and vice versa.

export interface RolePermission {
  roleId:  string
  pageKey: string
  view:    boolean
  create:  boolean
  read:    boolean
  update:  boolean
  delete:  boolean
}

export interface Role {
  id:          string
  name:        string
  description: string
  isSystem:    boolean
  permissions: RolePermission[]
}

export function emptyPermission(roleId: string, pageKey: string): RolePermission {
  return { roleId, pageKey, view: false, create: false, read: false, update: false, delete: false }
}

export function fullPermission(roleId: string, pageKey: string): RolePermission {
  return { roleId, pageKey, view: true, create: true, read: true, update: true, delete: true }
}

function presetPages(roleId: string, allKeys: string[], grantedPages: string[], deleteAllowed = false): RolePermission[] {
  return allKeys.map(p =>
    grantedPages.includes(p)
      ? { ...fullPermission(roleId, p), delete: deleteAllowed }
      : emptyPermission(roleId, p)
  )
}

// ─── Tenant / staff-portal roles ─────────────────────────────────────────────

export const TENANT_ROLE_PAGE_GROUPS: { group: string; pages: string[] }[] = [
  { group: 'Staff Portal', pages: ['Farmer Registry', 'Programs Setup', 'Agent Assignment', 'Check-in Config', 'Community Profiling', 'Cooperative Governance', 'User Management'] },
  { group: 'Analytics & Intelligence', pages: ['FRI Dashboard', 'Risk Intelligence', 'Intelligence Dashboard', 'Reports'] },
  { group: 'Portals', pages: ['Opportunities / Interventions', 'Credits Module', 'Finance & Insurance', 'Partner / MERL', 'Agronomist'] },
]

export const ALL_TENANT_PAGE_KEYS: string[] = TENANT_ROLE_PAGE_GROUPS.flatMap(g => g.pages)

export const SEED_TENANT_ROLES: Role[] = [
  {
    id: 'role-admin', name: 'Admin', isSystem: false,
    description: 'Full staff-portal access plus user & permission management.',
    permissions: ALL_TENANT_PAGE_KEYS.map(p => fullPermission('role-admin', p)),
  },
  {
    id: 'role-staff', name: 'Staff', isSystem: false,
    description: 'Programs & field-operations team — registry, enrollment, check-ins, governance.',
    permissions: presetPages('role-staff', ALL_TENANT_PAGE_KEYS, ['Farmer Registry', 'Programs Setup', 'Agent Assignment', 'Check-in Config', 'Community Profiling', 'Cooperative Governance']),
  },
  {
    id: 'role-agent', name: 'Field Agent', isSystem: false,
    description: 'Front-line agents capturing farmer data and running check-ins.',
    permissions: presetPages('role-agent', ALL_TENANT_PAGE_KEYS, ['Farmer Registry', 'Programs Setup', 'Agent Assignment', 'Check-in Config', 'Community Profiling', 'Cooperative Governance']),
  },
  {
    id: 'role-agronomist', name: 'Agronomist', isSystem: false,
    description: 'Technical advisors reviewing agronomy and training content.',
    permissions: presetPages('role-agronomist', ALL_TENANT_PAGE_KEYS, ['Check-in Config', 'Agronomist']),
  },
  {
    id: 'role-credits', name: 'Credits', isSystem: false,
    description: 'Credits-module staff managing interventions and disbursement.',
    permissions: presetPages('role-credits', ALL_TENANT_PAGE_KEYS, ['Opportunities / Interventions', 'Credits Module', 'Reports']),
  },
  {
    id: 'role-finance', name: 'Finance', isSystem: false,
    description: 'Finance & insurance portal — portfolio, risk, and compliance.',
    permissions: presetPages('role-finance', ALL_TENANT_PAGE_KEYS, ['Finance & Insurance', 'Reports', 'Risk Intelligence']),
  },
  {
    id: 'role-partner', name: 'Partner', isSystem: false,
    description: 'External financing or offtake partners viewing linked programs.',
    permissions: ALL_TENANT_PAGE_KEYS.map(p =>
      ['Partner / MERL', 'Reports'].includes(p)
        ? { view: true, create: false, read: true, update: false, delete: false, roleId: 'role-partner', pageKey: p }
        : emptyPermission('role-partner', p)
    ),
  },
  {
    id: 'role-farmer', name: 'Farmer', isSystem: false,
    description: 'Farmer-facing mobile/USSD access — no dashboard access.',
    permissions: ALL_TENANT_PAGE_KEYS.map(p => emptyPermission('role-farmer', p)),
  },
]

// ─── Super Admin platform roles ──────────────────────────────────────────────

export const SUPER_ADMIN_ROLE_PAGE_GROUPS: { group: string; pages: string[] }[] = [
  { group: 'Platform', pages: ['Tenants', 'Billing & Plans', 'Platform Users', 'System Settings'] },
  { group: 'Records',  pages: ['Activity Log', 'Audit Log'] },
]

export const ALL_SUPER_ADMIN_PAGE_KEYS: string[] = SUPER_ADMIN_ROLE_PAGE_GROUPS.flatMap(g => g.pages)

// Super Admin is the only built-in (system) role on the platform-operator
// side — its name is locked since it maps to the real super_admin auth role.
export const SEED_SUPER_ADMIN_ROLES: Role[] = [
  {
    id: 'role-super_admin', name: 'Super Admin', isSystem: true,
    description: 'Unrestricted platform-wide access across every portal.',
    permissions: ALL_SUPER_ADMIN_PAGE_KEYS.map(p => fullPermission('role-super_admin', p)),
  },
]
