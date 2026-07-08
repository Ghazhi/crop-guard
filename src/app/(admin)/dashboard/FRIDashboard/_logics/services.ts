import type { FRIFarmer, FRISummary, ProgramOption } from './interface'
import { FARMERS } from '@/dataCenter/farmers'
import { PROGRAM_OPTIONS_WITH_COHORTS } from '@/dataCenter/programOptions'

const DELAY = 300
const delay = () => new Promise(r => setTimeout(r, DELAY))

export async function fetchFRIFarmers(): Promise<FRIFarmer[]> {
  await delay()
  return FARMERS
}

export async function fetchFRISummary(): Promise<FRISummary> {
  await delay()
  const scored = FARMERS.filter(f => f.currentFri !== null)
  const avgFri = scored.length ? Math.round(scored.reduce((s, f) => s + f.currentFri!, 0) / scored.length) : null
  return {
    totalFarmers:     FARMERS.length,
    scored:           scored.length,
    avgFri,
    baselinesDone:    FARMERS.filter(f => f.baselineDone).length,
    baselinesPending: FARMERS.filter(f => !f.baselineDone).length,
    totalCheckins:    FARMERS.reduce((s, f) => s + f.checkinCount, 0),
    verifiedCheckins: FARMERS.reduce((s, f) => s + f.verifiedCheckins, 0),
    helpRequested:    FARMERS.filter(f => f.helpRequested).length,
    leaderCount:      FARMERS.filter(f => f.currentZone === 'Resilience Leader').length,
    builderCount:     FARMERS.filter(f => f.currentZone === 'Resilience Builder').length,
    learnerCount:     FARMERS.filter(f => f.currentZone === 'Resilience Learner').length,
    starterCount:     FARMERS.filter(f => f.currentZone === 'Resilience Starter').length,
  }
}

export async function fetchFRIPrograms(): Promise<ProgramOption[]> {
  await delay()
  return PROGRAM_OPTIONS_WITH_COHORTS
}
