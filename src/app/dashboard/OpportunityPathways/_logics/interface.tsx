export type InterventionStatus   = 'Active' | 'Suspended' | 'Draft'
export type InterventionType     = 'Input Loan' | 'Cash Loan' | 'Insurance' | 'Advisory' | 'Market Access'
export type ApprovalMode         = 'Auto' | 'Manual'

export interface EligibilityRule {
  id:       string
  field:    string
  operator: string
  value:    string
}

export interface ImprovementStep {
  id:          string
  description: string
  order:       number
}

export interface EnrolledCohort {
  programId:   string
  programName: string
  cohortId:    string
  cohortName:  string
}

export interface PartnerAssignment {
  partnerId: string
  cohorts:   EnrolledCohort[]
}

export interface Intervention {
  id:               string
  name:             string
  type:             InterventionType
  season:           string
  valueDescription: string
  description:      string
  minFri:           number
  capacity:         number
  status:           InterventionStatus
  approval:         ApprovalMode
  rules:            EligibilityRule[]
  steps:            ImprovementStep[]
  createdAt:        string
  enrolledCohorts:  EnrolledCohort[]   // master cohort list used in OpportunityPathways
  partnerAssignments?: PartnerAssignment[]
}

export interface ProgramOption {
  id:   string
  name: string
}

export interface ProgramWithCohorts {
  id:      string
  name:    string
  cohorts: { id: string; name: string }[]
}
