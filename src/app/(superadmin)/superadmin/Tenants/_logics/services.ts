import type { Tenant } from './interface'

const DELAY = 300
const delay = () => new Promise(r => setTimeout(r, DELAY))

export const SEED_TENANTS: Tenant[] = [
  { id: 'ten-001', name: 'CropGuard+ (Demo)',   subdomain: 'demo',     status: 'active',    contactEmail: 'ops@cropguard.org',        createdAt: '2025-01-15' },
  { id: 'ten-002', name: 'ASINYO Cooperative',  subdomain: 'asinyo',   status: 'active',    contactEmail: 'admin@asinyo.coop',        createdAt: '2025-06-02' },
  { id: 'ten-003', name: 'Fidelity Agri Trust', subdomain: 'fidelity', status: 'suspended', contactEmail: 'contact@fidelityagri.com', createdAt: '2025-09-20' },
]

export async function fetchTenants(): Promise<Tenant[]> {
  await delay()
  return SEED_TENANTS
}
