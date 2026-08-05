/*
# Fix RLS policies on custom_roles & custom_role_permissions

## Root cause
The CRUD policies on `custom_roles` and `custom_role_permissions` checked
`FROM profiles` — but user records (and the `role` column the app reads) live in
the `users` table. `profiles` has zero rows with role staff/super_admin, so
every insert/update/delete was blocked with "new row violates row-level
security policy", and role creation silently failed.

## Fix
Replace `profiles` with `users` in both policies so the ownership check
matches the table the application actually uses.
*/

-- ── custom_roles ─────────────────────────────────────────
DROP POLICY IF EXISTS "staff_crud_custom_roles" ON custom_roles;
DROP POLICY IF EXISTS "super_admin_crud_custom_roles" ON custom_roles;

CREATE POLICY "staff_crud_custom_roles"
  ON custom_roles FOR ALL
  TO authenticated
  USING ( EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.role IN ('staff', 'super_admin')
  ))
  WITH CHECK ( EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.role IN ('staff', 'super_admin')
  ));

-- ── custom_role_permissions ──────────────────────────────
DROP POLICY IF EXISTS "staff_crud_role_permissions" ON custom_role_permissions;
DROP POLICY IF EXISTS "super_admin_crud_role_permissions" ON custom_role_permissions;

CREATE POLICY "staff_crud_role_permissions"
  ON custom_role_permissions FOR ALL
  TO authenticated
  USING ( EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.role IN ('staff', 'super_admin')
  ))
  WITH CHECK ( EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.role IN ('staff', 'super_admin')
  ));
