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

export type FieldType =
  | 'text' | 'number' | 'date' | 'time' | 'select' | 'multiselect' | 'checkbox' | 'textarea'
  // Specialised captures that render a purpose-built widget rather than a plain
  // input. They still carry a label/required flag like any other field, so an
  // admin can rename them, mark them optional, or drop them from the form.
  | 'yesno' | 'chips' | 'gps' | 'phone' | 'email'
  // Uploads. Each maps to an accept filter, so an admin picks the kind of
  // document a field takes rather than typing MIME types.
  | 'photo' | 'file' | 'video' | 'document'
  // A bespoke widget the owning screen renders itself (nested matrices,
  // repeaters). The generic renderer skips it, but declaring it as a field lets
  // an admin still rename, reorder or delete the section from config.
  | 'custom'

/** Upload field types, and the `accept` filter each one applies. */
export const UPLOAD_ACCEPT: Record<string, string> = {
  photo:    'image/*',
  video:    'video/*',
  document: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv',
  file:     '',
}

/**
 * Prompt shown inside each upload dropzone. Set explicitly because
 * FileUploadTemplate otherwise guesses from `accept`, and the document filter
 * contains '.csv' — which would mislabel it "select a CSV file".
 */
export const UPLOAD_PLACEHOLDER: Record<string, string> = {
  photo:    'Upload photo',
  video:    'Upload video',
  document: 'Upload document',
  file:     'Click to upload file',
}

export function isUploadType(type: FieldType): boolean {
  return type === 'photo' || type === 'file' || type === 'video' || type === 'document'
}

export interface FieldOption {
  value: string
  label: string
}

/**
 * Shows or requires a field only when another field holds a given value.
 * `equals` matches a single value; `oneOf` matches any of several.
 */
export interface FieldCondition {
  /** FieldDef.key of the field being tested. */
  field:  string
  equals?: string
  oneOf?:  string[]
  /** Satisfied when the referenced field has any non-empty value. */
  filled?: boolean
}

export interface FieldDef {
  /** Storage key in the dynamic answers bag. Stable — do not rename after farmer data exists, or existing answers become orphaned under the old key. */
  key:      string
  label:    string
  type:     FieldType
  required: boolean
  /** Only used by 'select', 'multiselect' and 'chips'. Leave empty for lists the app supplies at runtime (programs, cohorts, crops, regions). */
  options?: FieldOption[]
  /** Which step (by FormStepDef.id) this field renders under */
  stepId:   string
  order:    number

  // ─── Optional presentation / behaviour metadata ───────────────────────────
  placeholder?: string
  hint?:        string
  /** Renders the field across both columns of a two-column step layout. */
  fullWidth?:   boolean
  /** Numeric bounds, for 'number' fields. */
  min?:         number
  max?:         number
  step?:        number
  /** Render this field only when the condition holds. A hidden field is never required. */
  visibleWhen?: FieldCondition
  /** Require this field only when the condition holds (on top of `required`). */
  requiredWhen?: FieldCondition
  /**
   * Names a runtime option source for select-likes whose choices come from live
   * data. Consumers resolve it through useDynamicFieldOptions; `dependsOn`
   * records which other field narrows the list (e.g. cohort depends on program).
   */
  optionSource?: string
  dependsOn?:    string
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
  /** Sidebar page this form belongs to — must be one of FORM_PAGE_ORDER. Groups the Configuration > Forms list. */
  page:  string
  steps: FormStepDef[]
  fields: FieldDef[]
}

/**
 * The sidebar pages that can own forms, in sidebar order (see STAFF_NAV in
 * DashboardLayout). Configuration > Forms shows exactly these as its top-level
 * groups, so every FormDef.page must be one of them.
 */
export const FORM_PAGE_ORDER: string[] = [
  'Governance',
  'Registry',
  'Programs',
  'Insights',
  'Opportunities',
  'Configuration',
]

/**
 * Groups forms under their sidebar page, in sidebar order. Pages with no forms
 * are omitted. A form whose `page` is not a sidebar name falls under the last
 * group rather than disappearing from the editor.
 */
export function formsByPage(forms: FormDef[]): { page: string; forms: FormDef[] }[] {
  const fallback = FORM_PAGE_ORDER[FORM_PAGE_ORDER.length - 1]
  const groups = new Map<string, FormDef[]>()
  for (const form of forms) {
    const key = FORM_PAGE_ORDER.includes(form.page) ? form.page : fallback
    const list = groups.get(key)
    if (list) list.push(form)
    else groups.set(key, [form])
  }
  return FORM_PAGE_ORDER
    .filter(page => groups.has(page))
    .map(page => ({ page, forms: groups.get(page)! }))
}

/** A record captured through a config-driven form. `values` is keyed by FieldDef.key. */
export interface DynamicRecord {
  id:        string
  createdAt: string
  updatedAt: string
  values:    Record<string, unknown>
}

/**
 * Storage key for the admin-edited form configs.
 *
 * Version-suffixed: a persisted config from a previous session would otherwise
 * shadow DEFAULT_FORMS forever, so a stale copy keeps rendering after the
 * shipped defaults change shape. Bump the suffix whenever DEFAULT_FORMS changes
 * structurally (fields added/renamed/regrouped) so old configs are dropped
 * instead of masking the new defaults.
 */
export const FORM_CONFIGS_KEY = 'form-configs-v3'

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
    .filter(f => f.stepId === stepId && fieldIsRequired(f, values))
    .every(f => fieldHasValue(f, values[f.key]))
}

