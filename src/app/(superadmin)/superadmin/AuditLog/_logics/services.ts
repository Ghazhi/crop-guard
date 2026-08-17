import type { AuditLogEntry, AuditEntityType, AuditAction } from './interface'

export const AUDIT_LOG_KEY = 'sa-audit-log'

export const SEED_AUDIT_LOG: AuditLogEntry[] = [
  { id: 'aud-001', entityType: 'tenant', entityName: 'CropGuard+ (Demo)',  action: 'created', actor: 'Nana Adjei', timestamp: '2025-01-15T09:00:00Z' },
  { id: 'aud-002', entityType: 'tenant', entityName: 'ASINYO Cooperative', action: 'created', actor: 'Nana Adjei', timestamp: '2025-06-02T10:30:00Z' },
  { id: 'aud-003', entityType: 'tenant', entityName: 'Fidelity Agri Trust', action: 'created', actor: 'Nana Adjei', timestamp: '2025-09-20T14:15:00Z' },
  { id: 'aud-004', entityType: 'tenant', entityName: 'Fidelity Agri Trust', action: 'suspended', actor: 'Nana Adjei', timestamp: '2025-10-05T11:00:00Z', detail: 'Overdue billing' },
]

/** Appends a new entry to the shared audit trail. Read via usePersistedState(AUDIT_LOG_KEY, ...) in consuming pages. */
export function newAuditEntry(
  entityType: AuditEntityType, entityName: string, action: AuditAction, actor: string, detail?: string,
): AuditLogEntry {
  return {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    entityType, entityName, action, actor, detail,
    timestamp: new Date().toISOString(),
  }
}
