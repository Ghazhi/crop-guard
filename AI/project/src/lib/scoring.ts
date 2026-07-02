// FRI Scoring Engine — client-side preview.
// Authoritative score is computed server-side by the /score-fri edge function.
// Spec §5.1–5.8.

// ── Zone ─────────────────────────────────────────────────────────────────────
// §5.4 — four zones with exact score ranges

export type ZoneLabel  = 'Resilience Leader' | 'Resilience Builder' | 'Resilience Learner' | 'Resilience Starter';
export type ZoneCode   = 'Zone1' | 'Zone2' | 'Zone3' | 'Zone4';

export interface ZoneInfo {
  code:      ZoneCode;
  label:     ZoneLabel;
  riskTier:  string;
  range:     string;
  minScore:  number;
}

export const ZONES: ZoneInfo[] = [
  { code: 'Zone1', label: 'Resilience Leader',  riskTier: 'Low Risk',      range: '80–100', minScore: 80 },
  { code: 'Zone2', label: 'Resilience Builder', riskTier: 'Managed Risk',  range: '60–79',  minScore: 60 },
  { code: 'Zone3', label: 'Resilience Learner', riskTier: 'Elevated Risk', range: '40–59',  minScore: 40 },
  { code: 'Zone4', label: 'Resilience Starter', riskTier: 'Critical Risk', range: '0–39',   minScore: 0  },
];

export function assignZone(total: number): ZoneLabel {
  if (total >= 80) return 'Resilience Leader';
  if (total >= 60) return 'Resilience Builder';
  if (total >= 40) return 'Resilience Learner';
  return 'Resilience Starter';
}

export function assignZoneCode(total: number): ZoneCode {
  if (total >= 80) return 'Zone1';
  if (total >= 60) return 'Zone2';
  if (total >= 40) return 'Zone3';
  return 'Zone4';
}

export function getZoneInfo(total: number): ZoneInfo {
  return ZONES.find(z => total >= z.minScore)!;
}