/** Evaluates a FieldCondition against the current answers bag. */
export function conditionMet(cond: FieldCondition | undefined, values: Record<string, unknown>): boolean {
  if (!cond) return true
  const raw = values[cond.field]
  const v = Array.isArray(raw) ? raw : raw === undefined || raw === null ? '' : String(raw)
  if (cond.filled !== undefined) {
    const filled = Array.isArray(v) ? v.length > 0 : v.trim() !== ''
    return cond.filled ? filled : !filled
  }
  if (cond.equals !== undefined) return v === cond.equals
  if (cond.oneOf) return typeof v === 'string' && cond.oneOf.includes(v)
  return true
}

/** True when the field should render given the current answers. */
export function fieldIsVisible(field: FieldDef, values: Record<string, unknown>): boolean {
  return conditionMet(field.visibleWhen, values)
}

/** True when the field must be filled given the current answers. Hidden fields are never required. */
export function fieldIsRequired(field: FieldDef, values: Record<string, unknown>): boolean {
  if (!fieldIsVisible(field, values)) return false
  if (field.required) return true
  return field.requiredWhen ? conditionMet(field.requiredWhen, values) : false
}

/** Single definition of "this field is filled in", per type. */
export function fieldHasValue(field: FieldDef, v: unknown): boolean {
  if (field.type === 'checkbox') return v === true
  if (field.type === 'multiselect' || field.type === 'chips') return Array.isArray(v) && v.length > 0
  return v !== undefined && v !== null && String(v).trim() !== ''
}

/** The empty value a field should start at, per type. */
export function emptyValueFor(field: FieldDef): unknown {
  if (field.type === 'checkbox') return false
  if (field.type === 'multiselect' || field.type === 'chips') return []
  return ''
}

export function sortedSteps(form: FormDef): FormStepDef[] {
  return [...form.steps].sort((a, b) => a.order - b.order)
}

export function fieldsForStep(form: FormDef, stepId: string): FieldDef[] {
  return form.fields.filter(f => f.stepId === stepId).sort((a, b) => a.order - b.order)
}

/** fieldsForStep, minus fields whose `visibleWhen` is not satisfied by the current answers. */
export function visibleFieldsForStep(form: FormDef, stepId: string, values: Record<string, unknown>): FieldDef[] {
  return fieldsForStep(form, stepId).filter(f => fieldIsVisible(f, values))
}

function f(key: string, label: string, type: FieldType, stepId: string, order: number, required = false, options?: FieldOption[]): FieldDef {
  return { key, label, type, required, stepId, order, options }
}

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
  f('phone', 'Phone', 'phone', 'personal', 5, true),
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
  f('ownsTractor', 'Owns Tractor', 'yesno', 'farm', 6),

  f('ownsHouse', 'Owns House', 'yesno', 'household', 1),
  f('maritalStatus', 'Marital Status', 'select', 'household', 2, false, [
    { value: 'single', label: 'Single' }, { value: 'married', label: 'Married' }, { value: 'divorced', label: 'Divorced' }, { value: 'widowed', label: 'Widowed' },
  ]),
  f('numChildren', 'Number of Children', 'number', 'household', 3),
  f('otherBusiness', 'Has Other Business', 'yesno', 'household', 4),
  f('nativeCommunity', 'Native of Community', 'yesno', 'household', 5),
  f('communityPrefs', 'Community Preferences', 'chips', 'household', 6, false, [
    { value: 'School', label: 'School' }, { value: 'Roads', label: 'Roads' }, { value: 'Water', label: 'Water' },
    { value: 'Hospital', label: 'Hospital' }, { value: 'Police station', label: 'Police station' }, { value: 'Banks', label: 'Banks' },
  ]),

  f('loanType', 'Loan Type', 'select', 'financial', 1, false, [
    { value: 'input_credit', label: 'Input Credit' }, { value: 'equipment', label: 'Equipment Loan' },
    { value: 'working_capital', label: 'Working Capital' }, { value: 'none', label: 'None' },
  ]),
  f('averageIncome', 'Average Monthly Income (GHS)', 'number', 'financial', 2),
  f('accountType', 'Account Type', 'select', 'financial', 3, false, [
    { value: 'bank', label: 'Bank Account' }, { value: 'mobile_money', label: 'Mobile Money' }, { value: 'none', label: 'None' },
  ]),
  f('hasAgricInsurance', 'Has Agric Insurance', 'yesno', 'financial', 4),

  f('engagedAgric', 'Engaged with Other Agric Companies', 'yesno', 'support', 1),
  f('desiredAssets', 'Desired Assets', 'chips', 'support', 2, false, [
    { value: 'Tractor', label: 'Tractor' }, { value: 'Irrigation system', label: 'Irrigation system' },
    { value: 'Storage facility', label: 'Storage facility' }, { value: 'Processing equipment', label: 'Processing equipment' },
    { value: 'Solar pump', label: 'Solar pump' }, { value: 'Drone sprayer', label: 'Drone sprayer' },
    { value: 'Motorbike', label: 'Motorbike' }, { value: 'Other', label: 'Other' },
  ]),
  f('inputCredit', 'Willing to Take Input Credit', 'yesno', 'support', 3),
  f('engagedOrgs', 'Engaged with Other Organizations', 'yesno', 'support', 4),
  f('suggestions', 'Suggestions', 'textarea', 'support', 5),
  f('gpsLocation', 'GPS Location', 'gps', 'support', 6),
  f('consentGiven', 'Farmer Consent Given', 'checkbox', 'support', 7, true),
]

