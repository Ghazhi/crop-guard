import { FARMERS } from '@/dataCenter/farmers'
import type { FriZone } from '@/lib/types'

export function zoneForScore(score: number): FriZone {
  if (score >= 80) return 'Resilience Leader'
  if (score >= 60) return 'Resilience Builder'
  if (score >= 45) return 'Resilience Learner'
  return 'Resilience Starter'
}

/**
 * Applies a verified check-in's pillar scores to a farmer record: recomputes
 * currentFri (sum of the 4 pillars) and currentZone from the resulting band,
 * mirroring the existing PILLARS_EMPTY max weights (30/30/20/20 = 100).
 */
export function verifyFarmerCheckin(
  farmerId: string,
  pillarScores: { p1: number; p2: number; p3: number; p4: number },
  verifiedBy: string,
): void {
  const farmer = FARMERS.find(f => f.id === farmerId)
  if (!farmer) return

  const score = pillarScores.p1 + pillarScores.p2 + pillarScores.p3 + pillarScores.p4
  const previousFri = farmer.currentFri

  farmer.pillars = farmer.pillars.map(p => ({
    ...p,
    score: p.code === 'P1' ? pillarScores.p1
         : p.code === 'P2' ? pillarScores.p2
         : p.code === 'P3' ? pillarScores.p3
         : pillarScores.p4,
  }))
  farmer.currentFri = score
  farmer.currentZone = zoneForScore(score)
  farmer.verified = true
  farmer.baselineDone = true
  farmer.baselineDate = farmer.baselineDate ?? new Date().toISOString().slice(0, 10)
  farmer.checkinCount += 1
  farmer.verifiedCheckins += 1
  farmer.friTrend = previousFri === null ? 'flat' : score > previousFri ? 'up' : score < previousFri ? 'down' : 'flat'
  farmer.checkins = [
    {
      week: farmer.checkins.length + 1,
      date: new Date().toISOString().slice(0, 10),
      verified: true,
      verifiedBy,
      helpNeeded: false,
      pillarScores,
      items: [],
    },
    ...farmer.checkins,
  ]
}
