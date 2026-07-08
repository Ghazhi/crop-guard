import { fmtGHS } from '@/lib/utils'
export { fmtGHS }

export type LoanStatus   = 'Active' | 'Completed' | 'Defaulted' | 'Suspended'
export type AppStatus    = 'Pending' | 'Approved' | 'Rejected' | 'Under Review'
export type RepayStatus  = 'On Time' | 'Late' | 'Missed' | 'Upcoming'

export const KPI = {
  portfolioValue:  450000,
  activeLoans:     287,
  repaymentRate:   91.2,
  atRisk:          23,
  disbursedMTD:    38500,
  collectedMTD:    29800,
  avgLoanSize:     1569,
  nplRate:         4.1,
}

export interface FarmerLoan {
  id: string; name: string; cohort: string; program: string
  loanAmount: number; disbursedDate: string; dueDate: string
  repaid: number; status: LoanStatus; fri: number; zone: string
}

export const FARMER_LOANS: FarmerLoan[] = [
  { id: 'fl-001', name: 'Ama Mensah',     cohort: 'Cohort 1 - Gurubagu', program: 'WAVE Program',       loanAmount: 1800, disbursedDate: '2026-03-10', dueDate: '2026-09-10', repaid: 1800, status: 'Completed', fri: 78, zone: 'Excellent' },
  { id: 'fl-002', name: 'Kofi Boateng',   cohort: 'Cohort 2 - Watato',   program: 'WAVE Program',       loanAmount: 1800, disbursedDate: '2026-03-10', dueDate: '2026-09-10', repaid: 900,  status: 'Active',    fri: 65, zone: 'Good'      },
  { id: 'fl-003', name: 'Abena Frimpong', cohort: 'Kumasi Cohort A',     program: 'Maize Season 2026A', loanAmount: 1800, disbursedDate: '2026-03-15', dueDate: '2026-09-15', repaid: 1350, status: 'Active',    fri: 72, zone: 'Good'      },
  { id: 'fl-004', name: 'Yaw Darko',      cohort: 'Cohort 1 - Gurubagu', program: 'WAVE Program',       loanAmount: 1400, disbursedDate: '2026-03-10', dueDate: '2026-09-10', repaid: 0,    status: 'Defaulted', fri: 42, zone: 'At Risk'   },
  { id: 'fl-005', name: 'Akua Asante',    cohort: 'Kumasi Cohort A',     program: 'Maize Season 2026A', loanAmount: 1800, disbursedDate: '2026-03-15', dueDate: '2026-09-15', repaid: 600,  status: 'Active',    fri: 58, zone: 'Moderate'  },
  { id: 'fl-006', name: 'Kweku Amoah',    cohort: 'Cohort 2 - Watato',   program: 'WAVE Program',       loanAmount: 1400, disbursedDate: '2026-03-10', dueDate: '2026-09-10', repaid: 1400, status: 'Completed', fri: 81, zone: 'Excellent' },
  { id: 'fl-007', name: 'Efua Mensah',    cohort: 'Kumasi Cohort A',     program: 'Maize Season 2026A', loanAmount: 1800, disbursedDate: '2026-03-15', dueDate: '2026-09-15', repaid: 450,  status: 'Active',    fri: 55, zone: 'Moderate'  },
  { id: 'fl-008', name: 'Nana Addo',      cohort: 'Cohort 1 - Gurubagu', program: 'WAVE Program',       loanAmount: 1800, disbursedDate: '2026-03-10', dueDate: '2026-09-10', repaid: 900,  status: 'Suspended', fri: 39, zone: 'At Risk'   },
  { id: 'fl-009', name: 'Adwoa Osei',     cohort: 'Kumasi Cohort A',     program: 'Maize Season 2026A', loanAmount: 1800, disbursedDate: '2026-03-15', dueDate: '2026-09-15', repaid: 1800, status: 'Completed', fri: 88, zone: 'Excellent' },
  { id: 'fl-010', name: 'Kojo Mensah',    cohort: 'Cohort 2 - Watato',   program: 'WAVE Program',       loanAmount: 1400, disbursedDate: '2026-03-10', dueDate: '2026-09-10', repaid: 700,  status: 'Active',    fri: 63, zone: 'Good'      },
]

export interface LoanApp {
  id: string; name: string; cohort: string; program: string
  amount: number; type: string; appliedDate: string; status: AppStatus; fri: number; notes: string
}

