import type { FarmerDetail, WeekScore, RiskFlag, Intervention } from '@/app/dashboard/FarmerDetail/[farmerId]/_logics/interface'

export const FARMER_DETAIL: FarmerDetail = {
  farmerId:        'F-4821',
  fullName:        'Amara Diallo',
  asinyoId:        'ASN-2026-04821',
  community:       'Kwahu North',
  district:        'Eastern Region',
  programName:     'GhanaVeg Resilience Programme',
  cohortName:      'Cohort B — 2026A',
  zone:            'Resilience Builder',
  totalScore:      71,
  baselineScore:   58,
  creditScore:     68,
  eciScore:        74,
  riskBand:        'Moderate',
  recommendation:  'Review',
  trajectory:      'Improving',
  weeksFinal:      6,
  weeksProvisional: 2,
  isProvisional:   true,
}

export const WEEK_SCORES: WeekScore[] = [
  { weekNumber: 1, totalScore: 55, p1Score: 18, p2Score: 14, p3Score: 13, p4Score: 10, eciScore: 60, isProvisional: false, scoreStatus: 'final'       },
  { weekNumber: 2, totalScore: 57, p1Score: 19, p2Score: 15, p3Score: 13, p4Score: 10, eciScore: 62, isProvisional: false, scoreStatus: 'final'       },
  { weekNumber: 3, totalScore: 59, p1Score: 20, p2Score: 15, p3Score: 14, p4Score: 10, eciScore: 64, isProvisional: false, scoreStatus: 'final'       },
  { weekNumber: 4, totalScore: 62, p1Score: 21, p2Score: 16, p3Score: 14, p4Score: 11, eciScore: 67, isProvisional: false, scoreStatus: 'final'       },
  { weekNumber: 5, totalScore: 65, p1Score: 22, p2Score: 17, p3Score: 15, p4Score: 11, eciScore: 69, isProvisional: false, scoreStatus: 'final'       },
  { weekNumber: 6, totalScore: 68, p1Score: 23, p2Score: 18, p3Score: 16, p4Score: 11, eciScore: 71, isProvisional: false, scoreStatus: 'final'       },
  { weekNumber: 7, totalScore: 70, p1Score: 23, p2Score: 18, p3Score: 17, p4Score: 12, eciScore: 73, isProvisional: true,  scoreStatus: 'provisional' },
  { weekNumber: 8, totalScore: 71, p1Score: 24, p2Score: 19, p3Score: 17, p4Score: 11, eciScore: 74, isProvisional: true,  scoreStatus: 'provisional' },
]

export const RISK_FLAGS: RiskFlag[] = [
  { id: 'rf-001', flagType: 'Missed Verification',  severity: 'high',   description: 'No field verification submitted for the past 3 consecutive weeks.',        createdAt: '2026-06-18' },
  { id: 'rf-002', flagType: 'Input Non-Compliance', severity: 'medium', description: 'Reported fertiliser usage does not match recommended protocol for Zone B.', createdAt: '2026-06-20' },
  { id: 'rf-003', flagType: 'Incomplete Profile',   severity: 'medium', description: 'Land tenure documentation missing; required for cohort advancement.',       createdAt: '2026-06-21' },
]

export const FARMER_INTERVENTIONS: Intervention[] = [
  { id: 'int-001', name: 'Input Credit Line',            type: 'Credit',         description: 'Access to subsidised input credit for seeds and fertiliser up to GHS 2,500 per season.',   minFRI: 60, eligible: true,  friGap: null },
  { id: 'int-002', name: 'Climate-Smart Agri-Insurance', type: 'Insurance',      description: 'Index-based weather insurance covering drought and flood events above threshold.',          minFRI: 65, eligible: true,  friGap: null },
  { id: 'int-003', name: 'Premium Market Linkage',       type: 'Market Access',  description: 'Direct offtake agreement with certified buyers at premium pricing for Grade A produce.',   minFRI: 80, eligible: false, friGap: 9    },
  { id: 'int-004', name: 'Irrigation Subsidy Grant',     type: 'Infrastructure', description: 'Capital grant of up to GHS 8,000 toward drip irrigation installation for smallholders.',  minFRI: 85, eligible: false, friGap: 14   },
]
