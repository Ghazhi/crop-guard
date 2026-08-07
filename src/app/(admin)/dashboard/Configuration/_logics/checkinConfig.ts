// Types + seed data for the NEW 4-section Check-in Configuration experience
// embedded inside Configuration > Check-in Config.
//
// This is intentionally self-contained and does NOT import from the legacy
// standalone `src/app/(admin)/dashboard/CheckinConfig/` feature — that folder
// keeps working independently at its own route.

import { PROGRAM_OPTIONS_WITH_COHORTS } from '@/dataCenter/programOptions'
import { BUILT_IN_CROPS, cropOptions } from '@/dataCenter/checkinConfig'

// ─── Baseline Templates ─────────────────────────────────────────────────────

export interface BaselineItem {
  id:       string
  label:    string
  guidance: string
  max:      number // point value, default 6
}

export interface BaselineTemplate {
  id:          string
  title:       string
  description: string
  cropType:    'maize' | 'soybean' | 'cocoa'
  p1Items:     BaselineItem[] // Agronomy Readiness
  p2Items:     BaselineItem[] // CSA & Climate-Smart
  p3Items:     BaselineItem[] // Advisory & Commitment
  p4Items:     BaselineItem[] // Farm Enterprise Discipline
  includeEci:  boolean
  eciItems:    BaselineItem[]
  isActive:    boolean
}

export const BASELINE_PILLAR_META = {
  p1: { label: 'Agronomy Readiness',          badge: 'blue'   as const },
  p2: { label: 'CSA & Climate-Smart',         badge: 'green'  as const },
  p3: { label: 'Advisory & Commitment',       badge: 'amber'  as const },
  p4: { label: 'Farm Enterprise Discipline',  badge: 'teal'   as const },
}

export const ECI_META = { label: 'ECI Section (Optional)', badge: 'purple' as const }

const BASELINE_CROP_TYPES: BaselineTemplate['cropType'][] = ['maize', 'soybean', 'cocoa']
export const CROP_TYPE_OPTIONS: { value: BaselineTemplate['cropType']; label: string }[] =
  cropOptions(BUILT_IN_CROPS).filter(
    (o): o is { value: BaselineTemplate['cropType']; label: string } =>
      (BASELINE_CROP_TYPES as string[]).includes(o.value)
  )

