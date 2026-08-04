import type { Stats, CropBreakdown, ZoneBreakdown } from './interface'
import { FARMERS_LIST } from '@/dataCenter/farmerManagement'
import { AGENTS } from '@/dataCenter/agents'
import { INTERVENTIONS } from '@/dataCenter/interventions'
import type { Farmer } from '@/app/(admin)/dashboard/FarmersRegistry/_logics/interface'

const DELAY = 300
const delay = () => new Promise(r => setTimeout(r, DELAY))

const OPPORTUNITY_COHORT_IDS = new Set(
  INTERVENTIONS.flatMap(iv => iv.enrolledCohorts.map(ec => ec.cohortId))
)

function seededDelta(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return (Math.abs(hash) % 21) - 10 // -10..+10
}

export async function fetchStats(): Promise<Stats> {
  await delay()
  const farmers = FARMERS_LIST as Farmer[]
  const scored = farmers.filter(f => f.currentFri !== null)
  const verified = farmers.filter(f => !f.duplicateFlag)

  let trajectoryUp = 0, trajectoryFlat = 0, trajectoryDown = 0
  for (const f of scored) {
    const delta = seededDelta(f.id)
    if (delta > 0) trajectoryUp++
    else if (delta < 0) trajectoryDown++
    else trajectoryFlat++
  }

  return {
    totalFarmers:      farmers.length,
    activeEnrollments: farmers.filter(f => f.enrollment?.status === 'active').length,
    verifiedFarmers:   verified.length,
    totalAgents:       AGENTS.length,
    avgFRI:            scored.length ? Math.round(scored.reduce((s, f) => s + (f.currentFri ?? 0), 0) / scored.length) : null,
    verificationRate:  farmers.length ? Math.round((verified.length / farmers.length) * 100) : 0,
    opportunityCount:  farmers.filter(f => f.enrollment?.cohortId && OPPORTUNITY_COHORT_IDS.has(f.enrollment.cohortId)).length,
    trajectoryUp,
    trajectoryFlat,
    trajectoryDown,
  }
}

export async function fetchCropBreakdown(): Promise<CropBreakdown[]> {
  await delay()
  const counts = new Map<string, number>()
  for (const f of FARMERS_LIST as Farmer[]) {
    counts.set(f.primaryCrop, (counts.get(f.primaryCrop) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([crop, count]) => ({ crop: crop.charAt(0).toUpperCase() + crop.slice(1), count }))
    .sort((a, b) => b.count - a.count)
}

export async function fetchZoneBreakdown(): Promise<ZoneBreakdown[]> {
  await delay()
  const counts = new Map<string, number>()
  for (const f of FARMERS_LIST as Farmer[]) {
    if (!f.currentZone) continue
    counts.set(f.currentZone, (counts.get(f.currentZone) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([zone, count]) => ({ zone, count }))
}
