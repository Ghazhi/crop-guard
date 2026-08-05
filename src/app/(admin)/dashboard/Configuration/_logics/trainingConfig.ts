// Types + seed data for the NEW 3-section Training Materials configuration
// experience embedded inside Configuration > Training Materials.
//
// This is intentionally self-contained and does NOT import from the legacy
// standalone `src/app/(admin)/dashboard/TrainingMaterials/` feature (aside from
// its shared type/data definitions used for the Weekly Content + Per-Farmer
// Overrides sections) — that folder keeps working independently at its own route.

import { PROGRAM_OPTIONS_WITH_COHORTS } from '@/dataCenter/programOptions'

// ─── Training Schedule — Cohort Schedules ──────────────────────────────────

export interface CohortTrainingSchedule {
  id:                string
  programId:         string
  programName:       string
  cohortId:          string
  cohortName:        string
  trainingStartDate: string | null
  windowDays:        number
  graceDays:         number
  isConfigured:      boolean
}

export const SEED_COHORT_TRAINING_SCHEDULES: CohortTrainingSchedule[] = [
  {
    id: 'cts-001',
    programId: 'prog-001', programName: 'WAVE Program',
    cohortId: 'coh-001', cohortName: 'Cohort 1 - Gurubagu',
    trainingStartDate: '2026-06-01', windowDays: 7, graceDays: 2,
    isConfigured: true,
  },
  {
    id: 'cts-002',
    programId: 'prog-004', programName: 'Soybean Outgrower Scheme',
    cohortId: 'coh-012', cohortName: 'Cohort A - Savannah',
    trainingStartDate: null, windowDays: 7, graceDays: 2,
    isConfigured: false,
  },
]

export const PROGRAM_LIST = PROGRAM_OPTIONS_WITH_COHORTS

// ─── Training Schedule — Per-Farmer Overrides ──────────────────────────────

export type TrainingOverrideStatus = 'normal' | 'send' | 'withhold'

export interface FarmerTrainingOverride {
  farmerId:   string
  weekNumber: number
  status:     TrainingOverrideStatus
}

// ─── Training Sessions ──────────────────────────────────────────────────────

export type TrainingSessionType   = 'in_person' | 'online'
export type TrainingSessionStatus = 'scheduled' | 'completed' | 'cancelled'

export interface TrainingSession {
  id:            string
  title:         string
  description:   string
  sessionType:   TrainingSessionType
  cropType:      string | null
  cohortId:      string | null
  cohortName:    string | null
  programName:   string | null
  scheduledDate: string
  startTime:     string
  endTime:       string
  location:      string | null
  meetingLink:   string | null
  status:        TrainingSessionStatus
}

export const SEED_TRAINING_SESSIONS: TrainingSession[] = [
  {
    id: 'tsn-001',
    title: 'Land Preparation Field Demo',
    description: 'Hands-on field demonstration covering land clearing, ploughing, and correct row spacing for maize.',
    sessionType: 'in_person',
    cropType: 'maize',
    cohortId: 'coh-005', cohortName: 'Kumasi Cohort A', programName: 'Maize Season 2026A',
    scheduledDate: '2026-05-12', startTime: '09:00', endTime: '11:30',
    location: 'Kumasi Demonstration Farm, Ejisu Road',
    meetingLink: null,
    status: 'completed',
  },
  {
    id: 'tsn-002',
    title: 'Climate-Smart Practices Webinar',
    description: 'Online session on mulching, composting, and water harvesting techniques for smallholder soybean farmers.',
    sessionType: 'online',
    cropType: 'soybean',
    cohortId: 'coh-012', cohortName: 'Cohort A - Savannah', programName: 'Soybean Outgrower Scheme',
    scheduledDate: '2026-08-20', startTime: '15:00', endTime: '16:00',
    location: null,
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    status: 'scheduled',
  },
  {
    id: 'tsn-003',
    title: 'Cocoa Sustainability & Traceability Training',
    description: 'In-person training on sustainable cocoa practices and farm-level traceability record keeping.',
    sessionType: 'in_person',
    cropType: 'cocoa',
    cohortId: null, cohortName: null, programName: null,
    scheduledDate: '2026-09-03', startTime: '10:00', endTime: '13:00',
    location: 'Sunyani Cooperative Hall',
    meetingLink: null,
    status: 'scheduled',
  },
]