export const SEED_BASELINE_TEMPLATES: BaselineTemplate[] = [
  {
    id: 'bt-001',
    title: 'Soybean Baseline Assessment',
    description: 'Baseline resilience assessment completed at enrollment for the soybean season.',
    cropType: 'soybean',
    isActive: true,
    includeEci: true,
    p1Items: [
      { id: 'bt-001-p1-1', label: 'Farming Experience',      guidance: 'Assess how many soybean seasons the farmer has completed.',              max: 6 },
      { id: 'bt-001-p1-2', label: 'Weed Management',         guidance: 'Confirm the farmer has a plan for timely weed control this soybean season.', max: 6 },
      { id: 'bt-001-p1-3', label: 'Proper Planting',         guidance: 'Check row spacing and seed rate align with recommended soybean practice.',  max: 6 },
      { id: 'bt-001-p1-4', label: 'Fertilizer Use',          guidance: 'Confirm the farmer applies the recommended fertilizer type and rate.',      max: 6 },
      { id: 'bt-001-p1-5', label: 'Pest & Disease Control',  guidance: 'Assess awareness of common soybean pests and control measures.',            max: 6 },
    ],
    p2Items: [
      { id: 'bt-001-p2-1', label: 'Mulching',              guidance: 'Confirm mulching is used to retain soil moisture.',            max: 6 },
      { id: 'bt-001-p2-2', label: 'Composting',            guidance: 'Confirm the farmer produces or applies compost.',              max: 6 },
      { id: 'bt-001-p2-3', label: 'Crop Rotation',         guidance: 'Check whether soybean is rotated with a cereal crop.',         max: 6 },
      { id: 'bt-001-p2-4', label: 'Water Harvesting',      guidance: 'Assess use of water harvesting or conservation structures.',   max: 6 },
      { id: 'bt-001-p2-5', label: 'Conservation Tillage',  guidance: 'Confirm reduced tillage practices are used on the plot.',      max: 6 },
    ],
    p3Items: [
      { id: 'bt-001-p3-1', label: 'Attends Training',            guidance: 'Confirm attendance at scheduled extension training sessions.', max: 5 },
      { id: 'bt-001-p3-2', label: 'Follows Agronomist Advice',   guidance: 'Assess how consistently agronomist recommendations are followed.', max: 5 },
      { id: 'bt-001-p3-3', label: 'Cooperative Visits',          guidance: 'Confirm field agent or cooperative visits occur regularly.',   max: 5 },
      { id: 'bt-001-p3-4', label: 'Cooperative Affiliation',     guidance: 'Confirm active membership in a farmer cooperative.',           max: 5 },
    ],
    p4Items: [
      { id: 'bt-001-p4-1', label: 'Repayment History',   guidance: 'Review prior loan repayment record, if any.',                max: 8 },
      { id: 'bt-001-p4-2', label: 'Savings Habit',       guidance: 'Confirm the farmer maintains a regular savings habit.',      max: 4 },
      { id: 'bt-001-p4-3', label: 'Additional Income',   guidance: 'Note any income sources beyond soybean farming.',            max: 4 },
      { id: 'bt-001-p4-4', label: 'Offtaker Confirmed',  guidance: 'Confirm a signed or informal offtaker agreement exists.',    max: 4 },
    ],
    eciItems: [
      { id: 'bt-001-eci-1', label: 'Stable Income & Debt Burden',    guidance: 'Assess whether household income can cover existing debt obligations.', max: 8 },
      { id: 'bt-001-eci-2', label: 'Moderate Financial Stability',   guidance: 'Assess overall household financial resilience.',                       max: 8 },
      { id: 'bt-001-eci-3', label: 'Identity and Eligibility',       guidance: 'Verify national ID and program eligibility documentation.',             max: 8 },
      { id: 'bt-001-eci-4', label: 'Production Commitment',          guidance: 'Confirm the farmer commits to the soybean production plan.',            max: 8 },
      { id: 'bt-001-eci-5', label: 'Declaration and Consent',        guidance: 'Confirm signed declaration and data consent forms.',                    max: 8 },
    ],
  },
  {
    id: 'bt-002',
    title: 'Cocoa Baseline Assessment',
    description: 'Baseline resilience assessment completed at enrollment for the cocoa season.',
    cropType: 'cocoa',
    isActive: true,
    includeEci: true,
    p1Items: [
      { id: 'bt-002-p1-1', label: 'Farming Experience',      guidance: 'Assess how many cocoa seasons the farmer has managed.',                  max: 6 },
      { id: 'bt-002-p1-2', label: 'Weed Management',         guidance: 'Confirm the farmer has a plan for timely weed control on the cocoa farm.', max: 6 },
      { id: 'bt-002-p1-3', label: 'Proper Planting',         guidance: 'Check tree spacing and shade management follow recommended cocoa practice.', max: 6 },
      { id: 'bt-002-p1-4', label: 'Fertilizer Use',          guidance: 'Confirm the farmer applies the recommended fertilizer type and rate.',      max: 6 },
      { id: 'bt-002-p1-5', label: 'Pest & Disease Control',  guidance: 'Assess awareness of black pod and capsid control measures.',               max: 6 },
    ],
    p2Items: [
      { id: 'bt-002-p2-1', label: 'Mulching',              guidance: 'Confirm mulching is used around young cocoa trees.',           max: 6 },
      { id: 'bt-002-p2-2', label: 'Composting',            guidance: 'Confirm the farmer produces or applies compost.',              max: 6 },
      { id: 'bt-002-p2-3', label: 'Crop Rotation',         guidance: 'Check whether food crops are intercropped during establishment.', max: 6 },
      { id: 'bt-002-p2-4', label: 'Water Harvesting',      guidance: 'Assess use of water harvesting or conservation structures.',   max: 6 },
      { id: 'bt-002-p2-5', label: 'Conservation Tillage',  guidance: 'Confirm minimal soil disturbance practices around trees.',     max: 6 },
    ],
    p3Items: [
      { id: 'bt-002-p3-1', label: 'Attends Training',            guidance: 'Confirm attendance at scheduled extension training sessions.', max: 5 },
      { id: 'bt-002-p3-2', label: 'Follows Agronomist Advice',   guidance: 'Assess how consistently agronomist recommendations are followed.', max: 5 },
      { id: 'bt-002-p3-3', label: 'Cooperative Visits',          guidance: 'Confirm field agent or cooperative visits occur regularly.',   max: 5 },
      { id: 'bt-002-p3-4', label: 'Cooperative Affiliation',     guidance: 'Confirm active membership in a farmer cooperative.',           max: 5 },
    ],
    p4Items: [
      { id: 'bt-002-p4-1', label: 'Repayment History',   guidance: 'Review prior loan repayment record, if any.',                max: 8 },
      { id: 'bt-002-p4-2', label: 'Savings Habit',       guidance: 'Confirm the farmer maintains a regular savings habit.',      max: 4 },
      { id: 'bt-002-p4-3', label: 'Additional Income',   guidance: 'Note any income sources beyond cocoa farming.',              max: 4 },
      { id: 'bt-002-p4-4', label: 'Offtaker Confirmed',  guidance: 'Confirm a signed or informal offtaker/LBC agreement exists.', max: 4 },
    ],
    eciItems: [
      { id: 'bt-002-eci-1', label: 'Stable Income & Debt Burden',    guidance: 'Assess whether household income can cover existing debt obligations.', max: 8 },
      { id: 'bt-002-eci-2', label: 'Moderate Financial Stability',   guidance: 'Assess overall household financial resilience.',                       max: 8 },
      { id: 'bt-002-eci-3', label: 'Identity and Eligibility',       guidance: 'Verify national ID and program eligibility documentation.',             max: 8 },
      { id: 'bt-002-eci-4', label: 'Production Commitment',          guidance: 'Confirm the farmer commits to the cocoa production plan.',              max: 8 },
      { id: 'bt-002-eci-5', label: 'Declaration and Consent',        guidance: 'Confirm signed declaration and data consent forms.',                    max: 8 },
    ],
  },
]

