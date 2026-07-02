// Shared program + cohort reference data used across features

export const PROGRAM_OPTIONS_WITH_COHORTS = [
  {
    id: 'prog-001', name: 'WAVE Program',
    cohorts: [
      { id: 'coh-001', name: 'Cohort 1 - Gurubagu'  },
      { id: 'coh-002', name: 'Cohort 2 - Watato'    },
      { id: 'coh-003', name: 'Cohort 3 - Lingbensi' },
    ],
  },
  {
    id: 'prog-002', name: 'Maize Season 2026A',
    cohorts: [
      { id: 'coh-005', name: 'Kumasi Cohort A' },
    ],
  },
]

export const PROGRAM_OPTIONS_FLAT = PROGRAM_OPTIONS_WITH_COHORTS.map(({ id, name }) => ({ id, name }))

export const INTERVENTION_PROGRAM_OPTIONS = [
  { id: 'prog-001', name: 'WAVE Program'         },
  { id: 'prog-002', name: 'Maize Season 2026A'   },
]
