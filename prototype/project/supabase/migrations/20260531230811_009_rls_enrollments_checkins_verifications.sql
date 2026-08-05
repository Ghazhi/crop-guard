/*
  # RLS Policies: enrollments, enrollments_opp, weekly_checkins,
                  checkin_activities, verifications, verification_activities
*/

-- enrollments
CREATE POLICY "Farmers view their own enrollments"
  ON enrollments FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

CREATE POLICY "Agents view enrollments for org farmers"
  ON enrollments FOR SELECT TO authenticated
  USING (is_agent_or_above() AND EXISTS (SELECT 1 FROM programs WHERE programs.id = enrollments.program_id AND programs.organisation_id = get_my_org_id()));

CREATE POLICY "Staff and admin view all enrollments in their org programs"
  ON enrollments FOR SELECT TO authenticated
  USING (is_admin_or_staff() AND EXISTS (SELECT 1 FROM programs WHERE programs.id = enrollments.program_id AND programs.organisation_id = get_my_org_id()));

CREATE POLICY "Agents can enroll farmers"
  ON enrollments FOR INSERT TO authenticated
  WITH CHECK (is_agent_or_above() AND agent_id = auth.uid() AND EXISTS (SELECT 1 FROM programs WHERE programs.id = program_id AND programs.organisation_id = get_my_org_id()));

CREATE POLICY "Staff and admin can enroll farmers"
  ON enrollments FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_staff() AND EXISTS (SELECT 1 FROM programs WHERE programs.id = program_id AND programs.organisation_id = get_my_org_id()));

CREATE POLICY "Agents and staff can update enrollments"
  ON enrollments FOR UPDATE TO authenticated
  USING (is_agent_or_above() AND EXISTS (SELECT 1 FROM programs WHERE programs.id = enrollments.program_id AND programs.organisation_id = get_my_org_id()))
  WITH CHECK (is_agent_or_above() AND EXISTS (SELECT 1 FROM programs WHERE programs.id = program_id AND programs.organisation_id = get_my_org_id()));

CREATE POLICY "Staff and admin can delete enrollments"
  ON enrollments FOR DELETE TO authenticated
  USING (is_admin_or_staff() AND EXISTS (SELECT 1 FROM programs WHERE programs.id = enrollments.program_id AND programs.organisation_id = get_my_org_id()));

-- enrollments_opp
CREATE POLICY "Farmers view their own opportunities"
  ON enrollments_opp FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

CREATE POLICY "Agents view opps for their enrollments"
  ON enrollments_opp FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.id = enrollments_opp.enrollment_id AND enrollments.agent_id = auth.uid()));

CREATE POLICY "Staff and admin view all opps in their org"
  ON enrollments_opp FOR SELECT TO authenticated
  USING (is_admin_or_staff() AND EXISTS (SELECT 1 FROM enrollments JOIN programs ON programs.id = enrollments.program_id WHERE enrollments.id = enrollments_opp.enrollment_id AND programs.organisation_id = get_my_org_id()));

CREATE POLICY "Staff can create opportunities"
  ON enrollments_opp FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_staff() AND EXISTS (SELECT 1 FROM enrollments JOIN programs ON programs.id = enrollments.program_id WHERE enrollments.id = enrollment_id AND programs.organisation_id = get_my_org_id()));

CREATE POLICY "Staff can update opportunities"
  ON enrollments_opp FOR UPDATE TO authenticated
  USING (is_admin_or_staff() AND EXISTS (SELECT 1 FROM enrollments JOIN programs ON programs.id = enrollments.program_id WHERE enrollments.id = enrollments_opp.enrollment_id AND programs.organisation_id = get_my_org_id()))
  WITH CHECK (is_admin_or_staff() AND EXISTS (SELECT 1 FROM enrollments JOIN programs ON programs.id = enrollments.program_id WHERE enrollments.id = enrollment_id AND programs.organisation_id = get_my_org_id()));

CREATE POLICY "Farmers can submit applications for their own enrollments"
  ON enrollments_opp FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM farmers WHERE farmers.id = enrollments_opp.farmer_id AND farmers.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM enrollments WHERE enrollments.id = enrollments_opp.enrollment_id AND enrollments.farmer_id = enrollments_opp.farmer_id AND enrollments.status = 'active')
    AND enrollments_opp.status = 'submitted'
  );

