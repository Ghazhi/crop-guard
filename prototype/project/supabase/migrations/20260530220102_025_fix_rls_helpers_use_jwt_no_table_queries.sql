/*
  # Fix infinite recursion — rewrite RLS helpers to use JWT claims only

  ## Problem
  The helper functions (get_my_org_id, get_my_role, is_admin_or_staff,
  is_agent_or_above) query the `users` table. Even though they are
  SECURITY DEFINER, Postgres still evaluates RLS on `users` for the
  definer role (anon/authenticated) because the definer is not a superuser.

  The RLS policies on `users` themselves call these same helper functions,
  creating an infinite recursion loop whenever any table with a policy
  referencing these helpers is accessed:

    farmers INSERT → is_agent_or_above()
      → SELECT FROM users  (triggers users RLS)
        → is_admin_or_staff() / get_my_org_id()
          → SELECT FROM users  (triggers users RLS again)
            → infinite recursion

  ## Fix
  Rewrite all helpers to read exclusively from auth.jwt() claims (no table
  access at all). The role and organisation_id are already stored in
  raw_user_meta_data on every user's JWT token, so no DB round-trip is needed.

  This permanently eliminates the recursion — JWT reads are instantaneous
  and cannot trigger RLS policies.
*/

CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(
    (auth.jwt() -> 'user_metadata' ->> 'organisation_id'),
    ''
  )::uuid;
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    ''
  )::user_role;
$$;

CREATE OR REPLACE FUNCTION is_admin_or_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff'),
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
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff', 'agent'),
    false
  );
$$;
