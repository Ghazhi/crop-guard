export type TenantPlanTier = 'starter' | 'pro' | 'enterprise'
export type TenantStatus   = 'active' | 'suspended'

export interface Tenant {
  id:           string
  name:         string
  subdomain:    string
  planTier:     TenantPlanTier
  status:       TenantStatus
  contactEmail: string
  createdAt:    string
}
