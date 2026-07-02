// ── Shared types for Intelligence & Opportunity Dashboard ────────────────────

export type Trajectory = 'Improving' | 'Stable' | 'Declining' | 'At Risk' | 'No Baseline';
export type ScoreStatus = 'final' | 'provisional' | 'pending' | 'missed';
export type Recommendation = 'Approve' | 'Review' | 'Defer' | 'Decline';
export type FriZone = 'Resilience Leader' | 'Resilience Builder' | 'Resilience Learner' | 'Resilience Starter';
export type RiskBand = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface PortfolioFarmer {
  farmer_id:          string;
  full_name:          string;
  phone:              string;
  community:          string;
  district:           string;
  region_code:        string;
  primary_crop:       string;
  total_farm_size_ha: number;
  is_verified:        boolean;
  asinyo_id:          string;
  gender:             string;
  program_id:         string;
  program_name:       string;
  cohort_id:          string | null;
  cohort_name:        string | null;
  enrollment_id:      string;
  enrollment_status:  string;
  enrolled_at:        string;
  latest_score_id:    string | null;
  total_score:        number;
  p1_score:           number;
  p2_score:           number;
  p3_score:           number;
  p4_score:           number;
  eci_score:          number;
  credit_score:       number | null;
  zone:               FriZone | null;
  score_status:       string | null;
  is_provisional:     boolean;
  season_average:     number | null;
  week_number:        number;
  baseline_score:     number | null;
  baseline_zone:      FriZone | null;
  active_flag_count:  number;
  high_flag_count:    number;
  weeks_final:        number;
  weeks_provisional:  number;
  // derived
  trajectory?:        Trajectory;
  recommendation?:    Recommendation;
  risk_band?:         RiskBand;
}

export interface ZoneDistribution {
  zone:         string;
  farmer_count: number;
  avg_fri:      number;
}

export interface TrajectoryDistribution {
  trajectory:   string;
  farmer_count: number;
}

export interface PortfolioKPIs {
  enrolled_count:    number;
  avg_fri:           number;
  verification_rate: number;
  opportunity_ready: number;
  final_count:       number;
  provisional_count: number;
}

export interface CohortFriTrend {
  week_number:          number;
  avg_fri_final:        number | null;
  avg_fri_provisional:  number | null;
  verified_count:       number;
}

export interface ZoneMigration {
  from_zone:    string;
  to_zone:      string;
  farmer_count: number;
}

export interface InterventionUptake {
  intervention_id:   string;
  intervention_name: string;
  intervention_type: string;
  enrolled_count:    number;
  approved_count:    number;
  delivered_count:   number;
  capacity:          number | null;
  avg_fri:           number | null;
}

export interface AgentVerificationQuality {
  agent_id:          string;
  agent_name:        string;
  assigned_farmers:  number;
  checkins_verified: number;
  total_checkins:    number;
  verification_rate: number;
  final_count:       number;
  provisional_count: number;
}

export interface RiskByGeo {
  community:    string;
  district:     string;
  farmer_count: number;
  avg_fri:      number;
}

// ── Derived helpers ──────────────────────────────────────────────────────────

export function deriveTrajectory(f: PortfolioFarmer): Trajectory {
  if (f.baseline_score == null) return 'No Baseline';
  const delta = f.total_score - f.baseline_score;
  if (f.zone === 'Resilience Starter' || delta <= -15) return 'At Risk';
  if (delta >= 5)  return 'Improving';
  if (delta <= -5) return 'Declining';
  return 'Stable';
}

export function deriveRecommendation(f: PortfolioFarmer): Recommendation {
  const score = f.credit_score ?? 0;
  if (score >= 650) return 'Approve';
  if (score >= 550) return 'Review';
  if (score >= 450) return 'Defer';
  return 'Decline';
}

export function deriveRiskBand(f: PortfolioFarmer): RiskBand {
  const score = f.total_score;
  if (score >= 80) return 'Low';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'High';
  return 'Critical';
}

export function enrichFarmer(f: PortfolioFarmer): PortfolioFarmer {
  return {
    ...f,
    trajectory: deriveTrajectory(f),
    recommendation: deriveRecommendation(f),
    risk_band: deriveRiskBand(f),
  };
}

// Zone colour helpers
export const ZONE_COLORS: Record<string, string> = {
  'Resilience Leader':  '#10b981',
  'Resilience Builder': '#3b82f6',
  'Resilience Learner': '#f59e0b',
  'Resilience Starter': '#ef4444',
};

export const ZONE_BG: Record<string, string> = {
  'Resilience Leader':  'bg-emerald-100 text-emerald-800',
  'Resilience Builder': 'bg-blue-100 text-blue-800',
  'Resilience Learner': 'bg-amber-100 text-amber-800',
  'Resilience Starter': 'bg-red-100 text-red-800',
};

export const TRAJECTORY_COLORS: Record<string, string> = {
  'Improving':   '#10b981',
  'Stable':      '#3b82f6',
  'Declining':   '#f59e0b',
  'At Risk':     '#ef4444',
  'No Baseline': '#9ca3af',
};

export const RECOMMENDATION_COLORS: Record<string, string> = {
  'Approve':  'bg-emerald-100 text-emerald-800',
  'Review':   'bg-amber-100 text-amber-800',
  'Defer':    'bg-orange-100 text-orange-800',
  'Decline':  'bg-red-100 text-red-800',
};

export const RISK_BAND_COLORS: Record<string, string> = {
  'Low':      'bg-emerald-100 text-emerald-800',
  'Moderate': 'bg-blue-100 text-blue-800',
  'High':     'bg-amber-100 text-amber-800',
  'Critical': 'bg-red-100 text-red-800',
};