// ─── Program (ProgramsSetup) ─────────────────────────────────────────────────

export const PROGRAM_FORM_ID = 'program'
const PROGRAM_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const PROGRAM_FIELDS: FieldDef[] = [
  { ...f('name', 'PROGRAM NAME', 'text', 'details', 1, true), placeholder: 'e.g. 2024 Maize Outgrower Scheme' },
  { ...f('description', 'DESCRIPTION', 'text', 'details', 2), placeholder: 'Brief description' },
  { ...f('season', 'CROP SEASON', 'text', 'details', 3, true), placeholder: 'e.g. 2024A' },
  f('startDate', 'START DATE', 'date', 'details', 4, true),
  f('endDate', 'END DATE', 'date', 'details', 5, true),
  f('targetEnrollment', 'TARGET ENROLLMENT', 'number', 'details', 6),
  { ...f('crops', 'CROP TYPES', 'multiselect', 'details', 7, true), optionSource: 'crops', placeholder: 'Select crop types *' },
  // Regions is decorative today — the submit handler never checks it and the value is not saved.
  { ...f('regions', 'REGIONS', 'multiselect', 'details', 8), optionSource: 'regions', placeholder: 'Select regions *' },
]

// ─── Cohort (ProgramsSetup) ───────────────────────────────────────────────────

export const COHORT_FORM_ID = 'cohort'
const COHORT_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const COHORT_FIELDS: FieldDef[] = [
  { ...f('programId', 'PROGRAM', 'select', 'details', 1), optionSource: 'programs' },
  { ...f('name', 'COHORT NAME', 'text', 'details', 2, true), placeholder: 'e.g. Northern Belt A' },
  // region and agentName store the visible LABEL, not an id — see the option lists at the call site.
  { ...f('region', 'REGION', 'select', 'details', 3, true), optionSource: 'regions' },
  { ...f('district', 'DISTRICT', 'text', 'details', 4, true), placeholder: 'e.g. Tamale' },
  f('targetCount', 'TARGET COUNT', 'number', 'details', 5),
  { ...f('agentName', 'ASSIGNED AGENT', 'select', 'details', 6), optionSource: 'agents' },
  { ...f('partnerId', 'PARTNER', 'select', 'details', 7), optionSource: 'partners' },
]

// ─── Governance sub-forms ─────────────────────────────────────────────────────

export const GOVERNANCE_OFFICER_FORM_ID = 'governance-officer'
const GOVERNANCE_OFFICER_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const GOVERNANCE_OFFICER_FIELDS: FieldDef[] = [
  f('cooperativeId', 'Cooperative', 'select', 'details', 1),
  f('farmerId', 'Officer', 'select', 'details', 2, true),
  f('role', 'Role', 'select', 'details', 3, true),
  f('isActive', 'Active', 'checkbox', 'details', 4),
  f('termStart', 'Term Start', 'date', 'details', 5),
  f('termEnd', 'Term End', 'date', 'details', 6),
]

export const GOVERNANCE_MEETING_FORM_ID = 'governance-meeting'
const GOVERNANCE_MEETING_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const GOVERNANCE_MEETING_FIELDS: FieldDef[] = [
  f('cooperativeId', 'Cooperative', 'select', 'details', 1),
  f('meetingType', 'Meeting Type', 'select', 'details', 2),
  f('meetingDate', 'Date', 'date', 'details', 3),
  f('attendanceCount', 'Attendance Count', 'number', 'details', 4),
  f('agenda', 'Agenda', 'text', 'details', 5),
  f('minutes', 'Minutes', 'text', 'details', 6),
]

export const GOVERNANCE_RESOLUTION_FORM_ID = 'governance-resolution'
const GOVERNANCE_RESOLUTION_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const GOVERNANCE_RESOLUTION_FIELDS: FieldDef[] = [
  f('cooperativeId', 'Cooperative', 'select', 'details', 1),
  f('meetingId', 'Meeting', 'select', 'details', 2),
  f('title', 'Title', 'text', 'details', 3, true),
  f('description', 'Description', 'text', 'details', 4),
  f('voteOutcome', 'Vote Outcome', 'select', 'details', 5),
  f('implementationStatus', 'Implementation', 'select', 'details', 6),
  f('datePassed', 'Date Passed', 'date', 'details', 7),
]

export const GOVERNANCE_FUND_FORM_ID = 'governance-fund'
const GOVERNANCE_FUND_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const GOVERNANCE_FUND_FIELDS: FieldDef[] = [
  f('cooperativeId', 'Cooperative', 'select', 'details', 1),
  f('transactionType', 'Transaction Type', 'select', 'details', 2),
  f('amount', 'Amount (GHS)', 'number', 'details', 3),
  f('modeOfPayment', 'Payment Mode', 'select', 'details', 4),
  f('transactionDate', 'Date', 'date', 'details', 5),
  f('notes', 'Notes', 'textarea', 'details', 6),
]