export const LOAN_APPS: LoanApp[] = [
  { id: 'la-001', name: 'Mensima Gyamfi', cohort: 'Cohort 1 - Gurubagu', program: 'WAVE Program',       amount: 1800, type: 'Input Loan', appliedDate: '2026-06-18', status: 'Pending',      fri: 74, notes: 'First-time applicant, strong FRI'   },
  { id: 'la-002', name: 'Owusu Barimah',  cohort: 'Kumasi Cohort A',     program: 'Maize Season 2026A', amount: 1800, type: 'Input Loan', appliedDate: '2026-06-17', status: 'Under Review', fri: 68, notes: 'Awaiting field verification'         },
  { id: 'la-003', name: 'Ama Serwaa',     cohort: 'Cohort 2 - Watato',   program: 'WAVE Program',       amount: 3000, type: 'Insurance',  appliedDate: '2026-06-16', status: 'Approved',     fri: 82, notes: 'Auto-approved via FRI threshold'     },
  { id: 'la-004', name: 'Kwabena Poku',   cohort: 'Cohort 1 - Gurubagu', program: 'WAVE Program',       amount: 1400, type: 'Input Loan', appliedDate: '2026-06-15', status: 'Rejected',     fri: 38, notes: 'FRI below minimum threshold (60)'    },
  { id: 'la-005', name: 'Abena Boakye',   cohort: 'Kumasi Cohort A',     program: 'Maize Season 2026A', amount: 1800, type: 'Input Loan', appliedDate: '2026-06-14', status: 'Pending',      fri: 71, notes: 'Missing land tenure documents'      },
  { id: 'la-006', name: 'Yaw Asante',     cohort: 'Cohort 2 - Watato',   program: 'WAVE Program',       amount: 1800, type: 'Input Loan', appliedDate: '2026-06-13', status: 'Approved',     fri: 79, notes: 'Repeat borrower, good history'       },
  { id: 'la-007', name: 'Adwoa Gyasi',    cohort: 'Kumasi Cohort A',     program: 'Maize Season 2026A', amount: 3000, type: 'Insurance',  appliedDate: '2026-06-12', status: 'Under Review', fri: 65, notes: 'Crop type verification needed'        },
]

export interface RepayRow {
  id: string; name: string; amount: number; dueDate: string
  paidDate: string | null; status: RepayStatus; installment: number; total: number
}

export const REPAY_ROWS: RepayRow[] = [
  { id: 'r-001', name: 'Ama Mensah',     amount: 900, dueDate: '2026-06-10', paidDate: '2026-06-09', status: 'On Time',  installment: 2, total: 2 },
  { id: 'r-002', name: 'Kofi Boateng',   amount: 900, dueDate: '2026-06-10', paidDate: '2026-06-14', status: 'Late',     installment: 1, total: 2 },
  { id: 'r-003', name: 'Abena Frimpong', amount: 450, dueDate: '2026-06-15', paidDate: '2026-06-15', status: 'On Time',  installment: 1, total: 4 },
  { id: 'r-004', name: 'Yaw Darko',      amount: 700, dueDate: '2026-06-10', paidDate: null,         status: 'Missed',   installment: 1, total: 2 },
  { id: 'r-005', name: 'Akua Asante',    amount: 600, dueDate: '2026-07-15', paidDate: null,         status: 'Upcoming', installment: 2, total: 3 },
  { id: 'r-006', name: 'Kweku Amoah',    amount: 700, dueDate: '2026-06-10', paidDate: '2026-06-10', status: 'On Time',  installment: 2, total: 2 },
  { id: 'r-007', name: 'Efua Mensah',    amount: 450, dueDate: '2026-07-15', paidDate: null,         status: 'Upcoming', installment: 2, total: 4 },
  { id: 'r-008', name: 'Nana Addo',      amount: 900, dueDate: '2026-05-10', paidDate: null,         status: 'Missed',   installment: 1, total: 2 },
  { id: 'r-009', name: 'Adwoa Osei',     amount: 900, dueDate: '2026-06-15', paidDate: '2026-06-14', status: 'On Time',  installment: 2, total: 2 },
  { id: 'r-010', name: 'Kojo Mensah',    amount: 700, dueDate: '2026-07-10', paidDate: null,         status: 'Upcoming', installment: 2, total: 2 },
]

export function fmt(n: number)    { return n.toLocaleString() }

export function loanStatusStyle(s: LoanStatus): string {
  if (s === 'Active')    return 'bg-blue-50 text-blue-700 border-blue-200'
  if (s === 'Completed') return 'bg-green-50 text-green-700 border-green-200'
  if (s === 'Defaulted') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}

export function appStatusStyle(s: AppStatus): string {
  if (s === 'Approved')     return 'bg-green-50 text-green-700 border-green-200'
  if (s === 'Rejected')     return 'bg-red-50 text-red-700 border-red-200'
  if (s === 'Under Review') return 'bg-blue-50 text-blue-700 border-blue-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}

export function repayStatusCls(s: RepayStatus): string {
  if (s === 'On Time')  return 'bg-green-50 text-green-700 border-green-200'
  if (s === 'Late')     return 'bg-amber-50 text-amber-700 border-amber-200'
  if (s === 'Missed')   return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-gray-50 text-gray-500 border-gray-200'
}
