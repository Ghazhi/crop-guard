import type { AgentSummary, CohortRow, FarmerPreview } from '@/app/(admin)/dashboard/AgentAssignment/_logics/interface'

export const AGENTS: AgentSummary[] = [
  { id: 'ag-001', name: 'Kwame Asante', phone: '0241234567', regions: ['AH'],        cohortCount: 2, farmerCount: 3, checkinCount: 2, capacity: 50 },
  { id: 'ag-002', name: 'Abdul Razak',  phone: '0200000010', regions: ['AH', 'SA'], cohortCount: 3, farmerCount: 3, checkinCount: 0, capacity: 50 },
]

export const COHORTS: CohortRow[] = [
  {
    cohortId: 'coh-005', cohortName: 'Kumasi Cohort A',
    programId: 'prog-002', programName: 'Maize Season 2026A',
    region: 'Ashanti', district: 'Kumasi Metro',
    farmerCount: 2, capacity: 100,
    agents: [
      { agentId: 'ag-001', agentName: 'Kwame Asante', isPrimary: true  },
      { agentId: 'ag-002', agentName: 'Abdul Razak',  isPrimary: false },
    ],
  },
  {
    cohortId: 'coh-001', cohortName: 'Cohort 1 - Gurubagu',
    programId: 'prog-001', programName: 'WAVE Program',
    region: 'Savannah', district: 'North Gonja',
    farmerCount: 1, capacity: 45,
    agents: [
      { agentId: 'ag-002', agentName: 'Abdul Razak',  isPrimary: true  },
      { agentId: 'ag-001', agentName: 'Kwame Asante', isPrimary: false },
    ],
  },
  {
    cohortId: 'coh-002', cohortName: 'Cohort 2 - Watato',
    programId: 'prog-001', programName: 'WAVE Program',
    region: 'Savannah', district: 'North Gonja',
    farmerCount: 1, capacity: 40,
    agents: [
      { agentId: 'ag-001', agentName: 'Kwame Asante', isPrimary: true },
    ],
  },
  {
    cohortId: 'coh-003', cohortName: 'Cohort 3 - Lingbensi',
    programId: 'prog-001', programName: 'WAVE Program',
    region: 'Savannah', district: 'East Gonja',
    farmerCount: 1, capacity: 15,
    agents: [],
  },
]

export const FARMER_PREVIEWS: FarmerPreview[] = [
  { id: 'f-001', fullName: 'Ama Mensah',    phone: '0241234567', region: 'Ashanti', currentFri: 61,
    cohortId: 'coh-005', cohortName: 'Kumasi Cohort A',      programId: 'prog-002', programName: 'Maize Season 2026A', agentId: 'ag-001', agentName: 'Kwame Asante' },
  { id: 'f-002', fullName: 'Ama Konadu',    phone: '0551234568', region: 'Ashanti', currentFri: null,
    cohortId: 'coh-005', cohortName: 'Kumasi Cohort A',      programId: 'prog-002', programName: 'Maize Season 2026A', agentId: 'ag-002', agentName: 'Abdul Razak'  },
  { id: 'f-003', fullName: 'Faiza Sidik',   phone: '0551234567', region: 'Savannah', currentFri: 82,
    cohortId: 'coh-001', cohortName: 'Cohort 1 - Gurubagu',  programId: 'prog-001', programName: 'WAVE Program',       agentId: 'ag-002', agentName: 'Abdul Razak'  },
  { id: 'f-004', fullName: 'Karma Fuseini', phone: '0201234567', region: 'Savannah', currentFri: 55,
    cohortId: 'coh-003', cohortName: 'Cohort 3 - Lingbensi', programId: 'prog-001', programName: 'WAVE Program',       agentId: 'ag-001', agentName: 'Kwame Asante' },
  { id: 'f-005', fullName: 'Lydia Adjei',   phone: '0501234567', region: 'Northern', currentFri: null,
    cohortId: 'coh-002', cohortName: 'Cohort 2 - Watato',    programId: 'prog-001', programName: 'WAVE Program',       agentId: 'ag-001', agentName: 'Kwame Asante' },
]