export const GOVERNANCE_DOCUMENT_FORM_ID = 'governance-document'
const GOVERNANCE_DOCUMENT_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const GOVERNANCE_DOCUMENT_FIELDS: FieldDef[] = [
  f('cooperativeId', 'Cooperative', 'select', 'details', 1),
  f('title', 'Title', 'text', 'details', 2, true),
  f('documentType', 'Document Type', 'select', 'details', 3),
  f('uploadDate', 'Upload Date', 'date', 'details', 4),
  f('status', 'Status', 'select', 'details', 5),
]

export const GOVERNANCE_TRACEABILITY_FORM_ID = 'governance-traceability'
const GOVERNANCE_TRACEABILITY_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const GOVERNANCE_TRACEABILITY_FIELDS: FieldDef[] = [
  f('cooperativeId', 'Cooperative', 'select', 'details', 1),
  f('farmerId', 'Farmer', 'select', 'details', 2, true),
  f('harvestDate', 'Harvest Date', 'date', 'details', 3, true),
  f('batchWeightKg', 'Batch Weight (kg)', 'number', 'details', 4, true),
  f('dryingMoisturePct', 'Drying Moisture (%)', 'number', 'details', 5),
  f('lbcReceiptNumber', 'LBC Receipt #', 'text', 'details', 6),
  f('producerPrice', 'Producer Price (GHS/ton)', 'number', 'details', 7),
  f('premiumPaid', 'Premium (GHS)', 'number', 'details', 8),
  f('saleDate', 'Sale Date', 'date', 'details', 9),
  f('season', 'Season', 'text', 'details', 10),
  f('fermentationConfirmed', 'Fermentation Confirmed', 'checkbox', 'details', 11),
  f('dryingConfirmed', 'Drying Confirmed', 'checkbox', 'details', 12),
]

// ─── Check-in Config templates ────────────────────────────────────────────────

export const CHECKIN_BASELINE_FORM_ID = 'checkin-baseline'
const CHECKIN_BASELINE_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const CHECKIN_BASELINE_FIELDS: FieldDef[] = [
  f('label', 'Baseline name', 'text', 'details', 1, true),
]

export const CHECKIN_LIST_FORM_ID = 'checkin-list'
const CHECKIN_LIST_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const CHECKIN_LIST_FIELDS: FieldDef[] = [
  f('label', 'Check-in list name', 'text', 'details', 1, true),
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
  f('scheduledDate', 'Date', 'date', 'details', 6, true),
  f('startTime', 'Start Time', 'time', 'details', 7, true),
  f('endTime', 'End Time', 'time', 'details', 8, true),
  {
    ...f('location', 'Location', 'text', 'details', 9),
    visibleWhen:  { field: 'sessionType', equals: 'in_person' },
    requiredWhen: { field: 'sessionType', equals: 'in_person' },
  },
  {
    ...f('meetingLink', 'Meeting Link', 'text', 'details', 10),
    visibleWhen:  { field: 'sessionType', equals: 'online' },
    requiredWhen: { field: 'sessionType', equals: 'online' },
  },
  f('description', 'Description', 'textarea', 'details', 11),
]

// ─── Advisory / Survey schedule & template (shared shape) ────────────────────

export const SURVEY_SCHEDULE_FORM_ID = 'survey-schedule'
export const ADVISORY_SCHEDULE_FORM_ID = 'advisory-schedule'
export const CHECKIN_SCHEDULE_FORM_ID = 'checkin-schedule'
const SCHEDULE_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]

const START_MODE_OPTIONS: FieldOption[] = [
  { value: 'immediate', label: 'Start immediately' },
  { value: 'scheduled', label: 'Schedule for later' },
]

/** Shared head of every schedule form: which cohort, and when it starts. */
function scheduleHeadFields(): FieldDef[] {
  return [
    { ...f('programId', 'Program', 'select', 'details', 1, true), optionSource: 'programs' },
    { ...f('cohortId', 'Cohort', 'select', 'details', 2, true), optionSource: 'cohorts', dependsOn: 'programId' },
    f('startMode', 'Start Mode', 'select', 'details', 3, false, START_MODE_OPTIONS),
    // only asked for — and only required — when the run is scheduled rather than immediate
    {
      ...f('startDate', 'Start Date', 'date', 'details', 4),
      visibleWhen:  { field: 'startMode', equals: 'scheduled' },
      requiredWhen: { field: 'startMode', equals: 'scheduled' },
    },
  ]
}

const SURVEY_SCHEDULE_FIELDS: FieldDef[] = [
  ...scheduleHeadFields(),
  { ...f('surveyTemplateId', 'Survey Template', 'select', 'details', 5), optionSource: 'surveyTemplates' },
]

const ADVISORY_SCHEDULE_FIELDS: FieldDef[] = [
  ...scheduleHeadFields(),
  { ...f('advisoryTemplateId', 'Advisory Template', 'select', 'details', 5), optionSource: 'advisoryTemplates' },
]

const CHECKIN_SCHEDULE_FIELDS: FieldDef[] = [
  { ...f('programId', 'Program', 'select', 'details', 1, true), optionSource: 'programs' },
  { ...f('cohortId', 'Cohort', 'select', 'details', 2, true), optionSource: 'cohorts', dependsOn: 'programId' },
  { ...f('partnerId', 'Partner', 'select', 'details', 3), optionSource: 'partners' },
  f('startMode', 'Start Mode', 'select', 'details', 4, false, START_MODE_OPTIONS),
  {
    ...f('startDate', 'Start Date', 'date', 'details', 5),
    visibleWhen:  { field: 'startMode', equals: 'scheduled' },
    requiredWhen: { field: 'startMode', equals: 'scheduled' },
  },
  { ...f('windowDays', 'Window Days', 'number', 'details', 6), min: 1 },
  { ...f('graceDays', 'Grace Days', 'number', 'details', 7), min: 0 },
  { ...f('totalWeeks', 'Total Weeks', 'number', 'details', 8), min: 1 },
  { ...f('baselineTemplateId', 'Baseline Template', 'select', 'details', 9), optionSource: 'baselineTemplates' },
  { ...f('checkinTemplateId', 'Check-in Template', 'select', 'details', 10), optionSource: 'checkinTemplates' },
]

