// Data fetching for Climate Exposure & Risk Quadrant tabs.
// Fetches real cohort, enrollment, farmer, and FRI score data from Supabase.

import { supabase } from '@/lib/supabase';
import {
  computeExposureScore, computeQuadrant, computeDisplayedLabel, generateExplanation,
  QUADRANT_INFO, type CohortExposureInputs, type ExposureResult, type QuadrantKey,
} from '@/lib/exposure';
import { assignZone, type ZoneLabel } from '@/lib/scoring';

export interface CohortWithExposure {
  id: string;
  name: string;
  crop: string;
  community: string;
  regionCode: string;
  district: string;
  programId: string;
  programName: string;
  farmerCount: number;
  inputs: CohortExposureInputs;
  exposure: ExposureResult;
}

export interface FarmerWithQuadrant {
  id: string;
  name: string;
  cohortId: string;
  cohortName: string;
  crop: string;
  community: string;
  communityId: string | null;
  cooperativeId: string | null;
  cooperativeName: string;
  programId: string;
  programName: string;
  friScore: number;
  friZone: ZoneLabel;
  exposureScore: number;
  exposureTier: ExposureResult['tier'];
  quadrant: QuadrantKey;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
}

export interface FilterOptions {
  programs: { id: string; name: string }[];
  cohorts: { id: string; name: string; programId: string }[];
  cooperatives: { id: string; name: string }[];
  communities: { id: string; name: string; district: string }[];
}

export interface ExposureFilters {
  programId: string | null;
  cohortId: string | null;
  cooperativeId: string | null;
  communityId: string | null;
}

export interface ExposureDashboardData {
  cohorts: CohortWithExposure[];
  farmers: FarmerWithQuadrant[];
  filterOptions: FilterOptions;
  loading: boolean;
  error: string | null;
}

