/*
  # RLS Policies: organisations, users, programs, cohorts
*/

-- organisations
CREATE POLICY "Admin and staff view their own org"
  ON organisations FOR SELECT TO authenticated
  USING (id = get_my_org_id());

CREATE POLICY "Admin can update their own org"
  ON organisations FOR UPDATE TO authenticated
  USING (id = get_my_org_id() AND get_my_role() = 'admin')
  WITH CHECK (id = get_my_org_id() AND get_my_role() = 'admin');

CREATE POLICY "Admin can insert organisations"
  ON organisations FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin');

-- users
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Staff and admin view users in their org"
  ON users FOR SELECT TO authenticated
  USING (organisation_id = get_my_org_id() AND is_admin_or_staff());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Admin can update any user in their org"
  ON users FOR UPDATE TO authenticated
  USING (organisation_id = get_my_org_id() AND get_my_role() = 'admin')
  WITH CHECK (organisation_id = get_my_org_id() AND get_my_role() = 'admin');

CREATE POLICY "Admin can insert users in their org"
  ON users FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_my_org_id() AND get_my_role() = 'admin');

-- programs
CREATE POLICY "Authenticated users view active programs in their org"
  ON programs FOR SELECT TO authenticated
  USING (organisation_id = get_my_org_id());

CREATE POLICY "Staff and admin can insert programs"
  ON programs FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_my_org_id() AND is_admin_or_staff());

CREATE POLICY "Staff and admin can update programs in their org"
  ON programs FOR UPDATE TO authenticated
  USING (organisation_id = get_my_org_id() AND is_admin_or_staff())
  WITH CHECK (organisation_id = get_my_org_id() AND is_admin_or_staff());

-- cohorts
CREATE POLICY "Users view cohorts in their org programs"
  ON cohorts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM programs WHERE programs.id = cohorts.program_id AND programs.organisation_id = get_my_org_id())
  );

CREATE POLICY "Staff and admin can insert cohorts"
  ON cohorts FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_or_staff()
    AND EXISTS (SELECT 1 FROM programs WHERE programs.id = program_id AND programs.organisation_id = get_my_org_id())
  );

CREATE POLICY "Staff and admin can update cohorts"
  ON cohorts FOR UPDATE TO authenticated
  USING (is_admin_or_staff() AND EXISTS (SELECT 1 FROM programs WHERE programs.id = cohorts.program_id AND programs.organisation_id = get_my_org_id()))
  WITH CHECK (is_admin_or_staff() AND EXISTS (SELECT 1 FROM programs WHERE programs.id = program_id AND programs.organisation_id = get_my_org_id()));

CREATE POLICY "Agents view their own cohort"
  ON cohorts FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Staff and admin can delete cohorts"
  ON cohorts FOR DELETE TO authenticated
  USING (is_admin_or_staff() AND EXISTS (SELECT 1 FROM programs WHERE programs.id = cohorts.program_id AND programs.organisation_id = get_my_org_id()));
