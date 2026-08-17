// The tenant Activity Log is a filtered view of the shared Audit Log
// (entityType === 'tenant') — see ../AuditLog/_logics for the underlying store.
export type { AuditLogEntry as TenantActivityEntry } from '../../AuditLog/_logics/interface'