// ─── Weekly Check-in Templates ──────────────────────────────────────────────

export type CheckinComponent = 'agronomy' | 'climate_smart' | 'advisory_commitment' | 'farm_enterprise'

export interface CheckinItem {
  id:          string
  component:   CheckinComponent
  label:       string
  description: string
  isActive:    boolean
}

export interface CheckinWeek {
  weekNumber: number
  items:      CheckinItem[]
}

export interface CheckinTemplate {
  id:          string
  title:       string
  cropType:    'maize' | 'soybean'
  season:      string
  description: string
  isActive:    boolean
  weeks:       CheckinWeek[]
}

export const CHECKIN_COMPONENT_META: Record<CheckinComponent, { label: string; color: 'blue' | 'emerald' | 'amber' | 'teal' }> = {
  agronomy:             { label: 'Agronomy',             color: 'blue'    },
  climate_smart:        { label: 'Climate-Smart',        color: 'emerald' },
  advisory_commitment:  { label: 'Advisory & Commitment', color: 'amber'  },
  farm_enterprise:      { label: 'Farm Enterprise',      color: 'teal'    },
}

const CHECKIN_CROP_TYPES: CheckinTemplate['cropType'][] = ['maize', 'soybean']
export const CHECKIN_CROP_OPTIONS: { value: CheckinTemplate['cropType']; label: string }[] =
  cropOptions(BUILT_IN_CROPS).filter(
    (o): o is { value: CheckinTemplate['cropType']; label: string } =>
      (CHECKIN_CROP_TYPES as string[]).includes(o.value)
  )

