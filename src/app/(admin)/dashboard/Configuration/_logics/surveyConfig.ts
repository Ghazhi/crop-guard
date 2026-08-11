// Types + seed data for the Survey Configuration experience embedded inside
// Configuration > Activities > Survey. Mirrors checkinConfig.ts's shape/conventions.

import { PROGRAM_LIST } from './checkinConfig'

export { PROGRAM_LIST }

// ─── Survey Templates ───────────────────────────────────────────────────────

export interface SurveyQuestion {
  id:   string
  text: string
}

export interface SurveyTemplate {
  id:          string
  title:       string
  description: string
  questions:   SurveyQuestion[]
  isActive:    boolean
}

export const SEED_SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    id: 'st-001',
    title: 'Post-Harvest Satisfaction Survey',
    description: 'Collects farmer feedback on the season after harvest is complete.',
    isActive: true,
    questions: [
      { id: 'st-001-q1', text: 'How satisfied were you with the training provided this season?' },
      { id: 'st-001-q2', text: 'Did you experience any input supply delays?' },
      { id: 'st-001-q3', text: 'Would you recommend this program to other farmers?' },
    ],
  },
  {
    id: 'st-002',
    title: 'Mid-Season Check-in Survey',
    description: 'Short pulse survey to gauge farmer sentiment mid-season.',
    isActive: true,
    questions: [
      { id: 'st-002-q1', text: 'How is the crop performing compared to expectations?' },
      { id: 'st-002-q2', text: 'Have you faced any pest or disease pressure?' },
    ],
  },
]

// ─── Survey Schedules ───────────────────────────────────────────────────────

export interface SurveySchedule {
  id:               string
  programId:        string
  programName:      string
  cohortId:         string
  cohortName:       string
  surveyTemplateId: string | null
  startMode:        'immediate' | 'scheduled'
  startDate:        string | null
  isPaused:         boolean
  isConfigured:     boolean
}

export const SEED_SURVEY_SCHEDULES: SurveySchedule[] = [
  {
    id: 'ss-001',
    programId: 'prog-001', programName: 'WAVE Program',
    cohortId: 'coh-001', cohortName: 'Cohort 1 - Gurubagu',
    surveyTemplateId: 'st-001',
    startMode: 'immediate', startDate: null,
    isPaused: false, isConfigured: true,
  },
  {
    id: 'ss-002',
    programId: 'prog-002', programName: 'Maize Season 2026A',
    cohortId: 'coh-005', cohortName: 'Kumasi Cohort A',
    surveyTemplateId: null,
    startMode: 'scheduled', startDate: '2026-10-01',
    isPaused: false, isConfigured: false,
  },
]
