'use client'

import { usePersistedState } from '@/lib/usePersistedState'
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

export function createDefaultP4Questions(): PartnerP4Question[] {
  return DEFAULT_P4_QUESTIONS.map(q => ({ ...q }))
}

const PARTNER_BASELINES_KEY = 'partnerBaselines.byPartnerId'

/**
 * Shared, persisted partner-ECI-baseline store — every page that creates or
 * reads a partner's P4 baseline (PartnerDirectory, PartnerDirectory/[partnerId],
 * CheckinConfig) reads/writes through this hook, so edits made from any one
 * of them are immediately visible to the others via the same persisted key.
 */
export function usePartnerBaselines() {
  const [baselines, setBaselines] = usePersistedState<Record<string, PartnerBaseline>>(PARTNER_BASELINES_KEY, {})

  function saveBaseline(partnerId: string, questions: PartnerP4Question[]) {
    setBaselines(prev => ({ ...prev, [partnerId]: { partnerId, questions } }))
  }

  function removeBaseline(partnerId: string) {
    setBaselines(prev => {
      const next = { ...prev }
      delete next[partnerId]
      return next
    })
  }

  return { baselines, saveBaseline, removeBaseline }
}
