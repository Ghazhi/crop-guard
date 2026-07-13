import { PROGRAMS } from '@/dataCenter/programs'

// ─── PM Scope ─────────────────────────────────────────────────────────────────
// The signed-in Program Manager manages these programs (mock scope).
// PM pages mirror the admin pages but only surface data linked to this scope.

export const PM_PROGRAM_IDS = ['prog-001', 'prog-002', 'prog-003', 'prog-004', 'prog-005']

export const PM_PROGRAMS = PROGRAMS.filter(p => PM_PROGRAM_IDS.includes(p.id))

export const PM_PROGRAM_NAMES = PM_PROGRAMS.map(p => p.name)

export const PM_PARTNER_IDS = Array.from(new Set(PM_PROGRAMS.map(p => p.partnerId)))

export const PM_COHORT_IDS = PM_PROGRAMS.flatMap(p => p.cohorts.map(c => c.id))

export function isPmProgram(programId?: string | null): boolean {
  return !!programId && PM_PROGRAM_IDS.includes(programId)
}

export function isPmProgramName(programName?: string | null): boolean {
  return !!programName && PM_PROGRAM_NAMES.includes(programName)
}
