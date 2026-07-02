import type { Program } from '@/app/dashboard/ProgramsSetup/_logics/interface'

export const PROGRAMS: Program[] = [
  {
    id:            'prog-001',
    name:          'WAVE Program',
    season:        '2026A',
    description:   'WAVE program',
    crops:         ['Soybean'],
    startDate:     '2026-06-09',
    endDate:       '2027-02-27',
    enrolledCount: 3,
    targetCount:   100,
    status:        'Active',
    cohorts: [
      { id: 'coh-003', name: 'Cohort 3 - Lingbensi', region: 'Savannah', district: 'North Gonja', agentName: 'Abdul Razak',  enrolledCount: 1, targetCount: 15 },
      { id: 'coh-002', name: 'Cohort 2 - Watato',    region: 'Savannah', district: 'North Gonja', agentName: 'Kwame Asante', enrolledCount: 1, targetCount: 40 },
      { id: 'coh-001', name: 'Cohort 1 - Gurubagu',  region: 'Savannah', district: 'North Gonja', agentName: 'Abdul Razak',  enrolledCount: 1, targetCount: 45 },
    ],
  },
  {
    id:            'prog-002',
    name:          'Maize Season 2026A',
    season:        '2026A',
    description:   'Smallholder maize farmer resilience program for Ashanti and Brong-Ahafo regions.',
    crops:         ['Maize'],
    startDate:     '2026-03-01',
    endDate:       '2026-09-30',
    enrolledCount: 2,
    targetCount:   500,
    status:        'Active',
    cohorts: [
      { id: 'coh-005', name: 'Kumasi Cohort A', region: 'Ashanti', district: 'Kumasi Metro', agentName: 'Kwame Asante', enrolledCount: 2, targetCount: 100 },
    ],
  },
]
