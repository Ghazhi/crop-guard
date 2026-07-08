import { fmtGHS } from '@/lib/utils'
export { fmtGHS }

export const FINANCIAL_KPI = {
  totalPortfolio:    1250000,
  disbursed:          680000,
  collected:          412000,
  outstanding:        268000,
  nplRate:               3.8,
  provisionRequired:   48200,
  portfolioAtRisk:      12.4,
  roi:                   8.2,
}

export interface ProgramBreakdown {
  program: string; loans: number; value: number; repaid: number; npl: number; zone: string
}

export const PROGRAM_BREAKDOWN: ProgramBreakdown[] = [
  { program: 'WAVE Program',       loans: 148, value: 220000, repaid: 148000, npl: 2.1, zone: 'Northern'    },
  { program: 'Maize Season 2026A', loans: 139, value: 250200, repaid: 162000, npl: 3.9, zone: 'Ashanti'     },
  { program: 'Soybean 2026A',      loans:  62, value:  86800, repaid:  52000, npl: 5.2, zone: 'Upper East'  },
  { program: 'Climate Insurance',  loans:  89, value: 123000, repaid:  50000, npl: 1.8, zone: 'Brong Ahafo' },
]

export interface RiskEntry {
  id: string; name: string; program: string; loanAmount: number
  fri: number; daysOverdue: number; riskBand: 'High' | 'Medium' | 'Watch'
  recommendation: string
}

export const RISK_ENTRIES: RiskEntry[] = [
  { id: 'r-001', name: 'Yaw Darko',      program: 'WAVE Program',       loanAmount: 1400, fri: 42, daysOverdue: 57, riskBand: 'High',   recommendation: 'Initiate recovery process'   },
  { id: 'r-002', name: 'Nana Addo',      program: 'WAVE Program',       loanAmount: 1800, fri: 39, daysOverdue: 43, riskBand: 'High',   recommendation: 'Field visit required'        },
  { id: 'r-003', name: 'Akua Asante',    program: 'Maize Season 2026A', loanAmount: 1800, fri: 58, daysOverdue: 12, riskBand: 'Medium', recommendation: 'Monitor closely, 30-day watch'},
  { id: 'r-004', name: 'Efua Mensah',    program: 'Maize Season 2026A', loanAmount: 1800, fri: 55, daysOverdue: 8,  riskBand: 'Medium', recommendation: 'Agent follow-up recommended'  },
  { id: 'r-005', name: 'Kofi Boateng',   program: 'WAVE Program',       loanAmount: 1800, fri: 65, daysOverdue: 4,  riskBand: 'Watch',  recommendation: 'Grace period active'         },
  { id: 'r-006', name: 'Mensima Gyamfi', program: 'Soybean 2026A',      loanAmount: 1400, fri: 48, daysOverdue: 22, riskBand: 'High',   recommendation: 'Restructure or provision'    },
]

export interface Transaction {
  id: string; date: string; type: 'Disbursement' | 'Repayment' | 'Provision' | 'Write-off'
  farmer: string; program: string; amount: number; reference: string; status: 'Settled' | 'Pending' | 'Failed'
}

