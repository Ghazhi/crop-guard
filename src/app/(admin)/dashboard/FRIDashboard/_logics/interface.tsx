import type { FriZone } from '@/lib/types'
export type { FriZone }
export type CreditRisk = 'Low Risk' | 'Medium Risk' | 'High Risk'
export type FriTrend   = 'up' | 'down' | 'flat'

export interface PillarScore {
  code:  string
  name:  string
  score: number
  max:   number
  color: string
}

export interface BaselinePillar {
  code:  string
  name:  string
  score: number
  max:   number
  color: string
}

export interface ECI {
  score:    number
  max:      number
  criteria: number
}

export interface BaselineItem {
  name:   string
  pillar: string
  score:  number
  max:    number
}

export interface CheckinItem {
  name:   string
  pillar: string
  value:  boolean
}

export interface CheckinRecord {
  week:         number
  date:         string
  verified:     boolean
  verifiedBy?:  string
  helpNeeded:   boolean
  pillarScores: { p1: number; p2: number; p3: number; p4: number }
  items:        CheckinItem[]
}

export interface FRIFarmer {
  id:              string
  fullName:        string
  phone:           string
  nationalId:      string
  gender:          string
  dateOfBirth:     string | null
  community:       string
  region:          string
  district:        string
  primaryCrop:     string
  farmSize:        string
  verified:        boolean
  programId:       string | null
  programName:     string | null
  cohortId:        string | null
  cohortName:      string | null
  agentName:       string | null
  enrolledDate:    string | null
  enrollStatus:    'active' | 'graduated' | 'withdrawn' | null
  currentFri:      number | null
  currentZone:     FriZone | null
  creditRisk:      CreditRisk | null
  recommendation:  string | null
  scoreWeek:       number
  baselineDone:    boolean
  baselineDate:    string | null
  checkinCount:    number
  verifiedCheckins: number
  helpRequested:   boolean
  friTrend:        FriTrend | null
  pillars:         PillarScore[]
  baselinePillars: BaselinePillar[]
  baselineItems:   BaselineItem[]
  eci:             ECI | null
  eciItems:        BaselineItem[]
  checkins:        CheckinRecord[]
}

export interface FRISummary {
  totalFarmers:     number
  scored:           number
  avgFri:           number | null
  baselinesDone:    number
  baselinesPending: number
  totalCheckins:    number
  verifiedCheckins: number
  helpRequested:    number
  leaderCount:      number
  builderCount:     number
  learnerCount:     number
  starterCount:     number
}

export interface ProgramOption {
  id:     string
  name:   string
  cohorts: { id: string; name: string }[]
}
