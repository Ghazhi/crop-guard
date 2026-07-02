/*
  # Interventions Catalog, Enrollment Workflow, Portfolio Assignments, farmer_fri_scores
*/

CREATE TABLE IF NOT EXISTS farmer_fri_scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id       uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  enrollment_id   uuid REFERENCES enrollments(id) ON DELETE SET NULL,
  checkin_id      uuid REFERENCES weekly_checkins(id) ON DELETE SET NULL,
  organisation_id uuid REFERENCES organisations(id) ON DELETE SET NULL,
  week_number     integer NOT NULL DEFAULT 0,
  total_score     numeric(6,2),
  p1_score        numeric(6,2),
  p2_score        numeric(6,2),
  p3_score        numeric(6,2),
  p4_score        numeric(6,2),
  eci_score       numeric(6,2),
  credit_score    integer,
  zone            text,
  score_status    text DEFAULT 'provisional',
  is_provisional  boolean DEFAULT true,
  season_average  numeric(6,2),
  baseline_score  numeric(6,2),
  recommendation  text,
  raw_responses   jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (farmer_id, week_number)
);

ALTER TABLE farmer_fri_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers select own scores"
  ON farmer_fri_scores FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

CREATE POLICY "Agents view FRI scores for their farmers"
  ON farmer_fri_scores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.farmer_id = farmer_fri_scores.farmer_id AND enrollments.agent_id = auth.uid()));

CREATE POLICY "Staff view org FRI scores"
  ON farmer_fri_scores FOR SELECT TO authenticated
  USING (is_admin_or_staff() AND (organisation_id = get_my_org_id() OR organisation_id IS NULL));

CREATE POLICY "Staff and admin read all org scores"
  ON farmer_fri_scores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('staff','admin') AND u.organisation_id = farmer_fri_scores.organisation_id));

CREATE POLICY "Agents can insert FRI scores"
  ON farmer_fri_scores FOR INSERT TO authenticated
  WITH CHECK (is_agent_or_above());

CREATE POLICY "Agents can update FRI scores"
  ON farmer_fri_scores FOR UPDATE TO authenticated
  USING (is_agent_or_above()) WITH CHECK (is_agent_or_above());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'farmer_fri_scores_farmer_week_unique') THEN
    ALTER TABLE farmer_fri_scores ADD CONSTRAINT farmer_fri_scores_farmer_week_unique UNIQUE (farmer_id, week_number);
  END IF;
END $$;

-- norvi_outputs: add extended columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='norvi_outputs' AND column_name='output_type') THEN ALTER TABLE norvi_outputs ADD COLUMN output_type text NOT NULL DEFAULT 'farmer_summary'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='norvi_outputs' AND column_name='enrollment_id') THEN ALTER TABLE norvi_outputs ADD COLUMN enrollment_id uuid REFERENCES enrollments(id); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='norvi_outputs' AND column_name='fri_score_id') THEN ALTER TABLE norvi_outputs ADD COLUMN fri_score_id uuid; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='norvi_outputs' AND column_name='week_number') THEN ALTER TABLE norvi_outputs ADD COLUMN week_number integer NOT NULL DEFAULT 1; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='norvi_outputs' AND column_name='is_provisional') THEN ALTER TABLE norvi_outputs ADD COLUMN is_provisional boolean NOT NULL DEFAULT false; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='norvi_outputs' AND column_name='content') THEN ALTER TABLE norvi_outputs ADD COLUMN content text NOT NULL DEFAULT ''; END IF;
END $$;

CREATE TABLE IF NOT EXISTS interventions_catalog (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id        uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  partner_id        uuid REFERENCES partners(id) ON DELETE SET NULL,
  name              text NOT NULL,
  type              text NOT NULL DEFAULT 'Input Loan',
  season            text NOT NULL DEFAULT '',
  description       text,
  value_description text NOT NULL DEFAULT '',
  min_fri           integer NOT NULL DEFAULT 0,
  eligibility_rules jsonb NOT NULL DEFAULT '[]',
  improvement_steps jsonb NOT NULL DEFAULT '[]',
  capacity          integer,
  status            text NOT NULL DEFAULT 'Draft',
  approval_workflow text NOT NULL DEFAULT 'Auto',
  created_by        uuid REFERENCES users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE interventions_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view interventions in their org"
  ON interventions_catalog FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM programs WHERE programs.id = interventions_catalog.program_id AND programs.organisation_id = get_my_org_id()));

CREATE POLICY "Authenticated users read active interventions"
  ON interventions_catalog FOR SELECT TO authenticated
  USING (status = 'Active');

CREATE POLICY "Staff and admin can insert interventions"
  ON interventions_catalog FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_staff() AND EXISTS (SELECT 1 FROM programs WHERE programs.id = program_id AND programs.organisation_id = get_my_org_id()));

