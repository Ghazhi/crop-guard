import type { FriZone } from '@/lib/types'
export type { FriZone }

export interface WorkflowActivityEntry {
  stage:     number
  stageName: string
  status:    'approved' | 'declined' | 'pending'
  date:      string
  notes?:    string
}

export interface FarmerEnrollment {
  id?:         string
  programId:   string
  programName: string
  cohortId:    string | null
  cohortName:  string | null
  agentName:   string | null
  status:      'active' | 'graduated' | 'withdrawn'
  currentStage: number
  registeredAt?: string
  graduatedAt?: string | null
  withdrawnAt?: string | null
  baselineDone?: boolean
  checkinOnTrack?: boolean | null
  activityLog?: WorkflowActivityEntry[]
}

export interface Farmer {
  id:            string
  fullName:      string
  phone:         string
  nationalId:    string
  dateOfBirth:   string
  gender:        string
  region:        string
  district:      string
  community:     string
  primaryCrop:   string
  farmSize:      string
  enrollment:    FarmerEnrollment | null
  enrollmentHistory?: FarmerEnrollment[]
  currentFri:    number | null
  currentZone:   FriZone | null
  duplicateFlag: boolean
  // Identity
  idType?:       string
  // Household
  ownsHouse?:      '' | 'yes' | 'no'
  maritalStatus?:  string
  childrenCount?:  string
  ownsTractor?:    '' | 'yes' | 'no'
  otherBusiness?:  '' | 'yes' | 'no'
  // Financial
  loanType?:          string
  accountType?:       string
  averageIncome?:     string
  hasAgricInsurance?: '' | 'yes' | 'no'
  // Support
  desiredAssets?:    string[]
  supportNeeded?:    string[]
  inputCredit?:      '' | 'yes' | 'no'
}

export interface ProgramOption {
  id:   string
  name: string
  cohorts: { id: string; name: string }[]
}
