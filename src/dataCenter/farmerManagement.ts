import type { Farmer } from '@/app/dashboard/FarmersRegistry/_logics/interface'

export const FARMERS_LIST: Farmer[] = [
  {
    id: 'f-001', fullName: 'Ama Mensah', phone: '0241234567',
    nationalId: 'GHA-0000000001', dateOfBirth: '1990-03-12', gender: 'female',
    region: 'ah', district: 'Kumasi Metro', community: 'Adum',
    primaryCrop: 'maize', farmSize: '2.5',
    enrollment: {
      programId: 'prog-002', programName: 'Maize Season 2026A',
      cohortId: 'coh-005', cohortName: 'Kumasi Cohort A',
      agentName: 'Kwame Asante', status: 'active', currentStage: 2,
    },
    currentFri: 61, currentZone: 'Resilience Builder', duplicateFlag: false,
  },
  {
    id: 'f-002', fullName: 'Ama Konadu', phone: '0551234568',
    nationalId: 'GHA-0000000002', dateOfBirth: '1992-06-14', gender: 'female',
    region: 'ah', district: 'Kwabre East', community: 'Mamponteng',
    primaryCrop: 'maize', farmSize: '3.0',
    enrollment: {
      programId: 'prog-002', programName: 'Maize Season 2026A',
      cohortId: 'coh-005', cohortName: 'Kumasi Cohort A',
      agentName: 'Abdul Razak', status: 'active', currentStage: 1,
    },
    currentFri: null, currentZone: null, duplicateFlag: false,
  },
  {
    id: 'f-003', fullName: 'Faiza Sidik', phone: '0551234567',
    nationalId: 'GHA-112233445-6', dateOfBirth: '1995-11-05', gender: 'female',
    region: 'sa', district: 'North Gonja', community: 'Gurubagu',
    primaryCrop: 'soybean', farmSize: '2.2',
    enrollment: {
      programId: 'prog-001', programName: 'WAVE Program',
      cohortId: 'coh-001', cohortName: 'Cohort 1 - Gurubagu',
      agentName: 'Abdul Razak', status: 'active', currentStage: 3,
    },
    currentFri: 82, currentZone: 'Resilience Leader', duplicateFlag: false,
  },
  {
    id: 'f-004', fullName: 'Karma Fuseini', phone: '0201234567',
    nationalId: 'GHA-556677889-1', dateOfBirth: '1990-07-30', gender: 'female',
    region: 'sa', district: 'East Gonja', community: 'Lingbensi',
    primaryCrop: 'soybean', farmSize: '4.5',
    enrollment: {
      programId: 'prog-001', programName: 'WAVE Program',
      cohortId: 'coh-003', cohortName: 'Cohort 3 - Lingbensi',
      agentName: 'Kwame Asante', status: 'active', currentStage: 1,
    },
    currentFri: 55, currentZone: 'Resilience Learner', duplicateFlag: false,
  },
  {
    id: 'f-005', fullName: 'Lydia Adjei', phone: '0501234567',
    nationalId: 'GHA-334455667-8', dateOfBirth: '1985-01-18', gender: 'female',
    region: 'nr', district: 'Kumbungu', community: 'Kajetia',
    primaryCrop: 'maize', farmSize: '6.0',
    enrollment: {
      programId: 'prog-001', programName: 'WAVE Program',
      cohortId: 'coh-002', cohortName: 'Cohort 2 - Watato',
      agentName: 'Kwame Asante', status: 'active', currentStage: 2,
    },
    currentFri: null, currentZone: null, duplicateFlag: false,
  },
  {
    id: 'f-006', fullName: 'Kofi Asare', phone: '0201234568',
    nationalId: 'GHA-778899001-3', dateOfBirth: '1983-09-12', gender: 'male',
    region: 'ue', district: 'Bolgatanga Municipal', community: 'Sumbrungu',
    primaryCrop: 'groundnut', farmSize: '1.5',
    enrollment: null, currentFri: 38, currentZone: 'Resilience Starter', duplicateFlag: false,
  },
]
