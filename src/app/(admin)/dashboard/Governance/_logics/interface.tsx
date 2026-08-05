export type GovTab = 'cooperatives' | 'leadership' | 'meetings' | 'training' | 'resolutions' | 'compliance' | 'funds' | 'documents'

export type OfficerRole = 'Chairperson' | 'Vice Chairperson' | 'Secretary' | 'Treasurer' | 'Executive Member'

export interface Officer {
  id:            string
  cooperativeId: string
  name:          string
  role:          OfficerRole
  phone:         string
  termStart:     string
  termEnd:       string
  isActive:      boolean
}

export type MeetingType = 'AGM' | 'Executive' | 'General' | 'Emergency'

export interface Meeting {
  id:              string
  cooperativeId:   string
  meetingType:     MeetingType
  meetingDate:     string
  attendanceCount: number
  agenda:          string
  minutes:         string
}

export type VoteOutcome           = 'Passed' | 'Rejected' | 'Deferred'
export type ImplementationStatus  = 'Pending' | 'In Progress' | 'Completed'

export interface Resolution {
  id:                    string
  cooperativeId:         string
  meetingId:             string
  title:                 string
  description:           string
  voteOutcome:           VoteOutcome
  implementationStatus:  ImplementationStatus
  datePassed:            string
}

export type CertificationType =
  'FBO Registration (Dept. of Cooperatives)' | 'COCOBOD License' | 'Fairtrade Certification' |
  'Organic Certification' | 'UTZ / Rainforest Alliance'
export type ComplianceStatus    = 'Valid' | 'Expiring Soon' | 'Expired'

export interface ComplianceItem {
  id:                 string
  cooperativeId:      string
  certificationType:  CertificationType
  registrationNumber: string | null
  issueDate:          string
  expiryDate:         string
  status:             ComplianceStatus
  notes:              string | null
}

export type FboStatus = 'Registered' | 'Pending' | 'Lapsed'

export interface FboRegistration {
  id:                  string
  cooperativeId:       string
  registrationNumber:  string | null
  registrationDate:    string | null
  status:              FboStatus
  renewalDueDate:      string | null
  notes:               string | null
}

export interface CocobodLicense {
  id:                        string
  cooperativeId:             string
  lbcName:                   string
  licenseNumber:             string | null
  agreementStartDate:        string | null
  agreementEndDate:          string | null
  seasonalProducerPrice:     number | null
  premiumAmount:             number | null
  season:                    string | null
  premiumDistributionNotes:  string | null
}

export type FundTransactionType = 'Contribution' | 'Withdrawal' | 'Loan Disbursement' | 'Loan Repayment'
export type PaymentMode         = 'Cash' | 'Mobile Money' | 'Bank Transfer'

export interface FundTransaction {
  id:              string
  cooperativeId:   string
  transactionType: FundTransactionType
  amount:          number
  modeOfPayment:   PaymentMode
  transactionDate: string
  notes:           string
}

export type DocumentType   = 'Constitution' | 'Registration Certificate' | 'Meeting Minutes' | 'Financial Statement' | 'Other'
export type DocumentStatus = 'Active' | 'Archived'

export interface GovernanceDocument {
  id:             string
  cooperativeId:  string
  documentType:   DocumentType
  title:          string
  uploadDate:     string
  status:         DocumentStatus
}

export interface TraceabilityRecord {
  id:                    string
  cooperativeId:         string
  farmerId:              string
  harvestDate:           string
  batchWeightKg:         number
  fermentationConfirmed: boolean
  dryingConfirmed:       boolean
  dryingMoisturePct:     number | null
  lbcReceiptNumber:      string | null
  producerPrice:         number | null
  premiumPaid:           number | null
  saleDate:              string | null
  season:                string
}
