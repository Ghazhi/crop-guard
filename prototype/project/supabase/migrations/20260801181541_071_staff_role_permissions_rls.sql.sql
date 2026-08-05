/*
# Allow Staff Role to Manage Custom Roles & Permissions

## Purpose
The user requested that roles and permissions across the platform should be
managed dynamically by only the Staff user (in addition to super_admin).
This migration updates the RLS policies on `custom_roles` and
`custom_role_permissions` to allow both `staff` and `super_admin` roles to
perform CRUD operations, while keeping read access for all authenticated users.

## Changes
1. `custom_roles` — drop the super_admin-only CRUD policy and replace with
   one that allows both `staff` and `super_admin`.
2. `custom_role_permissions` — same replacement.

## Security
- CRUD on both tables is restricted to `staff` and `super_admin` roles.
- All authenticated users retain read-only access.
*/

-- ── custom_roles ─────────────────────────────────────────
DROP POLICY IF EXISTS "super_admin_crud_custom_roles" ON custom_roles;
DROP POLICY IF EXISTS "staff_crud_custom_roles" ON custom_roles;

CREATE POLICY "staff_crud_custom_roles"
  ON custom_roles FOR ALL
  TO authenticated
  USING ( EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('staff', 'super_admin')
  ))
  WITH CHECK ( EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('staff', 'super_admin')
  ));

-- ── custom_role_permissions ──────────────────────────────
DROP POLICY IF EXISTS "super_admin_crud_role_permissions" ON custom_role_permissions;
DROP POLICY IF EXISTS "staff_crud_role_permissions" ON custom_role_permissions;

CREATE POLICY "staff_crud_role_permissions"
  ON custom_role_permissions FOR ALL
  TO authenticated
  USING ( EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('staff', 'super_admin')
  ))
  WITH CHECK ( EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('staff', 'super_admin')
  ));
