// ─── User Management data model & seed data ────────────────────────────────
// Prototype-only: no real backend. Everything here is client-side mock data
// meant to be held in usePersistedState by the consuming components.

export type BuiltInRole =
  | 'staff' | 'admin' | 'agent' | 'partner' | 'agronomist'
  | 'credits' | 'finance' | 'super_admin' | 'farmer'

export interface PlatformUser {
  id:           string
  fullName:     string
  email:        string
  phone:        string
  builtInRole:  BuiltInRole
  customRoleId: string | null
  isActive:     boolean
}

export interface CustomRole {
  id:          string
  name:        string
  description: string
  isSystem:    boolean
}

export interface RolePermission {
  roleId:  string
  pageKey: string
  view:    boolean
  create:  boolean
  read:    boolean
  update:  boolean
  delete:  boolean
}

// ─── Built-in role metadata ─────────────────────────────────────────────────

export const BUILT_IN_ROLE_META: Record<BuiltInRole, { label: string; description: string }> = {
  staff:       { label: 'Staff',       description: 'Programs & field-operations team — registry, enrollment, check-ins, governance.' },
  admin:       { label: 'Admin',       description: 'Full staff-portal access plus user & permission management.' },
  agent:       { label: 'Field Agent', description: 'Front-line agents capturing farmer data and running check-ins.' },
  partner:     { label: 'Partner',     description: 'External financing or offtake partners viewing linked programs.' },
  agronomist:  { label: 'Agronomist',  description: 'Technical advisors reviewing agronomy and training content.' },
  credits:     { label: 'Credits',     description: 'Credits-module staff managing interventions and disbursement.' },
  finance:     { label: 'Finance',     description: 'Finance & insurance portal — portfolio, risk, and compliance.' },
  super_admin: { label: 'Super Admin', description: 'Unrestricted platform-wide access across every portal.' },
  farmer:      { label: 'Farmer',      description: 'Farmer-facing mobile/USSD access — no dashboard access.' },
}

export const BUILT_IN_ROLES: BuiltInRole[] = [
  'super_admin', 'admin', 'staff', 'agent', 'agronomist', 'credits', 'finance', 'partner', 'farmer',
]

// ─── Seed users (Ghanaian names, consistent with farmerManagement.ts style) ─

export const SEED_PLATFORM_USERS: PlatformUser[] = [
  { id: 'u-001', fullName: 'Abena Owusu',      email: 'abena.owusu@cropguard.org',      phone: '0241234567', builtInRole: 'super_admin', customRoleId: null,         isActive: true  },
  { id: 'u-002', fullName: 'Kwame Asante',     email: 'kwame.asante@cropguard.org',     phone: '0242345678', builtInRole: 'staff',       customRoleId: null,         isActive: true  },
  { id: 'u-003', fullName: 'Ama Mensah',       email: 'ama.mensah@cropguard.org',       phone: '0243456789', builtInRole: 'staff',       customRoleId: 'crole-001',  isActive: true  },
  { id: 'u-004', fullName: 'Kofi Boateng',     email: 'kofi.boateng@cropguard.org',     phone: '0244567890', builtInRole: 'agent',       customRoleId: null,         isActive: true  },
  { id: 'u-005', fullName: 'Efua Darko',       email: 'efua.darko@cropguard.org',       phone: '0245678901', builtInRole: 'agent',       customRoleId: null,         isActive: true  },
  { id: 'u-006', fullName: 'Yaw Sarpong',      email: 'yaw.sarpong@cropguard.org',      phone: '0246789012', builtInRole: 'agent',       customRoleId: null,         isActive: false },
  { id: 'u-007', fullName: 'Akosua Frimpong',  email: 'akosua.frimpong@cropguard.org',  phone: '0247890123', builtInRole: 'agronomist',  customRoleId: null,         isActive: true  },
  { id: 'u-008', fullName: 'Kwabena Antwi',    email: 'kwabena.antwi@cropguard.org',    phone: '0248901234', builtInRole: 'agronomist',  customRoleId: 'crole-002',  isActive: true  },
  { id: 'u-009', fullName: 'Adjoa Nyarko',     email: 'adjoa.nyarko@fidelitybank.com',  phone: '0209012345', builtInRole: 'partner',     customRoleId: null,         isActive: true  },
  { id: 'u-010', fullName: 'Kojo Adjei',       email: 'kojo.adjei@barclays.com.gh',     phone: '0201123456', builtInRole: 'partner',     customRoleId: null,         isActive: true  },
  { id: 'u-011', fullName: 'Abigail Osei',     email: 'abigail.osei@cropguard.org',     phone: '0552234567', builtInRole: 'credits',     customRoleId: null,         isActive: true  },
  { id: 'u-012', fullName: 'Nana Yaa Boadi',   email: 'nanayaa.boadi@cropguard.org',    phone: '0553345678', builtInRole: 'credits',     customRoleId: null,         isActive: false },
  { id: 'u-013', fullName: 'Kwesi Appiah',     email: 'kwesi.appiah@cropguard.org',     phone: '0554456789', builtInRole: 'finance',     customRoleId: null,         isActive: true  },
  { id: 'u-014', fullName: 'Gifty Amponsah',   email: 'gifty.amponsah@cropguard.org',   phone: '0555567890', builtInRole: 'finance',     customRoleId: 'crole-001', isActive: true  },
  { id: 'u-015', fullName: 'Emmanuel Tetteh',  email: 'emmanuel.tetteh@cropguard.org',  phone: '0556678901', builtInRole: 'admin',       customRoleId: null,         isActive: true  },
  { id: 'u-016', fullName: 'Comfort Adusei',   email: 'comfort.adusei@cropguard.org',   phone: '0557789012', builtInRole: 'staff',       customRoleId: null,         isActive: true  },
  { id: 'u-017', fullName: 'Isaac Ofori',      email: 'isaac.ofori@cropguard.org',      phone: '0558890123', builtInRole: 'agent',       customRoleId: null,         isActive: true  },
  { id: 'u-018', fullName: 'Rebecca Aidoo',    email: 'rebecca.aidoo@cropguard.org',    phone: '0559901234', builtInRole: 'staff',       customRoleId: null,         isActive: false },
]

