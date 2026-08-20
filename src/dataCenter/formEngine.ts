// ─── Config-driven form engine ───────────────────────────────────────────────
// Prototype-only: no real backend. Lets a tenant admin (with the right
// permission) configure the field list of any tenant CRUD form — field name,
// input type, required flag, and step grouping — via Configuration > Forms.
// Every form ships with a DEFAULT_FORMS seed that reconstructs today's exact
// field list/order/required-ness, so nothing changes on first load; admins
// can then rename/retype/add/remove/reorder fields, or reset back to default.
//
// Records captured through a config-driven form store only `id` + timestamps
// as fixed fields — every other answer lives in an open `values` bag keyed by
// FieldDef.key. Pages that need a typed shape (farmer detail, FRI calcs,
// reports, etc.) read named fields out of `values` via a small per-entity
// adapter, so existing typed code keeps working unmodified.

export type FieldType = 'text' | 'number' | 'date' | 'time' | 'select' | 'multiselect' | 'checkbox' | 'textarea'

export interface FieldOption {
  value: string
  label: string
}

export interface FieldDef {
  /** Storage key in the dynamic answers bag. Stable — do not rename after farmer data exists, or existing answers become orphaned under the old key. */
  key:      string
  label:    string
  type:     FieldType
  required: boolean
  /** Only used by 'select' and 'multiselect' */
  options?: FieldOption[]
  /** Which step (by FormStepDef.id) this field renders under */
  stepId:   string
  order:    number
}

export interface FormStepDef {
  id:    string
  name:  string
  order: number
}

export interface FormDef {
  /** Stable identifier, e.g. 'farmer-registration' — used as the usePersistedState/lookup key */
  id:    string
  /** Display name shown in Configuration > Forms */
  name:  string
  steps: FormStepDef[]
  fields: FieldDef[]
}

/** A record captured through a config-driven form. `values` is keyed by FieldDef.key. */
export interface DynamicRecord {
  id:        string
  createdAt: string
  updatedAt: string
  values:    Record<string, unknown>
}

export const FORM_CONFIGS_KEY = 'form-configs'

