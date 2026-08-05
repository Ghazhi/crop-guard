/*
  # RLS Policies — farmers, farm_details, agents, partners
*/

-- ========================
-- farmers
-- ========================

CREATE POLICY "Farmers view their own record"
  ON farmers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Agents view farmers they enrolled"
  ON farmers FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'agent'
    AND EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.farmer_id = farmers.id
        AND enrollments.agent_id = auth.uid()
    )
  );

CREATE POLICY "Staff and admin view all farmers in their org"
  ON farmers FOR SELECT
  TO authenticated
  USING (
    organisation_id = get_my_org_id()
    AND is_admin_or_staff()
  );

CREATE POLICY "Agents can register new farmers"
  ON farmers FOR INSERT
  TO authenticated
  WITH CHECK (
    is_agent_or_above()
    AND organisation_id = get_my_org_id()
  );

CREATE POLICY "Agents can update farmers they enrolled"
  ON farmers FOR UPDATE
  TO authenticated
  USING (
    is_agent_or_above()
    AND organisation_id = get_my_org_id()
  )
  WITH CHECK (
    is_agent_or_above()
    AND organisation_id = get_my_org_id()
  );

-- ========================
-- farm_details
-- ========================

CREATE POLICY "Farmers view their own farm details"
  ON farm_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = farm_details.farmer_id
        AND farmers.user_id = auth.uid()
    )
  );

CREATE POLICY "Agents view farm details of their farmers"
  ON farm_details FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'agent'
    AND EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.farmer_id = farm_details.farmer_id
        AND enrollments.agent_id = auth.uid()
    )
  );

CREATE POLICY "Staff and admin view farm details in their org"
  ON farm_details FOR SELECT
  TO authenticated
  USING (
    is_admin_or_staff()
    AND EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = farm_details.farmer_id
        AND farmers.organisation_id = get_my_org_id()
    )
  );

CREATE POLICY "Agents can insert farm details"
  ON farm_details FOR INSERT
  TO authenticated
  WITH CHECK (
    is_agent_or_above()
    AND EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = farmer_id
        AND farmers.organisation_id = get_my_org_id()
    )
  );

CREATE POLICY "Agents can update farm details"
  ON farm_details FOR UPDATE
  TO authenticated
  USING (
    is_agent_or_above()
    AND EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = farm_details.farmer_id
        AND farmers.organisation_id = get_my_org_id()
    )
  )
  WITH CHECK (
    is_agent_or_above()
    AND EXISTS (
      SELECT 1 FROM farmers
      WHERE farmers.id = farmer_id
        AND farmers.organisation_id = get_my_org_id()
    )
  );

-- ========================
-- agents
-- ========================

CREATE POLICY "Agents view their own profile"
  ON agents FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Staff and admin view agents in their org"
  ON agents FOR SELECT
  TO authenticated
  USING (
    organisation_id = get_my_org_id()
    AND is_admin_or_staff()
  );

CREATE POLICY "Admin can insert agent profiles"
  ON agents FOR INSERT
  TO authenticated
  WITH CHECK (
    organisation_id = get_my_org_id()
    AND get_my_role() = 'admin'
  );

CREATE POLICY "Admin and staff can update agent profiles"
  ON agents FOR UPDATE
  TO authenticated
  USING (organisation_id = get_my_org_id() AND is_admin_or_staff())
  WITH CHECK (organisation_id = get_my_org_id() AND is_admin_or_staff());

-- ========================
-- partners
-- ========================

CREATE POLICY "Staff and admin view partners in their org"
  ON partners FOR SELECT
  TO authenticated
  USING (
    organisation_id = get_my_org_id()
    AND is_admin_or_staff()
  );

CREATE POLICY "Admin can manage partners"
  ON partners FOR INSERT
  TO authenticated
  WITH CHECK (organisation_id = get_my_org_id() AND get_my_role() = 'admin');

CREATE POLICY "Admin can update partners"
  ON partners FOR UPDATE
  TO authenticated
  USING (organisation_id = get_my_org_id() AND get_my_role() = 'admin')
  WITH CHECK (organisation_id = get_my_org_id() AND get_my_role() = 'admin');
