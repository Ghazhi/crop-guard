export type AuditEntityType = 'tenant' | 'platform_user' | 'settings'
export type AuditAction = 'created' | 'updated' | 'suspended' | 'reactivated' | 'deleted'

export interface AuditLogEntry {
  id:         string
  entityType: AuditEntityType
  entityName: string
  action:     AuditAction
  actor:      string
  timestamp:  string
  detail?:    string
}
