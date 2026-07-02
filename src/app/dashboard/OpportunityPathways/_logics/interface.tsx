export type InterventionStatus   = 'Active' | 'Suspended' | 'Draft'
export type InterventionType     = 'Input Loan' | 'Cash Loan' | 'Insurance' | 'Advisory' | 'Market Access'
export type ApprovalMode         = 'Auto' | 'Manual'

export interface EligibilityRule {
  id:       string
  field:    string   // e.g. 'fri_score', 'zone', 'crop'
  operator: string   // e.g. '>=', '<=', '==', 'in'
  value:    string
}

export interface ImprovementStep {
  id:          string
  description: string
  order:       number
}

export interface Intervention {
  id:               string
  programId:        string | null
  programName:      string | null
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
}

export interface ProgramOption {
  id:   string
  name: string
}