export const SURVEY_TEMPLATE_FORM_ID = 'survey-template'
export const ADVISORY_TEMPLATE_FORM_ID = 'advisory-template'
const TEMPLATE_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]

// The question/message repeaters on these sheets stay bespoke — a repeating
// group is not expressible as a FieldDef. Only the header fields are config-driven.
const SURVEY_TEMPLATE_FIELDS: FieldDef[] = [
  f('title', 'Template Title', 'text', 'details', 1, true),
  f('description', 'Description', 'textarea', 'details', 2),
]

const ADVISORY_TEMPLATE_FIELDS: FieldDef[] = [
  f('title', 'Template Title', 'text', 'details', 1, true),
  { ...f('cropType', 'Crop', 'select', 'details', 2), optionSource: 'crops' },
  f('description', 'Description', 'textarea', 'details', 3),
]

// ─── Agent Assignment ──────────────────────────────────────────────────────────

export const AGENT_FORM_ID = 'agent'
const AGENT_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const AGENT_FIELDS: FieldDef[] = [
  { ...f('partnerId', 'Organization', 'select', 'details', 1, true), optionSource: 'partners', placeholder: 'Select an organization…' },
  { ...f('name', 'Full Name', 'text', 'details', 2, true), placeholder: 'e.g. Ama Boateng' },
  { ...f('phone', 'Phone', 'phone', 'details', 3, true), placeholder: 'e.g. 0241234567' },
]

// ─── Community Profile ────────────────────────────────────────────────────────

export const COMMUNITY_FORM_ID = 'community'
// Two steps so the bespoke sections this sheet interleaves — the photo upload,
// the nested social-amenities matrix and the GPS capture — can sit between them.
const COMMUNITY_STEPS: FormStepDef[] = [
  { id: 'details', name: 'Details', order: 1 },
  { id: 'leader',  name: 'Leader',  order: 2 },
]

const COMMUNITY_FIELDS: FieldDef[] = [
  { ...f('photo', 'Community Photo', 'photo', 'details', 0), placeholder: 'Upload community photo' },
  { ...f('name', 'Community Name', 'text', 'details', 1, true), placeholder: 'e.g. Akumadan', fullWidth: true },
  { ...f('regionCode', 'Region', 'select', 'details', 2, true), optionSource: 'regions', placeholder: 'Select region' },
  { ...f('district', 'District', 'select', 'details', 3, true), optionSource: 'districts', dependsOn: 'regionCode' },
  { ...f('town', 'Nearest Town', 'text', 'details', 4), placeholder: 'e.g. Techiman' },
  { ...f('status', 'Socioeconomic Status', 'select', 'details', 5, false, [
    { value: 'rural', label: 'Rural' }, { value: 'peri_urban', label: 'Peri-Urban' }, { value: 'urban', label: 'Urban' },
  ]), placeholder: 'Select status' },
  f('streams', 'Major Income Streams', 'chips', 'details', 6, false, [
    { value: 'Farming', label: 'Farming' }, { value: 'Trading', label: 'Trading' }, { value: 'Other', label: 'Other' },
  ]),
  {
    ...f('otherStream', 'Other (specify)', 'text', 'details', 7),
    placeholder: 'Specify other income streams',
    visibleWhen: { field: 'streams', oneOf: ['Other'] },
  },
  // The amenities matrix and GPS capture are bespoke widgets, but they are
  // declared here so an admin can rename or remove them like any other field —
  // the sheet renders each section only while its field is present in config.
  f('socialAmenities', 'Social Amenities', 'custom', 'details', 8),
  f('gpsLocation', 'GPS Location', 'gps', 'details', 9),
  { ...f('leaderName', 'Community Leader Name', 'text', 'leader', 1), placeholder: 'Chief or other leader' },
  { ...f('leaderTel', 'Leader Contact', 'phone', 'leader', 2), placeholder: '+233 ...' },
]

export const COOPERATIVE_FORM_ID = 'cooperative'
const COOPERATIVE_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const COOPERATIVE_FIELDS: FieldDef[] = [
  { ...f('coopName', 'Group / Cooperative Name', 'text', 'details', 1, true), placeholder: 'e.g. Akumadan Women Farmers Group', fullWidth: true },
  { ...f('communityId', 'Community', 'select', 'details', 2), optionSource: 'communities', placeholder: 'No community' },
  { ...f('members', 'Number of Group Members', 'number', 'details', 3), placeholder: 'e.g. 25', fullWidth: true },
  { ...f('primary', 'Primary Crops (up to 2)', 'chips', 'details', 4), optionSource: 'crops' },
  { ...f('secondary', 'Secondary Crops (up to 2)', 'chips', 'details', 5), optionSource: 'crops' },
  f('animals', 'Farm Animals', 'chips', 'details', 6, false, [
    { value: 'Cattle', label: 'Cattle' }, { value: 'Goats', label: 'Goats' }, { value: 'Sheep', label: 'Sheep' },
    { value: 'Poultry', label: 'Poultry' }, { value: 'Pigs', label: 'Pigs' },
  ]),
  { ...f('chair', 'Chairman Name', 'text', 'details', 7), placeholder: 'Full name' },
  { ...f('secretary', 'Secretary Name', 'text', 'details', 8), placeholder: 'Full name' },
]