export function zoneBg(zone: ZoneLabel): string {
  if (zone === 'Resilience Leader')  return 'bg-purple-100 text-purple-800';
  if (zone === 'Resilience Builder') return 'bg-green-100 text-green-800';
  if (zone === 'Resilience Learner') return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

export function zoneColor(zone: ZoneLabel): string {
  if (zone === 'Resilience Leader')  return 'text-purple-700';
  if (zone === 'Resilience Builder') return 'text-green-700';
  if (zone === 'Resilience Learner') return 'text-yellow-700';
  return 'text-red-700';
}

export function zoneHex(score: number): string {
  if (score >= 80) return '#7C3AED';
  if (score >= 60) return '#16a34a';
  if (score >= 40) return '#ca8a04';
  return '#dc2626';
}

// Short label for compact displays
export function zoneShortLabel(zone: ZoneLabel): string {
  if (zone === 'Resilience Leader')  return 'Leader';
  if (zone === 'Resilience Builder') return 'Builder';
  if (zone === 'Resilience Learner') return 'Learner';
  return 'Starter';
}

// ── Pillar weights ────────────────────────────────────────────────────────────
// §5.3 — P1=30%, P2=30%, P3=20%, P4=20%; max pillar scores reflect weights × 100

export const PILLAR_WEIGHTS = { P1: 0.30, P2: 0.30, P3: 0.20, P4: 0.20 } as const;
export const PILLAR_MAX = { P1: 30, P2: 30, P3: 20, P4: 20 } as const;

export const CREDIT_MIN = 300;
export const CREDIT_MAX = 850;

// ── Weekly activity items ────────────────────────────────────────────────────
// §5.3 — weekly check-in activities per pillar.
// Each activity is verified by agent: Yes+Verified=1.0, Partial+Verified=0.5, unverified=0.
// Score per pillar = (sum verified values / activity count) × pillar max score.

export interface WeeklyActivityDef {
  id:      string;
  pillar:  'p1' | 'p2' | 'p3' | 'p4';
  label:   string;
  desc:    string;
}

export const WEEKLY_ACTIVITIES: WeeklyActivityDef[] = [
  // P1 — Agronomy Readiness (5 activities)
  { id: 'farming_experience', pillar: 'p1', label: 'Farming Experience',  desc: 'Years of active farming this season' },
  { id: 'weed_management',    pillar: 'p1', label: 'Weed Management',     desc: 'Systematic weed control carried out this week' },
  { id: 'proper_planting',    pillar: 'p1', label: 'Proper Planting',     desc: 'Correct spacing and timely planting maintained' },
  { id: 'fertilizer_use',     pillar: 'p1', label: 'Fertilizer Use',      desc: 'Applied at correct rate, time, and method' },
  { id: 'pest_disease',       pillar: 'p1', label: 'Pest & Disease Control', desc: 'Active scouting and responsive management' },
  // P2 — CSA & Climate-Smart (5 activities)
  { id: 'mulching',           pillar: 'p2', label: 'Mulching',            desc: 'Mulch cover applied on majority of farm area' },
  { id: 'composting',         pillar: 'p2', label: 'Composting',          desc: 'Active compost pile or compost application' },
  { id: 'crop_rotation',      pillar: 'p2', label: 'Crop Rotation',       desc: 'Rotation or intercropping practiced this season' },
  { id: 'water_harvesting',   pillar: 'p2', label: 'Water Harvesting',    desc: 'Structures or practices to retain rainfall' },
  { id: 'conservation_till',  pillar: 'p2', label: 'Conservation Tillage', desc: 'Minimal soil disturbance, avoids burning' },
  // P3 — Advisory & Commitment (4 activities)
  { id: 'attends_training',   pillar: 'p3', label: 'Attends Training',    desc: 'Regular attendance at extension or GAP training' },
  { id: 'follows_agronomist', pillar: 'p3', label: 'Follows Agronomist',  desc: 'Can demonstrate application of advice given' },
  { id: 'cooperative_visits', pillar: 'p3', label: 'Cooperative Visits',  desc: 'Active attendance at cooperative meetings' },
  { id: 'cooperative_member', pillar: 'p3', label: 'Cooperative Membership', desc: 'Formally registered cooperative member' },
  // P4 — Farm Enterprise Discipline (4 activities)
  { id: 'repayment_history',  pillar: 'p4', label: 'Repayment History',   desc: 'No outstanding unpaid agricultural obligations' },
  { id: 'savings_habit',      pillar: 'p4', label: 'Savings Habit',       desc: 'Active savings account or consistent practice' },
  { id: 'additional_income',  pillar: 'p4', label: 'Additional Income',   desc: 'Secondary occupation or verified other income' },
  { id: 'offtaker_confirmed', pillar: 'p4', label: 'Offtaker Confirmed',  desc: 'Binary: confirmed offtaker arrangement' },
];

export const P1_ACTIVITIES = WEEKLY_ACTIVITIES.filter(a => a.pillar === 'p1');
export const P2_ACTIVITIES = WEEKLY_ACTIVITIES.filter(a => a.pillar === 'p2');
export const P3_ACTIVITIES = WEEKLY_ACTIVITIES.filter(a => a.pillar === 'p3');
export const P4_ACTIVITIES = WEEKLY_ACTIVITIES.filter(a => a.pillar === 'p4');

// ── Weekly activity score values §5.2 ────────────────────────────────────────
// Score is ONLY non-zero when agent has verified the response.
// farmerResponse: 'yes' | 'partial' | 'no'
// agentVerification: 'verified' | 'not_verified' | 'under_review'

export type FarmerResponse     = 'yes' | 'partial' | 'no';
export type AgentVerification  = 'verified' | 'not_verified' | 'under_review';

export function activityScoreValue(
  farmerResponse: FarmerResponse,
  agentVerification: AgentVerification,
): number {
  if (agentVerification !== 'verified') return 0;
  if (farmerResponse === 'yes')     return 1.0;
  if (farmerResponse === 'partial') return 0.5;
  return 0;
}

// ── Weekly pillar score calculation ─────────────────────────────────────────
// Score per pillar = (sum of activity scores / activity count) × pillar max
// Activities "under_review" are excluded from denominator (configurable; here defaulted to excluded).

export function calcWeeklyPillarScore(
  activities: WeeklyActivityDef[],
  farmerResponses: Record<string, FarmerResponse>,
  agentVerifications: Record<string, AgentVerification>,
  excludeUnderReview = true,
): number {
  const applicable = excludeUnderReview
    ? activities.filter(a => agentVerifications[a.id] !== 'under_review')
    : activities;

  if (applicable.length === 0) return 0;
  const pillar = activities[0].pillar.toUpperCase() as keyof typeof PILLAR_MAX;
  const max = PILLAR_MAX[pillar];
  const total = applicable.reduce((s, a) => s + activityScoreValue(
    farmerResponses[a.id] ?? 'no',
    agentVerifications[a.id] ?? 'not_verified',
  ), 0);
  return Math.round((total / applicable.length) * max);
}

export function calcWeeklyFRI(
  farmerResponses: Record<string, FarmerResponse>,
  agentVerifications: Record<string, AgentVerification>,
): { p1: number; p2: number; p3: number; p4: number; total: number } {
  const p1 = calcWeeklyPillarScore(P1_ACTIVITIES, farmerResponses, agentVerifications);
  const p2 = calcWeeklyPillarScore(P2_ACTIVITIES, farmerResponses, agentVerifications);
  const p3 = calcWeeklyPillarScore(P3_ACTIVITIES, farmerResponses, agentVerifications);
  const p4 = calcWeeklyPillarScore(P4_ACTIVITIES, farmerResponses, agentVerifications);
  const total = p1 + p2 + p3 + p4; // already weighted by pillar max
  return { p1, p2, p3, p4, total };
}

// ── Baseline sub-component item definitions §5.7 ─────────────────────────────
// Each item has an exact max score as per spec.

export interface BaselineItemDef {
  id:       string;
  pillar:   'p1' | 'p2' | 'p3' | 'p4';
  label:    string;
  max:      number;
  guidance: string;
}

export const BASELINE_P1_ITEMS: BaselineItemDef[] = [
  { id: 'farming_experience', pillar: 'p1', label: 'Farming Experience',  max: 6, guidance: '0–1yr=1, 4+yr=2, 7+yr=3, 10+yr=4, 15+yr=5, 20+yr=6' },
  { id: 'weed_management',    pillar: 'p1', label: 'Weed Management',     max: 6, guidance: 'Evidence of systematic weed control across current and prior season' },
  { id: 'proper_planting',    pillar: 'p1', label: 'Proper Planting',     max: 6, guidance: 'Correct spacing, timely planting, variety appropriate for season' },
  { id: 'fertilizer_use',     pillar: 'p1', label: 'Fertilizer Use',      max: 6, guidance: 'Applies fertilizer at correct rate, time, and method — evidence required' },
  { id: 'pest_disease',       pillar: 'p1', label: 'Pest & Disease Control', max: 6, guidance: 'Active scouting and responsive management, not reactive-only' },
];

export const BASELINE_P2_ITEMS: BaselineItemDef[] = [
  { id: 'mulching',          pillar: 'p2', label: 'Mulching',            max: 6, guidance: 'Evidence of mulch cover across majority of active farm area' },
  { id: 'composting',        pillar: 'p2', label: 'Composting',          max: 6, guidance: 'Active compost pile or evidence of compost application on farm' },
  { id: 'crop_rotation',     pillar: 'p2', label: 'Crop Rotation',       max: 6, guidance: 'Planned or practiced rotation across at least one prior season' },
  { id: 'water_harvesting',  pillar: 'p2', label: 'Water Harvesting',    max: 6, guidance: 'Physical structures or land management practices to retain rainfall' },
  { id: 'conservation_till', pillar: 'p2', label: 'Conservation Tillage', max: 6, guidance: 'Minimal soil disturbance, avoids burning, retains crop residue' },
];

export const BASELINE_P3_ITEMS: BaselineItemDef[] = [
  { id: 'attends_training',   pillar: 'p3', label: 'Attends Training',      max: 5, guidance: 'Regular attendance at extension or GAP training in prior season' },
  { id: 'follows_agronomist', pillar: 'p3', label: 'Follows Agronomist',    max: 5, guidance: 'Can name the advice received and demonstrate application on farm' },
  { id: 'cooperative_visits', pillar: 'p3', label: 'Cooperative Visits',    max: 5, guidance: 'Active attendance at cooperative meetings, not just membership' },
  { id: 'cooperative_member', pillar: 'p3', label: 'Cooperative Affiliation', max: 5, guidance: 'Formally registered member of a cooperative or farmer group' },
];

export const BASELINE_P4_ITEMS: BaselineItemDef[] = [
  { id: 'repayment_history',  pillar: 'p4', label: 'Repayment History',  max: 8, guidance: 'No outstanding unpaid agricultural obligations — agent verifies' },
  { id: 'savings_habit',      pillar: 'p4', label: 'Savings Habit',      max: 4, guidance: 'Active savings account or demonstrated consistent savings practice' },
  { id: 'additional_income',  pillar: 'p4', label: 'Additional Income',  max: 4, guidance: 'Secondary occupation or other verified income beyond primary crop' },
  { id: 'offtaker_confirmed', pillar: 'p4', label: 'Offtaker Confirmed', max: 4, guidance: 'Binary: confirmed offtaker arrangement = 4pts, none = 0pts' },
];

// P1 max = 5×6 = 30, P2 max = 5×6 = 30, P3 max = 4×5 = 20, P4 max = 8+4+4+4 = 20
export const BASELINE_PILLAR_MAX = { p1: 30, p2: 30, p3: 20, p4: 20 } as const;

// ── ECI items §5.8 ────────────────────────────────────────────────────────────
// 5 items × 8 pts each = 40 total

export interface EciItemDef {
  id:       string;
  label:    string;
  max:      number;
  guidance: string;
}

export const ECI_ITEMS: EciItemDef[] = [
  { id: 'income_debt',          label: 'Stable Income & Debt Burden',   max: 8, guidance: 'Has stable income and no unmanageable debt. Agent checks income sources and existing loan obligations.' },
  { id: 'financial_stability',  label: 'Moderate Financial Stability',  max: 8, guidance: 'Owns productive assets or maintains some savings. Agent observes household assets.' },
  { id: 'identity_eligibility', label: 'Identity & Eligibility',        max: 8, guidance: 'Identity confirmed with valid documentation. Farmer meets age, crop, location, acreage program criteria.' },
  { id: 'production_commitment',label: 'Production Commitment',         max: 8, guidance: 'Clear production plan: crop type, farm acreage, program participation confirmed by agent.' },
  { id: 'declaration_consent',  label: 'Declaration & Consent',         max: 8, guidance: 'Informed consent form signed or thumb-printed. Farmer understands data collection and use.' },
];

export const ECI_MAX = 40;

// ── Baseline FRI score calculation §5.7 ─────────────────────────────────────
// Each pillar: (sum of item scores / pillar max) × pillar weight × 100

export function calcBaselinePillarScore(
  responses: Record<string, number>,
  items: BaselineItemDef[],
  pillarMax: number,
): number {
  const actual = items.reduce((s, item) => s + Math.min(responses[item.id] ?? 0, item.max), 0);
  return Math.round((actual / pillarMax) * 100);
}

export function calcBaselineFRI(
  p1Responses: Record<string, number>,
  p2Responses: Record<string, number>,
  p3Responses: Record<string, number>,
  p4Responses: Record<string, number>,
): { p1: number; p2: number; p3: number; p4: number; total: number } {
  const p1 = calcBaselinePillarScore(p1Responses, BASELINE_P1_ITEMS, BASELINE_PILLAR_MAX.p1);
  const p2 = calcBaselinePillarScore(p2Responses, BASELINE_P2_ITEMS, BASELINE_PILLAR_MAX.p2);
  const p3 = calcBaselinePillarScore(p3Responses, BASELINE_P3_ITEMS, BASELINE_PILLAR_MAX.p3);
  const p4 = calcBaselinePillarScore(p4Responses, BASELINE_P4_ITEMS, BASELINE_PILLAR_MAX.p4);
  const total = Math.round(
    (p1 / 100) * PILLAR_MAX.P1 +
    (p2 / 100) * PILLAR_MAX.P2 +
    (p3 / 100) * PILLAR_MAX.P3 +
    (p4 / 100) * PILLAR_MAX.P4,
  );
  return { p1, p2, p3, p4, total };
}

// ── ECI normalisation and credit score §5.1 ──────────────────────────────────
// ECI_normalised = (ECI_raw / 40) × 100
// Credit Score = (0.60 × FRI) + (0.40 × ECI_normalised)
// Then mapped to 300–850 range.

export function normaliseECI(eciRaw: number): number {
  return Math.round((eciRaw / ECI_MAX) * 100);
}

export function calcECIRaw(responses: Record<string, number>): number {
  return ECI_ITEMS.reduce((s, item) => s + Math.min(responses[item.id] ?? 0, item.max), 0);
}

export function calcCreditScore(friTotal: number, eciRaw: number): number {
  const eciNorm = normaliseECI(eciRaw);
  const composite = friTotal * 0.60 + eciNorm * 0.40;
  return Math.round(CREDIT_MIN + (composite / 100) * (CREDIT_MAX - CREDIT_MIN));
}

// ── Season FRI §5.6 ──────────────────────────────────────────────────────────
// Only Final and Provisional weeks contribute. Missed/Pending excluded.

export type WeekStatus = 'Draft' | 'Submitted' | 'Verification Pending' | 'Provisional' | 'Final' | 'Missed';

export function calcSeasonFRI(
  weeks: { fri_total: number; status: WeekStatus }[],
): { currentFRI: number | null; status: 'Final' | 'Provisional' | null } {
  const contributing = weeks.filter(w => (w.status === 'Final' || w.status === 'Provisional') && w.fri_total !== null);
  if (contributing.length === 0) return { currentFRI: null, status: null };
  const avg = Math.round(contributing.reduce((s, w) => s + w.fri_total, 0) / contributing.length);
  const status = contributing.every(w => w.status === 'Final') ? 'Final' : 'Provisional';
  return { currentFRI: avg, status };
}

// ── Scoring preview (used in baseline wizard) ────────────────────────────────

export interface ScoringPreviewResult {
  p1_score:     number;
  p2_score:     number;
  p3_score:     number;
  p4_score:     number;
  eci_raw:      number;
  eci_score:    number;
  total_score:  number;
  zone:         ZoneLabel;
  credit_score: number;
}

export function runBaselineScoringPreview(inputs: {
  p1: Record<string, number>;
  p2: Record<string, number>;
  p3: Record<string, number>;
  p4: Record<string, number>;
  eci: Record<string, number>;
}): ScoringPreviewResult {
  const fri = calcBaselineFRI(inputs.p1, inputs.p2, inputs.p3, inputs.p4);
  const eciRaw = calcECIRaw(inputs.eci);
  return {
    p1_score:     fri.p1,
    p2_score:     fri.p2,
    p3_score:     fri.p3,
    p4_score:     fri.p4,
    eci_raw:      eciRaw,
    eci_score:    normaliseECI(eciRaw),
    total_score:  fri.total,
    zone:         assignZone(fri.total),
    credit_score: calcCreditScore(fri.total, eciRaw),
  };
}
