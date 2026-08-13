// Types + seed data for the Advisory Configuration experience embedded inside
// Configuration > Activities > Advisory. Mirrors surveyConfig.ts's shape/conventions.

import { PROGRAM_LIST } from './checkinConfig'

export { PROGRAM_LIST }

// ─── Advisory Templates ─────────────────────────────────────────────────────

export interface AdvisoryMessage {
  id:   string
  text: string
}

export interface AdvisoryTemplate {
  id:          string
  title:       string
  description: string
  cropType:    string
  messages:    AdvisoryMessage[]
  isActive:    boolean
}

export const SEED_ADVISORY_TEMPLATES: AdvisoryTemplate[] = [
  {
    id: 'at-001',
    title: 'Maize Pest & Disease Advisory',
    description: 'Seasonal tips on scouting for fall armyworm and common maize diseases.',
    cropType: 'maize',
    isActive: true,
    messages: [
      { id: 'at-001-m1', text: 'Scout your field weekly for fall armyworm damage on young leaves.' },
      { id: 'at-001-m2', text: 'Apply recommended pesticide only after confirming pest presence.' },
      { id: 'at-001-m3', text: 'Remove and destroy heavily infested plants to slow spread.' },
    ],
  },
  {
    id: 'at-002',
    title: 'Rice Water Management Advisory',
    description: 'Guidance on irrigation timing and water conservation for rice farmers.',
    cropType: 'rice',
    isActive: true,
    messages: [
      { id: 'at-002-m1', text: 'Maintain 2-5cm of standing water during the vegetative stage.' },
      { id: 'at-002-m2', text: 'Drain the field briefly before fertilizer application for better uptake.' },
    ],
  },
]

// ─── Advisory Schedules ─────────────────────────────────────────────────────

export interface AdvisorySchedule {
  id:                 string
  programId:          string
  programName:        string
  cohortId:           string
  cohortName:         string
  advisoryTemplateId: string | null
  startMode:          'immediate' | 'scheduled'
  startDate:          string | null
  isPaused:           boolean
  isConfigured:       boolean
}

export const SEED_ADVISORY_SCHEDULES: AdvisorySchedule[] = [
  {
    id: 'as-001',
    programId: 'prog-001', programName: 'WAVE Program',
    cohortId: 'coh-001', cohortName: 'Cohort 1 - Gurubagu',
    advisoryTemplateId: 'at-001',
    startMode: 'immediate', startDate: null,
    isPaused: false, isConfigured: true,
  },
  {
    id: 'as-002',
    programId: 'prog-002', programName: 'Maize Season 2026A',
    cohortId: 'coh-005', cohortName: 'Kumasi Cohort A',
    advisoryTemplateId: null,
    startMode: 'scheduled', startDate: '2026-10-01',
    isPaused: false, isConfigured: false,
  },
]
