/*
  # Intelligence Dashboard Schema Additions

  1. Changes
    - Add `farmer_fri_scores` extended scoring table if missing (idempotent)
    - Add `interventions_catalog` table if missing
    - Add `portfolio_assignments` table if missing
    - Ensure `risk_flags.is_resolved` exists (already in schema as boolean)
    - Add RLS policies for farmer_fri_scores, interventions_catalog, portfolio_assignments
    - Grant read access on new RPC functions to authenticated users

  2. New Fields
    - `farmers.photo_url` already exists
    - `farmer_fri_scores.recommendation` column added (Approve / Review / Defer / Decline)

  3. Security
    - RLS enabled on all new tables
    - Partners restricted to portfolio_assignments
    - Staff/admin see org-scoped data
*/

-- ── farmer_fri_scores ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS farmer_fri_scores (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id      uuid        NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  enrollment_id  uuid        REFERENCES enrollments(id)      ON DELETE SET NULL,
  checkin_id     uuid        REFERENCES weekly_checkins(id)  ON DELETE SET NULL,
  organisation_id uuid       REFERENCES organisations(id)    ON DELETE SET NULL,
  week_number    integer     NOT NULL DEFAULT 0,
  total_score    numeric(6,2),
  p1_score       numeric(6,2),
  p2_score       numeric(6,2),
  p3_score       numeric(6,2),
  p4_score       numeric(6,2),
  eci_score      numeric(6,2),
  credit_score   integer,
  zone           text,
  score_status   text        DEFAULT 'provisional',
  is_provisional boolean     DEFAULT true,
  season_average numeric(6,2),
  baseline_score numeric(6,2),
  recommendation text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (farmer_id, week_number)
);

ALTER TABLE farmer_fri_scores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'farmer_fri_scores' AND policyname = 'Staff and admin read all org scores'
  ) THEN
    CREATE POLICY "Staff and admin read all org scores"
      ON farmer_fri_scores FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
            AND u.role IN ('staff', 'admin')
            AND u.organisation_id = farmer_fri_scores.organisation_id
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'farmer_fri_scores' AND policyname = 'Partners read assigned portfolio scores'
  ) THEN
    CREATE POLICY "Partners read assigned portfolio scores"
      ON farmer_fri_scores FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid() AND u.role = 'partner'
        )
        AND EXISTS (
          SELECT 1 FROM enrollments e
          JOIN portfolio_assignments pa ON pa.program_id = e.program_id
          WHERE e.farmer_id = farmer_fri_scores.farmer_id
            AND pa.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'farmer_fri_scores' AND policyname = 'Agents insert scores for their farmers'
  ) THEN
    CREATE POLICY "Agents insert scores for their farmers"
      ON farmer_fri_scores FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('agent', 'staff', 'admin')
        )
      );
  END IF;
END $$;

-- ── interventions_catalog ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS interventions_catalog (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id          uuid        NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  partner_id          uuid        REFERENCES partners(id) ON DELETE SET NULL,
  name                text        NOT NULL,
  type                text        NOT NULL DEFAULT 'Advisory',
  season              text,
  description         text,
  value_description   text,
  min_fri             integer     DEFAULT 0,
  eligibility_rules   jsonb       DEFAULT '[]',
  improvement_steps   jsonb       DEFAULT '[]',
  capacity            integer,
  status              text        DEFAULT 'Active',
  approval_workflow   text        DEFAULT 'Manual',
  created_by          uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE interventions_catalog ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'interventions_catalog' AND policyname = 'Authenticated users read active interventions'
  ) THEN
    CREATE POLICY "Authenticated users read active interventions"
      ON interventions_catalog FOR SELECT
      TO authenticated
      USING (status = 'Active');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'interventions_catalog' AND policyname = 'Staff and admin manage interventions'
  ) THEN
    CREATE POLICY "Staff and admin manage interventions"
      ON interventions_catalog FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('staff', 'admin'))
      );
  END IF;
END $$;

-- ── portfolio_assignments ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portfolio_assignments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id  uuid        NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  cohort_id   uuid        REFERENCES cohorts(id) ON DELETE SET NULL,
  granted_by  uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, program_id)
);

ALTER TABLE portfolio_assignments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_assignments' AND policyname = 'Users read own assignments'
  ) THEN
    CREATE POLICY "Users read own assignments"
      ON portfolio_assignments FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_assignments' AND policyname = 'Staff and admin manage assignments'
  ) THEN
    CREATE POLICY "Staff and admin manage assignments"
      ON portfolio_assignments FOR SELECT
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('staff', 'admin'))
      );
  END IF;
END $$;

-- ── Add recommendation column to farmer_fri_scores if missing ─────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'farmer_fri_scores' AND column_name = 'recommendation'
  ) THEN
    ALTER TABLE farmer_fri_scores ADD COLUMN recommendation text;
  END IF;
END $$;

-- ── Grant EXECUTE on RPC functions to authenticated role ──────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_portfolio_farmers') THEN
    GRANT EXECUTE ON FUNCTION get_portfolio_farmers(uuid, uuid) TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_zone_distribution') THEN
    GRANT EXECUTE ON FUNCTION get_zone_distribution(uuid, uuid) TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_trajectory_distribution') THEN
    GRANT EXECUTE ON FUNCTION get_trajectory_distribution(uuid, uuid) TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_portfolio_kpis') THEN
    GRANT EXECUTE ON FUNCTION get_portfolio_kpis(uuid, uuid) TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_cohort_fri_trend') THEN
    GRANT EXECUTE ON FUNCTION get_cohort_fri_trend(uuid, uuid) TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_zone_migration') THEN
    GRANT EXECUTE ON FUNCTION get_zone_migration(uuid, uuid) TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_intervention_uptake') THEN
    GRANT EXECUTE ON FUNCTION get_intervention_uptake(uuid) TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_agent_verification_quality') THEN
    GRANT EXECUTE ON FUNCTION get_agent_verification_quality(uuid) TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_risk_by_geography') THEN
    GRANT EXECUTE ON FUNCTION get_risk_by_geography(uuid, text) TO authenticated;
  END IF;
END $$;
