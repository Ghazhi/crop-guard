import type { Stats, CropBreakdown, ZoneBreakdown } from '@/app/dashboard/Dashboard/_logics/interface'

export const DASHBOARD_STATS: Stats = {
  totalFarmers:      6,
  activeEnrollments: 5,
  verifiedFarmers:   2,
  totalAgents:       2,
  avgFRI:            65,
  verificationRate:  33,
  opportunityCount:  4,
  trajectoryUp:      1,
  trajectoryFlat:    1,
  trajectoryDown:    0,
}

export const CROP_BREAKDOWN: CropBreakdown[] = [
  { crop: 'Maize',    count: 3 },
  { crop: 'Soybean',  count: 2 },
  { crop: 'Groundnut',count: 1 },
]

export const ZONE_BREAKDOWN: ZoneBreakdown[] = [
  { zone: 'Resilience Builder', count: 1 },
  { zone: 'Resilience Leader',  count: 1 },
  { zone: 'Resilience Learner', count: 1 },
  { zone: 'Resilience Starter', count: 1 },
]
