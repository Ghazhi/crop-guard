// Synthetic farmer → cooperative membership mapping.
// No real link exists between FARMERS_LIST and COOPERATIVES in the underlying
// data model yet — this table lets Traceability's cooperative → farmer cascade
// work against real farmer records without changing the Farmer type.
export const FARMER_COOPERATIVE_MAP: Record<string, string> = {
  'f-001': 'coop-001',
  'f-002': 'coop-001',
  'f-016': 'coop-001',
  'f-017': 'coop-001',
  'f-003': 'coop-002',
  'f-004': 'coop-002',
  'f-007': 'coop-002',
  'f-008': 'coop-002',
  'f-005': 'coop-003',
  'f-006': 'coop-003',
  'f-018': 'coop-004',
  'f-019': 'coop-004',
  'f-020': 'coop-004',
  'f-009': 'coop-005',
  'f-010': 'coop-005',
  'f-036': 'coop-006',
  'f-037': 'coop-006',
  'f-038': 'coop-006',
  'f-021': 'coop-007',
  'f-022': 'coop-007',
}
