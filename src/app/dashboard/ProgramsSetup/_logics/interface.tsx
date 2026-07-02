export interface Cohort {
  id:           string
  name:         string
  region:       string
  district:     string
  agentName:    string
  enrolledCount: number
  targetCount:  number
  status:       'Active' | 'Inactive'
}

export interface Program {
  id:            string
  name:          string
  season:        string
  description:   string
  crops:         string[]
  startDate:     string
  endDate:       string
  enrolledCount: number
  targetCount:   number
  status:        'Active' | 'Inactive' | 'Completed'
  cohorts:       Cohort[]
}
