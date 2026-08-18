export type TenantStatus = 'active' | 'suspended'

export interface Tenant {
  id:           string
  name:         string
  subdomain:    string
  status:       TenantStatus
  contactEmail: string
  createdAt:    string
}