// ─── Custom roles ────────────────────────────────────────────────────────────

export const SEED_CUSTOM_ROLES: CustomRole[] = [
  { id: 'crole-001', name: 'Regional Supervisor', description: 'Staff with elevated read access across all regions plus reporting export rights.', isSystem: false },
  { id: 'crole-002', name: 'Training Reviewer',    description: 'Agronomists who can approve and publish weekly training content.',                isSystem: false },
]

// ─── Permission page groups ──────────────────────────────────────────────────

export const PAGE_GROUPS: { group: string; pages: string[] }[] = [
  { group: 'Staff Portal', pages: ['Farmer Registry', 'Programs Setup', 'Agent Assignment', 'Check-in Config', 'Community Profiling', 'Cooperative Governance', 'User Management'] },
  { group: 'Analytics & Intelligence', pages: ['FRI Dashboard', 'Risk Intelligence', 'Intelligence Dashboard', 'Reports'] },
  { group: 'Portals', pages: ['Opportunities / Interventions', 'Credits Module', 'Finance & Insurance', 'Partner / MERL', 'Agronomist'] },
]

export const ALL_PAGE_KEYS: string[] = PAGE_GROUPS.flatMap(g => g.pages)

// default permission row (all off) for a given role+page
export function emptyPermission(roleId: string, pageKey: string): RolePermission {
  return { roleId, pageKey, view: false, create: false, read: false, update: false, delete: false }
}

// a fully-granted row
export function fullPermission(roleId: string, pageKey: string): RolePermission {
  return { roleId, pageKey, view: true, create: true, read: true, update: true, delete: true }
}

/** Built-in roles get a preset, non-editable permission set: super_admin/admin get everything, others get sensible defaults. */
export function presetPermissionsFor(role: BuiltInRole): RolePermission[] {
  if (role === 'super_admin' || role === 'admin') {
    return ALL_PAGE_KEYS.map(p => fullPermission(role, p))
  }
  if (role === 'staff' || role === 'agent') {
    const staffPages = ['Farmer Registry', 'Programs Setup', 'Agent Assignment', 'Check-in Config', 'Community Profiling', 'Cooperative Governance']
    return ALL_PAGE_KEYS.map(p =>
      staffPages.includes(p) ? { ...fullPermission(role, p), delete: false } : emptyPermission(role, p)
    )
  }
  if (role === 'agronomist') {
    const pages = ['Check-in Config', 'Agronomist']
    return ALL_PAGE_KEYS.map(p => pages.includes(p) ? { ...fullPermission(role, p), delete: false } : emptyPermission(role, p))
  }
  if (role === 'credits') {
    const pages = ['Opportunities / Interventions', 'Credits Module', 'Reports']
    return ALL_PAGE_KEYS.map(p => pages.includes(p) ? { ...fullPermission(role, p), delete: false } : emptyPermission(role, p))
  }
  if (role === 'finance') {
    const pages = ['Finance & Insurance', 'Reports', 'Risk Intelligence']
    return ALL_PAGE_KEYS.map(p => pages.includes(p) ? { ...fullPermission(role, p), delete: false } : emptyPermission(role, p))
  }
  if (role === 'partner') {
    const pages = ['Partner / MERL', 'Reports']
    return ALL_PAGE_KEYS.map(p => pages.includes(p) ? { view: true, create: false, read: true, update: false, delete: false, roleId: role, pageKey: p } : emptyPermission(role, p))
  }
  // farmer — no dashboard access
  return ALL_PAGE_KEYS.map(p => emptyPermission(role, p))
}