export async function fetchExposureDashboardData(
  organisationId: string,
  filters: ExposureFilters = { programId: null, cohortId: null, cooperativeId: null, communityId: null },
): Promise<ExposureDashboardData> {
  const empty: FilterOptions = { programs: [], cohorts: [], cooperatives: [], communities: [] };

  // 1. Fetch programs for this organisation
  const { data: programData } = await supabase
    .from('programs')
    .select('id, name')
    .eq('organisation_id', organisationId)
    .order('name');

  const allPrograms = (programData ?? []).map((p: any) => ({ id: p.id, name: p.name }));
  if (allPrograms.length === 0) {
    return { cohorts: [], farmers: [], filterOptions: empty, loading: false, error: null };
  }

  // 2. Fetch cohorts for these programs
  let cohortQuery = supabase
    .from('cohorts')
    .select('id, name, region_code, region, district, program_id')
    .in('program_id', allPrograms.map(p => p.id))
    .order('name');

  if (filters.programId) {
    cohortQuery = cohortQuery.eq('program_id', filters.programId);
  }
  if (filters.cohortId) {
    cohortQuery = cohortQuery.eq('id', filters.cohortId);
  }

  const { data: cohortData } = await cohortQuery;
  const cohorts = cohortData ?? [];
  if (cohorts.length === 0) {
    // Still return filter options
    const { data: coopData } = await supabase.from('cooperatives').select('id, name').eq('organisation_id', organisationId).order('name');
    const { data: commData } = await supabase.from('communities').select('id, name, district').eq('organisation_id', organisationId).order('name');
    return {
      cohorts: [],
      farmers: [],
      filterOptions: { programs: allPrograms, cohorts: [], cooperatives: coopData ?? [], communities: commData ?? [] },
      loading: false,
      error: null,
    };
  }

  const cohortIds = cohorts.map(c => c.id);

  // 3. Fetch exposure inputs for these cohorts
  const { data: exposureInputs } = await supabase
    .from('cohort_exposure_inputs')
    .select('*')
    .in('cohort_id', cohortIds);

  // 4. Fetch enrollments to get farmer-cohort mapping and farmer counts
  const { data: enrollmentData } = await supabase
    .from('enrollments')
    .select('id, farmer_id, cohort_id, status')
    .in('cohort_id', cohortIds)
    .eq('status', 'active');

  // 5. Fetch farmers that are enrolled
  const enrolledFarmerIds = [...new Set((enrollmentData ?? []).map(e => e.farmer_id))];
  let farmerData: any[] = [];
  if (enrolledFarmerIds.length > 0) {
    const { data: fData } = await supabase
      .from('farmers')
      .select('id, full_name, primary_crop, community, community_id, cooperative_id, current_fri_score')
      .in('id', enrolledFarmerIds)
      .order('full_name');
    farmerData = fData ?? [];
  }

  // Apply cooperative and community filters on farmers
  if (filters.cooperativeId) {
    farmerData = farmerData.filter(f => f.cooperative_id === filters.cooperativeId);
  }
  if (filters.communityId) {
    farmerData = farmerData.filter(f => f.community_id === filters.communityId);
  }

  // 6. Fetch FRI scores for these farmers (latest per farmer)
  let friScores: Record<string, { total: number; p1: number; p2: number; p3: number; p4: number; zone: string }> = {};
  const filteredFarmerIds = farmerData.map(f => f.id);
  if (filteredFarmerIds.length > 0) {
    const { data: scoreData } = await supabase
      .from('farmer_fri_scores')
      .select('farmer_id, total_score, p1_score, p2_score, p3_score, p4_score, zone, week_number, score_status')
      .in('farmer_id', filteredFarmerIds)
      .order('week_number', { ascending: false });

    const seen = new Set<string>();
    (scoreData ?? []).forEach((s: any) => {
      if (!seen.has(s.farmer_id)) {
        seen.add(s.farmer_id);
        friScores[s.farmer_id] = {
          total: Number(s.total_score) || 0,
          p1: Number(s.p1_score) || 0,
          p2: Number(s.p2_score) || 0,
          p3: Number(s.p3_score) || 0,
          p4: Number(s.p4_score) || 0,
          zone: s.zone || 'Resilience Starter',
        };
      }
    });
  }

  // 7. Fetch filter option lists (cooperatives, communities)
  const [coopResult, commResult] = await Promise.all([
    supabase.from('cooperatives').select('id, name').eq('organisation_id', organisationId).order('name'),
    supabase.from('communities').select('id, name, district').eq('organisation_id', organisationId).order('name'),
  ]);

  // Build exposure inputs map
  const exposureMap: Record<string, CohortExposureInputs> = {};
  (exposureInputs ?? []).forEach((e: any) => {
    exposureMap[e.cohort_id] = {
      hazard_classification: e.hazard_classification,
      actual_rainfall: Number(e.actual_rainfall) || 0,
      historical_avg_rainfall: Number(e.historical_avg_rainfall) || 0,
      critical_alert_count: e.critical_alert_count || 0,
      high_alert_count: e.high_alert_count || 0,
      medium_alert_count: e.medium_alert_count || 0,
      in_critical_growth_stage: e.in_critical_growth_stage ?? false,
      forecast_stress_flag: e.forecast_stress_flag ?? false,
    };
  });

  // Build enrollment map: farmer_id -> cohort_id
  const farmerCohortMap: Record<string, string> = {};
  const cohortFarmerCount: Record<string, number> = {};
  (enrollmentData ?? []).forEach(e => {
    farmerCohortMap[e.farmer_id] = e.cohort_id;
    cohortFarmerCount[e.cohort_id] = (cohortFarmerCount[e.cohort_id] ?? 0) + 1;
  });

  // Build program name map
  const programMap: Record<string, string> = {};
  allPrograms.forEach(p => { programMap[p.id] = p.name; });

  // Build cooperative name map
  const cooperativeMap: Record<string, string> = {};
  (coopResult.data ?? []).forEach((c: any) => { cooperativeMap[c.id] = c.name; });

  // Build cohort list with exposure
  const cohortList: CohortWithExposure[] = cohorts.map((c: any) => {
    const inputs = exposureMap[c.id] ?? {
      hazard_classification: 'Moderate' as const,
      actual_rainfall: 0,
      historical_avg_rainfall: 0,
      critical_alert_count: 0,
      high_alert_count: 0,
      medium_alert_count: 0,
      in_critical_growth_stage: false,
      forecast_stress_flag: false,
    };
    return {
      id: c.id,
      name: c.name,
      crop: '',
      community: c.district,
      regionCode: c.region_code,
      district: c.district,
      programId: c.program_id,
      programName: programMap[c.program_id] ?? '',
      farmerCount: cohortFarmerCount[c.id] ?? 0,
      inputs,
      exposure: computeExposureScore(inputs),
    };
  });

  // Build farmer list with quadrant
  const farmerList: FarmerWithQuadrant[] = farmerData.map((f: any) => {
    const cohortId = farmerCohortMap[f.id] ?? '';
    const cohort = cohortList.find(c => c.id === cohortId);
    const exposureScore = cohort?.exposure.score ?? 0;
    const exposureTier = cohort?.exposure.tier ?? 'Low';
    const friScore = friScores[f.id]?.total ?? f.current_fri_score ?? 0;
    const friZone = (friScores[f.id]?.zone as ZoneLabel) ?? assignZone(friScore);
    const p1 = friScores[f.id]?.p1 ?? 0;
    const p2 = friScores[f.id]?.p2 ?? 0;
    const p3 = friScores[f.id]?.p3 ?? 0;
    const p4 = friScores[f.id]?.p4 ?? 0;
    return {
      id: f.id,
      name: f.full_name,
      cohortId,
      cohortName: cohort?.name ?? 'Unassigned',
      crop: f.primary_crop ?? '',
      community: f.community ?? '',
      communityId: f.community_id ?? null,
      cooperativeId: f.cooperative_id ?? null,
      cooperativeName: cooperativeMap[f.cooperative_id ?? ''] ?? '',
      programId: cohort?.programId ?? '',
      programName: cohort?.programName ?? '',
      friScore,
      friZone,
      exposureScore,
      exposureTier,
      quadrant: computeQuadrant(friScore, exposureScore),
      p1, p2, p3, p4,
    };
  });

  return {
    cohorts: cohortList,
    farmers: farmerList,
    filterOptions: {
      programs: allPrograms,
      cohorts: cohorts.map((c: any) => ({ id: c.id, name: c.name, programId: c.program_id })),
      cooperatives: coopResult.data ?? [],
      communities: commResult.data ?? [],
    },
    loading: false,
    error: null,
  };
}