-- weekly_checkins
CREATE POLICY "Farmers view their own checkins"
  ON weekly_checkins FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

CREATE POLICY "Agents view and manage their checkins"
  ON weekly_checkins FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Staff and admin view checkins in their org"
  ON weekly_checkins FOR SELECT TO authenticated
  USING (is_admin_or_staff() AND EXISTS (SELECT 1 FROM enrollments JOIN programs ON programs.id = enrollments.program_id WHERE enrollments.id = weekly_checkins.enrollment_id AND programs.organisation_id = get_my_org_id()));

CREATE POLICY "Agents can create checkins for their farmers"
  ON weekly_checkins FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid() AND is_agent_or_above());

CREATE POLICY "Agents can update their own checkins"
  ON weekly_checkins FOR UPDATE TO authenticated
  USING (agent_id = auth.uid()) WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Staff can approve checkins"
  ON weekly_checkins FOR UPDATE TO authenticated
  USING (is_admin_or_staff() AND EXISTS (SELECT 1 FROM enrollments JOIN programs ON programs.id = enrollments.program_id WHERE enrollments.id = weekly_checkins.enrollment_id AND programs.organisation_id = get_my_org_id()))
  WITH CHECK (is_admin_or_staff() AND EXISTS (SELECT 1 FROM enrollments JOIN programs ON programs.id = enrollments.program_id WHERE enrollments.id = enrollment_id AND programs.organisation_id = get_my_org_id()));

-- checkin_activities
CREATE POLICY "Agents view activities on their checkins"
  ON checkin_activities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM weekly_checkins WHERE weekly_checkins.id = checkin_activities.checkin_id AND weekly_checkins.agent_id = auth.uid()));

CREATE POLICY "Staff and admin view activities in their org"
  ON checkin_activities FOR SELECT TO authenticated
  USING (is_admin_or_staff() AND EXISTS (SELECT 1 FROM weekly_checkins JOIN enrollments ON enrollments.id = weekly_checkins.enrollment_id JOIN programs ON programs.id = enrollments.program_id WHERE weekly_checkins.id = checkin_activities.checkin_id AND programs.organisation_id = get_my_org_id()));

CREATE POLICY "Farmers view activities for their own checkins"
  ON checkin_activities FOR SELECT TO authenticated
  USING (checkin_id IN (SELECT id FROM weekly_checkins WHERE farmer_id = get_my_farmer_id()));

CREATE POLICY "Agents can add checkin activities"
  ON checkin_activities FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM weekly_checkins WHERE weekly_checkins.id = checkin_id AND weekly_checkins.agent_id = auth.uid()));

-- verifications
CREATE POLICY "Farmers view their own verifications"
  ON verifications FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

CREATE POLICY "Agents view and manage their verifications"
  ON verifications FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Staff and admin view verifications in their org"
  ON verifications FOR SELECT TO authenticated
  USING (is_admin_or_staff() AND EXISTS (SELECT 1 FROM farmers WHERE farmers.id = verifications.farmer_id AND farmers.organisation_id = get_my_org_id()));

CREATE POLICY "Agents can create verifications"
  ON verifications FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid() AND is_agent_or_above());

CREATE POLICY "Agents can update their verifications"
  ON verifications FOR UPDATE TO authenticated
  USING (agent_id = auth.uid()) WITH CHECK (agent_id = auth.uid());

-- verification_activities
CREATE POLICY "Agents view verif activities for their verifications"
  ON verification_activities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM verifications WHERE verifications.id = verification_activities.verification_id AND verifications.agent_id = auth.uid()));

CREATE POLICY "Staff view verif activities in their org"
  ON verification_activities FOR SELECT TO authenticated
  USING (is_admin_or_staff() AND EXISTS (SELECT 1 FROM verifications JOIN farmers ON farmers.id = verifications.farmer_id WHERE verifications.id = verification_activities.verification_id AND farmers.organisation_id = get_my_org_id()));

CREATE POLICY "Agents can insert verif activities"
  ON verification_activities FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM verifications WHERE verifications.id = verification_id AND verifications.agent_id = auth.uid()));
