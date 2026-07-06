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
  {
    id: 'prog-003', name: 'Rice Value Chain 2026',
    cohorts: [
      { id: 'coh-010', name: 'Cohort A - Tamale' },
      { id: 'coh-011', name: 'Cohort B - Yendi'  },
    ],
  },
  {
    id: 'prog-004', name: 'Soybean Outgrower Scheme',
    cohorts: [
      { id: 'coh-012', name: 'Cohort A - Savannah' },
    ],
  },
  {
    id: 'prog-005', name: 'Cassava & Plantain Finance 2026',
    cohorts: [
      { id: 'coh-013', name: 'Ashanti Cohort A' },
      { id: 'coh-014', name: 'Ashanti Cohort B' },
    ],
  },
  {
    id: 'prog-006', name: 'Northern Sorghum Initiative',
    cohorts: [
      { id: 'coh-015', name: 'Cohort A - Tamale'    },
      { id: 'coh-016', name: 'Cohort B - Upper West' },
    ],
  },
  {
    id: 'prog-007', name: 'Feed the Future Groundnut Expansion',
    cohorts: [
      { id: 'coh-017', name: 'Upper East Cohort A' },
    ],
  },
  {
    id: 'prog-008', name: 'Women Smallholder Finance',
    cohorts: [
      { id: 'coh-018', name: 'Bolgatanga Cohort A' },
      { id: 'coh-019', name: 'Bawku Cohort A'      },
    ],
  },
  {
    id: 'prog-009', name: 'Brong-Ahafo Climate Resilience',
    cohorts: [
      { id: 'coh-020', name: 'Sunyani Cohort A'  },
      { id: 'coh-021', name: 'Techiman Cohort A' },
    ],
  },
  {
    id: 'prog-010', name: 'Kumasi Cocoa Microloans',
    cohorts: [
      { id: 'coh-022', name: 'Kumasi Metro Cohort' },
    ],
  },
]

export const PROGRAM_OPTIONS_FLAT = PROGRAM_OPTIONS_WITH_COHORTS.map(({ id, name }) => ({ id, name }))

export const INTERVENTION_PROGRAM_OPTIONS = [
  { id: 'prog-001', name: 'WAVE Program'                         },
  { id: 'prog-002', name: 'Maize Season 2026A'                   },
  { id: 'prog-003', name: 'Rice Value Chain 2026'                },
  { id: 'prog-004', name: 'Soybean Outgrower Scheme'             },
  { id: 'prog-005', name: 'Cassava & Plantain Finance 2026'      },
  { id: 'prog-006', name: 'Northern Sorghum Initiative'          },
  { id: 'prog-007', name: 'Feed the Future Groundnut Expansion'  },
  { id: 'prog-008', name: 'Women Smallholder Finance'            },
  { id: 'prog-009', name: 'Brong-Ahafo Climate Resilience'       },
  { id: 'prog-010', name: 'Kumasi Cocoa Microloans'              },
]