export function newDynamicRecord(values: Record<string, unknown>, id?: string): DynamicRecord {
  const now = new Date().toISOString()
  return { id: id ?? `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: now, updatedAt: now, values }
}

export function updateDynamicRecord(record: DynamicRecord, values: Record<string, unknown>): DynamicRecord {
  return { ...record, values: { ...record.values, ...values }, updatedAt: new Date().toISOString() }
}

/** True if every required field in the given step is present/non-empty in `values`. */
export function stepIsValid(form: FormDef, stepId: string, values: Record<string, unknown>): boolean {
  return form.fields
    .filter(f => f.stepId === stepId && f.required)
    .every(f => {
      const v = values[f.key]
      if (f.type === 'checkbox') return v === true
      if (f.type === 'multiselect') return Array.isArray(v) && v.length > 0
      return v !== undefined && v !== null && String(v).trim() !== ''
    })
}

export function sortedSteps(form: FormDef): FormStepDef[] {
  return [...form.steps].sort((a, b) => a.order - b.order)
}

export function fieldsForStep(form: FormDef, stepId: string): FieldDef[] {
  return form.fields.filter(f => f.stepId === stepId).sort((a, b) => a.order - b.order)
}

function f(key: string, label: string, type: FieldType, stepId: string, order: number, required = false, options?: FieldOption[]): FieldDef {
  return { key, label, type, required, stepId, order, options }
}

const YES_NO_OPTIONS: FieldOption[] = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]

// ─── Farmer Registration (Add/Edit Farmer) — reconstructs the 6-step wizard exactly ─

export const FARMER_REGISTRATION_FORM_ID = 'farmer-registration'

const FARMER_REGISTRATION_STEPS: FormStepDef[] = [
  { id: 'personal',  name: 'Personal',  order: 1 },
  { id: 'identity',  name: 'Identity',  order: 2 },
  { id: 'farm',      name: 'Farm',      order: 3 },
  { id: 'household', name: 'Household', order: 4 },
  { id: 'financial', name: 'Financial', order: 5 },
  { id: 'support',   name: 'Support',   order: 6 },
]

const FARMER_REGISTRATION_FIELDS: FieldDef[] = [
  f('firstName', 'First Name', 'text', 'personal', 1, true),
  f('lastName', 'Last Name', 'text', 'personal', 2, true),
  f('gender', 'Gender', 'select', 'personal', 3, false, [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'prefer_not_to_say', label: 'Prefer not to say' }]),
  f('dob', 'Date of Birth', 'date', 'personal', 4),
  f('phone', 'Phone', 'text', 'personal', 5, true),
  f('community', 'Community', 'select', 'personal', 6),
  f('group', 'Group / Cooperative', 'select', 'personal', 7),
  f('programId', 'Program', 'select', 'personal', 8),
  f('cohortId', 'Cohort', 'select', 'personal', 9),

  f('idType', 'ID Type', 'select', 'identity', 1, true, [
    { value: 'ghana_card', label: 'Ghana Card' }, { value: 'passport', label: 'Passport' },
    { value: 'voter_id', label: "Voter's ID" }, { value: 'nhis', label: 'NHIS' }, { value: 'drivers', label: "Driver's License" },
  ]),
  f('idNumber', 'ID Number', 'text', 'identity', 2, true),

  f('yearsExp', 'Years of Farming Experience', 'number', 'farm', 1),
  f('acres', 'Farm Size (acres)', 'number', 'farm', 2),
  f('primaryCrop', 'Primary Crop', 'select', 'farm', 3, true),
  f('bagsPrevSeason', 'Bags Previous Season', 'number', 'farm', 4),
  f('secondaryCrop', 'Secondary Crop', 'select', 'farm', 5),
  f('ownsTractor', 'Owns Tractor', 'select', 'farm', 6, false, YES_NO_OPTIONS),

  f('ownsHouse', 'Owns House', 'select', 'household', 1, false, YES_NO_OPTIONS),
  f('maritalStatus', 'Marital Status', 'select', 'household', 2, false, [
    { value: 'single', label: 'Single' }, { value: 'married', label: 'Married' }, { value: 'divorced', label: 'Divorced' }, { value: 'widowed', label: 'Widowed' },
  ]),
  f('numChildren', 'Number of Children', 'number', 'household', 3),
  f('otherBusiness', 'Has Other Business', 'select', 'household', 4, false, YES_NO_OPTIONS),
  f('nativeCommunity', 'Native of Community', 'select', 'household', 5, false, YES_NO_OPTIONS),
  f('communityPrefs', 'Community Preferences', 'multiselect', 'household', 6, false, [
    { value: 'market_access', label: 'Market Access' }, { value: 'water', label: 'Water' }, { value: 'roads', label: 'Roads' },
    { value: 'schools', label: 'Schools' }, { value: 'healthcare', label: 'Healthcare' }, { value: 'electricity', label: 'Electricity' },
  ]),

  f('loanType', 'Loan Type', 'select', 'financial', 1, false, [
    { value: 'input_credit', label: 'Input Credit' }, { value: 'working_capital', label: 'Working Capital' }, { value: 'equipment', label: 'Equipment' },
  ]),
  f('accountType', 'Account Type', 'select', 'financial', 2, false, [
    { value: 'mobile_money', label: 'Mobile Money' }, { value: 'bank', label: 'Bank Account' }, { value: 'none', label: 'None' },
  ]),
  f('averageIncome', 'Average Income', 'number', 'financial', 3),
  f('hasAgricInsurance', 'Has Agric Insurance', 'select', 'financial', 4, false, YES_NO_OPTIONS),

  f('engagedAgric', 'Engaged with Other Agric Companies', 'select', 'support', 1, false, YES_NO_OPTIONS),
  f('desiredAssets', 'Desired Assets', 'multiselect', 'support', 2, false, [
    { value: 'sprayer', label: 'Sprayer' }, { value: 'tractor', label: 'Tractor' }, { value: 'irrigation', label: 'Irrigation Kit' },
    { value: 'storage', label: 'Storage' }, { value: 'seeds', label: 'Improved Seeds' }, { value: 'fertilizer', label: 'Fertilizer' },
    { value: 'ppe', label: 'PPE' }, { value: 'other', label: 'Other' },
  ]),
  f('inputCredit', 'Willing to Take Input Credit', 'select', 'support', 3, false, YES_NO_OPTIONS),
  f('engagedOrgs', 'Engaged with Other Organizations', 'select', 'support', 4, false, YES_NO_OPTIONS),
  f('suggestions', 'Suggestions', 'textarea', 'support', 5),
  f('gpsLocation', 'GPS Location', 'text', 'support', 6),
  f('consentGiven', 'Farmer Consent Given', 'checkbox', 'support', 7, true),
]

// ─── Program (ProgramsSetup) ─────────────────────────────────────────────────

export const PROGRAM_FORM_ID = 'program'
const PROGRAM_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const PROGRAM_FIELDS: FieldDef[] = [
  f('name', 'Program Name', 'text', 'details', 1, true),
  f('description', 'Description', 'textarea', 'details', 2),
  f('season', 'Season', 'text', 'details', 3, true),
  f('startDate', 'Start Date', 'date', 'details', 4, true),
  f('endDate', 'End Date', 'date', 'details', 5, true),
  f('targetEnrollment', 'Target Enrollment', 'number', 'details', 6),
  f('crops', 'Crops', 'multiselect', 'details', 7, true),
  f('regions', 'Regions', 'multiselect', 'details', 8, true),
]

// ─── Cohort (ProgramsSetup) ───────────────────────────────────────────────────

export const COHORT_FORM_ID = 'cohort'
const COHORT_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const COHORT_FIELDS: FieldDef[] = [
  f('programId', 'Program', 'select', 'details', 1, true),
  f('name', 'Cohort Name', 'text', 'details', 2, true),
  f('region', 'Region', 'select', 'details', 3, true),
  f('district', 'District', 'text', 'details', 4, true),
  f('targetCount', 'Target Count', 'number', 'details', 5),
  f('agentName', 'Agent', 'select', 'details', 6),
  f('partnerId', 'Partner', 'select', 'details', 7),
]

// ─── Governance sub-forms ─────────────────────────────────────────────────────

export const GOVERNANCE_OFFICER_FORM_ID = 'governance-officer'
const GOVERNANCE_OFFICER_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const GOVERNANCE_OFFICER_FIELDS: FieldDef[] = [
  f('cooperativeId', 'Cooperative', 'select', 'details', 1, true),
  f('farmerId', 'Officer', 'select', 'details', 2, true),
  f('role', 'Role', 'select', 'details', 3, true),
  f('isActive', 'Active', 'checkbox', 'details', 4),
  f('termStart', 'Term Start', 'date', 'details', 5),
  f('termEnd', 'Term End', 'date', 'details', 6),
]

export const GOVERNANCE_MEETING_FORM_ID = 'governance-meeting'
const GOVERNANCE_MEETING_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const GOVERNANCE_MEETING_FIELDS: FieldDef[] = [
  f('cooperativeId', 'Cooperative', 'select', 'details', 1, true),
  f('meetingType', 'Meeting Type', 'select', 'details', 2, true),
  f('meetingDate', 'Meeting Date', 'date', 'details', 3, true),
  f('attendanceCount', 'Attendance Count', 'number', 'details', 4),
  f('agenda', 'Agenda', 'textarea', 'details', 5),
  f('minutes', 'Minutes', 'textarea', 'details', 6),
]

export const GOVERNANCE_RESOLUTION_FORM_ID = 'governance-resolution'
const GOVERNANCE_RESOLUTION_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const GOVERNANCE_RESOLUTION_FIELDS: FieldDef[] = [
  f('cooperativeId', 'Cooperative', 'select', 'details', 1, true),
  f('meetingId', 'Meeting', 'select', 'details', 2),
  f('title', 'Title', 'text', 'details', 3, true),
  f('description', 'Description', 'textarea', 'details', 4),
  f('voteOutcome', 'Vote Outcome', 'select', 'details', 5),
  f('implementationStatus', 'Implementation Status', 'select', 'details', 6),
  f('datePassed', 'Date Passed', 'date', 'details', 7),
]

export const GOVERNANCE_FUND_FORM_ID = 'governance-fund'
const GOVERNANCE_FUND_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const GOVERNANCE_FUND_FIELDS: FieldDef[] = [
  f('cooperativeId', 'Cooperative', 'select', 'details', 1, true),
  f('transactionType', 'Transaction Type', 'select', 'details', 2, true),
  f('amount', 'Amount', 'number', 'details', 3, true),
  f('modeOfPayment', 'Mode of Payment', 'select', 'details', 4),
  f('transactionDate', 'Transaction Date', 'date', 'details', 5, true),
  f('notes', 'Notes', 'textarea', 'details', 6),
]

export const GOVERNANCE_DOCUMENT_FORM_ID = 'governance-document'
const GOVERNANCE_DOCUMENT_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const GOVERNANCE_DOCUMENT_FIELDS: FieldDef[] = [
  f('cooperativeId', 'Cooperative', 'select', 'details', 1, true),
  f('title', 'Title', 'text', 'details', 2, true),
  f('documentType', 'Document Type', 'select', 'details', 3),
  f('uploadDate', 'Upload Date', 'date', 'details', 4),
  f('status', 'Status', 'select', 'details', 5),
]

export const GOVERNANCE_TRACEABILITY_FORM_ID = 'governance-traceability'
const GOVERNANCE_TRACEABILITY_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const GOVERNANCE_TRACEABILITY_FIELDS: FieldDef[] = [
  f('cooperativeId', 'Cooperative', 'select', 'details', 1, true),
  f('farmerId', 'Farmer', 'select', 'details', 2, true),
  f('harvestDate', 'Harvest Date', 'date', 'details', 3, true),
  f('batchWeightKg', 'Batch Weight (kg)', 'number', 'details', 4, true),
  f('dryingMoisturePct', 'Drying Moisture %', 'number', 'details', 5),
  f('lbcReceiptNumber', 'LBC Receipt Number', 'text', 'details', 6),
  f('producerPrice', 'Producer Price', 'number', 'details', 7),
  f('premiumPaid', 'Premium Paid', 'number', 'details', 8),
  f('saleDate', 'Sale Date', 'date', 'details', 9),
  f('season', 'Season', 'text', 'details', 10),
  f('fermentationConfirmed', 'Fermentation Confirmed', 'checkbox', 'details', 11),
  f('dryingConfirmed', 'Drying Confirmed', 'checkbox', 'details', 12),
]

// ─── Check-in Config templates ────────────────────────────────────────────────

export const CHECKIN_BASELINE_FORM_ID = 'checkin-baseline'
const CHECKIN_BASELINE_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const CHECKIN_BASELINE_FIELDS: FieldDef[] = [
  f('label', 'Label', 'text', 'details', 1, true),
  f('description', 'Description', 'textarea', 'details', 2),
]

export const CHECKIN_LIST_FORM_ID = 'checkin-list'
const CHECKIN_LIST_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const CHECKIN_LIST_FIELDS: FieldDef[] = [
  f('label', 'Label', 'text', 'details', 1, true),
  f('description', 'Description', 'textarea', 'details', 2),
]

// ─── Training session ─────────────────────────────────────────────────────────

export const TRAINING_SESSION_FORM_ID = 'training-session'
const TRAINING_SESSION_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const TRAINING_SESSION_FIELDS: FieldDef[] = [
  f('title', 'Title', 'text', 'details', 1, true),
  f('sessionType', 'Session Type', 'select', 'details', 2, false, [{ value: 'in_person', label: 'In Person' }, { value: 'online', label: 'Online' }]),
  f('cropType', 'Crop Type', 'select', 'details', 3),
  f('programName', 'Program', 'select', 'details', 4),
  f('cohortId', 'Cohort', 'select', 'details', 5),
  f('scheduledDate', 'Scheduled Date', 'date', 'details', 6, true),
  f('startTime', 'Start Time', 'time', 'details', 7, true),
  f('endTime', 'End Time', 'time', 'details', 8, true),
  f('location', 'Location', 'text', 'details', 9),
  f('meetingLink', 'Meeting Link', 'text', 'details', 10),
  f('description', 'Description', 'textarea', 'details', 11),
]

// ─── Advisory / Survey schedule & template (shared shape) ────────────────────

export const SURVEY_SCHEDULE_FORM_ID = 'survey-schedule'
export const ADVISORY_SCHEDULE_FORM_ID = 'advisory-schedule'
export const CHECKIN_SCHEDULE_FORM_ID = 'checkin-schedule'
const SCHEDULE_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const SCHEDULE_FIELDS: FieldDef[] = [
  f('programId', 'Program', 'select', 'details', 1, true),
  f('cohortId', 'Cohort', 'select', 'details', 2),
  f('startDate', 'Start Date', 'date', 'details', 3),
  f('templateId', 'Template', 'select', 'details', 4),
]

export const SURVEY_TEMPLATE_FORM_ID = 'survey-template'
export const ADVISORY_TEMPLATE_FORM_ID = 'advisory-template'
const TEMPLATE_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const TEMPLATE_FIELDS: FieldDef[] = [
  f('title', 'Title', 'text', 'details', 1, true),
  f('description', 'Description', 'textarea', 'details', 2),
]

// ─── Agent Assignment ──────────────────────────────────────────────────────────

export const AGENT_FORM_ID = 'agent'
const AGENT_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const AGENT_FIELDS: FieldDef[] = [
  f('name', 'Full Name', 'text', 'details', 1, true),
  f('phone', 'Phone', 'text', 'details', 2, true),
  f('region', 'Region', 'select', 'details', 3),
]

// ─── Community Profile ────────────────────────────────────────────────────────

export const COMMUNITY_FORM_ID = 'community'
const COMMUNITY_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const COMMUNITY_FIELDS: FieldDef[] = [
  f('name', 'Community Name', 'text', 'details', 1, true),
  f('region', 'Region', 'select', 'details', 2, true),
  f('district', 'District', 'text', 'details', 3),
  f('population', 'Population', 'number', 'details', 4),
  f('gpsLocation', 'GPS Location', 'text', 'details', 5),
]

export const COOPERATIVE_FORM_ID = 'cooperative'
const COOPERATIVE_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const COOPERATIVE_FIELDS: FieldDef[] = [
  f('name', 'Cooperative Name', 'text', 'details', 1, true),
  f('region', 'Region', 'select', 'details', 2, true),
  f('district', 'District', 'text', 'details', 3),
  f('memberCount', 'Member Count', 'number', 'details', 4),
]

// ─── Intervention (Opportunity Pathways / PM Interventions — unified) ─────────

export const INTERVENTION_FORM_ID = 'intervention'
const INTERVENTION_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const INTERVENTION_FIELDS: FieldDef[] = [
  f('name', 'Name', 'text', 'details', 1, true),
  f('type', 'Type', 'select', 'details', 2, true),
  f('description', 'Description', 'textarea', 'details', 3),
  f('startDate', 'Start Date', 'date', 'details', 4),
  f('endDate', 'End Date', 'date', 'details', 5),
  f('targetCount', 'Target Count', 'number', 'details', 6),
  f('partnerId', 'Partner', 'select', 'details', 7),
]

export const DEFAULT_FORMS: FormDef[] = [
  { id: FARMER_REGISTRATION_FORM_ID, name: 'Farmer Registration', steps: FARMER_REGISTRATION_STEPS, fields: FARMER_REGISTRATION_FIELDS },
  { id: PROGRAM_FORM_ID, name: 'Program', steps: PROGRAM_STEPS, fields: PROGRAM_FIELDS },
  { id: COHORT_FORM_ID, name: 'Cohort', steps: COHORT_STEPS, fields: COHORT_FIELDS },
  { id: GOVERNANCE_OFFICER_FORM_ID, name: 'Governance — Officer', steps: GOVERNANCE_OFFICER_STEPS, fields: GOVERNANCE_OFFICER_FIELDS },
  { id: GOVERNANCE_MEETING_FORM_ID, name: 'Governance — Meeting', steps: GOVERNANCE_MEETING_STEPS, fields: GOVERNANCE_MEETING_FIELDS },
  { id: GOVERNANCE_RESOLUTION_FORM_ID, name: 'Governance — Resolution', steps: GOVERNANCE_RESOLUTION_STEPS, fields: GOVERNANCE_RESOLUTION_FIELDS },
  { id: GOVERNANCE_FUND_FORM_ID, name: 'Governance — Fund Transaction', steps: GOVERNANCE_FUND_STEPS, fields: GOVERNANCE_FUND_FIELDS },
  { id: GOVERNANCE_DOCUMENT_FORM_ID, name: 'Governance — Document', steps: GOVERNANCE_DOCUMENT_STEPS, fields: GOVERNANCE_DOCUMENT_FIELDS },
  { id: GOVERNANCE_TRACEABILITY_FORM_ID, name: 'Governance — Traceability', steps: GOVERNANCE_TRACEABILITY_STEPS, fields: GOVERNANCE_TRACEABILITY_FIELDS },
  { id: CHECKIN_BASELINE_FORM_ID, name: 'Check-in — Baseline Activity', steps: CHECKIN_BASELINE_STEPS, fields: CHECKIN_BASELINE_FIELDS },
  { id: CHECKIN_LIST_FORM_ID, name: 'Check-in — Check-in List', steps: CHECKIN_LIST_STEPS, fields: CHECKIN_LIST_FIELDS },
  { id: TRAINING_SESSION_FORM_ID, name: 'Training Session', steps: TRAINING_SESSION_STEPS, fields: TRAINING_SESSION_FIELDS },
  { id: SURVEY_SCHEDULE_FORM_ID, name: 'Survey Schedule', steps: SCHEDULE_STEPS, fields: SCHEDULE_FIELDS },
  { id: ADVISORY_SCHEDULE_FORM_ID, name: 'Advisory Schedule', steps: SCHEDULE_STEPS, fields: SCHEDULE_FIELDS },
  { id: CHECKIN_SCHEDULE_FORM_ID, name: 'Check-in Schedule', steps: SCHEDULE_STEPS, fields: SCHEDULE_FIELDS },
  { id: SURVEY_TEMPLATE_FORM_ID, name: 'Survey Template', steps: TEMPLATE_STEPS, fields: TEMPLATE_FIELDS },
  { id: ADVISORY_TEMPLATE_FORM_ID, name: 'Advisory Template', steps: TEMPLATE_STEPS, fields: TEMPLATE_FIELDS },
  { id: AGENT_FORM_ID, name: 'Agent Assignment', steps: AGENT_STEPS, fields: AGENT_FIELDS },
  { id: COMMUNITY_FORM_ID, name: 'Community Profile', steps: COMMUNITY_STEPS, fields: COMMUNITY_FIELDS },
  { id: COOPERATIVE_FORM_ID, name: 'Cooperative Profile', steps: COOPERATIVE_STEPS, fields: COOPERATIVE_FIELDS },
  { id: INTERVENTION_FORM_ID, name: 'Intervention', steps: INTERVENTION_STEPS, fields: INTERVENTION_FIELDS },
]
