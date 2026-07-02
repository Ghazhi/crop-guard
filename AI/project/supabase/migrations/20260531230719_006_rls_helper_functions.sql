/*
  # RLS Helper Functions (JWT-based, no table queries, no recursion)
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

-- get_my_farmer_id: resolves current user's farmer row without re-entering farmers RLS
CREATE OR REPLACE FUNCTION get_my_farmer_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM farmers WHERE user_id = auth.uid() LIMIT 1;
$$;
