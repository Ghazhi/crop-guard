import type { Intervention } from '@/app/(admin)/dashboard/OpportunityPathways/_logics/interface'

export const INTERVENTIONS: Intervention[] = [
  // ── p-001: Fidelity Bank Ghana ─────────────────────────────────────────────
  {
    id: 'int-001', name: 'Maize Input Loan', type: 'Input Loan',
    season: '2026A', valueDescription: 'GHS 1,800',
    description: 'Subsidised inputs package covering certified maize seeds, NPK fertiliser, and crop protectants for one season.',
    minFri: 60, capacity: 200, status: 'Active', approval: 'Auto', createdAt: '2026-03-01',
    enrolledCohorts: [
      { programId: 'prog-002', programName: 'Maize Season 2026A', cohortId: 'coh-005', cohortName: 'Kumasi Cohort A' },
    ],
    partnerAssignments: [
      { partnerId: 'p-001', cohorts: [
        { programId: 'prog-002', programName: 'Maize Season 2026A', cohortId: 'coh-005', cohortName: 'Kumasi Cohort A' },
      ]},
    ],
    rules: [
      { id: 'r-001', field: 'primaryCrop', operator: '=',  value: 'maize' },
      { id: 'r-002', field: 'farmSize',    operator: '>=', value: '0.5'   },
    ],
    steps: [
      { id: 's-001', description: 'Agent verifies farm size and crop type on field visit.', order: 1 },
      { id: 's-002', description: 'Farmer completes input request form with agent.',         order: 2 },
      { id: 's-003', description: 'Inputs disbursed at collection point within 7 days.',    order: 3 },
    ],
  },
  {
    id: 'int-002', name: 'Climate-Smart Insurance', type: 'Insurance',
    season: '2026A', valueDescription: 'Up to GHS 3,000',
    description: 'Index-based weather insurance covering drought and flood events. Payout triggered automatically by satellite weather data.',
    minFri: 65, capacity: 300, status: 'Active', approval: 'Auto', createdAt: '2026-03-01',
    enrolledCohorts: [
      { programId: 'prog-002', programName: 'Maize Season 2026A', cohortId: 'coh-005', cohortName: 'Kumasi Cohort A'      },
      { programId: 'prog-001', programName: 'WAVE Program',       cohortId: 'coh-001', cohortName: 'Cohort 1 - Gurubagu' },
    ],
    partnerAssignments: [
      { partnerId: 'p-001', cohorts: [
        { programId: 'prog-002', programName: 'Maize Season 2026A', cohortId: 'coh-005', cohortName: 'Kumasi Cohort A'      },
        { programId: 'prog-001', programName: 'WAVE Program',       cohortId: 'coh-001', cohortName: 'Cohort 1 - Gurubagu' },
      ]},
    ],
    rules: [
      { id: 'r-003', field: 'primaryCrop', operator: '=',  value: 'maize' },
      { id: 'r-004', field: 'fri',         operator: '>=', value: '65'    },
    ],
    steps: [
      { id: 's-004', description: 'Farmer enrolled automatically upon meeting FRI threshold.', order: 1 },
      { id: 's-005', description: 'Policy document sent via SMS within 48 hours.',             order: 2 },
    ],
  },
  {
    id: 'int-003', name: 'Soybean Input Loan', type: 'Input Loan',
    season: '2026A', valueDescription: 'GHS 1,400',
    description: 'Inputs package — improved soybean seeds, inoculants, and fertilisers for the 2026A planting season.',
    minFri: 60, capacity: 100, status: 'Active', approval: 'Manual', createdAt: '2026-01-10',
    enrolledCohorts: [
      { programId: 'prog-001', programName: 'WAVE Program', cohortId: 'coh-001', cohortName: 'Cohort 1 - Gurubagu' },
      { programId: 'prog-001', programName: 'WAVE Program', cohortId: 'coh-002', cohortName: 'Cohort 2 - Watato'   },
    ],
    partnerAssignments: [
      { partnerId: 'p-001', cohorts: [
        { programId: 'prog-001', programName: 'WAVE Program', cohortId: 'coh-001', cohortName: 'Cohort 1 - Gurubagu' },
        { programId: 'prog-001', programName: 'WAVE Program', cohortId: 'coh-002', cohortName: 'Cohort 2 - Watato'   },
      ]},
    ],
    rules: [
      { id: 'r-005', field: 'primaryCrop', operator: '=', value: 'soybean' },
    ],
    steps: [
      { id: 's-006', description: 'Agent confirms farm details and completes eligibility check.',   order: 1 },
      { id: 's-007', description: 'Programme officer approves application within 3 working days.', order: 2 },
      { id: 's-008', description: 'Inputs collected at district aggregation point.',               order: 3 },
    ],
  },
  {
    id: 'int-004', name: 'Market Linkage — Premium Offtake', type: 'Market Access',
    season: '2026A', valueDescription: 'Premium pricing',
    description: 'Direct offtake agreement with certified buyers guaranteeing Grade A soybean purchase at 15% above market rate.',
    minFri: 75, capacity: 50, status: 'Draft', approval: 'Manual', createdAt: '2026-02-20',
    enrolledCohorts: [],
    partnerAssignments: [
      { partnerId: 'p-001', cohorts: [] },
    ],
    rules: [
      { id: 'r-006', field: 'fri',      operator: '>=', value: '75'   },
      { id: 'r-007', field: 'verified', operator: '=',  value: 'true' },
    ],
    steps: [
      { id: 's-009', description: 'Farmer submits produce volume estimate 4 weeks before harvest.', order: 1 },
      { id: 's-010', description: 'Offtake agreement signed with buyer representative.',             order: 2 },
    ],
  },

  // ── p-002: Agricultural DFI ────────────────────────────────────────────────
  {
    id: 'int-005', name: 'Rice Input Finance', type: 'Input Loan',
    season: '2026A', valueDescription: 'GHS 2,200',
    description: 'Full-season input financing covering improved paddy rice seeds, fertilisers, and irrigation support for Northern corridor farmers.',
    minFri: 55, capacity: 250, status: 'Active', approval: 'Auto', createdAt: '2026-04-01',
    enrolledCohorts: [
      { programId: 'prog-003', programName: 'Rice Value Chain 2026', cohortId: 'coh-010', cohortName: 'Cohort A - Tamale' },
      { programId: 'prog-003', programName: 'Rice Value Chain 2026', cohortId: 'coh-011', cohortName: 'Cohort B - Yendi'  },
    ],
    partnerAssignments: [
      { partnerId: 'p-002', cohorts: [
        { programId: 'prog-003', programName: 'Rice Value Chain 2026', cohortId: 'coh-010', cohortName: 'Cohort A - Tamale' },
        { programId: 'prog-003', programName: 'Rice Value Chain 2026', cohortId: 'coh-011', cohortName: 'Cohort B - Yendi'  },
      ]},
    ],
    rules: [
      { id: 'r-010', field: 'primaryCrop', operator: '=',  value: 'rice' },
      { id: 'r-011', field: 'farmSize',    operator: '>=', value: '1.0'  },
    ],
    steps: [
      { id: 's-015', description: 'Agent conducts GPS farm boundary mapping.',                order: 1 },
      { id: 's-016', description: 'Loan agreement signed at district branch.',                order: 2 },
      { id: 's-017', description: 'Inputs released in two tranches — planting and top-dress.', order: 3 },
    ],
  },
  {
    id: 'int-006', name: 'Soybean Market Access', type: 'Market Access',
    season: '2025B', valueDescription: 'Guaranteed offtake',
    description: 'Outgrower offtake guarantee connecting soybean farmers to national processing facilities at fixed floor price.',
    minFri: 70, capacity: 150, status: 'Active', approval: 'Manual', createdAt: '2025-08-01',
    enrolledCohorts: [
      { programId: 'prog-004', programName: 'Soybean Outgrower Scheme', cohortId: 'coh-012', cohortName: 'Cohort A - Savannah' },
    ],
    partnerAssignments: [
      { partnerId: 'p-002', cohorts: [
        { programId: 'prog-004', programName: 'Soybean Outgrower Scheme', cohortId: 'coh-012', cohortName: 'Cohort A - Savannah' },
      ]},
    ],
    rules: [
      { id: 'r-012', field: 'primaryCrop', operator: '=',  value: 'soybean' },
      { id: 'r-013', field: 'fri',         operator: '>=', value: '70'      },
    ],
    steps: [
      { id: 's-018', description: 'Farmer registers estimated harvest volume with aggregator.', order: 1 },
      { id: 's-019', description: 'Quality grading at collection centre.',                       order: 2 },
      { id: 's-020', description: 'Payment within 5 working days of delivery.',                  order: 3 },
    ],
  },

  // ── p-003: Ghana Rural Bank ────────────────────────────────────────────────
  {
    id: 'int-007', name: 'Cassava Input Loan', type: 'Input Loan',
    season: '2026A', valueDescription: 'GHS 1,200',
    description: 'Subsidised cassava planting materials, fertiliser, and herbicides for Ashanti smallholder farmers.',
    minFri: 50, capacity: 300, status: 'Active', approval: 'Auto', createdAt: '2026-02-01',
    enrolledCohorts: [
      { programId: 'prog-005', programName: 'Cassava & Plantain Finance 2026', cohortId: 'coh-013', cohortName: 'Ashanti Cohort A' },
      { programId: 'prog-005', programName: 'Cassava & Plantain Finance 2026', cohortId: 'coh-014', cohortName: 'Ashanti Cohort B' },
    ],
    partnerAssignments: [
      { partnerId: 'p-003', cohorts: [
        { programId: 'prog-005', programName: 'Cassava & Plantain Finance 2026', cohortId: 'coh-013', cohortName: 'Ashanti Cohort A' },
        { programId: 'prog-005', programName: 'Cassava & Plantain Finance 2026', cohortId: 'coh-014', cohortName: 'Ashanti Cohort B' },
      ]},
    ],
    rules: [
      { id: 'r-020', field: 'primaryCrop', operator: '=',  value: 'cassava' },
      { id: 'r-021', field: 'farmSize',    operator: '>=', value: '0.5'     },
    ],
    steps: [
      { id: 's-025', description: 'Field officer validates land ownership or usage rights.', order: 1 },
      { id: 's-026', description: 'Inputs collected from nearest rural bank branch.',        order: 2 },
    ],
  },
  {
    id: 'int-008', name: 'Yam Market Advisory', type: 'Advisory',
    season: '2026A', valueDescription: 'Free advisory',
    description: 'Agronomist-led advisory sessions on improved yam cultivation, post-harvest handling, and market pricing intelligence.',
    minFri: 40, capacity: 200, status: 'Active', approval: 'Auto', createdAt: '2026-02-15',
    enrolledCohorts: [
      { programId: 'prog-005', programName: 'Cassava & Plantain Finance 2026', cohortId: 'coh-013', cohortName: 'Ashanti Cohort A' },
      { programId: 'prog-005', programName: 'Cassava & Plantain Finance 2026', cohortId: 'coh-014', cohortName: 'Ashanti Cohort B' },
    ],
    partnerAssignments: [
      { partnerId: 'p-003', cohorts: [
        { programId: 'prog-005', programName: 'Cassava & Plantain Finance 2026', cohortId: 'coh-013', cohortName: 'Ashanti Cohort A' },
        { programId: 'prog-005', programName: 'Cassava & Plantain Finance 2026', cohortId: 'coh-014', cohortName: 'Ashanti Cohort B' },
      ]},
    ],
    rules: [
      { id: 'r-022', field: 'primaryCrop', operator: '=', value: 'yam' },
    ],
    steps: [
      { id: 's-027', description: 'Farmer registers for advisory series at community level.', order: 1 },
      { id: 's-028', description: 'Monthly sessions delivered by certified agronomist.',      order: 2 },
    ],
  },

  // ── p-004: USAID Feed the Future ──────────────────────────────────────────
  {
    id: 'int-009', name: 'Sorghum Input Grant', type: 'Input Loan',
    season: '2026A', valueDescription: 'GHS 1,600 grant',
    description: 'Donor-funded input grant for sorghum and millet farmers in Northern and Upper West regions.',
    minFri: 45, capacity: 400, status: 'Active', approval: 'Auto', createdAt: '2026-05-01',
    enrolledCohorts: [
      { programId: 'prog-006', programName: 'Northern Sorghum Initiative', cohortId: 'coh-015', cohortName: 'Cohort A - Tamale'    },
      { programId: 'prog-006', programName: 'Northern Sorghum Initiative', cohortId: 'coh-016', cohortName: 'Cohort B - Upper West' },
    ],
    partnerAssignments: [
      { partnerId: 'p-004', cohorts: [
        { programId: 'prog-006', programName: 'Northern Sorghum Initiative', cohortId: 'coh-015', cohortName: 'Cohort A - Tamale'    },
        { programId: 'prog-006', programName: 'Northern Sorghum Initiative', cohortId: 'coh-016', cohortName: 'Cohort B - Upper West' },
      ]},
    ],
    rules: [
      { id: 'r-030', field: 'primaryCrop', operator: '=', value: 'sorghum' },
    ],
    steps: [
      { id: 's-030', description: 'Farmer registers with community VSLA group.',        order: 1 },
      { id: 's-031', description: 'Grant disbursed via mobile money upon verification.', order: 2 },
      { id: 's-032', description: 'Post-harvest data submitted to USAID M&E system.',    order: 3 },
    ],
  },
  {
    id: 'int-010', name: 'Groundnut Offtake Partnership', type: 'Market Access',
    season: '2026A', valueDescription: 'Export-grade pricing',
    description: 'Market linkage connecting Upper East groundnut farmers to certified export buyers with guaranteed minimum pricing.',
    minFri: 60, capacity: 250, status: 'Active', approval: 'Manual', createdAt: '2026-03-15',
    enrolledCohorts: [
      { programId: 'prog-007', programName: 'Feed the Future Groundnut Expansion', cohortId: 'coh-017', cohortName: 'Upper East Cohort A' },
    ],
    partnerAssignments: [
      { partnerId: 'p-004', cohorts: [
        { programId: 'prog-007', programName: 'Feed the Future Groundnut Expansion', cohortId: 'coh-017', cohortName: 'Upper East Cohort A' },
      ]},
    ],
    rules: [
      { id: 'r-031', field: 'primaryCrop', operator: '=',  value: 'groundnut' },
      { id: 'r-032', field: 'farmSize',    operator: '>=', value: '1.0'       },
    ],
    steps: [
      { id: 's-033', description: 'Farmer submits produce quality sample for grading.', order: 1 },
      { id: 's-034', description: 'Offtake contract signed at district office.',         order: 2 },
      { id: 's-035', description: 'Payment on delivery at aggregation point.',           order: 3 },
    ],
  },
  {
    id: 'int-011', name: 'Climate Adaptation Advisory', type: 'Advisory',
    season: '2026A', valueDescription: 'Free advisory',
    description: 'Climate-smart farming advisory programme covering drought-tolerant varieties, conservation tillage, and water harvesting techniques.',
    minFri: 40, capacity: 500, status: 'Active', approval: 'Auto', createdAt: '2026-04-01',
    enrolledCohorts: [
      { programId: 'prog-006', programName: 'Northern Sorghum Initiative',         cohortId: 'coh-015', cohortName: 'Cohort A - Tamale'        },
      { programId: 'prog-006', programName: 'Northern Sorghum Initiative',         cohortId: 'coh-016', cohortName: 'Cohort B - Upper West'     },
      { programId: 'prog-007', programName: 'Feed the Future Groundnut Expansion', cohortId: 'coh-017', cohortName: 'Upper East Cohort A'       },
    ],
    partnerAssignments: [
      { partnerId: 'p-004', cohorts: [
        { programId: 'prog-006', programName: 'Northern Sorghum Initiative',         cohortId: 'coh-015', cohortName: 'Cohort A - Tamale'    },
        { programId: 'prog-006', programName: 'Northern Sorghum Initiative',         cohortId: 'coh-016', cohortName: 'Cohort B - Upper West' },
        { programId: 'prog-007', programName: 'Feed the Future Groundnut Expansion', cohortId: 'coh-017', cohortName: 'Upper East Cohort A'  },
      ]},
    ],
    rules: [],
    steps: [
      { id: 's-036', description: 'Quarterly field day hosted by extension officer.',        order: 1 },
      { id: 's-037', description: 'Farmer practises demonstrated technique on own plot.',    order: 2 },
    ],
  },

  // ── p-005: Opportunity Intl. Ghana ────────────────────────────────────────
  {
    id: 'int-012', name: "Women's Micro-Credit Loan", type: 'Cash Loan',
    season: '2026A', valueDescription: 'GHS 800 – 2,400',
    description: 'Stepped micro-credit facility for women smallholders, starting at GHS 800 and increasing with timely repayment history.',
    minFri: 40, capacity: 150, status: 'Active', approval: 'Manual', createdAt: '2026-01-15',
    enrolledCohorts: [
      { programId: 'prog-008', programName: 'Women Smallholder Finance', cohortId: 'coh-018', cohortName: 'Bolgatanga Cohort A' },
      { programId: 'prog-008', programName: 'Women Smallholder Finance', cohortId: 'coh-019', cohortName: 'Bawku Cohort A'      },
    ],
    partnerAssignments: [
      { partnerId: 'p-005', cohorts: [
        { programId: 'prog-008', programName: 'Women Smallholder Finance', cohortId: 'coh-018', cohortName: 'Bolgatanga Cohort A' },
        { programId: 'prog-008', programName: 'Women Smallholder Finance', cohortId: 'coh-019', cohortName: 'Bawku Cohort A'      },
      ]},
    ],
    rules: [
      { id: 'r-040', field: 'gender', operator: '=', value: 'female' },
    ],
    steps: [
      { id: 's-040', description: 'Loan officer conducts household assessment.', order: 1 },
      { id: 's-041', description: 'Group guarantee signed by VSLA members.',     order: 2 },
      { id: 's-042', description: 'Funds disbursed via mobile money.',            order: 3 },
    ],
  },
  {
    id: 'int-013', name: 'Agri-Business Training', type: 'Advisory',
    season: '2026A', valueDescription: 'Free training',
    description: 'Three-day agri-business skills training covering record keeping, pricing, savings groups, and mobile money for farm income management.',
    minFri: 30, capacity: 200, status: 'Active', approval: 'Auto', createdAt: '2026-02-01',
    enrolledCohorts: [
      { programId: 'prog-008', programName: 'Women Smallholder Finance', cohortId: 'coh-018', cohortName: 'Bolgatanga Cohort A' },
      { programId: 'prog-008', programName: 'Women Smallholder Finance', cohortId: 'coh-019', cohortName: 'Bawku Cohort A'      },
    ],
    partnerAssignments: [
      { partnerId: 'p-005', cohorts: [
        { programId: 'prog-008', programName: 'Women Smallholder Finance', cohortId: 'coh-018', cohortName: 'Bolgatanga Cohort A' },
        { programId: 'prog-008', programName: 'Women Smallholder Finance', cohortId: 'coh-019', cohortName: 'Bawku Cohort A'      },
      ]},
    ],
    rules: [],
    steps: [
      { id: 's-043', description: 'Farmer attends all three training days.', order: 1 },
      { id: 's-044', description: 'Farmer submits farm income record book.', order: 2 },
    ],
  },

  // ── p-007: CARE International Ghana ──────────────────────────────────────
  {
    id: 'int-014', name: 'Climate Resilience Grant', type: 'Input Loan',
    season: '2026A', valueDescription: 'GHS 2,000 grant',
    description: 'Donor grant for climate-smart inputs including drought-tolerant maize varieties and soil moisture conservation kits.',
    minFri: 45, capacity: 500, status: 'Active', approval: 'Auto', createdAt: '2026-04-01',
    enrolledCohorts: [
      { programId: 'prog-009', programName: 'Brong-Ahafo Climate Resilience', cohortId: 'coh-020', cohortName: 'Sunyani Cohort A'  },
      { programId: 'prog-009', programName: 'Brong-Ahafo Climate Resilience', cohortId: 'coh-021', cohortName: 'Techiman Cohort A' },
    ],
    partnerAssignments: [
      { partnerId: 'p-007', cohorts: [
        { programId: 'prog-009', programName: 'Brong-Ahafo Climate Resilience', cohortId: 'coh-020', cohortName: 'Sunyani Cohort A'  },
        { programId: 'prog-009', programName: 'Brong-Ahafo Climate Resilience', cohortId: 'coh-021', cohortName: 'Techiman Cohort A' },
      ]},
    ],
    rules: [
      { id: 'r-050', field: 'primaryCrop', operator: '=', value: 'maize' },
    ],
    steps: [
      { id: 's-050', description: 'Community enrolment session led by CARE field officer.',   order: 1 },
      { id: 's-051', description: 'Farmer receives input kit at community collection point.',  order: 2 },
      { id: 's-052', description: 'Post-season yield data collected for impact measurement.',  order: 3 },
    ],
  },
  {
    id: 'int-015', name: 'Yam Market Linkage', type: 'Market Access',
    season: '2026A', valueDescription: 'Guaranteed purchase',
    description: 'CARE-facilitated market linkage connecting Brong-Ahafo yam farmers to urban wholesale buyers in Kumasi and Accra.',
    minFri: 60, capacity: 200, status: 'Active', approval: 'Manual', createdAt: '2026-05-01',
    enrolledCohorts: [
      { programId: 'prog-009', programName: 'Brong-Ahafo Climate Resilience', cohortId: 'coh-020', cohortName: 'Sunyani Cohort A'  },
      { programId: 'prog-009', programName: 'Brong-Ahafo Climate Resilience', cohortId: 'coh-021', cohortName: 'Techiman Cohort A' },
    ],
    partnerAssignments: [
      { partnerId: 'p-007', cohorts: [
        { programId: 'prog-009', programName: 'Brong-Ahafo Climate Resilience', cohortId: 'coh-020', cohortName: 'Sunyani Cohort A'  },
        { programId: 'prog-009', programName: 'Brong-Ahafo Climate Resilience', cohortId: 'coh-021', cohortName: 'Techiman Cohort A' },
      ]},
    ],
    rules: [
      { id: 'r-051', field: 'primaryCrop', operator: '=',  value: 'yam' },
      { id: 'r-052', field: 'fri',         operator: '>=', value: '60'  },
    ],
    steps: [
      { id: 's-053', description: 'Farmer submits harvest quantity forecast.',    order: 1 },
      { id: 's-054', description: 'CARE connects farmer with verified buyer.',    order: 2 },
      { id: 's-055', description: 'Transaction verified and recorded in system.', order: 3 },
    ],
  },

  // ── p-008: Sinapi Aba Trust ────────────────────────────────────────────────
  {
    id: 'int-016', name: 'Farmer Microloan', type: 'Cash Loan',
    season: '2025B', valueDescription: 'GHS 500 – 3,000',
    description: 'Group-guarantee microloan for smallholder farmers in Kumasi Metro, disbursed through VSLA group structures.',
    minFri: 35, capacity: 100, status: 'Suspended', approval: 'Manual', createdAt: '2025-06-01',
    enrolledCohorts: [
      { programId: 'prog-010', programName: 'Kumasi Cocoa Microloans', cohortId: 'coh-022', cohortName: 'Kumasi Metro Cohort' },
    ],
    partnerAssignments: [
      { partnerId: 'p-008', cohorts: [
        { programId: 'prog-010', programName: 'Kumasi Cocoa Microloans', cohortId: 'coh-022', cohortName: 'Kumasi Metro Cohort' },
      ]},
    ],
    rules: [
      { id: 'r-060', field: 'farmSize', operator: '>=', value: '0.5' },
    ],
    steps: [
      { id: 's-060', description: 'VSLA group convenes and nominates eligible borrowers.',  order: 1 },
      { id: 's-061', description: 'Loan officer reviews group guarantee documentation.',    order: 2 },
      { id: 's-062', description: 'Disbursement via mobile money within 3 working days.',  order: 3 },
    ],
  },
]
