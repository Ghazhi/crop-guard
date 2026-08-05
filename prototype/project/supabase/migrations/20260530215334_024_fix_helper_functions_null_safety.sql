/*
  # Fix RLS helper functions — NULL safety

  ## Problem
  The helper functions return NULL when auth.uid() returns NULL (unauthenticated
  context) or when the user row is not found. NULL propagates through AND/OR
  conditions in RLS policies, causing policies to silently reject all rows
  instead of returning false.

  Specifically:
  - is_admin_or_staff() returns NULL → staff see 0 farmers
  - is_agent_or_above() returns NULL → agents/staff cannot insert farmers
  - get_my_org_id() returns NULL → org-scoped queries match nothing

  ## Fix
  Add COALESCE to return safe defaults (false/NULL are both handled) so that
  policy expressions short-circuit correctly:
  - Boolean functions coalesce to false
  - get_my_org_id() already returns NULL safely (NULL = org_id is always false)

  All functions remain SECURITY DEFINER + STABLE so they bypass RLS on `users`.
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
  SELECT COALESCE(
    (SELECT role IN ('admin','staff') FROM users WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION is_agent_or_above()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin','staff','agent') FROM users WHERE id = auth.uid()),
    false
  );
$$;