// ── Single-farmer climate risk position ──────────────────────────────────────

export interface FarmerClimateRisk {
  friScore: number;
  friZone: ZoneLabel;
  exposureScore: number;
  exposureTier: ExposureResult['tier'];
  exposureComponents: ExposureResult['components'];
  quadrant: QuadrantKey;
  quadrantLabel: string;
  quadrantShortLabel: string;
  quadrantColor: string;
  displayedLabel: string;
  recommendation: string;
  explanation: string;
  cohortName: string;
}

/**
 * Fetches a single farmer's climate risk position by combining their latest
 * FRI score with their cohort's exposure inputs. Returns null when the farmer
 * has no active enrollment or the cohort has no exposure data.
 */
export async function fetchFarmerClimateRisk(farmerId: string): Promise<FarmerClimateRisk | null> {
  // 1. Find the farmer's active enrollment → cohort
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('cohort_id')
    .eq('farmer_id', farmerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!enrollment?.cohort_id) return null;

  // 2. Fetch cohort name
  const { data: cohort } = await supabase
    .from('cohorts')
    .select('name')
    .eq('id', enrollment.cohort_id)
    .maybeSingle();

  // 3. Fetch cohort exposure inputs
  const { data: exposureRow } = await supabase
    .from('cohort_exposure_inputs')
    .select('*')
    .eq('cohort_id', enrollment.cohort_id)
    .maybeSingle();

  if (!exposureRow) return null;

  const inputs: CohortExposureInputs = {
    hazard_classification: exposureRow.hazard_classification,
    actual_rainfall: Number(exposureRow.actual_rainfall) || 0,
    historical_avg_rainfall: Number(exposureRow.historical_avg_rainfall) || 0,
    critical_alert_count: exposureRow.critical_alert_count || 0,
    high_alert_count: exposureRow.high_alert_count || 0,
    medium_alert_count: exposureRow.medium_alert_count || 0,
    in_critical_growth_stage: exposureRow.in_critical_growth_stage ?? false,
    forecast_stress_flag: exposureRow.forecast_stress_flag ?? false,
  };

  const exposure = computeExposureScore(inputs);

  // 4. Fetch farmer's latest FRI score
  const { data: scoreRow } = await supabase
    .from('farmer_fri_scores')
    .select('total_score')
    .eq('farmer_id', farmerId)
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const friScore = scoreRow ? Number(scoreRow.total_score) || 0 : 0;
  const friZone = assignZone(friScore);

  const quadrant = computeQuadrant(friScore, exposure.score);
  const qi = QUADRANT_INFO[quadrant];

  return {
    friScore,
    friZone,
    exposureScore: exposure.score,
    exposureTier: exposure.tier,
    exposureComponents: exposure.components,
    quadrant,
    quadrantLabel: qi.axisLabel,
    quadrantShortLabel: qi.shortLabel,
    quadrantColor: qi.color,
    displayedLabel: computeDisplayedLabel(friZone, exposure.tier),
    recommendation: qi.recommendation,
    explanation: generateExplanation(friZone, exposure.tier, quadrant),
    cohortName: cohort?.name ?? 'Unknown Cohort',
  };
}