export const SEED_CHECKIN_TEMPLATES: CheckinTemplate[] = [
  {
    id: 'ct-001',
    title: 'Maize Weekly Check-in',
    cropType: 'maize',
    season: '2026A',
    description: 'Weekly resilience check-in covering agronomy, climate-smart, advisory, and enterprise practices.',
    isActive: true,
    weeks: [
      {
        weekNumber: 1,
        items: [
          { id: 'ct-001-w1-1', component: 'agronomy',            label: 'Land preparation completed', description: 'Confirm land was cleared and ploughed on schedule.', isActive: true },
          { id: 'ct-001-w1-2', component: 'climate_smart',       label: 'Mulching applied',            description: 'Check whether mulch was applied after planting.',    isActive: true },
          { id: 'ct-001-w1-3', component: 'advisory_commitment', label: 'Attended kickoff training',   description: 'Confirm attendance at the season kickoff session.',  isActive: true },
        ],
      },
      {
        weekNumber: 2,
        items: [
          { id: 'ct-001-w2-1', component: 'agronomy',        label: 'Germination check',      description: 'Verify germination rate meets expectations.',       isActive: true },
          { id: 'ct-001-w2-2', component: 'farm_enterprise', label: 'Input expenses recorded', description: 'Confirm the farmer logged input purchase costs.',   isActive: true },
        ],
      },
      {
        weekNumber: 3,
        items: [
          { id: 'ct-001-w3-1', component: 'agronomy',      label: 'First weeding done',    description: 'Confirm first round of weeding was completed.',   isActive: true },
          { id: 'ct-001-w3-2', component: 'climate_smart', label: 'Soil moisture checked', description: 'Assess soil moisture and irrigation need.',       isActive: true },
          { id: 'ct-001-w3-3', component: 'agronomy',      label: 'Fertilizer top-dressed', description: 'Confirm top-dressing fertilizer was applied.',    isActive: true },
        ],
      },
    ],
  },
  {
    id: 'ct-002',
    title: 'Soybean Weekly Check-in',
    cropType: 'soybean',
    season: '2026A',
    description: 'Weekly resilience check-in covering agronomy, climate-smart, advisory, and enterprise practices.',
    isActive: true,
    weeks: [
      {
        weekNumber: 1,
        items: [
          { id: 'ct-002-w1-1', component: 'agronomy',            label: 'Seed treatment applied',    description: 'Confirm seed was treated with inoculant before planting.', isActive: true },
          { id: 'ct-002-w1-2', component: 'advisory_commitment', label: 'Attended kickoff training', description: 'Confirm attendance at the season kickoff session.',        isActive: true },
        ],
      },
      {
        weekNumber: 2,
        items: [
          { id: 'ct-002-w2-1', component: 'climate_smart',   label: 'Rainfall adequacy noted',  description: 'Log whether rainfall has been adequate for germination.', isActive: true },
          { id: 'ct-002-w2-2', component: 'farm_enterprise', label: 'Labor costs recorded',     description: 'Confirm the farmer logged labor costs for the week.',     isActive: true },
        ],
      },
    ],
  },
]

// ─── Cohort Schedules ───────────────────────────────────────────────────────

export interface CohortCheckinSchedule {
  id:                  string
  programId:           string
  programName:         string
  cohortId:            string
  cohortName:          string
  startMode:           'immediate' | 'scheduled'
  startDate:           string | null
  windowDays:          number
  graceDays:           number
  totalWeeks:          number
  baselineTemplateId:  string | null
  checkinTemplateId:   string | null
  isPaused:            boolean
  isConfigured:        boolean
}

export const SEED_COHORT_SCHEDULES: CohortCheckinSchedule[] = [
  {
    id: 'cs-001',
    programId: 'prog-001', programName: 'WAVE Program',
    cohortId: 'coh-001', cohortName: 'Cohort 1 - Gurubagu',
    startMode: 'immediate', startDate: null,
    windowDays: 7, graceDays: 2, totalWeeks: 12,
    baselineTemplateId: 'bt-001', checkinTemplateId: 'ct-002',
    isPaused: false, isConfigured: true,
  },
  {
    id: 'cs-002',
    programId: 'prog-002', programName: 'Maize Season 2026A',
    cohortId: 'coh-005', cohortName: 'Kumasi Cohort A',
    startMode: 'scheduled', startDate: '2026-09-01',
    windowDays: 7, graceDays: 3, totalWeeks: 16,
    baselineTemplateId: null, checkinTemplateId: 'ct-001',
    isPaused: false, isConfigured: true,
  },
  {
    id: 'cs-003',
    programId: 'prog-004', programName: 'Soybean Outgrower Scheme',
    cohortId: 'coh-012', cohortName: 'Cohort A - Savannah',
    startMode: 'immediate', startDate: null,
    windowDays: 7, graceDays: 2, totalWeeks: 10,
    baselineTemplateId: null, checkinTemplateId: null,
    isPaused: true, isConfigured: false,
  },
]

export const PROGRAM_LIST = PROGRAM_OPTIONS_WITH_COHORTS
