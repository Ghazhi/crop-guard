import { BASELINE_SEED } from '@/dataCenter/checkinConfig'

export interface PartnerP4Question {
  id:     string
  label:  string
  desc:   string
  active: boolean
}

export interface PartnerBaseline {
  partnerId: string
  questions: PartnerP4Question[]
}

const DEFAULT_P4_QUESTIONS: PartnerP4Question[] = BASELINE_SEED
  .filter(a => a.pillar === 'p4')
  .map(a => ({ id: a.id, label: a.label, desc: a.desc, active: true }))

// partnerId -> baseline, for partners that have had a P4 baseline created for them
export const PARTNER_BASELINES: Record<string, PartnerBaseline> = {}

export function createDefaultP4Questions(): PartnerP4Question[] {
  return DEFAULT_P4_QUESTIONS.map(q => ({ ...q }))
}