// ─── Intervention (Opportunity Pathways / PM Interventions — unified) ─────────

export const INTERVENTION_FORM_ID = 'intervention'
const INTERVENTION_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const INTERVENTION_FIELDS: FieldDef[] = [
  { ...f('name', 'Opportunity Name', 'text', 'details', 1, true), placeholder: 'e.g. Soybean Input Loan', fullWidth: true },
  f('type', 'Type', 'select', 'details', 2, true),
  { ...f('season', 'Season', 'text', 'details', 3, true), placeholder: 'e.g. June-Sept 2026' },
  { ...f('valueDescription', 'Value Description', 'text', 'details', 4), placeholder: 'e.g. GHS 1,400', fullWidth: true },
  { ...f('description', 'Description', 'textarea', 'details', 5), placeholder: 'Short description of the opportunity' },
  { ...f('minFri', 'Min FRI', 'number', 'details', 6), min: 0, max: 100 },
  { ...f('capacity', 'Capacity', 'number', 'details', 7), min: 1 },
  f('status', 'Status', 'select', 'details', 8),
  f('approval', 'Approval', 'select', 'details', 9),
]


// ─── Tenant / Platform user (Configuration > User Management, Super Admin > Platform Users) ─

export const PLATFORM_USER_FORM_ID = 'platform-user'
const PLATFORM_USER_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const PLATFORM_USER_FIELDS: FieldDef[] = [
  f('fullName', 'Full Name', 'text', 'details', 1, true),
  f('email', 'Email', 'email', 'details', 2, true),
  f('phone', 'Phone', 'phone', 'details', 3, true),
  { ...f('roleId', 'Role', 'select', 'details', 4, true), optionSource: 'roles' },
]

// ─── Tenant (Super Admin > Tenants) ──────────────────────────────────────────

