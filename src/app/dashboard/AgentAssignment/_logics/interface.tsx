export interface AgentSummary {
  id:          string
  name:        string
  regions:     string[]
  cohortCount: number
  farmerCount: number
  checkinCount: number
  capacity:    number
}

export interface CohortAgent {
  agentId:   string
  agentName: string
  isPrimary: boolean
}

export interface CohortRow {
  cohortId:    string
  cohortName:  string
  programId:   string
  programName: string
  region:      string
  district:    string
  farmerCount: number
  capacity:    number
  agents:      CohortAgent[]
}

export interface ProgramOption {
  id:   string
  name: string
}

export interface FarmerPreview {
  id:          string
  fullName:    string
  phone:       string
  region:      string
  currentFri:  number | null
  cohortId:    string
  cohortName:  string
  programId:   string
  programName: string
  agentId:     string | null
  agentName:   string | null
}
