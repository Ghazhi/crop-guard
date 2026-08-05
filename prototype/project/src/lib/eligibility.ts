// Eligibility rule evaluator.
// Rules are loaded from the eligibility_rules DB table and evaluated
// against a farmer's current FRI facts.

import { supabase } from '@/lib/supabase';

// ── Supported operators ──────────────────────────────────────────────────────

export type RuleOperator = '>=' | '<=' | '==' | '!=';

// ── FarmerFacts — all fields that rules can test ─────────────────────────────

export interface FarmerFacts {
  farmer_id:        string;
  total_score:      number;
  season_average:   number | null;
  zone:             string;
  credit_score:     number | null;
  p1_score:         number;
  p2_score:         number;
  p3_score:         number;
  p4_score:         number;
  eci_score:        number;
  enrollment_weeks: number;
  total_area_ha:    number | null;
  irrigation:       boolean;
  gender:           string | null;
}

// ── Rule definition (mirrors DB row) ─────────────────────────────────────────

export interface EligibilityRule {
  id:               string;
  program_id:       string | null;
  name:             string;
  description:      string | null;
  field:            string;
  operator:         RuleOperator;
  value:            number;
  benefit_label:    string;
  benefit_amount:   number | null;
  benefit_currency: string;
  is_active:        boolean;
}

// ── Per-rule result ──────────────────────────────────────────────────────────

export interface RuleResult {
  rule:              EligibilityRule;
  eligible:          boolean;
  current_value:     number | null;
  gap:               number | null;
  improvement_steps: string[];
}

// ── Field accessor ────────────────────────────────────────────────────────────

function resolveField(facts: FarmerFacts, field: string): number | null {
  const val = (facts as unknown as Record<string, unknown>)[field];
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  return null;
}

// ── Rule evaluator ───────────────────────────────────────────────────────────

export function evalRule(currentValue: number | null, operator: RuleOperator, threshold: number): boolean {
  if (currentValue === null) return false;
  switch (operator) {
    case '>=': return currentValue >= threshold;
    case '<=': return currentValue <= threshold;
    case '==': return currentValue === threshold;
    case '!=': return currentValue !== threshold;
    default:   return false;
  }
}

// ── Improvement steps by field ────────────────────────────────────────────────

const IMPROVEMENT_HINTS: Record<string, string[]> = {
  total_score: [
    'Complete all weekly check-ins on time to maintain your score.',
    'Improve your weakest pillar (Farm Management, Climate, Economic, or Welfare).',
    'Request an agent visit to get personalised coaching.',
  ],
  p1_score: [
    'Apply recommended inputs at the correct rates and timing.',
    'Keep detailed farm records (planting dates, inputs used).',
    'Practice crop rotation or intercropping to improve soil health.',
  ],
  p2_score: [
    'Use drought-tolerant varieties recommended for your region.',
    'Construct simple water-harvesting structures (zai pits, half-moons).',
    'Monitor weather forecasts and adjust farm activities accordingly.',
  ],
  p3_score: [
    'Open a savings account and save at least 10% of farm income.',
    'Join a farmer cooperative or FBO for group input purchasing.',
    'Explore available crop insurance products in your programme.',
  ],
  p4_score: [
    'Diversify household food sources with a kitchen garden.',
    'Ensure all school-age children are enrolled and attending regularly.',
    'Access nearest health facility for routine check-ups.',
  ],
  credit_score: [
    'Maintain a good loan repayment record.',
    'Keep check-in data accurate and consistent with field observations.',
    'Achieve Green zone FRI to unlock higher credit tiers.',
  ],
};

function getImprovementSteps(field: string, eligible: boolean, gap: number | null): string[] {
  if (eligible) return [];
  const hints = IMPROVEMENT_HINTS[field] ?? IMPROVEMENT_HINTS['total_score'];
  return gap !== null && gap > 20 ? hints : hints.slice(0, 2);
}

// ── Evaluate a single rule ───────────────────────────────────────────────────

export function evaluateRule(rule: EligibilityRule, facts: FarmerFacts): RuleResult {
  const currentValue = resolveField(facts, rule.field);
  const eligible     = evalRule(currentValue, rule.operator, rule.value);
  const gap = !eligible && currentValue !== null
    ? Math.max(0, rule.operator === '>=' ? rule.value - currentValue : currentValue - rule.value)
    : null;

  return {
    rule,
    eligible,
    current_value:     currentValue,
    gap,
    improvement_steps: getImprovementSteps(rule.field, eligible, gap),
  };
}

// ── Evaluate all active rules for a farmer ───────────────────────────────────

export async function evaluateAllRules(facts: FarmerFacts): Promise<RuleResult[]> {
  const { data } = await (supabase.from('eligibility_rules') as any).select('*').eq('is_active', true);
  const rules = (data ?? []) as EligibilityRule[];
  return rules.map(r => evaluateRule(r, facts));
}

// ── Build FarmerFacts from DB for a given farmer_id ──────────────────────────

export async function buildFarmerFacts(farmerId: string): Promise<FarmerFacts | null> {
  const [{ data: farmerRaw }, { data: farmRaw }, { data: enrollRaw }, { data: scoreRaw }] = await Promise.all([
    supabase.from('farmers').select('id,gender').eq('id', farmerId).maybeSingle(),
    supabase.from('farm_details').select('total_area_ha,irrigation').eq('farmer_id', farmerId).maybeSingle(),
    supabase.from('enrollments').select('id,enrolled_at').eq('farmer_id', farmerId).eq('status', 'active').limit(1),
    (supabase.from('farmer_fri_scores') as any)
      .select('total_score,p1_score,p2_score,p3_score,p4_score,eci_score,credit_score,season_average,zone')
      .eq('farmer_id', farmerId)
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!farmerRaw) return null;

  const farmer   = farmerRaw as { id: string; gender: string | null };
  const farm     = farmRaw as { total_area_ha: number | null; irrigation: boolean } | null;
  const enrList  = (enrollRaw ?? []) as { id: string; enrolled_at: string }[];
  const enr      = enrList[0] ?? null;
  const score    = scoreRaw as {
    total_score: number; p1_score: number; p2_score: number;
    p3_score: number; p4_score: number; eci_score: number;
    credit_score: number | null; season_average: number | null; zone: string;
  } | null;

  let enrollmentWeeks = 0;
  if (enr) {
    const ms = Date.now() - new Date(enr.enrolled_at).getTime();
    enrollmentWeeks = Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
  }

  return {
    farmer_id:        farmer.id,
    total_score:      score?.total_score      ?? 0,
    season_average:   score?.season_average   ?? null,
    zone:             score?.zone             ?? 'Resilience Starter',
    credit_score:     score?.credit_score     ?? null,
    p1_score:         score?.p1_score         ?? 0,
    p2_score:         score?.p2_score         ?? 0,
    p3_score:         score?.p3_score         ?? 0,
    p4_score:         score?.p4_score         ?? 0,
    eci_score:        score?.eci_score        ?? 0,
    enrollment_weeks: enrollmentWeeks,
    total_area_ha:    farm?.total_area_ha     ?? null,
    irrigation:       farm?.irrigation        ?? false,
    gender:           farmer.gender,
  };
}
