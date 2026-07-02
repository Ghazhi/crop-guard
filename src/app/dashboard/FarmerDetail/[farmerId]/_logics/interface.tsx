export type FriZone = 'Resilience Leader' | 'Resilience Builder' | 'Resilience Learner' | 'Resilience Starter'
export type Trajectory = 'Improving' | 'Stable' | 'Declining'
export type Recommendation = 'Approve' | 'Review' | 'Defer' | 'Decline'
export type RiskBand = 'Low' | 'Moderate' | 'High' | 'Critical'

export interface FarmerDetail {
  farmerId: string
  fullName: string
  asinyoId: string
  community: string
  district: string
  programName: string
  cohortName: string
  zone: FriZone
  totalScore: number
  baselineScore: number
  creditScore: number
  eciScore: number
  riskBand: RiskBand
  recommendation: Recommendation
  trajectory: Trajectory
  weeksFinal: number
  weeksProvisional: number
  isProvisional: boolean
}

export interface WeekScore {
  weekNumber: number
  totalScore: number
  p1Score: number
  p2Score: number
  p3Score: number
  p4Score: number
  eciScore: number
  isProvisional: boolean
  scoreStatus: 'final' | 'provisional'
}

export interface RiskFlag {
  id: string
  flagType: string
  severity: 'high' | 'medium'
  description: string
  createdAt: string
}

export interface Intervention {
  id: string
  name: string
  type: string
  description: string
  minFRI: number
  eligible: boolean
  friGap: number | null
}
