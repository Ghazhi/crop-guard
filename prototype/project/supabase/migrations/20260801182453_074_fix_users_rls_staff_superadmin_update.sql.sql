/*
# Fix users table RLS: allow staff & super_admin to manage users

## Root cause
The UPDATE policy on `users` only allowed `admin` role (via `get_my_role() =
'admin'`). Staff and super_admin users could see users (SELECT works via
`is_admin_or_staff()`) but couldn't update them — so assigning custom roles
or toggling is_active silently failed with an RLS violation.

Additionally, `is_admin_or_staff()` didn't include `super_admin`, so
super_admin users couldn't even see the user list.

## Fix
1. Update `is_admin_or_staff()` to also return true for `super_admin`.
2. Replace the admin-only UPDATE policy with one that allows admin, staff,
   and super_admin to update any user in their organisation.
3. Replace the admin-only INSERT policy similarly.
*/

-- ── Fix helper: include super_admin ──────────────────────
CREATE OR REPLACE FUNCTION is_admin_or_staff()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff', 'super_admin'),
    false
  );
$$;

-- ── users UPDATE policy ──────────────────────────────────
DROP POLICY IF EXISTS "Admin can update any user in their org" ON users;
DROP POLICY IF EXISTS "Staff admin superadmin can update users in org" ON users;

CREATE POLICY "Staff admin superadmin can update users in org"
  ON users FOR UPDATE
  TO authenticated
  USING ( organisation_id = get_my_org_id() AND is_admin_or_staff() )
  WITH CHECK ( organisation_id = get_my_org_id() AND is_admin_or_staff() );

-- ── users INSERT policy ──────────────────────────────────
DROP POLICY IF EXISTS "Admin can insert users in their org" ON users;
DROP POLICY IF EXISTS "Staff admin superadmin can insert users in org" ON users;

CREATE POLICY "Staff admin superadmin can insert users in org"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK ( organisation_id = get_my_org_id() AND is_admin_or_staff() );
