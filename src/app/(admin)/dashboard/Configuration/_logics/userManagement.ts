// ─── User Management data model & seed data ────────────────────────────────
// Prototype-only: no real backend. Everything here is client-side mock data
// meant to be held in usePersistedState by the consuming components.
//
// Role/permission modeling lives in src/dataCenter/roles.ts (a unified Role
// type shared across the staff-portal User Management screen and the Super
// Admin Platform Users / Permissions / Roles screens).

export interface PlatformUser {
  id:       string
  fullName: string
  email:    string
  phone:    string
  roleId:   string
  isActive: boolean
}

// ─── Seed users (Ghanaian names, consistent with farmerManagement.ts style) ─

export const SEED_PLATFORM_USERS: PlatformUser[] = [
  { id: 'u-001', fullName: 'Abena Owusu',      email: 'abena.owusu@cropguard.org',      phone: '0241234567', roleId: 'role-super_admin', isActive: true  },
  { id: 'u-002', fullName: 'Kwame Asante',     email: 'kwame.asante@cropguard.org',     phone: '0242345678', roleId: 'role-staff',       isActive: true  },
  { id: 'u-003', fullName: 'Ama Mensah',       email: 'ama.mensah@cropguard.org',       phone: '0243456789', roleId: 'role-staff',       isActive: true  },
  { id: 'u-004', fullName: 'Kofi Boateng',     email: 'kofi.boateng@cropguard.org',     phone: '0244567890', roleId: 'role-agent',       isActive: true  },
  { id: 'u-005', fullName: 'Efua Darko',       email: 'efua.darko@cropguard.org',       phone: '0245678901', roleId: 'role-agent',       isActive: true  },
  { id: 'u-006', fullName: 'Yaw Sarpong',      email: 'yaw.sarpong@cropguard.org',      phone: '0246789012', roleId: 'role-agent',       isActive: false },
  { id: 'u-007', fullName: 'Akosua Frimpong',  email: 'akosua.frimpong@cropguard.org',  phone: '0247890123', roleId: 'role-agronomist',  isActive: true  },
  { id: 'u-008', fullName: 'Kwabena Antwi',    email: 'kwabena.antwi@cropguard.org',    phone: '0248901234', roleId: 'role-agronomist',  isActive: true  },
  { id: 'u-009', fullName: 'Adjoa Nyarko',     email: 'adjoa.nyarko@fidelitybank.com',  phone: '0209012345', roleId: 'role-partner',     isActive: true  },
  { id: 'u-010', fullName: 'Kojo Adjei',       email: 'kojo.adjei@barclays.com.gh',     phone: '0201123456', roleId: 'role-partner',     isActive: true  },
  { id: 'u-011', fullName: 'Abigail Osei',     email: 'abigail.osei@cropguard.org',     phone: '0552234567', roleId: 'role-credits',     isActive: true  },
  { id: 'u-012', fullName: 'Nana Yaa Boadi',   email: 'nanayaa.boadi@cropguard.org',    phone: '0553345678', roleId: 'role-credits',     isActive: false },
  { id: 'u-013', fullName: 'Kwesi Appiah',     email: 'kwesi.appiah@cropguard.org',     phone: '0554456789', roleId: 'role-finance',     isActive: true  },
  { id: 'u-014', fullName: 'Gifty Amponsah',   email: 'gifty.amponsah@cropguard.org',   phone: '0555567890', roleId: 'role-finance',     isActive: true  },
  { id: 'u-015', fullName: 'Emmanuel Tetteh',  email: 'emmanuel.tetteh@cropguard.org',  phone: '0556678901', roleId: 'role-admin',       isActive: true  },
  { id: 'u-016', fullName: 'Comfort Adusei',   email: 'comfort.adusei@cropguard.org',   phone: '0557789012', roleId: 'role-staff',       isActive: true  },
  { id: 'u-017', fullName: 'Isaac Ofori',      email: 'isaac.ofori@cropguard.org',      phone: '0558890123', roleId: 'role-agent',       isActive: true  },
  { id: 'u-018', fullName: 'Rebecca Aidoo',    email: 'rebecca.aidoo@cropguard.org',    phone: '0559901234', roleId: 'role-staff',       isActive: false },
]
