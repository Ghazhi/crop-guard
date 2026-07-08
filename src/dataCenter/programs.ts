import type { Program } from '@/app/(admin)/dashboard/ProgramsSetup/_logics/interface'

export const PROGRAMS: Program[] = [
  // ── p-001: Fidelity Bank Ghana ─────────────────────────────────────────────
  {
    id: 'prog-001', name: 'WAVE Program', partnerId: 'p-001',
    season: '2026A', description: 'WAVE program',
    crops: ['Soybean'], startDate: '2026-06-09', endDate: '2027-02-27',
    enrolledCount: 3, targetCount: 100, status: 'Active',
    cohorts: [
      { id: 'coh-003', name: 'Cohort 3 - Lingbensi', region: 'Savannah',  district: 'North Gonja',  agentName: 'Abdul Razak',  enrolledCount: 1, targetCount: 15, status: 'Active' },
      { id: 'coh-002', name: 'Cohort 2 - Watato',    region: 'Savannah',  district: 'North Gonja',  agentName: 'Kwame Asante', enrolledCount: 1, targetCount: 40, status: 'Active' },
      { id: 'coh-001', name: 'Cohort 1 - Gurubagu',  region: 'Savannah',  district: 'North Gonja',  agentName: 'Abdul Razak',  enrolledCount: 1, targetCount: 45, status: 'Active' },
    ],
  },
  {
    id: 'prog-002', name: 'Maize Season 2026A', partnerId: 'p-001',
    season: '2026A', description: 'Smallholder maize farmer resilience program for Ashanti and Brong-Ahafo regions.',
    crops: ['Maize'], startDate: '2026-03-01', endDate: '2026-09-30',
    enrolledCount: 2, targetCount: 500, status: 'Active',
    cohorts: [
      { id: 'coh-005', name: 'Kumasi Cohort A', region: 'Ashanti', district: 'Kumasi Metro', agentName: 'Kwame Asante', enrolledCount: 2, targetCount: 100, status: 'Active' },
    ],
  },

  // ── p-002: Agricultural DFI ────────────────────────────────────────────────
  {
    id: 'prog-003', name: 'Rice Value Chain 2026', partnerId: 'p-002',
    season: '2026A', description: 'Supporting smallholder rice farmers in the Savannah corridor with inputs and market linkages.',
    crops: ['Rice'], startDate: '2026-04-01', endDate: '2026-11-30',
    enrolledCount: 5, targetCount: 200, status: 'Active',
    cohorts: [
      { id: 'coh-010', name: 'Cohort A - Tamale',   region: 'Northern', district: 'Tamale Metro', agentName: 'Kwame Asante', enrolledCount: 3, targetCount: 100, status: 'Active' },
      { id: 'coh-011', name: 'Cohort B - Yendi',    region: 'Northern', district: 'Yendi',        agentName: 'Abdul Razak',  enrolledCount: 2, targetCount: 100, status: 'Active' },
    ],
  },
  {
    id: 'prog-004', name: 'Soybean Outgrower Scheme', partnerId: 'p-002',
    season: '2025B', description: 'Outgrower scheme connecting soybean farmers to national processing facilities.',
    crops: ['Soybean'], startDate: '2025-08-01', endDate: '2026-02-28',
    enrolledCount: 4, targetCount: 150, status: 'Completed',
    cohorts: [
      { id: 'coh-012', name: 'Cohort A - Savannah', region: 'Savannah', district: 'East Gonja', agentName: 'Abdul Razak', enrolledCount: 4, targetCount: 150, status: 'Inactive' },
    ],
  },

  // ── p-003: Ghana Rural Bank ────────────────────────────────────────────────
  {
    id: 'prog-005', name: 'Cassava & Plantain Finance 2026', partnerId: 'p-003',
    season: '2026A', description: 'Input financing for Ashanti cassava and plantain smallholders.',
    crops: ['Cassava', 'Yam'], startDate: '2026-02-01', endDate: '2026-10-31',
    enrolledCount: 5, targetCount: 250, status: 'Active',
    cohorts: [
      { id: 'coh-013', name: 'Ashanti Cohort A', region: 'Ashanti', district: 'Ejisu-Juaben', agentName: 'Kwame Asante', enrolledCount: 3, targetCount: 130, status: 'Active'   },
      { id: 'coh-014', name: 'Ashanti Cohort B', region: 'Ashanti', district: 'Kwabre East',  agentName: 'Abdul Razak',  enrolledCount: 2, targetCount: 120, status: 'Active'   },
    ],
  },

  // ── p-004: USAID Feed the Future ──────────────────────────────────────────
  {
    id: 'prog-006', name: 'Northern Sorghum Initiative', partnerId: 'p-004',
    season: '2026A', description: 'Smallholder sorghum productivity and market access programme in Northern Ghana.',
    crops: ['Sorghum', 'Millet'], startDate: '2026-05-01', endDate: '2027-01-31',
    enrolledCount: 6, targetCount: 300, status: 'Active',
    cohorts: [
      { id: 'coh-015', name: 'Cohort A - Tamale',   region: 'Northern',   district: 'Kumbungu',   agentName: 'Kwame Asante', enrolledCount: 3, targetCount: 150, status: 'Active' },
      { id: 'coh-016', name: 'Cohort B - Upper West',region: 'Upper West', district: 'Wa Municipal',agentName: 'Abdul Razak',  enrolledCount: 3, targetCount: 150, status: 'Active' },
    ],
  },
  {
    id: 'prog-007', name: 'Feed the Future Groundnut Expansion', partnerId: 'p-004',
    season: '2026A', description: 'Expanding groundnut production and linking farmers to export markets across Upper East.',
    crops: ['Groundnut'], startDate: '2026-03-15', endDate: '2026-12-15',
    enrolledCount: 4, targetCount: 200, status: 'Active',
    cohorts: [
      { id: 'coh-017', name: 'Upper East Cohort A', region: 'Upper East', district: 'Bolgatanga Municipal', agentName: 'Abdul Razak', enrolledCount: 4, targetCount: 200, status: 'Active' },
    ],
  },

  // ── p-005: Opportunity Intl. Ghana ────────────────────────────────────────
  {
    id: 'prog-008', name: 'Women Smallholder Finance', partnerId: 'p-005',
    season: '2026A', description: 'Micro-credit and input support for women-led smallholder farms in Upper East.',
    crops: ['Groundnut', 'Maize'], startDate: '2026-01-15', endDate: '2026-09-15',
    enrolledCount: 5, targetCount: 120, status: 'Active',
    cohorts: [
      { id: 'coh-018', name: 'Bolgatanga Cohort A', region: 'Upper East', district: 'Bolgatanga Municipal', agentName: 'Kwame Asante', enrolledCount: 3, targetCount: 60, status: 'Active' },
      { id: 'coh-019', name: 'Bawku Cohort A',      region: 'Upper East', district: 'Bawku Municipal',      agentName: 'Abdul Razak',  enrolledCount: 2, targetCount: 60, status: 'Active' },
    ],
  },

  // ── p-007: CARE International Ghana ──────────────────────────────────────
  {
    id: 'prog-009', name: 'Brong-Ahafo Climate Resilience', partnerId: 'p-007',
    season: '2026A', description: 'Climate-smart maize and yam farming practices in Bono and Bono East regions.',
    crops: ['Maize', 'Yam'], startDate: '2026-04-01', endDate: '2027-03-31',
    enrolledCount: 6, targetCount: 400, status: 'Active',
    cohorts: [
      { id: 'coh-020', name: 'Sunyani Cohort A',   region: 'Bono',      district: 'Sunyani Municipal', agentName: 'Kwame Asante', enrolledCount: 3, targetCount: 200, status: 'Active' },
      { id: 'coh-021', name: 'Techiman Cohort A',  region: 'Bono East', district: 'Techiman Municipal', agentName: 'Abdul Razak',  enrolledCount: 3, targetCount: 200, status: 'Active' },
    ],
  },

  // ── p-008: Sinapi Aba Trust ────────────────────────────────────────────────
  {
    id: 'prog-010', name: 'Kumasi Cocoa Microloans', partnerId: 'p-008',
    season: '2025B', description: 'Microloan scheme for cocoa farmers in Ashanti region.',
    crops: ['Maize', 'Cassava'], startDate: '2025-06-01', endDate: '2025-12-31',
    enrolledCount: 4, targetCount: 80, status: 'Inactive',
    cohorts: [
      { id: 'coh-022', name: 'Kumasi Metro Cohort', region: 'Ashanti', district: 'Kumasi Metro', agentName: 'Kwame Asante', enrolledCount: 4, targetCount: 80, status: 'Inactive' },
    ],
  },
]
