-- Fix: include 'admin' role in CRUD policies for custom_roles and custom_role_permissions
-- (User Management page is accessible to admin, staff, and super_admin)

DROP POLICY IF EXISTS staff_crud_custom_roles ON custom_roles;
DROP POLICY IF EXISTS staff_crud_role_permissions ON custom_role_permissions;

CREATE POLICY staff_crud_custom_roles ON custom_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = ANY (ARRAY['admin'::user_role, 'staff'::user_role, 'super_admin'::user_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = ANY (ARRAY['admin'::user_role, 'staff'::user_role, 'super_admin'::user_role])
    )
  );

CREATE POLICY staff_crud_role_permissions ON custom_role_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = ANY (ARRAY['admin'::user_role, 'staff'::user_role, 'super_admin'::user_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = ANY (ARRAY['admin'::user_role, 'staff'::user_role, 'super_admin'::user_role])
    )
  );
