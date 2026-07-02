/*
  # Intelligence Dashboard RPC Functions
*/

CREATE OR REPLACE FUNCTION get_portfolio_farmers(
  p_program_id uuid DEFAULT NULL,
  p_cohort_id  uuid DEFAULT NULL
)
RETURNS TABLE (
  farmer_id uuid, full_name text, phone text, community text, district text,
  region_code text, primary_crop text, total_farm_size_ha numeric, is_verified boolean,
  asinyo_id text, gender text, program_id uuid, program_name text, cohort_id uuid,
  cohort_name text, enrollment_id uuid, enrollment_status text, enrolled_at timestamptz,
  latest_score_id uuid, total_score numeric, p1_score numeric, p2_score numeric,
  p3_score numeric, p4_score numeric, eci_score numeric, credit_score integer,
  zone text, score_status text, is_provisional boolean, season_average numeric,
  week_number integer, baseline_score numeric, baseline_zone text,
  active_flag_count bigint, high_flag_count bigint, weeks_final bigint, weeks_provisional bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role    text := (SELECT role FROM users WHERE id = auth.uid());
  v_org_id  uuid := (SELECT organisation_id FROM users WHERE id = auth.uid());
BEGIN
  RETURN QUERY
  WITH accessible_enrollments AS (
    SELECT e.id AS enrollment_id, e.farmer_id, e.program_id, e.cohort_id, e.status, e.enrolled_at
    FROM enrollments e
    WHERE e.status = 'active'
      AND (p_program_id IS NULL OR e.program_id = p_program_id)
      AND (p_cohort_id  IS NULL OR e.cohort_id  = p_cohort_id)
      AND CASE
        WHEN v_role = 'partner' THEN EXISTS (SELECT 1 FROM portfolio_assignments pa WHERE pa.user_id = auth.uid() AND pa.program_id = e.program_id)
        ELSE EXISTS (SELECT 1 FROM programs pr WHERE pr.id = e.program_id AND pr.organisation_id = v_org_id)
      END
  ),
  latest_scores AS (
    SELECT DISTINCT ON (s.farmer_id)
      s.id, s.farmer_id, s.total_score, s.p1_score, s.p2_score, s.p3_score,
      s.p4_score, s.eci_score, s.credit_score, s.zone, s.score_status,
      s.is_provisional, s.season_average, s.week_number
    FROM farmer_fri_scores s
    JOIN accessible_enrollments ae ON ae.farmer_id = s.farmer_id
    WHERE s.week_number > 0
    ORDER BY s.farmer_id, s.week_number DESC
  ),
  baseline_scores AS (
    SELECT DISTINCT ON (s.farmer_id) s.farmer_id, s.total_score AS bscore, s.zone AS bzone
    FROM farmer_fri_scores s
    JOIN accessible_enrollments ae ON ae.farmer_id = s.farmer_id
    WHERE s.week_number = 0
    ORDER BY s.farmer_id, s.created_at DESC
  ),
  flag_counts AS (
    SELECT rf.farmer_id,
      COUNT(*) FILTER (WHERE rf.is_resolved = false) AS active_flags,
      COUNT(*) FILTER (WHERE rf.is_resolved = false AND rf.severity = 'high') AS high_flags
    FROM risk_flags rf JOIN accessible_enrollments ae ON ae.farmer_id = rf.farmer_id
    GROUP BY rf.farmer_id
  ),
  week_counts AS (
    SELECT wc.farmer_id,
      COUNT(*) FILTER (WHERE wc.status = 'approved')  AS wfinal,
      COUNT(*) FILTER (WHERE wc.status = 'submitted') AS wprov
    FROM weekly_checkins wc JOIN accessible_enrollments ae ON ae.farmer_id = wc.farmer_id
    GROUP BY wc.farmer_id
  )
  SELECT
    f.id, f.full_name, f.phone, f.community, f.district, f.region_code,
    f.primary_crop, f.total_farm_size_ha, f.is_verified,
    COALESCE(f.national_id, 'ASY-' || UPPER(SUBSTRING(f.id::text, 1, 8))) AS asinyo_id,
    f.gender,
    ae.program_id, pr.name AS program_name, ae.cohort_id, co.name AS cohort_name,
    ae.enrollment_id, ae.status, ae.enrolled_at,
    ls.id, COALESCE(ls.total_score, 0), COALESCE(ls.p1_score, 0), COALESCE(ls.p2_score, 0),
    COALESCE(ls.p3_score, 0), COALESCE(ls.p4_score, 0), COALESCE(ls.eci_score, 0),
    ls.credit_score, ls.zone, ls.score_status, COALESCE(ls.is_provisional, true),
    ls.season_average, COALESCE(ls.week_number, 0), bs.bscore, bs.bzone,
    COALESCE(fc.active_flags, 0), COALESCE(fc.high_flags, 0),
    COALESCE(wk.wfinal, 0), COALESCE(wk.wprov, 0)
  FROM accessible_enrollments ae
  JOIN farmers f ON f.id = ae.farmer_id
  JOIN programs pr ON pr.id = ae.program_id
  LEFT JOIN cohorts co ON co.id = ae.cohort_id
  LEFT JOIN latest_scores ls ON ls.farmer_id = f.id
  LEFT JOIN baseline_scores bs ON bs.farmer_id = f.id
  LEFT JOIN flag_counts fc ON fc.farmer_id = f.id
  LEFT JOIN week_counts wk ON wk.farmer_id = f.id
  ORDER BY CASE ls.zone WHEN 'Resilience Starter' THEN 1 WHEN 'Resilience Learner' THEN 2 WHEN 'Resilience Builder' THEN 3 WHEN 'Resilience Leader' THEN 4 ELSE 5 END, COALESCE(ls.total_score, 0) ASC;
END;
$$;

CREATE OR REPLACE FUNCTION get_zone_distribution(p_program_id uuid DEFAULT NULL, p_cohort_id uuid DEFAULT NULL)
RETURNS TABLE (zone text, farmer_count bigint, avg_fri numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH rows AS (SELECT pf.zone, pf.total_score FROM get_portfolio_farmers(p_program_id, p_cohort_id) pf WHERE pf.zone IS NOT NULL)
  SELECT r.zone, COUNT(*), ROUND(AVG(r.total_score), 1) FROM rows r GROUP BY r.zone
  ORDER BY CASE r.zone WHEN 'Resilience Leader' THEN 1 WHEN 'Resilience Builder' THEN 2 WHEN 'Resilience Learner' THEN 3 WHEN 'Resilience Starter' THEN 4 ELSE 5 END;
END;
$$;

CREATE OR REPLACE FUNCTION get_trajectory_distribution(p_program_id uuid DEFAULT NULL, p_cohort_id uuid DEFAULT NULL)
RETURNS TABLE (trajectory text, farmer_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH rows AS (SELECT pf.total_score, pf.baseline_score, pf.zone FROM get_portfolio_farmers(p_program_id, p_cohort_id) pf),
  labelled AS (SELECT CASE WHEN r.baseline_score IS NULL THEN 'No Baseline' WHEN r.zone = 'Resilience Starter' OR r.total_score <= r.baseline_score - 15 THEN 'At Risk' WHEN r.total_score >= r.baseline_score + 5 THEN 'Improving' WHEN r.total_score <= r.baseline_score - 5 THEN 'Declining' ELSE 'Stable' END AS traj FROM rows r)
  SELECT l.traj, COUNT(*) FROM labelled l GROUP BY l.traj
  ORDER BY CASE l.traj WHEN 'Improving' THEN 1 WHEN 'Stable' THEN 2 WHEN 'Declining' THEN 3 WHEN 'At Risk' THEN 4 WHEN 'No Baseline' THEN 5 ELSE 6 END;
END;
$$;

CREATE OR REPLACE FUNCTION get_portfolio_kpis(p_program_id uuid DEFAULT NULL, p_cohort_id uuid DEFAULT NULL)
RETURNS TABLE (enrolled_count bigint, avg_fri numeric, verification_rate numeric, opportunity_ready bigint, final_count bigint, provisional_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH rows AS (SELECT pf.total_score, pf.is_provisional, pf.weeks_final, pf.weeks_provisional, pf.credit_score FROM get_portfolio_farmers(p_program_id, p_cohort_id) pf)
  SELECT COUNT(*)::bigint, ROUND(AVG(r.total_score), 1),
    CASE WHEN SUM(r.weeks_final + r.weeks_provisional) > 0 THEN ROUND(SUM(r.weeks_final)::numeric / SUM(r.weeks_final + r.weeks_provisional) * 100, 1) ELSE 0 END,
    COUNT(*) FILTER (WHERE r.credit_score IS NOT NULL AND r.credit_score >= 500),
    COUNT(*) FILTER (WHERE r.is_provisional = false),
    COUNT(*) FILTER (WHERE r.is_provisional = true)
  FROM rows r;
END;
$$;

CREATE OR REPLACE FUNCTION get_cohort_fri_trend(p_cohort_id uuid, p_program_id uuid DEFAULT NULL)
RETURNS TABLE (week_number integer, avg_fri_final numeric, avg_fri_provisional numeric, verified_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role   text := (SELECT role FROM users WHERE id = auth.uid());
  v_org_id uuid := (SELECT organisation_id FROM users WHERE id = auth.uid());
BEGIN
  RETURN QUERY
  WITH enrolled AS (
    SELECT e.farmer_id FROM enrollments e
    WHERE (p_cohort_id IS NULL OR e.cohort_id = p_cohort_id)
      AND (p_program_id IS NULL OR e.program_id = p_program_id)
      AND e.status = 'active'
      AND CASE WHEN v_role = 'partner' THEN EXISTS (SELECT 1 FROM portfolio_assignments pa WHERE pa.user_id = auth.uid() AND pa.program_id = e.program_id) ELSE EXISTS (SELECT 1 FROM programs pr WHERE pr.id = e.program_id AND pr.organisation_id = v_org_id) END
  )
  SELECT s.week_number,
    ROUND(AVG(s.total_score) FILTER (WHERE s.is_provisional = false), 1),
    ROUND(AVG(s.total_score) FILTER (WHERE s.is_provisional = true),  1),
    COUNT(*) FILTER (WHERE s.is_provisional = false)
  FROM farmer_fri_scores s JOIN enrolled en ON en.farmer_id = s.farmer_id
  WHERE s.week_number BETWEEN 1 AND 12
  GROUP BY s.week_number ORDER BY s.week_number;
END;
$$;

CREATE OR REPLACE FUNCTION get_zone_migration(p_program_id uuid DEFAULT NULL, p_cohort_id uuid DEFAULT NULL)
RETURNS TABLE (from_zone text, to_zone text, farmer_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(pf.baseline_zone, 'No Baseline') AS from_zone, COALESCE(pf.zone, 'No Score') AS to_zone, COUNT(*)
  FROM get_portfolio_farmers(p_program_id, p_cohort_id) pf
  WHERE pf.baseline_zone IS NOT NULL AND pf.zone IS NOT NULL
  GROUP BY pf.baseline_zone, pf.zone;
END;
$$;

CREATE OR REPLACE FUNCTION get_intervention_uptake(p_program_id uuid DEFAULT NULL)
RETURNS TABLE (intervention_id uuid, intervention_name text, intervention_type text, enrolled_count bigint, approved_count bigint, delivered_count bigint, capacity integer, avg_fri numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id uuid := (SELECT organisation_id FROM users WHERE id = auth.uid());
BEGIN
  RETURN QUERY
  SELECT ic.id, ic.name, ic.type,
    COUNT(eo.id) FILTER (WHERE eo.status NOT IN ('withdrawn')),
    COUNT(eo.id) FILTER (WHERE eo.status = 'active'),
    COUNT(eo.id) FILTER (WHERE eo.status IN ('active','delivered')),
    ic.capacity, ROUND(AVG(s.total_score), 1)
  FROM interventions_catalog ic
  LEFT JOIN enrollments_opp eo ON eo.enrollment_id IN (SELECT e.id FROM enrollments e WHERE e.program_id = ic.program_id)
  LEFT JOIN farmer_fri_scores s ON s.farmer_id = eo.farmer_id AND s.week_number > 0
  WHERE (p_program_id IS NULL OR ic.program_id = p_program_id)
    AND EXISTS (SELECT 1 FROM programs pr WHERE pr.id = ic.program_id AND pr.organisation_id = v_org_id)
  GROUP BY ic.id, ic.name, ic.type, ic.capacity;
END;
$$;

CREATE OR REPLACE FUNCTION get_agent_verification_quality(p_program_id uuid DEFAULT NULL)
RETURNS TABLE (agent_id uuid, agent_name text, assigned_farmers bigint, checkins_verified bigint, total_checkins bigint, verification_rate numeric, final_count bigint, provisional_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id uuid := (SELECT organisation_id FROM users WHERE id = auth.uid());
BEGIN
  RETURN QUERY
  SELECT u.id, u.full_name,
    COUNT(DISTINCT e.farmer_id),
    COUNT(wc.id) FILTER (WHERE wc.status = 'approved'),
    COUNT(wc.id) FILTER (WHERE wc.status IN ('approved','submitted')),
    CASE WHEN COUNT(wc.id) FILTER (WHERE wc.status IN ('approved','submitted')) > 0
      THEN ROUND(COUNT(wc.id) FILTER (WHERE wc.status = 'approved')::numeric / COUNT(wc.id) FILTER (WHERE wc.status IN ('approved','submitted')) * 100, 1) ELSE 0 END,
    COUNT(wc.id) FILTER (WHERE wc.status = 'approved'),
    COUNT(wc.id) FILTER (WHERE wc.status = 'submitted')
  FROM enrollments e
  JOIN users u ON u.id = e.agent_id
  LEFT JOIN weekly_checkins wc ON wc.farmer_id = e.farmer_id
  WHERE e.status = 'active'
    AND (p_program_id IS NULL OR e.program_id = p_program_id)
    AND EXISTS (SELECT 1 FROM programs pr WHERE pr.id = e.program_id AND pr.organisation_id = v_org_id)
  GROUP BY u.id, u.full_name;
END;
$$;

CREATE OR REPLACE FUNCTION get_risk_by_geography(p_program_id uuid DEFAULT NULL, p_zone_filter text DEFAULT 'Resilience Starter')
RETURNS TABLE (community text, district text, farmer_count bigint, avg_fri numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT pf.community, pf.district, COUNT(*), ROUND(AVG(pf.total_score), 1)
  FROM get_portfolio_farmers(p_program_id, NULL) pf
  WHERE pf.zone = p_zone_filter
  GROUP BY pf.community, pf.district ORDER BY COUNT(*) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_portfolio_farmers(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_zone_distribution(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trajectory_distribution(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_portfolio_kpis(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cohort_fri_trend(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_zone_migration(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_intervention_uptake(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_verification_quality(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_risk_by_geography(uuid, text) TO authenticated;
