/*
  # Fix infinite recursion in RLS helper functions

  ## Problem
  The helper functions get_my_org_id(), get_my_role(), is_admin_or_staff(), and
  is_agent_or_above() all query the `users` table. The `users` table itself has
  RLS policies that call these same helpers, causing infinite recursion whenever
  any policy on `farmers` (or other tables) invokes these helpers.

  ## Fix
  Recreate all four helper functions with SECURITY DEFINER so they execute with
  the privileges of the function owner (bypassing RLS on `users`) rather than
  the privileges of the calling user. This breaks the recursion loop.

  ## Changes
  - get_my_org_id(): add SECURITY DEFINER + STABLE + SET search_path
  - get_my_role(): add SECURITY DEFINER + STABLE + SET search_path
  - is_admin_or_staff(): add SECURITY DEFINER + STABLE + SET search_path
  - is_agent_or_above(): add SECURITY DEFINER + STABLE + SET search_path
*/

CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organisation_id FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_admin_or_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role IN ('admin','staff') FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_agent_or_above()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role IN ('admin','staff','agent') FROM users WHERE id = auth.uid();
$$;
