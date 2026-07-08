import type { FriZone } from '@/lib/types'
export type { FriZone }

export interface FarmerEnrollment {
  programId:   string
  programName: string
  cohortId:    string | null
  cohortName:  string | null
  agentName:   string | null
  status:      'active' | 'graduated' | 'withdrawn'
  currentStage: number
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
  currentFri:    number | null
  currentZone:   FriZone | null
  duplicateFlag: boolean
}

export interface ProgramOption {
  id:   string
  name: string
  cohorts: { id: string; name: string }[]
}
