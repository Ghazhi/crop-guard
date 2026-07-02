export interface Stats {
  totalFarmers:      number
  activeEnrollments: number
  verifiedFarmers:   number
  totalAgents:       number
  avgFRI:            number | null
  verificationRate:  number
  opportunityCount:  number
  trajectoryUp:      number
  trajectoryFlat:    number
  trajectoryDown:    number
}

export interface CropBreakdown  { crop: string; count: number }
export interface ZoneBreakdown  { zone: string; count: number }