export const TRANSACTIONS: Transaction[] = [
  { id: 't-001', date: '2026-07-01', type: 'Repayment',    farmer: 'Ama Mensah',     program: 'WAVE Program',       amount:  900, reference: 'RPY-2026-0701-001', status: 'Settled' },
  { id: 't-002', date: '2026-07-01', type: 'Repayment',    farmer: 'Adwoa Osei',     program: 'Maize Season 2026A', amount:  900, reference: 'RPY-2026-0701-002', status: 'Settled' },
  { id: 't-003', date: '2026-06-30', type: 'Disbursement', farmer: 'Mensima Gyamfi', program: 'WAVE Program',       amount: 1400, reference: 'DIS-2026-0630-001', status: 'Settled' },
  { id: 't-004', date: '2026-06-30', type: 'Repayment',    farmer: 'Kweku Amoah',    program: 'WAVE Program',       amount:  700, reference: 'RPY-2026-0630-001', status: 'Settled' },
  { id: 't-005', date: '2026-06-28', type: 'Provision',    farmer: 'Yaw Darko',      program: 'WAVE Program',       amount:  280, reference: 'PRV-2026-0628-001', status: 'Settled' },
  { id: 't-006', date: '2026-06-27', type: 'Disbursement', farmer: 'Abena Boakye',   program: 'Maize Season 2026A', amount: 1800, reference: 'DIS-2026-0627-001', status: 'Pending' },
  { id: 't-007', date: '2026-06-25', type: 'Repayment',    farmer: 'Kofi Boateng',   program: 'WAVE Program',       amount:  900, reference: 'RPY-2026-0625-001', status: 'Failed'  },
  { id: 't-008', date: '2026-06-24', type: 'Disbursement', farmer: 'Yaw Asante',     program: 'WAVE Program',       amount: 1800, reference: 'DIS-2026-0624-001', status: 'Settled' },
  { id: 't-009', date: '2026-06-23', type: 'Write-off',    farmer: 'Nana Addo',      program: 'WAVE Program',       amount:  900, reference: 'WOF-2026-0623-001', status: 'Settled' },
  { id: 't-010', date: '2026-06-20', type: 'Repayment',    farmer: 'Akua Asante',    program: 'Maize Season 2026A', amount:  600, reference: 'RPY-2026-0620-001', status: 'Settled' },
]

export interface ComplianceItem {
  id: string; category: string; item: string
  status: 'Compliant' | 'Due Soon' | 'Overdue' | 'Pending Review'
  dueDate: string; owner: string
}

export const COMPLIANCE_ITEMS: ComplianceItem[] = [
  { id: 'c-001', category: 'Regulatory', item: 'Bank of Ghana Quarterly Return',       status: 'Compliant',      dueDate: '2026-07-31', owner: 'Finance Team'    },
  { id: 'c-002', category: 'Regulatory', item: 'AML/KYC Farmer Documentation Review', status: 'Due Soon',       dueDate: '2026-07-15', owner: 'Compliance Team' },
  { id: 'c-003', category: 'Internal',   item: 'Portfolio Provisioning Review',        status: 'Compliant',      dueDate: '2026-06-30', owner: 'Credit Risk'     },
  { id: 'c-004', category: 'Audit',      item: 'External Audit — Q2 2026',             status: 'Pending Review', dueDate: '2026-07-20', owner: 'External Auditor'},
  { id: 'c-005', category: 'Regulatory', item: 'IFRS 9 ECL Calculation Update',       status: 'Overdue',        dueDate: '2026-06-30', owner: 'Finance Team'    },
  { id: 'c-006', category: 'Internal',   item: 'Borrower Data Accuracy Spot Check',   status: 'Compliant',      dueDate: '2026-06-28', owner: 'Data Team'       },
  { id: 'c-007', category: 'Regulatory', item: 'Agri-Finance Impact Disclosure',      status: 'Due Soon',       dueDate: '2026-07-10', owner: 'Reporting Team'  },
  { id: 'c-008', category: 'Audit',      item: 'Internal Controls Self-Assessment',   status: 'Compliant',      dueDate: '2026-06-25', owner: 'Internal Audit'  },
]

export function txTypeStyle(t: Transaction['type']): string {
  if (t === 'Disbursement') return 'bg-blue-50 text-blue-700 border-blue-200'
  if (t === 'Repayment')    return 'bg-green-50 text-green-700 border-green-200'
  if (t === 'Provision')    return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-red-50 text-red-700 border-red-200'
}

export function txStatusStyle(s: Transaction['status']): string {
  if (s === 'Settled') return 'bg-green-50 text-green-700'
  if (s === 'Pending') return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}

export function riskBandStyle(b: RiskEntry['riskBand']): string {
  if (b === 'High')   return 'bg-red-50 text-red-700 border-red-200'
  if (b === 'Medium') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-blue-50 text-blue-700 border-blue-200'
}

export function complianceStatusCls(s: ComplianceItem['status']): string {
  if (s === 'Compliant')     return 'bg-green-50 text-green-700 border-green-200'
  if (s === 'Due Soon')      return 'bg-amber-50 text-amber-700 border-amber-200'
  if (s === 'Overdue')       return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-blue-50 text-blue-700 border-blue-200'
}
