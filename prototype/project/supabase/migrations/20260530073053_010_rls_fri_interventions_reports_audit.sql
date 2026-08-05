/*
  # RLS Policies — fri_scores, baseline_assessments, interventions,
                   field_reports, norvi_outputs, risk_flags, audit_logs
*/

-- ========================
-- fri_scores
-- ========================

CREATE POLICY "Farmers view their own FRI scores"
  ON fri_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = fri_scores.farmer_id
        AND farmers.user_id = auth.uid()
    )
  );

CREATE POLICY "Agents view FRI scores for their farmers"
  ON fri_scores FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'agent'
    AND EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.farmer_id = fri_scores.farmer_id
        AND enrollments.agent_id = auth.uid()
    )
  );

CREATE POLICY "Staff and admin view FRI scores in their org"
  ON fri_scores FOR SELECT
  TO authenticated
  USING (
    is_admin_or_staff()
    AND EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = fri_scores.farmer_id
        AND farmers.organisation_id = get_my_org_id()
    )
  );

CREATE POLICY "System and agents can insert FRI scores"
  ON fri_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    is_agent_or_above()
    AND EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = farmer_id
        AND farmers.organisation_id = get_my_org_id()
    )
  );

-- ========================
-- baseline_assessments
-- ========================

CREATE POLICY "Farmers view their own baselines"
  ON baseline_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = baseline_assessments.farmer_id
        AND farmers.user_id = auth.uid()
    )
  );

CREATE POLICY "Agents view baselines they created"
  ON baseline_assessments FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Staff view baselines in their org"
  ON baseline_assessments FOR SELECT
  TO authenticated
  USING (
    is_admin_or_staff()
    AND EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = baseline_assessments.farmer_id
        AND farmers.organisation_id = get_my_org_id()
    )
  );

CREATE POLICY "Agents can create baselines"
  ON baseline_assessments FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid() AND is_agent_or_above());

CREATE POLICY "Agents can update baselines they created"
  ON baseline_assessments FOR UPDATE
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- ========================
-- interventions
-- ========================

CREATE POLICY "Farmers view their own interventions"
  ON interventions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = interventions.farmer_id
        AND farmers.user_id = auth.uid()
    )
  );

CREATE POLICY "Agents view and manage their interventions"
  ON interventions FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Staff view interventions in their org"
  ON interventions FOR SELECT
  TO authenticated
  USING (
    is_admin_or_staff()
    AND EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = interventions.farmer_id
        AND farmers.organisation_id = get_my_org_id()
    )
  );

CREATE POLICY "Agents can create interventions"
  ON interventions FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid() AND is_agent_or_above());

CREATE POLICY "Agents can update their interventions"
  ON interventions FOR UPDATE
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- ========================
-- field_reports
-- ========================

CREATE POLICY "Agents view their own field reports"
  ON field_reports FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Staff view field reports in their org"
  ON field_reports FOR SELECT
  TO authenticated
  USING (
    is_admin_or_staff()
    AND EXISTS (
      SELECT 1 FROM programs
      WHERE programs.id = field_reports.program_id
        AND programs.organisation_id = get_my_org_id()
    )
  );

CREATE POLICY "Agents can create field reports"
  ON field_reports FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid() AND is_agent_or_above());

CREATE POLICY "Agents can update their draft reports"
  ON field_reports FOR UPDATE
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Staff can review reports"
  ON field_reports FOR UPDATE
  TO authenticated
  USING (
    is_admin_or_staff()
    AND EXISTS (
      SELECT 1 FROM programs
      WHERE programs.id = field_reports.program_id
        AND programs.organisation_id = get_my_org_id()
    )
  )
  WITH CHECK (
    is_admin_or_staff()
    AND EXISTS (
      SELECT 1 FROM programs
      WHERE programs.id = program_id
        AND programs.organisation_id = get_my_org_id()
    )
  );

-- ========================
-- norvi_outputs
-- ========================

CREATE POLICY "Agents view Norvi outputs for their farmers"
  ON norvi_outputs FOR SELECT
  TO authenticated
  USING (
    is_agent_or_above()
    AND EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.farmer_id = norvi_outputs.farmer_id
        AND enrollments.agent_id = auth.uid()
    )
  );

CREATE POLICY "Staff view Norvi outputs in their org"
  ON norvi_outputs FOR SELECT
  TO authenticated
  USING (
    is_admin_or_staff()
    AND EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = norvi_outputs.farmer_id
        AND farmers.organisation_id = get_my_org_id()
    )
  );

CREATE POLICY "Agents can insert Norvi outputs"
  ON norvi_outputs FOR INSERT
  TO authenticated
  WITH CHECK (
    is_agent_or_above()
    AND EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = farmer_id
        AND farmers.organisation_id = get_my_org_id()
    )
  );

-- ========================
-- risk_flags
-- ========================

CREATE POLICY "Farmers view their own risk flags"
  ON risk_flags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = risk_flags.farmer_id
        AND farmers.user_id = auth.uid()
    )
  );

CREATE POLICY "Agents view risk flags for their farmers"
  ON risk_flags FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'agent'
    AND EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.farmer_id = risk_flags.farmer_id
        AND enrollments.agent_id = auth.uid()
    )
  );

CREATE POLICY "Staff view all risk flags in their org"
  ON risk_flags FOR SELECT
  TO authenticated
  USING (
    is_admin_or_staff()
    AND EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = risk_flags.farmer_id
        AND farmers.organisation_id = get_my_org_id()
    )
  );

CREATE POLICY "System and agents can insert risk flags"
  ON risk_flags FOR INSERT
  TO authenticated
  WITH CHECK (
    is_agent_or_above()
    AND EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = farmer_id
        AND farmers.organisation_id = get_my_org_id()
    )
  );

CREATE POLICY "Staff can resolve risk flags"
  ON risk_flags FOR UPDATE
  TO authenticated
  USING (
    is_admin_or_staff()
    AND EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = risk_flags.farmer_id
        AND farmers.organisation_id = get_my_org_id()
    )
  )
  WITH CHECK (
    is_admin_or_staff()
    AND EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = risk_flags.farmer_id
        AND farmers.organisation_id = get_my_org_id()
    )
  );

-- ========================
-- audit_logs (SELECT only — append-only table)
-- ========================

CREATE POLICY "Admin can read audit logs for their org"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = audit_logs.actor_id
        AND users.organisation_id = get_my_org_id()
    )
  );

CREATE POLICY "Anyone can insert their own audit log"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());