CREATE POLICY "Staff and admin can update interventions"
  ON interventions_catalog FOR UPDATE TO authenticated
  USING (is_admin_or_staff()) WITH CHECK (is_admin_or_staff());

CREATE POLICY "Staff and admin can delete interventions"
  ON interventions_catalog FOR DELETE TO authenticated
  USING (is_admin_or_staff() AND EXISTS (SELECT 1 FROM programs WHERE programs.id = interventions_catalog.program_id AND programs.organisation_id = get_my_org_id()));

CREATE TABLE IF NOT EXISTS enrollment_workflow (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id),
  opp_id        uuid REFERENCES enrollments_opp(id),
  farmer_id     uuid NOT NULL REFERENCES farmers(id),
  stage         integer NOT NULL DEFAULT 1,
  stage_name    text NOT NULL DEFAULT 'Submitted',
  status        text NOT NULL DEFAULT 'pending',
  actor_id      uuid REFERENCES users(id),
  actor_role    text,
  notes         text,
  reason_code   text,
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE enrollment_workflow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers view their own workflow entries"
  ON enrollment_workflow FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

CREATE POLICY "Agents view workflow for their enrollments"
  ON enrollment_workflow FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.id = enrollment_workflow.enrollment_id AND enrollments.agent_id = auth.uid()));

CREATE POLICY "Staff view workflow in their org"
  ON enrollment_workflow FOR SELECT TO authenticated
  USING (is_admin_or_staff() AND EXISTS (SELECT 1 FROM enrollments JOIN programs ON programs.id = enrollments.program_id WHERE enrollments.id = enrollment_workflow.enrollment_id AND programs.organisation_id = get_my_org_id()));

CREATE POLICY "Agents and staff can insert workflow entries"
  ON enrollment_workflow FOR INSERT TO authenticated
  WITH CHECK (is_agent_or_above() AND EXISTS (SELECT 1 FROM enrollments JOIN programs ON programs.id = enrollments.program_id WHERE enrollments.id = enrollment_id AND programs.organisation_id = get_my_org_id()));

CREATE POLICY "Staff can update workflow entries"
  ON enrollment_workflow FOR UPDATE TO authenticated
  USING (is_admin_or_staff()) WITH CHECK (is_admin_or_staff());

CREATE TABLE IF NOT EXISTS portfolio_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id),
  program_id  uuid NOT NULL REFERENCES programs(id),
  cohort_id   uuid REFERENCES cohorts(id),
  granted_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_id)
);

ALTER TABLE portfolio_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own portfolio assignments"
  ON portfolio_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff view all portfolio assignments in their org"
  ON portfolio_assignments FOR SELECT TO authenticated
  USING (is_admin_or_staff() AND EXISTS (SELECT 1 FROM programs WHERE programs.id = portfolio_assignments.program_id AND programs.organisation_id = get_my_org_id()));

CREATE POLICY "Staff can manage portfolio assignments"
  ON portfolio_assignments FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_staff() AND EXISTS (SELECT 1 FROM programs WHERE programs.id = program_id AND programs.organisation_id = get_my_org_id()));

CREATE POLICY "Staff can delete portfolio assignments"
  ON portfolio_assignments FOR DELETE TO authenticated
  USING (is_admin_or_staff());

CREATE POLICY "Users read own assignments"
  ON portfolio_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Credit officer policy on farmers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='farmers' AND policyname='Credit officers view portfolio farmers') THEN
    CREATE POLICY "Credit officers view portfolio farmers"
      ON farmers FOR SELECT TO authenticated
      USING (get_my_role() = 'partner' AND EXISTS (SELECT 1 FROM enrollments JOIN portfolio_assignments pa ON pa.program_id = enrollments.program_id WHERE enrollments.farmer_id = farmers.id AND pa.user_id = auth.uid()));
  END IF;
END $$;

-- Partners read assigned portfolio scores
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='farmer_fri_scores' AND policyname='Partners read assigned portfolio scores') THEN
    CREATE POLICY "Partners read assigned portfolio scores"
      ON farmer_fri_scores FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'partner') AND EXISTS (SELECT 1 FROM enrollments e JOIN portfolio_assignments pa ON pa.program_id = e.program_id WHERE e.farmer_id = farmer_fri_scores.farmer_id AND pa.user_id = auth.uid()));
  END IF;
END $$;

-- updated_at triggers for new tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_interventions_catalog') THEN
    CREATE TRIGGER set_updated_at_interventions_catalog BEFORE UPDATE ON interventions_catalog FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_enrollment_workflow') THEN
    CREATE TRIGGER set_updated_at_enrollment_workflow BEFORE UPDATE ON enrollment_workflow FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_farmer_fri_scores') THEN
    CREATE TRIGGER set_updated_at_farmer_fri_scores BEFORE UPDATE ON farmer_fri_scores FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
END $$;
