/*
  # Fix infinite recursion in farmers RLS policies

  ## Root Cause
  Two policies form a recursive cycle when any SELECT is run against `farmers`:

  1. farmers SELECT "Credit officers view portfolio farmers"
     → queries `enrollments` table

  2. enrollments SELECT "Farmers view their own enrollments"
     → queries `farmers` table (EXISTS ... FROM farmers WHERE farmers.user_id = auth.uid())

  Postgres evaluates ALL SELECT policies on `farmers` for every query, including
  the credit-officer policy which touches `enrollments`. That triggers the
  enrollments policy which reads back into `farmers` → infinite recursion.

  ## Fix
  Introduce a SECURITY DEFINER helper `get_my_farmer_id()` that reads
  `farmers.id` bypassing RLS. Replace every policy subquery that does
  EXISTS(SELECT 1 FROM farmers WHERE farmers.user_id = auth.uid()) with a
  direct comparison `farmer_id = get_my_farmer_id()`. This eliminates all
  cross-table RLS re-entry into `farmers`.

  ## Tables affected
  enrollments, farmer_checkins, farmer_checkin_responses, checkins,
  weekly_checkins, checkin_activities, verifications, fri_scores,
  farmer_fri_scores, baseline_assessments, interventions, norvi_outputs,
  risk_flags, enrollment_workflow, farm_details, enrollments_opp
*/

-- Helper: resolve current user's farmer row without re-entering farmers RLS
CREATE OR REPLACE FUNCTION get_my_farmer_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM farmers WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ── enrollments ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Farmers view their own enrollments" ON enrollments;

CREATE POLICY "Farmers view their own enrollments"
  ON enrollments FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

-- ── farmer_checkins ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Farmers select own checkins" ON farmer_checkins;

CREATE POLICY "Farmers select own checkins"
  ON farmer_checkins FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

-- ── farmer_checkin_responses ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "Farmers select own responses" ON farmer_checkin_responses;

CREATE POLICY "Farmers select own responses"
  ON farmer_checkin_responses FOR SELECT TO authenticated
  USING (
    checkin_id IN (
      SELECT id FROM farmer_checkins WHERE farmer_id = get_my_farmer_id()
    )
  );

-- ── checkins ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Farmers select own enrollment checkins" ON checkins;

CREATE POLICY "Farmers select own enrollment checkins"
  ON checkins FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.id = checkins.enrollment_id
        AND e.farmer_id = get_my_farmer_id()
    )
  );

-- ── weekly_checkins ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Farmers view their own checkins" ON weekly_checkins;

CREATE POLICY "Farmers view their own checkins"
  ON weekly_checkins FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

-- ── checkin_activities ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Farmers view activities for their own checkins" ON checkin_activities;

CREATE POLICY "Farmers view activities for their own checkins"
  ON checkin_activities FOR SELECT TO authenticated
  USING (
    checkin_id IN (
      SELECT id FROM weekly_checkins WHERE farmer_id = get_my_farmer_id()
    )
  );

-- ── verifications ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Farmers view their own verifications" ON verifications;

CREATE POLICY "Farmers view their own verifications"
  ON verifications FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

-- ── fri_scores ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Farmers view their own FRI scores" ON fri_scores;

CREATE POLICY "Farmers view their own FRI scores"
  ON fri_scores FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

-- ── farmer_fri_scores ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Farmers view own FRI scores" ON farmer_fri_scores;

CREATE POLICY "Farmers view own FRI scores"
  ON farmer_fri_scores FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

-- ── baseline_assessments ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Farmers view their own baselines" ON baseline_assessments;

CREATE POLICY "Farmers view their own baselines"
  ON baseline_assessments FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

-- ── interventions ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Farmers view their own interventions" ON interventions;

CREATE POLICY "Farmers view their own interventions"
  ON interventions FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

-- ── norvi_outputs ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Farmers view own norvi outputs" ON norvi_outputs;

CREATE POLICY "Farmers view own norvi outputs"
  ON norvi_outputs FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

-- ── risk_flags ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Farmers view their own risk flags" ON risk_flags;

CREATE POLICY "Farmers view their own risk flags"
  ON risk_flags FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

-- ── enrollment_workflow ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Farmers view their own workflow entries" ON enrollment_workflow;

CREATE POLICY "Farmers view their own workflow entries"
  ON enrollment_workflow FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

-- ── farm_details ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Farmers view their own farm details" ON farm_details;

CREATE POLICY "Farmers view their own farm details"
  ON farm_details FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

-- ── enrollments_opp ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Farmers view their own opportunities" ON enrollments_opp;

CREATE POLICY "Farmers view their own opportunities"
  ON enrollments_opp FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());