export const TENANT_FORM_ID = 'tenant'
const TENANT_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const TENANT_FIELDS: FieldDef[] = [
  f('name', 'Organization Name', 'text', 'details', 1, true),
  f('subdomain', 'Subdomain', 'text', 'details', 2, true),
  f('contactEmail', 'Contact Email', 'email', 'details', 3, true),
  f('status', 'Status', 'select', 'details', 4, false, [
    { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' },
  ]),
]

// ─── Partner (PartnerDirectory / PM Partners) ────────────────────────────────

export const PARTNER_FORM_ID = 'partner'
const PARTNER_STEPS: FormStepDef[] = [
  { id: 'organisation', name: 'Organisation',    order: 1 },
  { id: 'contact',      name: 'Primary Contact', order: 2 },
]
const PARTNER_FIELDS: FieldDef[] = [
  f('name', 'Organisation Name', 'text', 'organisation', 1, true),
  f('type', 'Partner Type', 'select', 'organisation', 2, true),
  f('category', 'Category', 'select', 'organisation', 3, true),
  { ...f('region', 'Region', 'select', 'organisation', 4, true), optionSource: 'regions' },
  f('website', 'Website (optional)', 'text', 'organisation', 5),
  f('contact', 'Full Name', 'text', 'contact', 1, true),
  f('email', 'Email Address', 'email', 'contact', 2, true),
  f('phone', 'Phone Number (optional)', 'phone', 'contact', 3),
  f('role', 'Job Title (optional)', 'text', 'contact', 4),
]

// ─── Governance compliance sub-forms ─────────────────────────────────────────

export const GOVERNANCE_CERTIFICATION_FORM_ID = 'governance-certification'
const GOVERNANCE_CERTIFICATION_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const GOVERNANCE_CERTIFICATION_FIELDS: FieldDef[] = [
  f('certificationType', 'Type', 'select', 'details', 1, true),
  f('registrationNumber', 'Registration #', 'text', 'details', 2),
  f('issueDate', 'Issue Date', 'date', 'details', 3),
  f('expiryDate', 'Expiry Date', 'date', 'details', 4),
  f('status', 'Status', 'select', 'details', 5),
  f('notes', 'Notes', 'text', 'details', 6),
]

export const GOVERNANCE_FBO_FORM_ID = 'governance-fbo'
const GOVERNANCE_FBO_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const GOVERNANCE_FBO_FIELDS: FieldDef[] = [
  f('registrationNumber', 'Registration #', 'text', 'details', 1),
  f('registrationDate', 'Registration Date', 'date', 'details', 2),
  f('status', 'Status', 'select', 'details', 3),
  f('renewalDueDate', 'Renewal Due', 'date', 'details', 4),
  f('notes', 'Notes', 'text', 'details', 5),
]

export const GOVERNANCE_LBC_FORM_ID = 'governance-lbc'
const GOVERNANCE_LBC_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const GOVERNANCE_LBC_FIELDS: FieldDef[] = [
  f('lbcName', 'LBC Name', 'text', 'details', 1, true),
  f('licenseNumber', 'License #', 'text', 'details', 2),
  f('agreementStartDate', 'Agreement Start', 'date', 'details', 3),
  f('agreementEndDate', 'Agreement End', 'date', 'details', 4),
  f('seasonalProducerPrice', 'Producer Price (GHS/ton)', 'number', 'details', 5),
  f('premiumAmount', 'Premium (GHS)', 'number', 'details', 6),
  f('season', 'Season', 'text', 'details', 7),
  f('premiumDistributionNotes', 'Premium Distribution Notes', 'text', 'details', 8),
]

// ─── Training bundle / week (TrainingMaterials) ──────────────────────────────

export const TRAINING_BUNDLE_FORM_ID = 'training-bundle'
const TRAINING_BUNDLE_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const TRAINING_BUNDLE_FIELDS: FieldDef[] = [
  { ...f('title', 'Title', 'text', 'details', 1, true), fullWidth: true },
  { ...f('cropType', 'Crop', 'select', 'details', 2), optionSource: 'crops' },
  { ...f('season', 'Season', 'text', 'details', 3), placeholder: 'e.g. 2026A' },
  { ...f('totalWeeks', 'Total Weeks', 'number', 'details', 4), min: 1, fullWidth: true },
  f('description', 'Description', 'textarea', 'details', 5),
]

export const TRAINING_WEEK_FORM_ID = 'training-week'
const TRAINING_WEEK_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const TRAINING_WEEK_FIELDS: FieldDef[] = [
  { ...f('weekTitle', 'Week Title', 'text', 'details', 1), placeholder: 'e.g. Land Preparation' },
  f('topic', 'Topic', 'text', 'details', 2),
  f('description', 'Description', 'textarea', 'details', 3),
  f('notes', 'Notes', 'textarea', 'details', 4),
]

// ─── Farmer registry side-sheets ─────────────────────────────────────────────

export const FARMER_ASSIGN_AGENT_FORM_ID = 'farmer-assign-agent'
const FARMER_ASSIGN_AGENT_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const FARMER_ASSIGN_AGENT_FIELDS: FieldDef[] = [
  { ...f('agent', 'Field Agent', 'select', 'details', 1, true), optionSource: 'agents' },
]

// PM portal edits a farmer through a flatter shape than the registration wizard
// (single full name, plain-text community), so it carries its own FormDef.
export const PM_FARMER_EDIT_FORM_ID = 'pm-farmer-edit'
const PM_FARMER_EDIT_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const PM_FARMER_EDIT_FIELDS: FieldDef[] = [
  { ...f('fullName', 'Full Name', 'text', 'details', 1, true), placeholder: 'Ama Mensah', fullWidth: true },
  { ...f('phone', 'Phone', 'text', 'details', 2, true), placeholder: '0221234567' },
  { ...f('nationalId', 'National ID', 'text', 'details', 3), placeholder: 'GHA-XXXXXXXXX-X' },
  f('dateOfBirth', 'Date of Birth', 'date', 'details', 4),
  { ...f('gender', 'Gender', 'select', 'details', 5, false, [
    { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ]), placeholder: 'Select gender' },
  { ...f('region', 'Region', 'select', 'details', 6), optionSource: 'regions', placeholder: 'Select region' },
  { ...f('district', 'District', 'select', 'details', 7), optionSource: 'districts', dependsOn: 'region', placeholder: 'Select district' },
  { ...f('community', 'Community', 'text', 'details', 8), placeholder: 'Community' },
  { ...f('primaryCrop', 'Primary Crop', 'select', 'details', 9), optionSource: 'crops', placeholder: 'Select crop' },
  { ...f('farmSize', 'Farm Size (ha)', 'number', 'details', 10), placeholder: '2.5', fullWidth: true },
]

export const FARMER_ENROLL_FORM_ID = 'farmer-enroll'
const FARMER_ENROLL_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const FARMER_ENROLL_FIELDS: FieldDef[] = [
  { ...f('programId', 'Program', 'select', 'details', 1, true), optionSource: 'programs' },
  {
    ...f('cohortId', 'Cohort (Optional)', 'select', 'details', 2),
    optionSource: 'cohorts', dependsOn: 'programId',
    visibleWhen: { field: 'programId', filled: true },
  },
]

export const DEFAULT_FORMS: FormDef[] = [
  { id: FARMER_REGISTRATION_FORM_ID, name: 'Farmer Registration', page: 'Registry', steps: FARMER_REGISTRATION_STEPS, fields: FARMER_REGISTRATION_FIELDS },
  { id: PROGRAM_FORM_ID, name: 'Program', page: 'Programs', steps: PROGRAM_STEPS, fields: PROGRAM_FIELDS },
  { id: COHORT_FORM_ID, name: 'Cohort', page: 'Programs', steps: COHORT_STEPS, fields: COHORT_FIELDS },
  { id: GOVERNANCE_OFFICER_FORM_ID, name: 'Officer', page: 'Governance', steps: GOVERNANCE_OFFICER_STEPS, fields: GOVERNANCE_OFFICER_FIELDS },
  { id: GOVERNANCE_MEETING_FORM_ID, name: 'Meeting', page: 'Governance', steps: GOVERNANCE_MEETING_STEPS, fields: GOVERNANCE_MEETING_FIELDS },
  { id: GOVERNANCE_RESOLUTION_FORM_ID, name: 'Resolution', page: 'Governance', steps: GOVERNANCE_RESOLUTION_STEPS, fields: GOVERNANCE_RESOLUTION_FIELDS },
  { id: GOVERNANCE_FUND_FORM_ID, name: 'Fund Transaction', page: 'Governance', steps: GOVERNANCE_FUND_STEPS, fields: GOVERNANCE_FUND_FIELDS },
  { id: GOVERNANCE_DOCUMENT_FORM_ID, name: 'Document', page: 'Governance', steps: GOVERNANCE_DOCUMENT_STEPS, fields: GOVERNANCE_DOCUMENT_FIELDS },
  { id: GOVERNANCE_TRACEABILITY_FORM_ID, name: 'Traceability', page: 'Governance', steps: GOVERNANCE_TRACEABILITY_STEPS, fields: GOVERNANCE_TRACEABILITY_FIELDS },
  { id: CHECKIN_BASELINE_FORM_ID, name: 'Baseline Activity', page: 'Configuration', steps: CHECKIN_BASELINE_STEPS, fields: CHECKIN_BASELINE_FIELDS },
  { id: CHECKIN_LIST_FORM_ID, name: 'Check-in List', page: 'Configuration', steps: CHECKIN_LIST_STEPS, fields: CHECKIN_LIST_FIELDS },
  { id: TRAINING_SESSION_FORM_ID, name: 'Session', page: 'Configuration', steps: TRAINING_SESSION_STEPS, fields: TRAINING_SESSION_FIELDS },
  { id: SURVEY_SCHEDULE_FORM_ID, name: 'Survey Schedule', page: 'Configuration', steps: SCHEDULE_STEPS, fields: SURVEY_SCHEDULE_FIELDS },
  { id: ADVISORY_SCHEDULE_FORM_ID, name: 'Advisory Schedule', page: 'Configuration', steps: SCHEDULE_STEPS, fields: ADVISORY_SCHEDULE_FIELDS },
  { id: CHECKIN_SCHEDULE_FORM_ID, name: 'Cohort Schedule', page: 'Configuration', steps: SCHEDULE_STEPS, fields: CHECKIN_SCHEDULE_FIELDS },
  { id: SURVEY_TEMPLATE_FORM_ID, name: 'Survey Template', page: 'Configuration', steps: TEMPLATE_STEPS, fields: SURVEY_TEMPLATE_FIELDS },
  { id: ADVISORY_TEMPLATE_FORM_ID, name: 'Advisory Template', page: 'Configuration', steps: TEMPLATE_STEPS, fields: ADVISORY_TEMPLATE_FIELDS },
  { id: AGENT_FORM_ID, name: 'Agent', page: 'Programs', steps: AGENT_STEPS, fields: AGENT_FIELDS },
  { id: COMMUNITY_FORM_ID, name: 'Community', page: 'Governance', steps: COMMUNITY_STEPS, fields: COMMUNITY_FIELDS },
  { id: COOPERATIVE_FORM_ID, name: 'Cooperative', page: 'Governance', steps: COOPERATIVE_STEPS, fields: COOPERATIVE_FIELDS },
  { id: INTERVENTION_FORM_ID, name: 'Intervention', page: 'Opportunities', steps: INTERVENTION_STEPS, fields: INTERVENTION_FIELDS },
  { id: PLATFORM_USER_FORM_ID, name: 'User', page: 'Configuration', steps: PLATFORM_USER_STEPS, fields: PLATFORM_USER_FIELDS },
  { id: TENANT_FORM_ID, name: 'Tenant', page: 'Configuration', steps: TENANT_STEPS, fields: TENANT_FIELDS },
  { id: PARTNER_FORM_ID, name: 'Partner', page: 'Programs', steps: PARTNER_STEPS, fields: PARTNER_FIELDS },
  { id: GOVERNANCE_CERTIFICATION_FORM_ID, name: 'Certification', page: 'Governance', steps: GOVERNANCE_CERTIFICATION_STEPS, fields: GOVERNANCE_CERTIFICATION_FIELDS },
  { id: GOVERNANCE_FBO_FORM_ID, name: 'FBO Registration', page: 'Governance', steps: GOVERNANCE_FBO_STEPS, fields: GOVERNANCE_FBO_FIELDS },
  { id: GOVERNANCE_LBC_FORM_ID, name: 'LBC License', page: 'Governance', steps: GOVERNANCE_LBC_STEPS, fields: GOVERNANCE_LBC_FIELDS },
  { id: TRAINING_BUNDLE_FORM_ID, name: 'Bundle', page: 'Configuration', steps: TRAINING_BUNDLE_STEPS, fields: TRAINING_BUNDLE_FIELDS },
  { id: TRAINING_WEEK_FORM_ID, name: 'Week', page: 'Configuration', steps: TRAINING_WEEK_STEPS, fields: TRAINING_WEEK_FIELDS },
  { id: FARMER_ASSIGN_AGENT_FORM_ID, name: 'Assign Agent', page: 'Registry', steps: FARMER_ASSIGN_AGENT_STEPS, fields: FARMER_ASSIGN_AGENT_FIELDS },
  { id: FARMER_ENROLL_FORM_ID, name: 'Enroll Farmers', page: 'Registry', steps: FARMER_ENROLL_STEPS, fields: FARMER_ENROLL_FIELDS },
  { id: PM_FARMER_EDIT_FORM_ID, name: 'Edit Farmer', page: 'Registry', steps: PM_FARMER_EDIT_STEPS, fields: PM_FARMER_EDIT_FIELDS },
]
