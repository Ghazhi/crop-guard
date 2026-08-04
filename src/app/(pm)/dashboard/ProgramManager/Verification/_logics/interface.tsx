export interface PendingSubmission {
  id:          string
  farmerId:    string
  farmer:      string
  community:   string
  cohort:      string
  submittedDate: string
  type:        'Initial' | 'Resubmission'
  reviewedBy:  string
  priority:    'High' | 'Medium' | 'Low'
  status:      'Pending' | 'In Review'
  pillarScores: { p1: number; p2: number; p3: number; p4: number }
}
